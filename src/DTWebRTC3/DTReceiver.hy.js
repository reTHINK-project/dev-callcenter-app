/* jshint undef: true */
import {Syncher} from 'service-framework/dist/Syncher';
import {divideURL} from '../utils/utils';
import EventEmitter from '../utils/EventEmitter';
import obj from './obj';
import config from  './stunTurnserverConfig'

class Receiver extends EventEmitter {

  constructor(hypertyURL, bus, configuration) {
    if (!hypertyURL) throw new Error('The hypertyURL is a needed parameter');
    if (!bus) throw new Error('The MiniBus is a needed parameter');
    if (!configuration) throw new Error('The configuration is a needed parameter');
    super();

    this._domain = divideURL(hypertyURL).domain;
    this._objectDescURL = 'hyperty-catalogue://' + this._domain + '/.well-known/dataschemas/FakeDataSchema';
    this._syncher = new Syncher(hypertyURL, bus, configuration);
    this.constraints = {
      audio: false,
      video: true
    }
    this.myUrl = null; // this.me = null;
    this.partner = null;
    this.pc = null;
    this.ice = false;
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
      syncher.create(_this._objectDescURL, [hypertyURL], {})
      .then(function(webrtcReporter) {
        console.info('1. Return Created WebRTC Object Reporter', webrtcReporter);
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

  
  // send data to the other hyperty
  slideback(data) {
    this.objReporter.data.slider = data;
    console.log("[Receiver] [slideback] objReporter: ", this.objReporter);
  }

  // reveicing starts here
  _onNotification(event) {
    let _this = this;
    console.info( 'Event Received: ', event);
    this.trigger('invitation', event.identity);
    event.ack(); // Acknowledge reporter about the Invitation was received

    // Subscribe to Object
    this._syncher.subscribe(this._objectDescURL, event.url)
    .then(function(objObserver) {
      console.info("[_onNotification] objObserver ", objObserver);

      // // lets notify the App the subscription was accepted with the most updated version of Object
      // _this.trigger('slide', objObserver.data);
      objObserver.onChange('*', function(event) {
        console.log("ANY EVENT RECEIVED!", event);
      });

      objObserver.onChange('slider', function(event) {
        console.info('message received:', event); // Object was changed
        _this.trigger('slide', objObserver.data); // lets notify the App about the change
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

  //create a peer connection with its event handlers
  createPC() {

    var _this = this;
    this.pc = new RTCPeerConnection({'iceServers': config.ice});
    //event handler for when remote stream is added to peer connection
    this.pc.onaddstream = function(obj){
      console.log('onaddstream', _this.pc);
      document.getElementById('remoteVideo').srcObject = obj.stream;
    }

    //event handler for when local ice candidate has been found
    this.pc.onicecandidate = function(e){
      if (!e.candidate) return;
      // console.log("ICE: ", e.candidate);
      if (!_this.ice) _this.iceBuffer.push(e.candidate);
      else            _this.sendIceCandidate(e.candidate);
    }
  }

  //send all ICE candidates from buffer to partner
  emptyIceBuffer(){
    console.log("icebuffer: ", this.iceBuffer);
    //send ice candidates from buffer
    if (this.iceBuffer && this.iceBuffer.length) this.rek(this);
  }

  rek(that){
    // give the syncer time to sync or it will fail
    setTimeout(function() {
      if (that.iceBuffer.length>0) {
        console.log("iceBuffer[0]: ", that.iceBuffer[0]);
        that.sendIceCandidate(that.iceBuffer[0]);
        that.iceBuffer.splice(0, 1);
        that.rek(that);
      } else {
        console.log("that.iceBuffer.length: ", that.iceBuffer.length);
      }
    }, 1);
  }

  //send one ICE candidate to partner
  sendIceCandidate(c){
    this.message({
        type: 'icecandidate',
        candidate: c
    });
  }

  //handler for received ICE candidate from partner
  handleIceCandidate(msg){
    if (!msg.body.hasOwnProperty('candidate')) return; // doublecheck also on reciever side
    this.pc.addIceCandidate(new RTCIceCandidate(msg.body.candidate))
    .then((success)=>{console.log("handleIceCandidate success: ", success)})
    .catch((err)   =>{console.log("handleIceCandidate err: "    , err)});
  }

  //Bob: handle incoming invite from Alice
  handleInvite(msg, partner){
    var _this = this;
    this.partner = partner;
    console.log('got invite');
    // uncommented for testing purposes
    // if(!confirm('Incoming call. Answer?')) return;
    this.createPC();
    var offer = msg.body.offer;
    console.log('received offer: ', offer);
    
    navigator.mediaDevices.getUserMedia(this.constraints)
    .then(function(stream){
      document.getElementById('localVideo').srcObject = stream;
      _this.pc.addStream(stream);
      _this.pc.setRemoteDescription(new RTCSessionDescription(offer), function(){
        _this.pc.createAnswer()
        .then(function(answer){
          _this.pc.setLocalDescription(new RTCSessionDescription(answer), function(){
            _this.connect(partner)
            .then((objReporter)=>{
              console.log("objReporter present, sending msg answer");
              _this.message({
                type: 'accepted',
                answer: answer
              });
            });
          });
        });
      });
    });
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

  iceallowed(){
    console.log("ICE IS ALLOWED NOW")
    this.ice=true;
    this.emptyIceBuffer();
  }

}

export default function activate(hypertyURL, bus, configuration) {
  return {
    name: 'ReceiverDTWebRTC',
    instance: new Receiver(hypertyURL, bus, configuration)
  };
}


  