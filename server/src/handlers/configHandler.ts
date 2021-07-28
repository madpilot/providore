import { Response } from "express";
import { Devices, HMACRequest, signPayload } from "../middleware/hmac";
import path from "path";
import { readFile } from "fs/promises";
import { logger } from "../logger";

export function configHandler(
  configStore: string,
  devices: Devices
): (req: HMACRequest, res: Response) => void {
  return async (req, res) => {
    if (!req.device) {
      res.sendStatus(404);
      return;
    }
    const device = devices[req.device];
    const firmware = device.firmware.find((f) => f.version === req.version);

    if (!firmware) {
      logger.debug("Firmware version not found");
      res.sendStatus(404);
      return;
    }

    const filePath = path.join(
      configStore,
      req.device,
      `${firmware.config}.json`
    );

    try {
      res.contentType("json");
      const data = await readFile(filePath);
      signPayload(res, data, device.secretKey);
      res.sendFile(filePath);
    } catch (err) {
      if (err.code === "ENOENT") {
        res.sendStatus(404);
      } else {
        logger.error(err.message);
        res.sendStatus(500);
      }
    }
  };
}
