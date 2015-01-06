var app = require('http').createServer(handler),
    io = require('socket.io')(app),
    fs = require('fs'),
    SerialPort = require('serialport').SerialPort,
    serialPort = new SerialPort("/dev/tty.usbmodem1411", { baudrate: 19200 });

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

function mapValue(x, in_min, in_max, out_min, out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

var listening = true;
var jawAngle = 0;

serialPort.on("open", function () {
  console.log('open');
  app.listen(8080);
  io.on('connection', function (socket) {
    socket.on('audio', function(data) {
      if (listening) {
        var value = Math.floor(mapValue(data.data, 0, 1, 40, 20));
        if (jawAngle !== value) {
          jawAngle = value;
          console.log(data.data, value);
          serialPort.write(value + "s", function(err) {
            if (err) { console.log('err ' + err); }
          });
          listening = false;
          setTimeout(function(){ listening = true; }, 20);
        }
      }
    });
  });
  // serialPort.on('data', function(data) {
  //   console.log('data received: ' + data);
  // });
});


