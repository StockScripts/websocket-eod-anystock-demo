"use strict";

const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const fetch = require('node-fetch');
const papa = require('papaparse');

const app = express();
const server = http.Server(app);
const io = socketio(server);

/**
 * get historical data from EOD and send it to client
 * @param {*} socket socket.io client
 */
function eodHistoricalRequest(socket) {
  fetch('https://eodhistoricaldata.com/api/eod/EUR.FOREX?api_token=OeAFFmMliFG5orCUuwAKQ8l4WWFQ67YX&period=d')
    .then(res => res.text())
    .then(csv => papa.parse(csv, {header: true}).data)
    .then(data => {
      socket.emit('loadData', data);
    })
    .catch(err => console.log(err));
}


/** 
 * get real-time data from EOD and send it to client
 * @param {*} socket socket.io client
 */
function eodRealTimeRequest(socket) {
  fetch('https://eodhistoricaldata.com/api/real-time/EUR.FOREX?api_token=anychart-5b084a5bd99e75.54278180&fmt=json')
    .then(res => res.json())
    .then(data => socket.emit('realTimeData', data))
    .catch(err => console.log(err));
}


// set static directory for express app
app.use(express.static(path.join(__dirname, '/public')));

//on html request of root directory, run callback function
app.get('/', (req, res) => {
  //send html file named "index.html"
  res.sendFile(path.join(__dirname, '/public/index.html'));
});

// init data service on socket connection
io.on('connection', socket => {
  eodHistoricalRequest(socket);

  let realTimeDataInterval;

  // on timerStart event get real-time data from EOD and set interval for real-time data
  socket.on('timerStart', () => {
    eodRealTimeRequest(socket);
    realTimeDataInterval = setInterval(() => eodRealTimeRequest(socket), 60000);
  })

  // clear interval for real-time dat on socket client  disconnection
  socket.on('disconnect', () => {
    clearInterval(realTimeDataInterval)
  })
});


// Runs express server
server.listen(8081, function() {
  console.log('Example app is listening on port ' + 8081 + '!\n');
});
