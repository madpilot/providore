import express from "express";
import { Devices, hmacAuthorization } from "./middleware/hmac";
import { readFile } from "fs/promises";

import http from "http";
import https from "https";
import { configHandler } from "./handlers/configHandler";
import { certificateHandler } from "./handlers/certificateHandler";
import { firmwareHandler } from "./handlers/firmwareHandler";
import { csrHandler } from "./handlers/csrHandler";
import { Config } from "config";

const app = express();

async function loadDevices(configStore: string): Promise<Devices> {
  const data = await readFile(`${configStore}/devices.json`, {
    encoding: "utf-8",
  });
  return JSON.parse(data);
}

export async function startServer({
  protocol,
  bind,
  port,
  sslCertPath,
  sslKeyPath,
  caCertPath,
  config,
  certificateStore,
  firmwareStore,
}: Config) {
  try {
    const devices = await loadDevices(config);
    app.use(hmacAuthorization(devices));

    app.get("/config.json", configHandler(config, devices));
    app.post("/certificates/request", csrHandler());
    app.get("/client.cert.pem", certificateHandler(certificateStore, devices));
    app.get("/firmware.bin", firmwareHandler(firmwareStore, devices));

    // TODO: Add either a OCSP or stream out a CRL file
    // CRL, while not the latest and greatest probably makes the most sense
    // here as the only server that needs to validate the certificate is
    // MQTT, so having a the over head of OCSP seems like overkill at the moment...
    if (protocol == "https") {
      const cert = await readFile(sslCertPath);
      const key = await readFile(sslKeyPath);
      const ca = await readFile(caCertPath);
      const httpsServer = https.createServer(
        {
          cert,
          key,
          ca,
        },
        app
      );
      httpsServer.listen(port, () => {
        console.log(`HTTPS server listening at ${protocol}://${bind}:${port}`);
      });
    } else {
      const httpServer = http.createServer(app);
      httpServer.listen(port, () => {
        console.log(`HTTP server listening at ${protocol}://${bind}:${port}`);
      });
    }
  } catch (e) {
    console.error(e);
  }
}
