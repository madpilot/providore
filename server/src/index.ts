#!/usr/bin/env node
import commander, { Command } from "commander";
import { load } from "./config";
import { startServer } from "./server";
import { resolve } from "path";
const program = new Command();
program.version("0.0.1");

program.option("-b, --bind <bind>", "IP Address to bind to");
program.option("-p, --port <port>", "TCP port to listen to");
program.option("--ssl <true|false>", "Enable SSL");
program.option(
  "--cert <path>",
  "Path to the TLS certificate. Required if SSL is enabled"
);
program.option(
  "--cert-key <path>",
  "Path to the TLS key. Required if SSL is enabled"
);
program.option("--cert-ca <path>", "Path to a TLS ca cert chain.");

program.option("-c, --config <path>", "Folder that stores device config files");
program.option("--firmware-store <path>", "Folder that stores device firmware");
program.option(
  "--certificate-store <path>",
  "Folder that stores device certificates"
);

async function bootstrap(options: commander.OptionValues) {
  const config = await load(options.config);
  const defaults = {
    protocol: "http",
    bind: "0.0.0.0",
    port: 3000,
  };

  if (typeof options.ssl !== "undefined") {
    config.protocol = options.ssl ? "https" : "http";
  }

  if (typeof options.cert !== "undefined") {
    config.sslCertPath = options.cert;
  }

  if (typeof options.certKey !== "undefined") {
    config.sslKeyPath = options.certKey;
  }

  if (typeof options.certCa !== "undefined") {
    config.caCertPath = options.certCa;
  }

  if (typeof options.certificateStore !== "undefined") {
    config.certificateStore = options.certificateStore;
  }

  if (typeof options.firmwareStore !== "undefined") {
    config.firmwareStore = options.firmwareStore;
  }

  if (config.sslCertPath) {
    config.sslCertPath = resolve(config.config, config.sslCertPath);
  }
  if (config.sslKeyPath) {
    config.sslKeyPath = resolve(config.config, config.sslKeyPath);
  }
  if (config.caCertPath) {
    config.caCertPath = resolve(config.config, config.caCertPath);
  }
  if (config.certificateStore) {
    config.certificateStore = resolve(config.config, config.certificateStore);
  }
  if (config.firmwareStore) {
    config.firmwareStore = resolve(config.config, config.firmwareStore);
  }

  startServer({
    ...defaults,
    ...config,
  });
}

program.parse(process.argv);
bootstrap(program.opts());
