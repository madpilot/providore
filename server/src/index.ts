import express, { Request } from "express";
import { Devices, hmacAuthorization } from "./middleware/hmac";
import { readFile, readFileSync } from "fs";

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
});

app.get("/firmware.bin", (_req, res) => {
  res.send("firmware.bin");
});

app.listen(port, () => {
  console.log(`Server listening at ${protocol}://${server}:${port}`);
});
