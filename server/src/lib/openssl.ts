import { spawn } from "child_process";
import { file, FileResult } from "tmp-promise";
import { createWriteStream, PathLike } from "fs";
import { logger } from "../logger";
import { OpenSSLConfig } from "config";
import { readFile } from "fs/promises";
import { dirname } from "path";

function isString(obj: any): obj is string {
  return typeof obj === "string";
}

function splitParameters(
  parameters: string | Array<string | Buffer>
): Array<string | Buffer> {
  if (isString(parameters)) {
    return parameters.split(" ");
  }
  return parameters;
}

interface TemporaryFile {
  file: FileResult;
  content: Buffer;
}

async function resolveParameters(
  param: string | Buffer
): Promise<string | TemporaryFile> {
  if (isString(param)) {
    return Promise.resolve(param);
  } else {
    const p = await file();
    return {
      file: p,
      content: param
    };
  }
}

export async function openssl(
  params: string | Array<string | Buffer>,
  bin = "openssl"
): Promise<string> {
  const stdout: Array<string> = [];
  const stderr: Array<string> = [];

  const resolved = await Promise.all(
    splitParameters(params).map(resolveParameters)
  );

  // Write out all the tmp files
  await Promise.all(
    resolved
      .filter((v) => !isString(v))
      .map(async (v) => {
        if (!isString(v)) {
          const stream = createWriteStream(
            (null as unknown) as PathLike, // Null is valid when there is a file descriptor
            { fd: v.file.fd }
          );

          await new Promise<void>((resolve, reject) => {
            stream.write(v.content, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });

          stream.close();
        }
      })
  );

  const openSSLProcess = spawn(
    bin,
    resolved.map((v) => (isString(v) ? v : v.file.path))
  );

  openSSLProcess.stdout.on("data", (data) => {
    stdout.push(data);
  });

  openSSLProcess.stderr.on("data", (data) => {
    stderr.push(data);
  });

  // eslint-disable-next-line unused-imports/no-unused-vars
  return new Promise((resolve, reject) => {
    openSSLProcess.on("close", (code) => {
      logger.info(`OpenSSL process ends with code ${code}`);
      logger.info("Cleaning up temp files");
      resolved.map((v) => (isString(v) ? v : v.file.cleanup()));

      if (code !== 0) {
        if (stderr.length > 0) {
          reject(Error(stderr.join("\n")));
        } else if (stdout.length > 0) {
          reject(Error(stdout.join("\n")));
        } else {
          reject(Error("Error processsing CSR"));
        }
      } else {
        resolve(stdout.join("\n"));
      }
    });
  });
}

export async function sign(
  csr: string,
  device: string,
  certificateStore: string,
  { bin, passwordFile, configFile }: OpenSSLConfig
): Promise<string> {
  if (!configFile) {
    throw new Error("No Open SSL config file set");
  }
  if (!passwordFile) {
    throw new Error("No Open SSL password file set");
  }

  const certificates = await getCertificates(device, {
    bin,
    passwordFile,
    configFile
  });

  await Promise.all(
    certificates
      .filter((certificate) => certificate.status === "valid")
      .map((certificate) =>
        revoke(certificate.serial, { bin, passwordFile, configFile })
      )
  );

  const stdio = await openssl(
    [
      "ca",
      "-config",
      `${configFile}`,
      "-batch",
      "-passin",
      `file:${passwordFile}`,
      "-extensions",
      "usr_cert",
      "-notext",
      "-md",
      "sha256",
      "-in",
      Buffer.from(csr),
      "-out",
      `${certificateStore}/${device}.cert.pem`
    ],
    bin
  );

  logger.info(stdio.toString());

  const certificate = await readFile(`${certificateStore}/${device}.cert.pem`);
  return certificate.toString("utf-8");
}

interface CertificateDatabase {
  status: "valid" | "revoked" | "expired";
  expiration: Date;
  revokation: Date;
  serial: string;
  subject: string;
}

export async function getCertificates(
  cn: string,
  { bin, passwordFile, configFile }: OpenSSLConfig
): Promise<Array<CertificateDatabase>> {
  if (!configFile) {
    throw new Error("No Open SSL config file set");
  }

  // Update the DB first
  await openssl(
    [
      "ca",
      "-config",
      `${configFile}`,
      "-passin",
      `file:${passwordFile}`,
      "-updatedb"
    ],
    bin
  );
  const configDir = dirname(configFile);
  const file = await readFile(`${configDir}/index.txt`);

  return file
    .toString("utf-8")
    .split("\n")
    .reduce<Array<CertificateDatabase>>((certificates, line) => {
      const [
        status,
        expiration,
        revokation,
        serial,
        _filename,
        subject
      ] = line.split(/\t/);

      if (status) {
        const certificate: CertificateDatabase = {
          status:
            status === "V" ? "valid" : status === "R" ? "revoked" : "expired",
          expiration: new Date(Date.parse(expiration)),
          revokation: new Date(Date.parse(revokation)),
          serial,
          subject
        };
        return [...certificates, certificate];
      }

      return certificates;
    }, [])
    .filter((certificate) =>
      certificate.subject
        .split("/")
        .find((component) => component === `CN=${cn}`)
    );
}

export async function revoke(
  serial: string,
  { bin, passwordFile, configFile }: OpenSSLConfig
): Promise<void> {
  if (!configFile) {
    throw new Error("No Open SSL config file set");
  }
  const configDir = dirname(configFile);

  const stdio = await openssl(
    [
      "ca",
      "-config",
      `${configFile}`,
      "-passin",
      `file:${passwordFile}`,
      "-revoke",
      `${configDir}/newcerts/${serial}.pem`
    ],
    bin
  );

  logger.info(stdio.toString());
}
