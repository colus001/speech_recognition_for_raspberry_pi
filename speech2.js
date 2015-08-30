// Don't forget to run export AUDIODEV='hw:1,0' && export AUDIODRIVER='alsa'

var BUTTONS = {
  RECORD: 18,
  NEXT: 19,
  PREV: 20,
  OK: 21
};

var GPIO = require('node-pi-gpio');
var Promise = require('es6-promise').Promise;
var Speakable = require('./');
var DDPClient = require('ddp');

var speakable = new Speakable({ key: 'AIzaSyDOJE7TY2p4SwpluK8ojaoXuDG_0mUim0c' }, { threshold: '5%' });

var recordButton = new GPIO(BUTTONS.RECORD, 'in', 'both');
var isStarted = false;

var ddpclient = new DDPClient({
  useSockJs: true
});

console.log('Starting the app...');

ddpclient.connect(function(error, wasReconnect) {
  if (error) console.log ('error ddp connection:', error);

  Promise
    .all([GPIO.open(BUTTONS.RECORD, 'in')]).then(function(res) {
      var button = res[0];
      return button.on('change', function(state) {
        if ( state == 1 && !isStarted ) {
          console.log('recordVoice');
          isStarted = true;
          speakable.recordVoice();
        }
      });
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
