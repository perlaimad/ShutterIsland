import { app } from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.port, () => {
  console.log(`Backend server listening on http://localhost:${env.port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${env.port} is already in use. Set PORT to another value or stop the running server.`);
    process.exit(1);
  }

  console.error("Backend server failed to start.", error);
  process.exit(1);
});
