import { Response } from "express";
import { HMACRequest } from "middleware/hmac";
import path from "path";

export function certificateHandler(
  certificateStore: string
): (req: HMACRequest, res: Response) => void {
  return async (req, res) => {
    const filePath = path.join(certificateStore, `${req.device}.cert.pem`);

    try {
      res.contentType("application/x-pem-file");
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
