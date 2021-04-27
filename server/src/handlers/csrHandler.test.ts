import { Response } from "express";
import { sign } from "../lib/openssl";
import { HMACRequest } from "../middleware/hmac";

describe("csrHandler", () => {
  let req: HMACRequest;
  let res: Response;
  let device: string;

  beforeEach(() => {
    device = "abc123";
    req = { device } as HMACRequest;
    res = ({
      contentType: jest.fn(),
      sendFile: jest.fn(),
      sendStatus: jest.fn(),
      set: jest.fn()
    } as unknown) as Response;
  });

  it("does a thing", async () => {
    const result = await sign("Hello!", device, "", {});
    console.log(result);
  });
});
