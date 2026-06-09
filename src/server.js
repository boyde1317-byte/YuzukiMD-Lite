import http from "http";

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`);

  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("🐋 Yuzuki MD is running");
});

server.listen(PORT, () => {
  console.log(`Health server listening on port ${PORT}`);
});

export default server;
