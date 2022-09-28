const { WebSocketServer } = require('ws');
const express = require('express');
const http = require('http');
const https = require('https');
const { PeerServer, ExpressPeerServer } = require('peer');
const { readFileSync } = require('fs');

const KEY = readFileSync('./key.pem');
const CERT = readFileSync('./cert.pem');

const app = express();
const server = https.createServer({
  key: KEY,
  cert: CERT
}, app);

app.use(express.static('static'));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/test', (_, res) => {
  res.send('I\'m working!');
});

server.listen(9000, () => {
  console.log("Started");
});

// // // WebSocket Server // // //

const wssHttps = https.createServer({
  key: KEY,
  cert: CERT,
}).listen(9001);
var wss = new WebSocketServer({ server: wssHttps });

function wssBroadcast(message) {
  for(let client of wss.clients) {
    client.send(message);
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    console.log(msg.toString());
  });
});

// // // PeerJS Server // // //

const peerClients = new Set();

const peerApp = express();

const peerHttp = https.createServer({
  key: KEY,
  cert: CERT
}, peerApp).listen(9002);

const peerServer = ExpressPeerServer(peerHttp, {
  path: '/peer',
  ssl: {
    key: KEY,
    cert: CERT,
  },
  debug: true,
});
peerApp.use('/', peerServer);

peerServer.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

peerServer.on('connection', (client) => {
  peerClients.add(client.getId());
  wssBroadcast([ ...peerClients ].toString());
  console.log("got client", client.getId());
});

peerServer.on("disconnect", (client) => {
  peerClients.delete(client.getId());
  wssBroadcast([ ...peerClients ].toString());
  console.log("lost client", client.getId());
});

// PIZDEC