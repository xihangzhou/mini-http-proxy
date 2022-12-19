const http = require("http");
const { URL } = require("url");
const net = require("net");
var https = require("https");
var fs = require("fs");
var path = require('path');
var { portConfig } = require("../port-config.js");

let tunnelPort = portConfig.httpsProxyPort; // 启动隧道的端口
let httpsPort = portConfig.httpsServerPort; // 启动HTTPS代理服务的端口

//根据项目的路径导入生成的证书文件
var privateKey = fs.readFileSync(path.join(__dirname, "../private.pem"));
var certificate = fs.readFileSync(path.join(__dirname, "../public.crt"));
var credentials = { key: privateKey, cert: certificate };

// 建立代理服务器
let httpTunnel = new http.Server();
var httpsServer = https.createServer(credentials);

// 启动代理服务
httpTunnel.listen(tunnelPort, () => {
  console.log(`http tunnel server is running on ths port of ${tunnelPort}`);
});
httpsServer.listen(httpsPort, () => {
  console.log(`https server is running on ths port of ${httpsPort}`);
});
 
// 监听connect请求
httpTunnel.on("connect", (req, clientSocket, head) => {
  var serverUrl = new URL(`http://${req.url}`);
  console.log(`CONNECT ${serverUrl.hostname}:${serverUrl.port}`);
  // 建立到HTTPS代理服务端的TCP
  var serverSocket = net.connect(httpsPort, "127.0.0.1", () => {
    clientSocket.write(
      "HTTP/1.1 200 Connection Established\r\n" +
        "Proxy-agent: MITM-proxy\r\n" +
        "\r\n"
    );
    serverSocket.write(head);
    // 转发数据
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });
  serverSocket.on("error", (e) => {
    console.error(e);
  });
});

// HTTPS代理服务端监听转发请求
httpsServer.on("request", (clientReq, clientRes) => {
  // 解析客户端请求
  var options = {
    hostname: clientReq.headers.host,
    method: clientReq.method,
    headers: clientReq.headers,
    path:clientReq.url
  };

  // 再重新发送请求到真实的服务器
  var proxyReq = https
    .request(options, function (proxyRes) {
      // 转发请求
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes);
    })
    .on("error", function (e) {
      clientRes.end();
    });
  clientReq.pipe(proxyReq);
});
