import { Response } from "express";
import { HMACRequest } from "middleware/hmac";

export function csrHandler(): (req: HMACRequest, res: Response) => void {
  return async (_req, res) => {
    res.send("CSR required");
    // See: https://jamielinux.com/docs/openssl-certificate-authority/index.html
    // Write out the CSR, then
    // 1. If revoking, revoke the cert (This could be an configuration option?)
    // 2. Create a new certificate using the following
    //    openssl ca -config <path/to/openssl.cnf -batch -passin pass:<password>> -extensions usr_cert -notext -md sha256 -in <path/to/csr> -out <path/to/cert>
    // 3. Stream the new certificate back
  };
}
