// Don't forget to run export AUDIODEV='hw:1,0' && export AUDIODRIVER='alsa'

var BUTTONS = {
  RECORD: 19,
  LEFT: 26,
  RIGHT: 20,
  OK: 21
};

var GPIO = require('node-pi-gpio');
var Promise = require('es6-promise').Promise;
var Speakable = require('./');
var DDPClient = require('ddp');
var WebSocket = require('ws');
var ws = new WebSocket('ws://192.168.0.69:9090');

var speakable = new Speakable({ key: 'AIzaSyDOJE7TY2p4SwpluK8ojaoXuDG_0mUim0c' }, { threshold: '5%' });

var recordButton = new GPIO(BUTTONS.RECORD, 'in', 'both');
var isStarted = false;

var ddpclient = new DDPClient({
  useSockJs: true
});

console.log('Starting the app...');

function _sendMessage (message) {
  console.log('sending...:', message);
  setTimeout(function timeout() {
    ws.send(message)
  }, 500);
}

ws.on('open', function () {
  _sendMessage('ready');
})

ddpclient.connect(function(error, wasReconnect) {
  if (error) console.log ('error ddp connection:', error);

  var buttons = [
    GPIO.open(BUTTONS.RECORD, 'in'),
    GPIO.open(BUTTONS.LEFT, 'in'),
    GPIO.open(BUTTONS.RIGHT, 'in'),
    GPIO.open(BUTTONS.OK, 'in'),
  ];

  Promise
    .all(buttons).then(function(res) {
      var recordButton = res[0], leftButton = res[1], rightButton = res[2], okButton = res[3];

      recordButton.on('change', function(state) {
        if ( state == 1 && !isStarted ) {
          console.log('recordVoice');
          isStarted = true;
          speakable.recordVoice();
        }
      });

      leftButton.on('change', function (state) {
        if ( state == 1 ) {
          _sendMessage('left');
        }
      });

      rightButton.on('change', function (state) {
        if ( state == 1 ) {
          _sendMessage('right');
        }
      });

      okButton.on('change', function (state) {
        if ( state == 1 ) {
          _sendMessage('okay');
        }
      });
      return;
    })["catch"](function(err) {
      return console.log('err', err.stack);
    });

  speakable.on('speechStart', function() {
    console.log('onSpeechStart');
  });

  speakable.on('speechStop', function() {
    console.log('onSpeechStop');
  });

  speakable.on('speechReady', function() {
    console.log('onSpeechReady');
  });

  speakable.on('error', function(err) {
    console.log('onError:', err);
    isStarted = false;
  });

  speakable.on('speechResult', function(recognizedWords) {
    console.log('onSpeechResult:', recognizedWords)
    _sendWords(recognizedWords);
    isStarted = false;
  });

  function _sendWords (words) {
    message = words.join().replace(/,/, " ");
    console.log('sending message:', message);
    ddpclient.call('newQuery', [message], function (err, result) {
      if (err) console.log('newQuery error:', err);
      console.log('called function, result: ' + result);
    });
    // RTGif.insert(giphyFilter(result.data, size));
  }

});
