import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const isRender = Boolean(process.env.RENDER);
const host = isRender ? "0.0.0.0" : "127.0.0.1";
const port = process.env.PORT || "3000";
const jsonServerBin = fileURLToPath(
  new URL("./node_modules/json-server/lib/bin.js", import.meta.url)
);

const server = spawn(
  process.execPath,
  [jsonServerBin, "--watch", "db.json", "--host", host, "--port", port],
  { stdio: "inherit" }
);

server.on("error", (error) => {
  console.error("Não foi possível iniciar o JSON Server:", error);
  process.exitCode = 1;
});

server.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
