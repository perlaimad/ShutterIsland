import mysql from "mysql2/promise";
import { env } from "./env.js";

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: env.db.ssl ? {} : undefined
});

export const pingDatabase = async () => {
  const [rows] = await pool.query("SELECT NOW() AS now");
  return rows[0];
};
