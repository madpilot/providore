import { spawn } from "child_process";
import { file, FileResult } from "tmp-promise";
import { createWriteStream, PathLike } from "fs";
import { logger } from "../logger";
import { OpenSSLConfig } from "config";
import { readFile } from "fs/promises";

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
