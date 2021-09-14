import { firmwareHandler } from "./firmwareHandler";
import path, { join } from "path";
import { Response } from "express";
import { ProvidoreRequest, sign } from "../middleware/hmac";

import { readFile } from "fs/promises";

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
        firmware: [
          { type: "type", version: "1.0.0", config: "config" },
          { type: "type", version: "1.0.1", config: "config" },
          { type: "type", version: "2.0.0", config: "config" }
        ]
      }
    });

  let req: ProvidoreRequest;
  let res: Response;
  let device: string;

  beforeEach(() => {
    res = {
      contentType: jest.fn(),
      sendFile: jest.fn(),
      sendStatus: jest.fn(),
      set: jest.fn()
    } as unknown as Response;
  });

  describe("when the device does not exist", () => {
    beforeEach(() => {
      device = "xyz123";
      req = { device } as ProvidoreRequest;
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
      req = { device } as ProvidoreRequest;
    });

    it("sets the content type to application/octet-stream", async () => {
      const handler = subject();
      await handler(req, res);
      expect(res.contentType as jest.Mock).toBeCalledTimes(1);
      expect(res.contentType as jest.Mock).toBeCalledWith(
        "application/octet-stream"
      );
    });

    describe("no version is supplied", () => {
      describe("when the file is found", () => {
        it("returns a 200", async () => {
          const handler = subject();
          await handler(req, res);

          expect(res.sendFile as jest.Mock).toBeCalledTimes(1);
          expect(res.sendFile as jest.Mock).toBeCalledWith(
            path.join(storePath, "type/2.0.0/firmware.bin")
          );
        });

        it("signs the payload", async () => {
          const handler = subject();
          await handler(req, res);

          expect(res.set as jest.Mock).toBeCalledTimes(3);

          const created = (res.set as jest.Mock).mock.calls[0][1] as string;
          const expires = (res.set as jest.Mock).mock.calls[1][1] as string;

          const data = await readFile(
            path.join(storePath, "type/2.0.0/firmware.bin")
          );
          const message = `${data.toString("utf-8")}\n${created}\n${expires}`;
          const signature = sign(message, "secret");

          expect(res.set as jest.Mock).toBeCalledWith("signature", signature);
        });
      });
    });

    describe("a version is supplied", () => {
      beforeEach(() => {
        const version = "1.0.0";
        req = { device, version } as ProvidoreRequest;
      });

      describe("when the version is found", () => {
        it("returns the firmware corresponding to the version number", async () => {
          const handler = subject();
          await handler(req, res);

          expect(res.sendFile as jest.Mock).toBeCalledTimes(1);
          expect(res.sendFile as jest.Mock).toBeCalledWith(
            path.join(storePath, "type/1.0.0/firmware.bin")
          );
        });

        it("signs the payload", async () => {
          const handler = subject();
          await handler(req, res);

          expect(res.set as jest.Mock).toBeCalledTimes(3);

          const created = (res.set as jest.Mock).mock.calls[0][1] as string;
          const expires = (res.set as jest.Mock).mock.calls[1][1] as string;

          const data = await readFile(
            path.join(storePath, "type/1.0.0/firmware.bin")
          );
          const message = `${data.toString("utf-8")}\n${created}\n${expires}`;
          const signature = sign(message, "secret");

          expect(res.set as jest.Mock).toBeCalledWith("signature", signature);
        });
      });

      describe("when the version is not found", () => {
        beforeEach(() => {
          const version = "4.0.0";
          req = { device, version } as ProvidoreRequest;
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
    });
  });

  describe("when the file is not found", () => {
    beforeEach(() => {
      device = "abc123";
      req = { device } as ProvidoreRequest;
    });

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
    beforeEach(() => {
      device = "abc123";
      req = { device } as ProvidoreRequest;
    });

    it("returns a 500", async () => {
      res.sendFile = jest.fn().mockImplementation(() => {
        throw new MockError("Other Error", "Other");
      });

      const handler = subject();
      await handler(req, res);

      expect(res.sendFile as jest.Mock).toBeCalledTimes(1);
      expect(res.sendStatus as jest.Mock).toBeCalledTimes(1);
      expect(res.sendStatus as jest.Mock).toBeCalledWith(500);
    });
  });
});
