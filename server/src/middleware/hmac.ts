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

export function hmacAuthorization(devices: Devices) {
  return (
    req: Request & { device?: string },
    res: Response,
    next: NextFunction
  ) => {
    const authorizationHeader = req.get("authorization");

    if (!authorizationHeader) {
      res.sendStatus(400);
      return next(new Error("No authorization header found"));
    }

    const [type, ...mac] = authorizationHeader.split(" ");

    if (type !== "Hmac") {
      res.sendStatus(400);
      return next("Unsupported authorization method");
    }

    const authorization = mac
      .join(" ")
      .split(", ")
      .map((kv) => {
        const [key, ...values] = kv.replace(/"/g, "").split("=");
        return [key, values.join("=")];
      })
      .reduce<Record<string, string>>((t, x: [string, string]) => {
        const key = x[0];
        const value = x[1];
        return { ...t, [key]: value };
      }, {});

    if (!isAuthorizationObject(authorization)) {
      res.sendStatus(401);
      return next("router");
    }

    const device = devices[authorization["key-id"]];
    if (!device) {
      res.sendStatus(401);
      return next("router");
    }

    const message = `${req.method}\n${req.path}\n${req.get(
      "created-at"
    )}\n${req.get("expiry")}`;

    const buffer = Buffer.from(message, "utf8");
    const hash = crypto.createHmac("sha256", device.secretKey);
    hash.update(buffer);
    const signature = hash.digest("base64");

    if (signature !== authorization.signature) {
      res.sendStatus(401);
      return next("router");
    }

    req.device = authorization["key-id"];
    next();
  };
}
