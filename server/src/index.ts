import { Command } from "commander";
import { startServer } from "./server";
const program = new Command();
program.version("0.0.1");

program.option("-b, --bind <port>", "IP Address to bind to", "0.0.0.0");
program.option("-p, --port <port>", "TCP port to listen to", "3000");

program.parse(process.argv);

const options = program.opts();

startServer({
  protocol: "https",
  bind: options.bind,
  port: parseInt(options.port),
});
