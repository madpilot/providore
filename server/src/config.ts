import { readFile } from "fs/promises";

export interface HTTPConfig {
  protocol: "http" | "https";
  bind: string;
  port: number;
  sslCertPath?: string | undefined;
  sslKeyPath?: string | undefined;
  caCertPath?: string | undefined;
}

export interface StoreConfig {
  config: string;
  firmwareStore?: string | undefined;
  certificateStore?: string | undefined;
}

export type Config = HTTPConfig & StoreConfig;

export async function load(config: string | undefined): Promise<Config> {
  const pathCascade = ["/etc/providor", `${process.env.HOME}/.providor`];
  if (config) {
    pathCascade.unshift(config);
  }
  while (pathCascade.length > 0) {
    try {
      const path = pathCascade.shift();
      const data = await readFile(`${path}/config.json`, {
        encoding: "utf-8",
      });
      return { ...JSON.parse(data), config: path };
    } catch (e) {}
  }
  throw new Error("Configuration folder not found");
}
