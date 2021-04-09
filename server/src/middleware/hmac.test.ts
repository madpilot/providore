import { Devices, hmacAuthorization, HMACRequest, sign } from "./hmac";
import { Response } from "express";

describe("hmac middleware", () => {
  let req: HMACRequest;
  let res: Response;
  let nextFunction;

  const devices: Devices = {
    abc123: {
      secretKey: "secret",
      firmware: { type: "type", version: "version" },
    },
  };

  const subject = () => {
    return hmacAuthorization(devices);
  };

  beforeEach(() => {
    nextFunction = jest.fn();
    res = ({
      contentType: jest.fn(),
      sendFile: jest.fn(),
      sendStatus: jest.fn(),
    } as unknown) as Response;
  });

  describe("no authorization header", () => {
    beforeEach(() => {
      req = ({
        get: jest.fn(() => undefined),
      } as unknown) as HMACRequest;
    });

    it("returns a 400", () => {
      const middleware = subject();
      middleware(req, res, nextFunction);

      expect(res.sendStatus as jest.Mock).toBeCalledTimes(1);
      expect(res.sendStatus as jest.Mock).toBeCalledWith(400);
    });

    it("sets an error message", () => {
      const middleware = subject();
      middleware(req, res, nextFunction);

      expect(nextFunction as jest.Mock).toBeCalledTimes(1);
      expect(nextFunction as jest.Mock).toHaveBeenCalledWith(expect.any(Error));

      expect(() => {
        throw (nextFunction as jest.Mock).mock.calls[0];
      }).toThrowError(/No authorization header found/);
    });
  });

  describe("Unsupported authorization header", () => {
    beforeEach(() => {
      req = ({
        get: jest.fn((header) => {
          switch (header) {
            case "authorization":
              return "UNKNOWN abc.123";
            default:
              return undefined;
          }
        }),
      } as unknown) as HMACRequest;
    });

    it("returns a 400", () => {
      const middleware = subject();
      middleware(req, res, nextFunction);

      expect(res.sendStatus as jest.Mock).toBeCalledTimes(1);
      expect(res.sendStatus as jest.Mock).toBeCalledWith(400);
    });

    it("sets an error message", () => {
      const middleware = subject();
      middleware(req, res, nextFunction);

      expect(nextFunction as jest.Mock).toBeCalledTimes(1);
      expect(nextFunction as jest.Mock).toHaveBeenCalledWith(expect.any(Error));

      expect(() => {
        throw (nextFunction as jest.Mock).mock.calls[0];
      }).toThrowError(/Unsupported authorization method/);
    });
  });

  describe("Invalid Hmac authorization header", () => {
    beforeEach(() => {
      req = ({
        get: jest.fn((header) => {
          switch (header) {
            case "authorization":
              return "Hmac abc.123";
            default:
              return undefined;
          }
        }),
      } as unknown) as HMACRequest;
    });

    it("returns a 401", () => {
      const middleware = subject();
      middleware(req, res, nextFunction);

      expect(res.sendStatus as jest.Mock).toBeCalledTimes(1);
      expect(res.sendStatus as jest.Mock).toBeCalledWith(401);
    });

    it("fallsback to the router", () => {
      const middleware = subject();
      middleware(req, res, nextFunction);

      expect(nextFunction as jest.Mock).toBeCalledTimes(1);
      expect(nextFunction as jest.Mock).toHaveBeenCalledWith("router");
    });
  });

  describe("Valid Hmac authorization header", () => {
    describe("Unknown device", () => {
      beforeEach(() => {
        const message = "get\npath\n2021-04-08T11:00:21\n2021-04-08T11:15:21";
        const signature = sign(message, "secret");

        req = ({
          method: "get",
          path: "path",
          get: jest.fn((header) => {
            switch (header) {
              case "authorization":
                return `Hmac key-id="xyz123", signature="${signature}"`;
              case "created-at":
                return "2021-04-08T11:00:21";
              case "expiry":
                return "2021-04-08T11:15:21";
              default:
                return undefined;
            }
          }),
        } as unknown) as HMACRequest;
      });

      it("returns a 401", () => {
        const middleware = subject();
        middleware(req, res, nextFunction);

        expect(res.sendStatus as jest.Mock).toBeCalledTimes(1);
        expect(res.sendStatus as jest.Mock).toBeCalledWith(401);
      });

      it("fallsback to the router", () => {
        const middleware = subject();
        middleware(req, res, nextFunction);

        expect(nextFunction as jest.Mock).toBeCalledTimes(1);
        expect(nextFunction as jest.Mock).toHaveBeenCalledWith("router");
      });
    });

    describe("Invalid signature", () => {
      beforeEach(() => {
        const message = "get\npath\n2021-04-08T11:00:21\n2021-04-08T11:15:21";
        const signature = sign(message, "notsecret");

        req = ({
          method: "get",
          path: "path",
          get: jest.fn((header) => {
            switch (header) {
              case "authorization":
                return `Hmac key-id="abc123", signature="${signature}"`;
              case "created-at":
                return "2021-04-08T11:00:21";
              case "expiry":
                return "2021-04-08T11:15:21";
              default:
                return undefined;
            }
          }),
        } as unknown) as HMACRequest;
      });

      it("returns a 401", () => {
        const middleware = subject();
        middleware(req, res, nextFunction);

        expect(res.sendStatus as jest.Mock).toBeCalledTimes(1);
        expect(res.sendStatus as jest.Mock).toBeCalledWith(401);
      });

      it("fallsback to the router", () => {
        const middleware = subject();
        middleware(req, res, nextFunction);

        expect(nextFunction as jest.Mock).toBeCalledTimes(1);
        expect(nextFunction as jest.Mock).toHaveBeenCalledWith("router");
      });
    });

    describe("Valid signature", () => {
      beforeEach(() => {
        const message = "get\npath\n2021-04-08T11:00:21\n2021-04-08T11:15:21";
        const signature = sign(message, "secret");

        req = ({
          method: "get",
          path: "path",
          get: jest.fn((header) => {
            switch (header) {
              case "authorization":
                return `Hmac key-id="abc123", signature="${signature}"`;
              case "created-at":
                return "2021-04-08T11:00:21";
              case "expiry":
                return "2021-04-08T11:15:21";
              default:
                return undefined;
            }
          }),
        } as unknown) as HMACRequest;
      });

      it("sets the device", () => {
        const middleware = subject();
        middleware(req, res, nextFunction);
        expect(req.device).toEqual("abc123");
      });

      it("passes to the next middleware in the chain", () => {
        const middleware = subject();
        middleware(req, res, nextFunction);

        expect(nextFunction as jest.Mock).toBeCalledTimes(1);
        expect(nextFunction as jest.Mock).toHaveBeenCalledWith();
      });
    });
  });
});

describe("sign", () => {
  let message: string | Buffer;
  let secret: string;

  const subject = () => sign(message, secret);

  it("signs strings", () => {
    message = "get\npath\n2021-04-08T11:00:21\n2021-04-08T11:15:21";
    secret = "secret";
    expect(subject()).toEqual("SpzyqqImicOLKO9ZwhB+kk4/gM32+wd+I6h6Si6BW/s=");
  });

  it("signs Buffers", () => {
    message = Buffer.from(
      "get\npath\n2021-04-08T11:00:21\n2021-04-08T11:15:21",
      "utf8"
    );
    secret = "secret";
    expect(subject()).toEqual("SpzyqqImicOLKO9ZwhB+kk4/gM32+wd+I6h6Si6BW/s=");
  });
});