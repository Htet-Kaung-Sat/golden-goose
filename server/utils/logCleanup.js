"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Remove log folders (YYYY/MM) under baseDir that are older than maxAgeDays.
 * Used to enforce 90-day retention when logs are organized by month.
 * @param {string} baseDir - Base logs directory (e.g. "logs")
 * @param {number} maxAgeDays - Delete folders whose last day of month is older than this many days
 */
function cleanupOldLogs(baseDir, maxAgeDays) {
  const cutoffMs = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  if (!fs.existsSync(baseDir)) return;
  const years = fs.readdirSync(baseDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const yearDir of years) {
    const yearPath = path.join(baseDir, yearDir.name);
    const months = fs.readdirSync(yearPath, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const monthDir of months) {
      const year = parseInt(yearDir.name, 10);
      const month = parseInt(monthDir.name, 10);
      if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) continue;
      const lastDayOfMonth = new Date(year, month, 0);
      if (lastDayOfMonth.getTime() < cutoffMs) {
        const folderPath = path.join(yearPath, monthDir.name);
        try {
          fs.rmSync(folderPath, { recursive: true });
        } catch (err) {
          // Log to console only; logger may not be ready
          console.error(`Log cleanup: failed to remove ${folderPath}:`, err.message);
        }
      }
    }
    const yearPathContents = fs.readdirSync(yearPath);
    if (yearPathContents.length === 0) {
      try {
        fs.rmdirSync(yearPath);
      } catch (err) {
        console.error(`Log cleanup: failed to remove empty year dir ${yearPath}:`, err.message);
      }
    }
  }
}

module.exports = { cleanupOldLogs };
