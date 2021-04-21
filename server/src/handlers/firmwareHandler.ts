import { Response } from "express";
import { Devices, HMACRequest, signPayload } from "../middleware/hmac";
import path from "path";
import { readFile } from "fs/promises";
import { logger } from "../logger";

export function firmwareHandler(
  firmwareStore: string,
  devices: Devices
): (req: HMACRequest, res: Response) => void {
  return async (req, res) => {
    if (!req.device) {
      res.sendStatus(404);
      return;
    }
    const device = devices[req.device];
    if (!device) {
      res.sendStatus(404);
      return;
    }

    const filePath = path.join(
      firmwareStore,
      device.firmware.type,
      device.firmware.version,
      "firmware.bin"
    );

    try {
      const data = await readFile(filePath);
      signPayload(res, data, device.secretKey);
      res.contentType("application/octet-stream");
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
