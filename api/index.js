// Vercel serverless entry point. Committed on purpose: Vercel only creates a
// function if it can see this file before the build runs. The real server
// code is bundled into api/_server.js by script/build-vercel.ts.
import handler from "./_server.js";

export default handler;
