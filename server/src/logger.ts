import winston from "winston";

export const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
      silent: process.env.NODE_ENV === "test",
    }),
  ],
});
