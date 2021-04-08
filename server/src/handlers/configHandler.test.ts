import { configHandler } from "./configHandler";
import { join } from "path";
import { Response } from "express";
import { HMACRequest } from "middleware/hmac";
import path from 'path'

class MockError extends Error {
  public message: string;
  public code: string;

  public constructor(message: string, code: string) {
    super(message);
    this.message = message;
    this.code = code;
  }
}

describe("configHandler", () => {
  const storePath = join(__dirname, "..", "test", "store")
  const subject = () => configHandler(storePath);

  describe("config does not exist", () => {
    let req: HMACRequest;
    let res: Response;
    let device: string;

    beforeEach(() => {
      req = { device } as HMACRequest;
      res = ({
        contentType: jest.fn(),
        sendFile: jest.fn(),
        sendStatus: jest.fn(),
      } as unknown) as Response;

      device = "abc123"
    });

    it("sets the content type to JSON", async () => {
      const handler = subject();
      await handler(req, res);
      expect(res.contentType as jest.Mock).toBeCalledTimes(1);
      expect(res.contentType as jest.Mock).toBeCalledWith("json");
    });

    describe('when the file is found', () => {
      it("returns a 200", async () => {
        const handler = subject();
        await handler(req, res);

        expect(res.sendFile as jest.Mock).toBeCalledTimes(1);
        expect(res.sendFile as jest.Mock).toBeCalledWith(path.join(storePath, 'abc123.json'))
      });
    });

    describe('when the file is not found', () => {
      it("returns a 404", async () => {
        res.sendFile = jest.fn().mockImplementation(() => {throw new MockError("", "ENOENT"));

        const handler = subject();
        await handler(req, res);

        expect(res.sendFile as jest.Mock).toBeCalledTimes(1);
        expect(res.sendStatus as jest.Mock).toBeCalledTimes(1);
        expect(res.sendStatus as jest.Mock).toBeCalledWith(404)
      });
    });

    describe('when there is an error reading the file', () => {
      it("returns a 500", async () => {
        res.sendFile = jest.fn().mockImplementation(() => {throw new MockError("Other Error", "Other"));

        const handler = subject();
        await handler(req, res);

        expect(res.sendFile as jest.Mock).toBeCalledTimes(1);
        expect(res.sendStatus as jest.Mock).toBeCalledWith(500)
      });
    });
  });
});
