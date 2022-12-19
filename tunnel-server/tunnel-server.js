const http = require("http");
const { URL } = require("url");
const net = require("net");
var { portConfig } = require("../port-config.js");

// 启动端口
let port = portConfig.tunnelPort;
let httpTunnel = new http.Server();

// 启动隧道代理服务
httpTunnel.listen(port, () => {
  console.log("Tunnel Server is running on: https://localhost:%s", port);
});

// 监听connect请求
httpTunnel.on("connect", (req, clientSocket, head) => {
  var serverUrl = new URL(`http://${req.url}`);
  console.log(`CONNECT ${serverUrl.hostname}:${serverUrl.port}`);
  // 建立到服务端的TCP
  var serverSocket = net.connect(serverUrl.port, serverUrl.hostname, () => {
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
