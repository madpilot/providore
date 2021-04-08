import express, { Request } from "express";
import { Devices, hmacAuthorization, HMACRequest } from "./middleware/hmac";
import { readFileSync } from "fs";
import path from "path";

import http from "http";
import https from "https";
import { configHandler } from "handlers/configHandler";
import { certificateHandler } from "handlers/certificateHandler";
import { firmwareHandler } from "handlers/firmwareHandler";
import { csrHandler } from "handlers/csrHandler";

const app = express();

const devices: Devices = JSON.parse(
  readFileSync("./devices/list.json").toString()
);

export interface ServerConfig {
  protocol: "http" | "https";
  bind: string;
  port: number;
  sslCertPath?: string | undefined;
  sslKeyPath?: string | undefined;
  caCertPath?: string | undefined;
  configStore?: string | undefined;
  firmwareStore?: string | undefined;
  certificateStore?: string | undefined;
}

export function startServer({
  protocol,
  bind,
  port,
  sslCertPath,
  sslKeyPath,
  caCertPath,
  configStore,
  certificateStore,
  firmwareStore,
}: ServerConfig) {
  app.use(hmacAuthorization(devices));

  app.get("/config.json", configHandler(configStore));
  app.post("/certificates/request", csrHandler());
  app.get("/client.cert.pem", certificateHandler(certificateStore));
  app.get("/firmware.bin", firmwareHandler(firmwareStore, devices));

  // TODO: Add either a OCSP or stream out a CRL file
  // CRL, while not the latest and greatest probably makes the most sense
  // here as the only server that needs to validate the certificate is
  // MQTT, so having a the over head of OCSP seems like overkill at the moment...

  if (protocol == "https") {
    const httpsServer = https.createServer(
      {
        cert: readFileSync(sslCertPath),
        key: readFileSync(sslKeyPath),
        ca: readFileSync(caCertPath),
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
}
