/* jshint undef: true */
import HypertyDiscovery from 'service-framework/dist/HypertyDiscovery';
import {Syncher} from 'service-framework/dist/Syncher';
import {divideURL} from '../utils/utils';
import EventEmitter from '../utils/EventEmitter'; // for receiving
import obj from './obj';

class Sender extends EventEmitter{ // extends EventEmitter because we need to recieve events

  constructor(hypertyURL, bus, configuration) {
    if (!hypertyURL) throw new Error('The hypertyURL is a needed parameter');
    if (!bus) throw new Error('The MiniBus is a needed parameter');
    if (!configuration) throw new Error('The configuration is a needed parameter');
    super(); // call event emitter constructor to be able to receive things

    this._domain = divideURL(hypertyURL).domain;
    this._objectDescURL = 'hyperty-catalogue://' + this._domain + '/.well-known/dataschemas/FakeDataSchema';
    this._syncher = new Syncher(hypertyURL, bus, configuration);
    this.hypertyDiscovery = new HypertyDiscovery(hypertyURL, bus);
    this.constraints = {
      audio: false,
      video: true
    }
    this.pc = null;
    this.ice = false; // Do we already transmit ICE candidates?
    this.iceBuffer = [];
    
    // receiving starts here
    let _this = this;
    this._syncher.onNotification(function(event) {
      _this._onNotification(event);
    });
  }

  connect(hypertyURL) {
    let _this = this;
    let syncher = _this._syncher;

    return new Promise(function(resolve, reject) {
      syncher.create(_this._objectDescURL, [hypertyURL], obj)
      .then(function(objReporter) {
        console.info('1. Return Created Data Object Reporter', objReporter);
        _this.objReporter = objReporter;
        objReporter.onSubscription(function(event) {
          console.info('-------- Reporter received subscription request --------- \n');
          event.accept(); // All subscription requested are accepted
        });
        resolve(objReporter);
      })
      .catch(function(reason) {
        console.error(reason);
        reject(reason);
      });
    });
  }

  // send data to the other hyperty
  slide(data) {
    this.objReporter.data.slider = data;
    console.log("[Sender] [slide] objReporter: ", this.objReporter);
  }

  // reveicing starts here
  _onNotification(event) {
    let _this = this;
    console.info( 'Incoming event received on sender side: ', event);
    this.trigger('invitation', event.identity);
    event.ack(); // Acknowledge reporter about the Invitation was received
    
    // Subscribe to Object
    this._syncher.subscribe(this._objectDescURL, event.url)
    .then(function(objObserver) {
      console.info(objObserver);

      // // lets notify the App the subscription was accepted with the most updated version of Object
      // _this.trigger('slideback', objObserver.data);

      objObserver.onChange('slider', function(event) {
        console.info('message received:',event); // Object was changed
        _this.trigger('slideback', objObserver.data); // lets notify the App about the change
      });

      objObserver.onChange('webrtc', function(event) {
        console.info('webrtc message received:', event); // Object was changed
        _this.trigger('webrtcreceive', objObserver.data); // lets notify the App about the change
      });

    }).catch(function(reason) {
      console.error(reason);
    });
  }


  // WEBRTC FUNCTIONS HERE

  webrtcconnect(hypertyURL) {
    let _this = this;
    let syncher = _this._syncher;

    return new Promise(function(resolve, reject) {
      syncher.create(_this._objectDescURL, [hypertyURL], {})
      .then(function(webrtcReporter) {
        console.info('1. Return Created Data Object Reporter', webrtcReporter);
        _this.webrtcReporter = webrtcReporter;
        webrtcReporter.onSubscription(function(event) {
          console.info('-------- Receiver received subscription request --------- \n');
          event.accept(); // All subscription requested are accepted
          resolve(webrtcReporter);
        });
      })
      .catch(function(reason) {
        console.error(reason);
        reject(reason);
      });
    });
  }

  //Alice: invite a partner p (Bob) to a call
  invite(){
    var _this = this;
    this.createPC();

    navigator.mediaDevices.getUserMedia(this.constraints)
    .then(function(stream){
        document.getElementById('localVideo').srcObject = stream;
        _this.pc.addStream(stream);
        _this.pc.createOffer({
          offerToReceiveAudio: 1,
          offerToReceiveVideo: 1
        })
        .then(function(offer){
          _this.pc.setLocalDescription(new RTCSessionDescription(offer), function(){
            var msg = {
                type: 'invitation',
                offer: offer
            }
            _this.message(msg);
          })
        });
    });
  }

  //create a peer connection with its event handlers
  createPC() {
    var _this = this;
    this.pc = new RTCPeerConnection();
    //event handler for when remote stream is added to peer connection
    this.pc.onaddstream = function(obj){
      console.log('onaddstream', _this.pc);
      document.getElementById('remoteVideo').srcObject = obj.stream;
    }

    //event handler for when local ice candidate has been found
    this.pc.onicecandidate = function(e){
      var cand = e.candidate;
      if(!cand) return;
      if(!_this.ice)  _this.iceBuffer.push(cand);
      else            _this.sendIceCandidate(cand);
    }
  }

  //send Websocket message
  message(body){
    var msg = {
        type: 'message',
        body: body
    }
    console.log('sending', msg);
    this.webrtcReporter.data.webrtc = {msg : msg};
  }

  //Alice: handle accepted call from Bob
  handleAccepted(msg){
    var _this = this;
    var answer = msg.body.answer;
    console.log('received answer', answer);
    this.pc.setRemoteDescription(new RTCSessionDescription(answer), function(){
      var msg = {
          type: 'iceallowed'
      };
      _this.message(msg);
      _this.emptyIceBuffer(_this.iceBuffer);
    });
  }

  //send all ICE candidates from buffer to partner
  emptyIceBuffer(b){
    console.log("empütyicebuffer")
    this.ice = true;
    //send ice candidates from buffer
    for(var i = (b.length - 1); i >= 0; i--){
      console.log("icebuffer:", b)
      this.sendIceCandidate(b[i]);
      b.splice(i, 1);
    }
  }

  //send one ICE candidate to partner
  sendIceCandidate(cand){
    var msg = {
        type: 'icecandidate',
        candidate: cand
    }
    this.message(msg);
  }

  //handler for received ICE candidate from partner
  handleIceCandidate(msg){
    if (this.ice) {
      let data = {
        type: 'candidate',
        candidate: msg.body.candidate.candidate,
        sdpMid: msg.body.candidate.sdpMid,
        sdpMLineIndex: msg.body.candidate.sdpMLineIndex
      };
      console.log("icecandidateblubb: ", data)
      this.pc.addIceCandidate(new RTCIceCandidate({candidate: data.candidate}))
      .then((success)=>{console.log("handleIceCandidate success: ", success)})
      .catch((err)=>{console.log("handleIceCandidate err: ", err);});
    } else {
      console.log("ice not ready");
    }
  }

}

export default function activate(hypertyURL, bus, configuration) {
  return {
    name: 'SenderDTWebRTC',
    instance: new Sender(hypertyURL, bus, configuration)
  };
}