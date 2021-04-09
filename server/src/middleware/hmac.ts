import { NextFunction, Request, Response } from "express";
import crypto from "crypto";

export interface Device {
  secretKey: string;
  firmware: {
    type: string;
    version: string;
  };
}

export type Devices = Record<string, Device>;

interface AuthorizationObject {
  "key-id": string;
  signature: string;
}

function isAuthorizationObject(obj: any): obj is AuthorizationObject {
  return (
    typeof obj["key-id"] !== "undefined" && typeof obj.signature !== "undefined"
  );
}

export type HMACRequest = Request & { device: string };

export function sign(message: string | Buffer, secret: string): string {
  let buffer: Buffer;
  if (message instanceof Buffer) {
    buffer = message;
  } else {
    buffer = Buffer.from(message, "utf8");
  }
  const hash = crypto.createHmac("sha256", secret);
  hash.update(buffer);
  return hash.digest("base64");
}

export function hmacAuthorization(devices: Devices) {
  return (req: HMACRequest, res: Response, next: NextFunction) => {
    const authorizationHeader = req.get("authorization");

    if (!authorizationHeader) {
      res.sendStatus(400);
      return next(new Error("No authorization header found"));
    }

    const [type, ...mac] = authorizationHeader.split(" ");

    if (type !== "Hmac") {
      res.sendStatus(400);
      return next(new Error("Unsupported authorization method"));
    }

    const authorization = mac
      .join(" ")
      .split(", ")
      .map((kv) => {
        const [key, ...values] = kv.replace(/"/g, "").split("=");
        return [key, values.join("=")];
      })
      .reduce<Record<string, string>>(
        (t, [key, value]: [string, string]) => ({ ...t, [key]: value }),
        {}
      );

    if (!isAuthorizationObject(authorization)) {
      console.error("Invalid authorization header");
      res.sendStatus(401);
      return next("router");
    }

    const device = devices[authorization["key-id"]];
    if (!device) {
      console.error("Device not found");
      res.sendStatus(401);
      return next("router");
    }

    const message = `${req.method}\n${req.path}\n${req.get(
      "created-at"
    )}\n${req.get("expiry")}`;

    const signature = sign(message, device.secretKey);

    if (signature !== authorization.signature) {
      console.error("Invalid signature");
      res.sendStatus(401);
      return next("router");
    }

    req.device = authorization["key-id"];
    next();
  };
}
