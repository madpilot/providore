import { Response } from "express";
import { Devices, HMACRequest, sign } from "../middleware/hmac";
import path from "path";
import { readFile } from "fs/promises";

export function certificateHandler(
  certificateStore: string,
  devices: Devices
): (req: HMACRequest, res: Response) => void {
  return async (req, res) => {
    const device = devices[req.device];
    try {
      const filePath = path.join(certificateStore, `${req.device}.cert.pem`);
      res.contentType("application/x-pem-file");
      res.sendFile(filePath);

      const data = await readFile(filePath);
      const created = new Date();
      const expires = new Date(created.getTime() + 15 * 60 * 1000);

      const message = `${data.toString(
        "utf-8"
      )}\n${created.toISOString()}\n${expires.toISOString()}`;
      const signature = sign(message, device.secretKey);

      res.set("created-at", created.toISOString());
      res.set("expires", expires.toISOString());
      res.set("signature", signature);
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
