var app = require('http').createServer(handler),
    io = require('socket.io')(app),
    fs = require('fs'),
    SerialPort = require('serialport').SerialPort,
    serialPort = new SerialPort("/dev/tty.usbmodem1411", { baudrate: 9600 });

// this is the worst http server ever. it will serve any file asked for,
// including the source of files outside its own root dir.
// dont put this online.
function handler (req, res) {
  var filename;
  if (req.url === "/") {
    filename = "/index.html";
    res.writeHead(200, { 'Content-Type': 'text/html' });
  } else {
    filename = req.url;
  }
  fs.readFile(__dirname + filename, function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading ' + filename);
    }
    res.end(data);
  });
}

var listening = true;

serialPort.on("open", function () {
  console.log('open');
  app.listen(8080);
  io.on('connection', function (socket) {
    socket.on('audio', function(data) {
      if (listening) {
        var command = parseInt(data.data * 250, 10) + "s";
        console.log(command);
        serialPort.write(command, function(err, results) {
          if (err) { console.log('err ' + err); }
          // console.log('results ' + results);
        });
        listening = false;
        setTimeout(function(){
          listening = true;
        }, 100);
      }
    });
  });
  // serialPort.on('data', function(data) {
  //   console.log('data received: ' + data);
  // });
});


