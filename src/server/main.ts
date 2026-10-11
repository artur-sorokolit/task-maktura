import path from "node:path";
import express, { type Express } from "express";
import { createApp } from "./app";
import { DATABASE_PATH, IS_PRODUCTION, PORT } from "./config";
import { openDb } from "./db";

const CLIENT_DIR = path.resolve("dist/client");

const serveBuiltClient = async (app: Express): Promise<Express> =>
  app
    .use(express.static(CLIENT_DIR))
    .use((_req, res) => res.sendFile(path.join(CLIENT_DIR, "index.html")));

const serveClientThroughVite = async (app: Express): Promise<Express> => {
  const { createServer } = await import("vite");
  const vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
  return app.use(vite.middlewares);
};

const serveClient = IS_PRODUCTION ? serveBuiltClient : serveClientThroughVite;

const app = await serveClient(createApp({ db: openDb(DATABASE_PATH) }));

app.listen(PORT, () => {
  console.log(`Maktura follow-up list: http://localhost:${PORT} (database: ${DATABASE_PATH})`);
});
