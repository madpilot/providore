import { Command } from "commander";
import { startServer } from "./server";
const program = new Command();
program.version("0.0.1");

program.option("-b, --bind <bind>", "IP Address to bind to", "0.0.0.0");
program.option("-p, --port <port>", "TCP port to listen to", "3000");
program.option("--ssl <true|false>", "Enable SSL", false);
program.option(
  "--cert <path>",
  "Path to the TLS certificate. Required if SSL is enabled"
);
program.option(
  "--cert-key <path>",
  "Path to the TLS key. Required if SSL is enabled"
);
program.option("--cert-ca <path>", "Path to a TLS ca cert chain.");

program.parse(process.argv);

const options = program.opts();

startServer({
  protocol: options.ssl ? "https" : "http",
  bind: options.bind,
  port: parseInt(options.port),
  sslCertPath: options.cert,
  sslKeyPath: options.certKey,
  caCertPath: options.certCa,
});
