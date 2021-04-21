import { readFile } from "fs/promises";
import { SyslogTransportOptions } from "winston-syslog";
import {
  ConsoleTransportOptions,
  FileTransportOptions,
} from "winston/lib/winston/transports";

export interface HTTPConfig {
  protocol: "http" | "https";
  bind: string;
  port: number;
  sslCertPath?: string | undefined;
  sslKeyPath?: string | undefined;
  caCertPath?: string | undefined;
}

export interface StoreConfig {
  configStore: string;
  deviceStore: string | undefined;
  firmwareStore?: string | undefined;
  certificateStore?: string | undefined;
}

export interface LoggerConfig {
  syslog?: SyslogTransportOptions;
  file?: FileTransportOptions;
  console?: ConsoleTransportOptions;
}

export interface Config extends StoreConfig {
  config: string;
  webserver: HTTPConfig;
  logging: LoggerConfig;
}

export async function load(config: string | undefined): Promise<Config> {
  const pathCascade = ["/etc/providore", `${process.env.HOME}/.providore`];
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
    } catch (e) {
      if (e.code !== "ENOENT") {
        throw new Error(`Unable to load the configuration file: ${e.message}`);
      }
    }
  }
  throw new Error("Configuration folder not found");
}
