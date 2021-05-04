import express from "express";
import { Devices, hmacAuthorization } from "./middleware/hmac";
import { readFile } from "fs/promises";

import http from "http";
import https from "https";
import { configHandler } from "./handlers/configHandler";
import { certificateHandler } from "./handlers/certificateHandler";
import { firmwareHandler } from "./handlers/firmwareHandler";
import { csrHandler } from "./handlers/csrHandler";
import { crlHandler } from "./handlers/crlHandler";
import { Config } from "config";
import { logger } from "./logger";
import { text } from "body-parser";

const app = express();
async function loadDevices(configStore: string): Promise<Devices> {
  const data = await readFile(`${configStore}/devices.json`, {
    encoding: "utf-8"
  });
  return JSON.parse(data);
}

export async function startServer({
  webserver,
  configStore,
  certificateStore,
  firmwareStore,
  openSSL
}: Config) {
  const {
    protocol,
    bind,
    port,
    sslCertPath,
    sslKeyPath,
    caCertPath
  } = webserver;

  try {
    const devices = await loadDevices(configStore);

    app.use(text({ defaultCharset: "utf-8" }));

    if (openSSL.configFile) {
      app.get("/certificates/crl.pem", crlHandler(openSSL));
    }

    app.use(hmacAuthorization(devices));

    app.get("/config.json", configHandler(configStore, devices));
    if (certificateStore) {
      app.post(
        "/certificates/request",
        csrHandler(certificateStore, devices, openSSL)
      );
      app.get(
        "/client.cert.pem",
        certificateHandler(certificateStore, devices)
      );
    }
    if (firmwareStore) {
      app.get("/firmware.bin", firmwareHandler(firmwareStore, devices));
    }

    if (protocol === "https") {
      if (!sslCertPath) {
        throw new Error(
          "Unable to start SSL server - no certificate file supplied"
        );
      }
      if (!sslKeyPath) {
        throw new Error(
          "Unable to start SSL server - no certificate key supplied"
        );
      }

      const cert = await readFile(sslCertPath);
      const key = await readFile(sslKeyPath);
      const ca = caCertPath ? await readFile(caCertPath) : undefined;
      const httpsServer = https.createServer(
        {
          cert,
          key,
          ca
        },
        app
      );
      httpsServer.listen(port, () => {
        logger.info(`HTTPS server listening at ${protocol}://${bind}:${port}`);
      });
    } else {
      const httpServer = http.createServer(app);
      httpServer.listen(port, () => {
        logger.info(`HTTP server listening at ${protocol}://${bind}:${port}`);
      });
    }
  } catch (e) {
    logger.error(e);
  }
}
