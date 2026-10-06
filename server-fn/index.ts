// Vercel serverless entry point for the Express API.
//
// Vercel doesn't run a persistent Node server -- it calls this file as a
// function per request. We build the same Express `app` used in local dev
// (server/index.ts) once per cold start, register all the /api routes on
// it, and hand it directly to Vercel's Node runtime, which knows how to
// drive an Express app as a request handler.
import "dotenv/config";
import express, { Response, NextFunction } from "express";
import type { Request } from "express";
import { registerRoutes } from "../server/routes";

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

// registerRoutes expects an httpServer argument for local dev parity, but
// never actually uses it to register anything -- serverless has no
// persistent server to pass, so this is only for the type signature.
let ready: Promise<unknown> | null = null;
function ensureRoutes() {
  if (!ready) {
    ready = registerRoutes(undefined as never, app);
  }
  return ready;
}

app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Internal Server Error:", err);
  if (res.headersSent) return next(err);
  return res.status(status).json({ message });
});

export default async function handler(req: Request, res: Response) {
  await ensureRoutes();
  app(req, res);
}
