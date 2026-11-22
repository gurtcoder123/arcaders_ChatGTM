import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import research from "./api/research.js";

const port = Number(process.env.PORT ?? 3000);
const staticFiles = new Map([
  ["/", ["index.html", "text/html"]],
  ["/app.js", ["app.js", "text/javascript"]],
  ["/examples.js", ["examples.js", "text/javascript"]],
  ["/styles.css", ["styles.css", "text/css"]]
]);

createServer(async (incoming, outgoing) => {
  const url = new URL(incoming.url, "http://localhost:" + port);
  if (url.pathname === "/api/research") {
    const abort = new AbortController();
    outgoing.on("close", () => abort.abort());
    try {
      const method = incoming.method;
      const options = { method, signal: abort.signal, headers: incoming.headers };
      if (method !== "GET" && method !== "HEAD") {
        options.body = Readable.toWeb(incoming);
        options.duplex = "half";
      }
      const response = await research.fetch(new Request(url, options));
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) await pipeline(Readable.fromWeb(response.body), outgoing);
      else outgoing.end();
    } catch (error) {
      if (abort.signal.aborted) return;
      console.error(error);
      if (!outgoing.headersSent) outgoing.writeHead(500);
      outgoing.end();
    }
    return;
  }

  const file = staticFiles.get(url.pathname);
  if (!file || !["GET", "HEAD"].includes(incoming.method)) {
    outgoing.writeHead(404).end("Not found");
    return;
  }
  try {
    const content = await readFile(new URL("./public/" + file[0], import.meta.url));
    outgoing.writeHead(200, { "Content-Type": file[1] + "; charset=utf-8" });
    outgoing.end(incoming.method === "HEAD" ? undefined : content);
  } catch {
    outgoing.writeHead(500).end("Could not load ChatGTM.");
  }
}).listen(port, "127.0.0.1", () => {
  console.log("ChatGTM is running at http://127.0.0.1:" + port);
});
