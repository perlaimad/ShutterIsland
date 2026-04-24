import { env } from "../config/env.js";
import { pool } from "../config/db.js";

const run = async () => {
  try {
    const [rows] = await pool.query(
      "SELECT NOW() AS server_now, DATABASE() AS current_database, CURRENT_USER() AS db_user"
    );
    const info = rows[0];

    console.log("Database connection successful.");
    console.log(`Host: ${env.db.host}:${env.db.port}`);
    console.log(`Database: ${info.current_database}`);
    console.log(`User: ${info.db_user}`);
    console.log(`Server time: ${info.server_now}`);
    process.exit(0);
  } catch (error) {
    console.error("Database connection failed.");
    console.error(`Host: ${env.db.host}:${env.db.port}`);
    console.error(`Database: ${env.db.name}`);
    console.error(`User: ${env.db.user}`);
    console.error(`Reason: ${error.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

run();
