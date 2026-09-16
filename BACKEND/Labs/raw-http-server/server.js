const http = require("http");

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
} 
//3 routes 
const server = http.createServer(async(req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET" && req.url === "/health/live") {
    console.log("Health request handled");
    res.statusCode = 200;

    res.end(
      JSON.stringify({
        status: "ok",
      })
    );

    return;
  }

  if (req.method === "GET" && req.url === "/feed") {
    console.log("Feed request started");

await wait(5000);

console.log("Feed request finished");
    res.statusCode = 200;

    res.end(
      JSON.stringify({
        items: [
          {
            id: "post-1",
            text: "Hello from the raw Node server!",
          },
          {
            id: "post-2",
            text: "This is our first feed.",
          },
        ],
      })
    );

    return;
  }

  res.statusCode = 404;

  res.end(
    JSON.stringify({
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    })
  );
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});