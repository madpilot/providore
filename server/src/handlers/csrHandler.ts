import { Response } from "express";
import { Devices, HMACRequest } from "middleware/hmac";

interface Params {
  csr?: string;
}

export function csrHandler(
  certificateStore: string,
  devices: Devices
): (req: HMACRequest<Params>, res: Response) => void {
  return async (req, res) => {
    if (!req.device) {
      res.sendStatus(404);
      return;
    }
    const device = devices[req.device];
    if (!device) {
      res.sendStatus(404);
      return;
    }

    const csr = req.params.csr;
    if (!csr) {
      res.sendStatus(404);
      return
    }

    const result = await openssl(["ca", "-config", "path/to/openssl.cnf", "-batch", "-passin", "pass:<password>", "-extensions", "usr_cert", "-notext", "-md", "sha256", "-in", Buffer.from(csr), "-out", "path/to/certificate")

    // See: https://jamielinux.com/docs/openssl-certificate-authority/index.html
    // Write out the CSR, then
    // 1. If revoking, revoke the cert (This could be an configuration option?)
    // 2. Create a new certificate using the following
    //    openssl ca -config <path/to/openssl.cnf -batch -passin pass:<password>> -extensions usr_cert -notext -md sha256 -in <path/to/csr> -out <path/to/cert>
    // 3. Stream the new certificate back
  };
}
