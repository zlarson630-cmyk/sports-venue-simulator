import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../public/", import.meta.url);
const files = {
  "/": ["index.html", "text/html"],
  "/index.html": ["index.html", "text/html"],
  "/game.js": ["game.js", "text/javascript"],
  "/tutorial.js": ["tutorial.js", "text/javascript"],
  "/test/": ["test/index.html", "text/html"],
  "/test/index.html": ["test/index.html", "text/html"],
  "/test/ownership.html": ["test/ownership.html", "text/html"],
  "/test/ownership.js": ["test/ownership.js", "text/javascript"],
  "/test/park-link.js": ["test/park-link.js", "text/javascript"],
  "/styles.css": ["styles.css", "text/css"],
};
createServer(async (request, response) => {
  const file = files[new URL(request.url, "http://localhost").pathname];
  if (!file) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  try {
    response.writeHead(200, {
      "Content-Type": file[1] + "; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(await readFile(new URL(file[0], root)));
  } catch {
    response.writeHead(500);
    response.end("Unable to load game");
  }
}).listen(4173, "0.0.0.0", () => console.log("Play at http://localhost:4173"));
