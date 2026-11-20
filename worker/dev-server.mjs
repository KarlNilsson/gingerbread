// Local stand-in for the Cloudflare Worker, for testing without deploying.
// Usage: node worker/dev-server.mjs   → http://localhost:8787
import http from "node:http";
import worker from "./worker.js";

const PORT = process.env.PORT || 8787;

http
  .createServer(async (req, res) => {
    const response = await worker.fetch(
      new Request(`http://localhost:${PORT}${req.url}`, { method: req.method })
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  })
  .listen(PORT, () => console.log(`Proxy running on http://localhost:${PORT}`));
