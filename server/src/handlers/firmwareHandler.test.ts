import { firmwareHandler } from "./firmwareHandler";
import { join } from "path";
import { Response } from "express";
import { HMACRequest } from "middleware/hmac";
import path from "path";

class MockError extends Error {
  public message: string;
  public code: string;

  public constructor(message: string, code: string) {
    super(message);
    this.message = message;
    this.code = code;
  }
}

describe("firmwareHandler", () => {
  const storePath = join(__dirname, "..", "test", "store");
  const subject = () =>
    firmwareHandler(storePath, {
      abc123: {
        secretKey: "secret",
        firmware: { type: "type", version: "version" },
      },
    });

  let req: HMACRequest;
  let res: Response;
  let device: string;

  beforeEach(() => {
    res = ({
      contentType: jest.fn(),
      sendFile: jest.fn(),
      sendStatus: jest.fn(),
    } as unknown) as Response;
  });

  describe("when the device does not exist", () => {
    beforeEach(() => {
      device = "xyz123";
      req = { device } as HMACRequest;
    });

    it("returns a 404", async () => {
      res.sendFile = jest.fn().mockImplementation(() => {
        throw new MockError("", "ENOENT");
      });

      const handler = subject();
      await handler(req, res);

      expect(res.sendFile as jest.Mock).toBeCalledTimes(0);
      expect(res.sendStatus as jest.Mock).toBeCalledTimes(1);
      expect(res.sendStatus as jest.Mock).toBeCalledWith(404);
    });
  });

  describe("when the device exists", () => {
    beforeEach(() => {
      device = "abc123";
      req = { device } as HMACRequest;
    });

    it("sets the content type to application/octet-stream", async () => {
      const handler = subject();
      await handler(req, res);
      expect(res.contentType as jest.Mock).toBeCalledTimes(1);
      expect(res.contentType as jest.Mock).toBeCalledWith(
        "application/octet-stream"
      );
    });

    describe("when the file is found", () => {
      it("returns a 200", async () => {
        const handler = subject();
        await handler(req, res);

        expect(res.sendFile as jest.Mock).toBeCalledTimes(1);
        expect(res.sendFile as jest.Mock).toBeCalledWith(
          path.join(storePath, "type/version/firmware.bin")
        );
      });
    });

    describe("when the file is not found", () => {
      it("returns a 404", async () => {
        res.sendFile = jest.fn().mockImplementation(() => {
          throw new MockError("", "ENOENT");
        });

        const handler = subject();
        await handler(req, res);

        expect(res.sendFile as jest.Mock).toBeCalledTimes(1);
        expect(res.sendStatus as jest.Mock).toBeCalledTimes(1);
        expect(res.sendStatus as jest.Mock).toBeCalledWith(404);
      });
    });

    describe("when there is an error reading the file", () => {
      it("returns a 500", async () => {
        res.sendFile = jest.fn().mockImplementation(() => {
          throw new MockError("Other Error", "Other");
        });

        const handler = subject();
        await handler(req, res);

        expect(res.sendFile as jest.Mock).toBeCalledTimes(1);
        expect(res.sendStatus as jest.Mock).toBeCalledWith(500);
      });
    });
  });
});
