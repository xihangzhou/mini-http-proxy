var http = require("http");
var {portConfig} = require("../port-config.js");
const { URL } = require("url");

const port = portConfig.httpServerPort;
function request(clientReq, clientRes) {
  //查看响应内容
  console.log(clientReq);

  // 解析客户端的url请求
  var u = new URL(clientReq.url);
  var options = {
    hostname: u.hostname,
    port: u.port || 80,
    path: u.pathname,
    method: clientReq.method,
    headers: clientReq.headers,
  };

  console.log(`httpRequest from ${u.hostname}`);

  // 代理服务器重新自己发送客户端要发送的请求
  var proxyReq = http
    .request(options, function (proxyRes) {
      // 增加响应头设置Cookie
      clientRes.setHeader("Set-Cookie", ["type=proxy"]);
      // 代理通过回调函数在拿到服务器的响应后重写客户端响应
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes);
    })
    .on("error", function () {
      clientRes.end();
    });
  clientReq.pipe(proxyReq);
}

//启动一个服务器开启request监听事件
http
  .createServer()
  .on("request", request)
  .listen(port, "0.0.0.0", function () {
    console.log("HTTP Server is running on: https://localhost:%s", port);
  });
