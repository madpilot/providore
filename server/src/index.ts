import { startServer } from "./server";

startServer({ protocol: "https", bind: "0.0.0.0", port: 3000 });
