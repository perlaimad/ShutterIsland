import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { env } from "../config/env.js";

const backupFile = process.argv[2];

if (!backupFile) {
  console.error("Usage: node src/scripts/db-restore.js <backup-file.sql>");
  process.exit(1);
}

const sql = readFileSync(backupFile, "utf-8");
const mysqlArgs = [
  `-h${env.db.host}`,
  `-P${env.db.port}`,
  `-u${env.db.user}`,
  `-p${env.db.password}`,
  env.db.name
];

const restoreResult = spawnSync("mysql", mysqlArgs, {
  input: sql,
  encoding: "utf-8",
  shell: false
});

if (restoreResult.error) {
  console.error("mysql execution failed:", restoreResult.error.message);
  process.exit(1);
}

if (restoreResult.status !== 0) {
  console.error("mysql restore failed:", restoreResult.stderr || "unknown error");
  process.exit(restoreResult.status ?? 1);
}

console.log(`Restore completed from ${backupFile}`);
