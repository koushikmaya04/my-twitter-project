# Raw Node HTTP Request Lifecycle

## Overview

This lab demonstrates how a basic HTTP server works using Node.js core modules without using a framework such as NestJS.

The server uses Node's built-in `http` module and provides two required routes:

- `GET /health/live`
- `GET /feed`

Unknown routes return a JSON `404` response.

The purpose of this lab is to understand the basic HTTP request and response lifecycle before moving to the NestJS framework.

---

## 1. Starting the HTTP Server

The server imports Node's built-in `http` module:

```js
const http = require("http");
```

The `http` module provides the functionality required to create an HTTP server and handle HTTP requests and responses.

The server is created using:

```js
const server = http.createServer(async (req, res) => {
  // request handling
});
```

The callback receives two important objects:

- `req` — represents the incoming HTTP request.
- `res` — represents the outgoing HTTP response.

The server begins listening on port `3000` using:

```js
server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
```

Calling `server.listen()` starts the HTTP server and makes it listen for incoming connections on port `3000`.

The server remains running while it waits for incoming requests.

The process can be stopped manually with:

```text
Ctrl + C
```

---

## 2. Incoming HTTP Request

When the browser opens:

```text
http://localhost:3000/feed
```

it sends an HTTP request to the Node.js server.

Conceptually, the request contains information such as:

```text
Method: GET
Path: /feed
Host: localhost:3000
```

Node receives this request and passes it to the callback provided to `http.createServer()`.

The callback receives:

```js
(req, res)
```

where:

- `req` contains information about the request.
- `res` is used to construct and send the response.

---

## 3. URL and Method Parsing

Because this is a raw Node HTTP server, routing is performed manually.

The server checks both the HTTP method and URL:

```js
if (req.method === "GET" && req.url === "/feed") {
  // handle feed request
}
```

This means:

1. The request must use the `GET` method.
2. The requested path must be `/feed`.

If both conditions are true, the feed handler is executed.

Similarly, the health endpoint checks:

```js
if (req.method === "GET" && req.url === "/health/live") {
  // handle health request
}
```

For example, when the browser requests:

```text
GET /feed
```

the server sees:

```js
req.method === "GET"
req.url === "/feed"
```

The server then selects the matching route.

This is basic manual routing.

In NestJS, routing is abstracted using decorators such as:

```ts
@Get("feed")
```

The raw Node lab therefore helps demonstrate what is happening underneath a framework such as NestJS.

---

## 4. Handling the Health Request

For:

```text
GET /health/live
```

the server returns a successful HTTP status:

```js
res.statusCode = 200;
```

A status code of `200` indicates that the request was successfully handled.

The server sets the response content type:

```js
res.setHeader("Content-Type", "application/json");
```

This tells the client that the response body contains JSON.

The server then sends the response:

```js
res.end(
  JSON.stringify({
    status: "ok",
  })
);
```

The browser receives:

```json
{
  "status": "ok"
}
```

The `res.end()` call finishes the response.

---

## 5. Response Status Codes

HTTP status codes communicate the result of a request.

A successful request uses:

```js
res.statusCode = 200;
```

For an unknown route, the server uses:

```js
res.statusCode = 404;
```

A `404` means that the requested route was not found.

For example:

```text
GET /unknown
```

does not match any route and returns:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Route not found"
  }
}
```

The status code and response body are separate parts of the HTTP response.

The status code communicates the result at the HTTP level, while the JSON body provides additional information to the client.

---

## 6. Response Headers

The server sets the JSON response header using:

```js
res.setHeader("Content-Type", "application/json");
```

The `Content-Type` header tells the client how to interpret the response body.

In this lab, the response body is JSON, so the server specifies:

```text
Content-Type: application/json
```

The server sets the response headers before completing the response with:

```js
res.end(...)
```

This ensures that the client receives the correct response metadata.

---

## 7. Serializing the Response Body

JavaScript works with objects such as:

```js
{
  status: "ok"
}
```

However, the HTTP response body is sent as data.

The JavaScript object is therefore converted into a JSON string using:

```js
JSON.stringify(...)
```

For example:

```js
res.end(
  JSON.stringify({
    status: "ok",
  })
);
```

The JavaScript object:

```js
{
  status: "ok"
}
```

is converted into:

```text
{"status":"ok"}
```

The resulting string is passed to:

```js
res.end(...)
```

The process can be represented as:

```text
JavaScript Object
       |
       | JSON.stringify()
       v
JSON String
       |
       | res.end()
       v
HTTP Response Body
```

---

## 8. The Feed Endpoint

The server also provides:

```text
GET /feed
```

The endpoint returns a small static fixture list:

```json
{
  "items": [
    {
      "id": "post-1",
      "text": "Hello from the raw Node server!"
    },
    {
      "id": "post-2",
      "text": "This is our first feed."
    }
  ]
}
```

The raw HTTP lab uses a small static list because it is a learning exercise.

The complete Social Feed fixture data and API contract will be implemented later in the NestJS application.

---

## 9. Nonblocking Simulated Wait

The `/feed` route contains a simulated `200 ms` dependency wait.

The helper function is:

```js
function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
```

The feed handler uses:

```js
await wait(200);
```

This simulates a dependency that takes approximately `200 milliseconds` to respond.

Instead of calling a real external service, the lab uses a timer to simulate the delay.

The purpose is to demonstrate asynchronous waiting and how Node.js can continue handling other work while the timer is pending.

---

## 10. Why the Wait Is Nonblocking

The simulated wait uses:

```js
setTimeout()
```

inside a native Promise.

The server does not use a busy loop such as:

```js
while (...) {
  // keep CPU busy
}
```

A busy loop would keep the JavaScript thread occupied and prevent the server from handling other work.

Instead, `setTimeout()` schedules the continuation for later.

The `await` pauses the current asynchronous request handler while the timer is pending.

During this time, Node.js can continue processing other events.

Conceptually:

```text
/feed request
     |
     v
Start asynchronous timer
     |
     |  waiting...
     |
     +--------------------+
     |                    |
     v                    v
Node can handle       Other requests
other events
     |
     v
Timer completes
     |
     v
/feed continues
```

---

## 11. Demonstrating Concurrent Requests

The server logs before and after the simulated wait:

```js
console.log("Feed request started");

await wait(200);

console.log("Feed request finished");
```

The health endpoint logs:

```js
console.log("Health request handled");
```

During testing, the terminal produced:

```text
Server running at http://localhost:3000
Feed request started
Health request handled
Feed request finished
```

The order of these messages is important.

It demonstrates that:

1. The feed request started.
2. The feed request entered its asynchronous wait.
3. Node handled the health request while the feed request was waiting.
4. The feed request continued after the timer completed.

The lifecycle can be represented as:

```text
/feed
  |
  | Request starts
  v
Feed request started
  |
  v
Wait 200 ms asynchronously
  |
  |-----------------------------|
  |                             |
  |                        /health request
  |                             |
  |                        Health request handled
  |                             |
  |-----------------------------|
  |
  v
Feed request finished
```

This demonstrates that the simulated dependency wait does not block the server from handling another request.

---

## 12. Unknown Routes

If a request does not match any of the defined routes, the server returns a JSON `404`.

For example:

```text
GET /hello
```

does not match:

```text
GET /health/live
GET /feed
```

Therefore, the server executes the fallback response:

```js
res.statusCode = 404;

res.end(
  JSON.stringify({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  })
);
```

The client receives:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Route not found"
  }
}
```

This ensures that unknown routes receive a predictable JSON response.

---

## 13. Complete Request Lifecycle

The complete lifecycle of a normal request is:

```text
Browser
   |
   | HTTP Request
   | GET /feed
   v
Node HTTP Server
   |
   | req.method + req.url
   v
Manual Route Selection
   |
   v
Feed Handler
   |
   v
Simulated Asynchronous Wait
   |
   v
Create Response
   |
   v
Set Status Code
   |
   v
Set Content-Type Header
   |
   v
JSON.stringify()
   |
   v
res.end()
   |
   v
HTTP Response
   |
   v
Browser
```

For an unknown route:

```text
Browser
   |
   | GET /unknown
   v
Node HTTP Server
   |
   v
No Matching Route
   |
   v
404 Status
   |
   v
JSON Error Body
   |
   v
res.end()
   |
   v
Browser
```

---

## 14. What Keeps the Node Process Alive?

The server starts listening using:

```js
server.listen(3000);
```

The HTTP server creates a listening socket and waits for incoming connections.

Because the server is actively listening for requests, the Node.js process remains active.

The process can be stopped manually using:

```text
Ctrl + C
```

The relationship is:

```text
server.listen(3000)
       |
       v
HTTP server starts listening
       |
       v
Waits for incoming requests
       |
       v
Node process remains active
```

When the process is stopped, the server is no longer listening for new requests.

---

## 15. Request and Response Objects

The raw Node server exposes two important objects.

### Request object

The `req` object represents the incoming request.

Examples:

```js
req.method
req.url
```

These allow the server to determine what the client requested.

### Response object

The `res` object is used to construct the outgoing response.

Examples:

```js
res.statusCode = 200;
res.setHeader("Content-Type", "application/json");
res.end(...);
```

Together they represent the basic HTTP interaction:

```text
Client
  |
  | Request
  |-------> req
  |
  |         Node Server
  |
  |<------- res
  | Response
  |
Client
```

---

## 16. Route Handling Flow

The current server handles requests in the following order:

```text
Request received
      |
      v
Check HTTP method
      |
      v
Check URL
      |
      +----------------------+
      |                      |
      v                      v
GET /health/live         GET /feed
      |                      |
      v                      v
Return 200              Wait 200 ms
      |                      |
      v                      v
JSON response           Return feed
      |                      |
      +----------+-----------+
                 |
                 v
              Response
```

If neither route matches:

```text
Request received
      |
      v
No route matches
      |
      v
Set status 404
      |
      v
Return JSON error
```

---

## 17. Key Concepts Learned

| Concept | Node.js implementation |
|---|---|
| Create HTTP server | `http.createServer()` |
| Receive request | `req` |
| Read HTTP method | `req.method` |
| Read request URL | `req.url` |
| Set status code | `res.statusCode` |
| Set response header | `res.setHeader()` |
| Serialize JSON | `JSON.stringify()` |
| Send response | `res.end()` |
| Keep server listening | `server.listen()` |
| Simulate async waiting | `setTimeout()` + native Promise |
| Handle unknown route | HTTP `404` |

---

## 18. Why This Lab Comes Before NestJS

The raw Node HTTP server is a learning artifact rather than the final Social Feed API.

It demonstrates the basic HTTP request and response lifecycle manually.

The next stage uses NestJS to organize these responsibilities into separate application layers.

The intended NestJS flow is:

```text
HTTP Request
     |
     v
Controller
     |
     v
Service
     |
     v
Repository
     |
     v
Fixture Data
```

The raw Node lab makes these NestJS abstractions easier to understand because the underlying HTTP request and response behavior has already been implemented manually.

---

## 19. Relation to the Social Feed Backend

The raw HTTP lab is intentionally small.

Its purpose is not to implement the entire Social Feed API.

The later NestJS application will provide the required Stage A endpoints:

```text
GET /health/live
GET /feed
GET /posts/{id}
GET /users/{id}
```

The NestJS application will also introduce:

- Controllers
- Services
- Repository abstraction
- Fixture data
- Request validation
- Cursor pagination
- Request IDs
- Predictable error responses
- Tests

The raw HTTP server provides the foundation for understanding how an HTTP request reaches those higher-level components.

---

## 20. Conclusion

The Raw Node HTTP Lab demonstrates the fundamental pieces of an HTTP server:

- Receiving an HTTP request.
- Reading the request method.
- Reading the request URL.
- Selecting a route.
- Setting HTTP status codes.
- Setting response headers.
- Serializing JavaScript objects into JSON.
- Sending HTTP responses.
- Handling unknown routes.
- Keeping a server alive with `server.listen()`.
- Performing a nonblocking simulated dependency wait.
- Handling another request while one request is waiting.

The main lesson is that an HTTP server receives a request, determines which code should handle it, creates an appropriate response, and sends that response back to the client.

The next step is to apply these concepts using NestJS and introduce the Controller → Service → Repository structure required by PRD 1.
