import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { env } from "../config/env.js";

const backupFile = process.argv[2];

if (!backupFile) {
  console.error("Usage: node src/scripts/db-backup.js <backup-file.sql>");
  process.exit(1);
}

const commandArgs = [
  `-h${env.db.host}`,
  `-P${env.db.port}`,
  `-u${env.db.user}`,
  `-p${env.db.password}`,
  "--single-transaction",
  "--routines",
  "--events",
  env.db.name
];

const backupResult = spawnSync("mysqldump", commandArgs, {
  encoding: "utf-8",
  shell: false
});

if (backupResult.error) {
  console.error("mysqldump execution failed:", backupResult.error.message);
  process.exit(1);
}

if (backupResult.status !== 0) {
  console.error("mysqldump failed:", backupResult.stderr || "unknown error");
  process.exit(backupResult.status ?? 1);
}

writeFileSync(backupFile, backupResult.stdout, "utf-8");
console.log(`Backup created at ${backupFile}`);
