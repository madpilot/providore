import { Response } from "express";
import { Devices, HMACRequest, signPayload } from "../middleware/hmac";
import path from "path";
import { readFile } from "fs/promises";

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
    const filePath = path.join(configStore, `${req.device}.json`);

    try {
      res.contentType("json");
      const data = await readFile(filePath);
      signPayload(res, data, device.secretKey);
      res.sendFile(filePath);
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
