var audioContext = null;
var meter = null;
var rafID = null;
var socket = io('http://localhost');

function createAudioMeter(audioContext, clipLevel, averaging, clipLag) {
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


window.onload = function() {

  window.AudioContext = window.AudioContext || window.webkitAudioContext;

  audioContext = new AudioContext();

  try {
    navigator.getUserMedia = 
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia;

    // ask for an audio input
    navigator.getUserMedia({
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

function gotStream(stream) {
  var mediaStreamSource = audioContext.createMediaStreamSource(stream);
  meter = createAudioMeter(audioContext);
  mediaStreamSource.connect(meter);
  sendAudioLevel();
}

function sendAudioLevel(time) {
  socket.emit('audio', { data: meter.volume });
  rafID = window.requestAnimationFrame(sendAudioLevel);
}
