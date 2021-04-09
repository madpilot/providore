import { Response } from "express";
import { Devices, HMACRequest, sign, signPayload } from "../middleware/hmac";
import path from "path";
import { readFile } from "fs/promises";

export function firmwareHandler(
  firmwareStore: string,
  devices: Devices
): (req: HMACRequest, res: Response) => void {
  return async (req, res) => {
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
      res.contentType("application/octet-stream");
      res.sendFile(filePath);

      const data = await readFile(filePath);
      signPayload(res, data, device.secretKey);
    } catch (err) {
      if (err.code === "ENOENT") {
        res.sendStatus(404);
      } else {
        console.error(err.message);
        res.sendStatus(500);
      }
    }
  };
}
