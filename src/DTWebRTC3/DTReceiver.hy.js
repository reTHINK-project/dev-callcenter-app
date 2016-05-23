/* jshint undef: true */
import {Syncher} from 'service-framework/dist/Syncher';
import {divideURL} from '../utils/utils';
import EventEmitter from '../utils/EventEmitter';
import obj from './obj';

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
      syncher.create(_this._objectDescURL, [hypertyURL], obj)
      .then(function(objReporter) {
        console.info('1. Return Created Data Object Reporter', objReporter);
        _this.objReporter = objReporter;
        objReporter.onSubscription(function(event) {
          console.info('-------- Receiver received subscription request --------- \n');
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

  webrtcconnect(hypertyURL) {
    let _this = this;
    let syncher = _this._syncher;

    return new Promise(function(resolve, reject) {
      syncher.create(_this._objectDescURL, [hypertyURL], obj)
      .then(function(webrtcReporter) {
        console.info('1. Return Created Data Object Reporter', webrtcReporter);
        _this.webrtcReporter = webrtcReporter;
        webrtcReporter.onSubscription(function(event) {
          console.info('-------- Receiver received subscription request --------- \n');
          event.accept(); // All subscription requested are accepted
        });
        resolve(webrtcReporter);
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
      console.info(objObserver);

      // lets notify the App the subscription was accepted with the most updated version of Object
      _this.trigger('slide', objObserver.data);

      objObserver.onChange('slider', function(event) {
        console.info('message received:', event); // Object was changed
        _this.trigger('slide', objObserver.data); // lets notify the App about the change
      });
    }).catch(function(reason) {
      console.error(reason);
    });
  }

  // WEBRTC FUNCTIONS HERE

  //create a peer connection with its event handlers
  createPC() {
    pc = new RTCPeerConnection();
    //event handler for when remote stream is added to peer connection
    pc.onaddstream = function(obj){
      console.log('onaddstream', pc);
      document.getElementById('remoteVideo').srcObject = obj.stream;
    }

    //event handler for when local ice candidate has been found
    pc.onicecandidate = function(e){
      var cand = e.candidate;

      //end if candidate is null (last candidate is!)
      if(!cand) return;

      //if ice not enabled yet, push to buffer first
      if(!ice){
          this.iceBuffer.push(cand);
      }else{
          this.sendIceCandidate(cand);
      }
    }
  }

  //send all ICE candidates from buffer to partner
  emptyIceBuffer(){
    this.ice = true;
    //send ice candidates from buffer
    for(var i = (this.iceBuffer.length - 1); i >= 0; i--){
        this.sendIceCandidate(iceBuffer[i]);
        this.iceBuffer.splice(i, 1);
    }
  }

  //send one ICE candidate to partner
  sendIceCandidate(cand){
    var msg = {
        type: 'icecandidate',
        to: partner,
        candidate: cand
    }
    this.message(this.partner, msg);
  }

  //handler for received ICE candidate from partner
  handleIceCandidate(msg){
    this.pc.addIceCandidate(new RTCIceCandidate(msg.body.candidate));
  }


  //Alice: invite a partner p (Bob) to a call
  invite(p){
    var _this = this;
    this.partner = p;
    this.createPC();

    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream){
      document.getElementById('localVideo').srcObject = stream;
      _thispc.addStream(stream);

      _thispc.createOffer({
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1
      })
      .then(function(offer){
        _this.pc.setLocalDescription(new RTCSessionDescription(offer), function(){
          var msg = {
              type: 'invitation',
              offer: offer,
              to: partner
          }
          _this.message(partner, msg);
        })
      });
    });
  }

  //Bob: handle incoming invite from Alice
   handleInvite(msg){
    var _this = this;
    console.log('got invite from', msg.from);
    this.partner = msg.from;
    if(!confirm('Incoming call from ' + msg.from + '. Answer?')) return;
    this.createPC();
    var offer = msg.body.offer;
    console.log('received offer', offer);
    
    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream){
      document.getElementById('localVideo').srcObject = stream;
      _this.pc.addStream(stream);
      _this.pc.setRemoteDescription(new RTCSessionDescription(offer), function(){
        _this.pc.createAnswer().then(function(answer){
          _this.pc.setLocalDescription(new RTCSessionDescription(answer), function(){
            var send = {
                type: 'accepted',
                to: partner,
                answer: answer
            }
            _this.message(partner, send);
            _this.emptyIceBuffer();
          });
        });
      });
    });
  }

  //Alice: handle accepted call from Bob
   handleAccepted(msg){
    var _this = this;
    var answer = msg.body.answer;
    console.log('received answer', answer);
    this.pc.setRemoteDescription(new RTCSessionDescription(answer), function(){
       _this.emptyIceBuffer();
    });
  }

  //////////////////////////////////// CHECK EVERYTHING HERE

  // send Websocket message // this is the dataobject.data function !!!!!!!!!!!!!!! translate it
message(to, body){
    var msg = {
        type: 'message',
        from: me,
        to: to,
        body: body
    }
    console.log('sending', msg);
    conn.send(JSON.stringify(msg));
  }

}






export default function activate(hypertyURL, bus, configuration) {
  return {
    name: 'Receiver',
    instance: new Receiver(hypertyURL, bus, configuration)
  };
}
