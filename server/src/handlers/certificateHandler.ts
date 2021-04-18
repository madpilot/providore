import { Response } from "express";
import { Devices, HMACRequest, signPayload } from "../middleware/hmac";
import path from "path";
import { readFile } from "fs/promises";

export function certificateHandler(
  certificateStore: string,
  devices: Devices
): (req: HMACRequest, res: Response) => void {
  return async (req, res) => {
    if (!req.device) {
      res.sendStatus(404);
      return;
    }
    const device = devices[req.device];
    try {
      const filePath = path.join(certificateStore, `${req.device}.cert.pem`);
      res.contentType("application/x-pem-file");
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
