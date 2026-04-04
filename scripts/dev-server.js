const fs = require("fs");
const path = require("path");
const net = require("net");
const { startServer } = require("next/dist/server/lib/start-server");

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST;
const shouldClearCache = process.env.DEV_CLEAR_CACHE === "1";

if (!Number.isInteger(port) || port <= 0) {
  console.error(`Invalid PORT value: "${process.env.PORT}"`);
  process.exit(1);
}

function checkPortAvailable(portToCheck, hostToCheck) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(portToCheck, hostToCheck || "0.0.0.0");
  });
}

async function main() {
  const available = await checkPortAvailable(port, host);
  if (!available) {
    console.error(
      `Port ${port} is already in use. Stop the existing dev server first, then run this command again.`
    );
    process.exit(1);
  }

  if (shouldClearCache) {
    const distDir = path.join(process.cwd(), ".next");
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  startServer({
    dir: process.cwd(),
    port,
    allowRetry: false,
    isDev: true,
    hostname: host || undefined,
    isExperimentalTestProxy: false,
  }).catch((error) => {
    console.error("Failed to start Next dev server:", error);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error("Failed to prepare dev server:", error);
  process.exit(1);
});
