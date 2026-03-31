"use strict";

const path = require("path");
const pino = require("pino");
const { cleanupOldLogs } = require("./utils/logCleanup.js");

const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const LOG_BASE_DIR = process.env.LOG_BASE_DIR || "logs";
const RETENTION_DAYS = 90;
const isDev = process.env.NODE_ENV !== "production";

function getLogFileDir() {
  const d = new Date();
  const year = String(d.getFullYear());
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return path.join(LOG_BASE_DIR, year, month, "app");
}

async function createLogger() {
  cleanupOldLogs(LOG_BASE_DIR, RETENTION_DAYS);

  const fileOption = {
    file: getLogFileDir(),
    frequency: "daily",
    mkdir: true,
    extension: ".log",
    dateFormat: "dd",
    limit: { count: 89 },
  };

  const rollStream = await pino.transport({
    target: "pino-roll",
    options: fileOption,
  });

  const streams = [{ stream: rollStream, level: LOG_LEVEL }];

  if (isDev) {
    try {
      streams.push({
        stream: require("pino-pretty")({ colorize: true }),
        level: LOG_LEVEL,
      });
    } catch {
      streams.push({ stream: process.stdout, level: LOG_LEVEL });
    }
  } else {
    streams.push({ stream: process.stdout, level: LOG_LEVEL });
  }

  return pino({ level: LOG_LEVEL }, pino.multistream(streams));
}

const loggerPromise = createLogger();

module.exports = loggerPromise;
