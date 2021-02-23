import express, { Request } from "express";
import { Devices, hmacAuthorization } from "./middleware/hmac";
import { readFile, readFileSync, stat } from "fs";
import path from "path";

const app = express();
const protocol = "http";
const server = "0.0.0.0";
const port = 3000;

const devices: Devices = JSON.parse(
  readFileSync("./devices/list.json").toString()
);

app.use(hmacAuthorization(devices));

app.get("/config.json", (req: Request & { device: string }, res) => {
  readFile(`./devices/config/${req.device}.json`, (err, data) => {
    if (err) {
      res.sendStatus(404);
    } else {
      res.contentType("json");
      res.send(data);
    }
  });
});

app.post("/certificates/request", (_req, res) => {
  res.send("CSR required");
  // See: https://jamielinux.com/docs/openssl-certificate-authority/index.html
  // Write out the CSR, then
  // 1. If revoking, revoke the cert (This could be an configuration option?)
  // 2. Create a new certificate using the following
  //    openssl ca -config <path/to/openssl.cnf -batch -passin pass:<password>> -extensions usr_cert -notext -md sha256 -in <path/to/csr> -out <path/to/cert>
  // 3. Stream the new certificate back
});

app.get("/client.cert.pem", (req: Request & { device: string }, res) => {
  // If a certificate has already been generated, and is valid, then just return it
  // If not: 404 - the device can request a new one...
  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "tls",
    `${req.device}.cert.pem`
  );

  stat(filePath, (err, status) => {
    if (err) {
      if (err.code == "ENOENT") {
        res.sendStatus(404);
      } else {
        console.error(err.message);
        res.sendStatus(500);
      }
      return;
    }

    if (status.isFile()) {
      res.contentType("application/x-pem-file");
      res.sendFile(filePath);
    } else {
      res.sendStatus(500);
    }
  });
});

app.get("/firmware.bin", (req: Request & { device: string }, res) => {
  const device = devices[req.device];
  if (!device) {
    res.sendStatus(404);
    return;
  }

  res.contentType("application/octet-stream");
  res.sendFile(
    path.join(
      __dirname,
      "..",
      "devices",
      "firmware",
      device.firmware.type,
      device.firmware.version,
      "firmware.bin"
    )
  );
});

// TODO: Add either a OCSP or stream out a CRL file

app.listen(port, () => {
  console.log(`Server listening at ${protocol}://${server}:${port}`);
});
