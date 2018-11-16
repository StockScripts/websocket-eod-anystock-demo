var express = require('express');
var path = require('path');
const https = require('https');
const papa = require('papaparse');

//#region COnnect to EOD
//global respond variable
var globalRes;
var globablInterval = null;

function eodHistoricalRequest() {
  var data;
  //daily history
  https.get('https://eodhistoricaldata.com/api/eod/EUR.FOREX?api_token=OeAFFmMliFG5orCUuwAKQ8l4WWFQ67YX&period=d.', (resp) => {
    data = '';
    // A chunk of data has been recieved.
    resp.on('data', (chunk) => {
      data += chunk;
    });
    // The whole response has been received. Print out the result.
    resp.on('end', () => {
      data = papa.parse(data, {header: true}).data;
      sendDataToHost(globalRes, data);
    });
  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });

}

function eodRealTimeRequest() {
  var data;
  //1minute real-time ticker
  https.get('https://eodhistoricaldata.com/api/real-time/EUR.FOREX?api_token=anychart-5b084a5bd99e75.54278180&fmt=json', (resp) => {
    data = '';
    resp.on('data', (chunk) => {
      data += chunk;
    });
    resp.on('end', () => {
      sendDataToHost(globalRes, JSON.parse(data));
    });
  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });
}

//#endregion

//#region COMET
//creates COMET connection
function openStreamingToHost(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache'
  });
}

function sendDataToHost(res, data) {
  // console.log('send data');
  res.write('data: ' + JSON.stringify(data) + '\n\n');
}

//#endregion

//#region Express init
// Creates server instance
var app = express();
app.use(express.static(path.join(__dirname + '/public')));

//basic get request handler
app.get('/', function(req, res) { //on html request of root directory, run callback function
  res.sendFile(path.join(__dirname, '/public/index.html')); //send html file named "index.html"
});

//handler for get request to connect to EOD
app.get('/eod', function(req, res) {
  globalRes = res;
  openStreamingToHost(req, res);
  eodHistoricalRequest();
  eodRealTimeRequest();
  if (globablInterval)
    globablInterval = setInterval(eodRealTimeRequest, 60000);
});

// Runs express server
app.listen(8081, function() {
  console.log('Example app is listening on port ' + 8081 + '!\n');
});
//#endregion