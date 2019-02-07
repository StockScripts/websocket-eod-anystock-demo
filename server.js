const express = require('express');
const app = express();
const path = require('path');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fetch = require('node-fetch');
const papa = require('papaparse');

function eodHistoricalRequest(socket) {
  fetch('https://eodhistoricaldata.com/api/eod/EUR.FOREX?api_token=OeAFFmMliFG5orCUuwAKQ8l4WWFQ67YX&period=d')
    .then(res => res.text())
    .then(csv => {
      return papa.parse(csv, {header: true}).data;
    })
    .then(data => {
      socket.emit('loadData', data);
    })
    .catch(err => console.log(err));
}

function eodRealTimeRequest(socket) {
  fetch('https://eodhistoricaldata.com/api/real-time/EUR.FOREX?api_token=anychart-5b084a5bd99e75.54278180&fmt=json')
    .then(res => res.json())
    .then(data => {
      socket.emit('realTimeData', data);
    })
    .catch(err => console.log(err));
}

app.use(express.static(path.join(__dirname + '/public')));

//basic get request handler
app.get('/', function(req, res) { //on html request of root directory, run callback function
  res.sendFile(path.join(__dirname, '/public/index.html')); //send html file named "index.html"
});


io.on('connection', function(socket) {
  console.log('a user connected');
  eodHistoricalRequest(socket);
  socket.on('timerStart', () => {
    eodRealTimeRequest(socket);
    setInterval(() => eodRealTimeRequest(socket), 60000);
  })
});

// Runs express server
http.listen(8081, function() {
  console.log('Example app is listening on port ' + 8081 + '!\n');
});