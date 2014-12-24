function createAudioMeter(audioContext,clipLevel,averaging,clipLag) {
  var processor = audioContext.createScriptProcessor(512);
  processor.onaudioprocess = volumeAudioProcess;
  processor.clipping = false;
  processor.lastClip = 0;
  processor.volume = 0;
  processor.clipLevel = clipLevel || 0.98;
  processor.averaging = averaging || 0.95;
  processor.clipLag = clipLag || 750;

  // this will have no effect, since we don't copy the input to the output,
  // but works around a current Chrome bug.
  processor.connect(audioContext.destination);

  processor.checkClipping = function(){
    if (!this.clipping)
      return false;
    if ((this.lastClip + this.clipLag) < window.performance.now())
      this.clipping = false;
    return this.clipping;
  };

  processor.shutdown = function(){
    this.disconnect();
    this.onaudioprocess = null;
  };

  return processor;
}

function volumeAudioProcess( event ) {
  var buf = event.inputBuffer.getChannelData(0);
  var bufLength = buf.length;
  var sum = 0;
  var x;

  // Do a root-mean-square on the samples: sum up the squares...
  for (var i=0; i<bufLength; i++) {
    x = buf[i];
    if (Math.abs(x)>=this.clipLevel) {
      this.clipping = true;
      this.lastClip = window.performance.now();
    }
    sum += x * x;
  }

  var rms =  Math.sqrt(sum / bufLength);
  this.volume = Math.max(rms, this.volume*this.averaging);
}

var audioContext = null;
var meter = null;
var canvasContext = null;
var WIDTH=500;
var HEIGHT=50;
var rafID = null;

window.onload = function() {

  // grab our canvas
  // canvasContext = document.getElementById( "meter" ).getContext("2d");

  // monkeypatch Web Audio
  window.AudioContext = window.AudioContext || window.webkitAudioContext;

  // grab an audio context
  audioContext = new AudioContext();

  // Attempt to get audio input
  try {
    // monkeypatch getUserMedia
    navigator.getUserMedia = 
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia;

    // ask for an audio input
    navigator.getUserMedia(
      {
      "audio": {
        "mandatory": {
          "googEchoCancellation": "false",
          "googAutoGainControl": "false",
          "googNoiseSuppression": "false",
          "googHighpassFilter": "false"
        },
        "optional": []
      },
    }, gotStream, didntGetStream);
  } catch (e) {
    alert('getUserMedia threw exception :' + e);
  }

};


function didntGetStream() {
  alert('Stream generation failed.');
}

var socket = io('http://localhost');

function gotStream(stream) {
  // Create an AudioNode from the stream.
  var mediaStreamSource = audioContext.createMediaStreamSource(stream);

  // Create a new volume meter and connect it.
  meter = createAudioMeter(audioContext);
  mediaStreamSource.connect(meter);

  // kick off the visual updating
  sendAudioLevel();
}

function sendAudioLevel(time) {
  // clear the background
  // canvasContext.clearRect(0,0,WIDTH,HEIGHT);

  // check if we're currently clipping
  // if (meter.checkClipping())
  //   canvasContext.fillStyle = "red";
  // else
  //   canvasContext.fillStyle = "green";

  // draw a bar based on the current volume
  // canvasContext.fillRect(0, 0, meter.volume*WIDTH*1.4, HEIGHT);
  
  socket.emit('audio', { data: meter.volume });

  // set up the next visual callback
  rafID = window.requestAnimationFrame(sendAudioLevel);
}
