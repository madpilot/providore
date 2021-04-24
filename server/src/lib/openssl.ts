// Inspirexd (heavily) by https://github.com/codevibess/openssl-nodejs/
import { spawn } from "child_process";
import fs from "fs";
import { writeFile } from "fs/promises";

function checkIsParamsString(obj: any): obj is string {
  return typeof obj === "string";
}

function checkBufferObject(obj: any): obj is Buffer {
  return obj instanceof Object && obj.name && Buffer.isBuffer(obj.buffer);
}

function checkCommandForIO(element: string): boolean {
  return (
    element.includes("-in") ||
    element.includes("-out") ||
    element.includes("-keyout") ||
    element.includes("-signkey") ||
    element.includes("-key")
  );
}

function checkDataTypeCompatibility(params: any): params is string | object {
  const allowedParamsDataTypes = ["string", "object"];
  return allowedParamsDataTypes.includes(typeof params);
}

export async function openssl(
  params: string | Array<string | Buffer>
): Promise<[Array<string>, Array<string>]> {
  const stdout: Array<string> = [];
  const stderr: Array<string> = [];
  const dir = "openssl/";
  let parameters = params;
  if (!checkDataTypeCompatibility(parameters)) {
    throw new Error(
      `Parameters must be string or an array, but got ${typeof parameters}`
    );
  }

  if (checkIsParamsString(parameters)) {
    parameters = parameters.split(" ");
  }

  if (parameters.length === 0) {
    throw new Error("Array of params must contain at least one parameter");
  }

  if (parameters[0] === "openssl") {
    parameters.shift();
  }

  for (let i = 0; i <= parameters.length - 1; i++) {
    const parameter = parameters[i];
    if (checkBufferObject(parameter)) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      const filename = dir + parameter.name;
      await writeFile(filename, parameter.buffer);
      parameters[i] = parameter.name;
      parameters[i] = dir + parameter;
    }

    if (checkCommandForIO(parameter) && typeof parameters[i + 1] !== "object") {
      parameters[i + 1] = dir + parameters[i + 1];
    }
  }

  const openSSLProcess = spawn("openssl", parameters);

  openSSLProcess.stdout.on("data", (data) => {
    stdout.push(data);
  });

  openSSLProcess.stderr.on("data", (data) => {
    stderr.push(data);
  });

  return new Promise((resolve, reject) => {
    openSSLProcess.on("close", (code) => {
      console.log(`OpenSSL process ends with code ${code}`);
      resolve([stdout, stderr]);
    });
  });

  return openSSLProcess;
}
