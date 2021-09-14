import { Response } from "express";
import { Devices, HMACRequest, signPayload } from "../middleware/hmac";
import path from "path";
import { readFile } from "fs/promises";
import { logger } from "../logger";
import { FirmwareParams } from "types";

export function firmwareHandler(
  firmwareStore: string,
  devices: Devices
): (req: HMACRequest<FirmwareParams>, res: Response) => void {
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
    const version = req.params?.version || device.firmware.reverse()[0].version;
    if (!version) {
      res.sendStatus(404);
      return;
    }

    const firmware = device.firmware.find((f) => f.version === version);

    if (!firmware) {
      res.sendStatus(404);
      return;
    }

    const filePath = path.join(
      firmwareStore,
      firmware.type,
      firmware.version,
      "firmware.bin"
    );

    try {
      const data = await readFile(filePath);
      signPayload(res, data, device.secretKey);
      res.contentType("application/octet-stream");
      res.sendFile(filePath);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        res.sendStatus(404);
      } else {
        logger.error(err.message);
        res.sendStatus(500);
      }
    }
  };
}
