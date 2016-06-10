/* jshint undef: true */
import HypertyDiscovery from 'service-framework/dist/HypertyDiscovery';
import {Syncher} from 'service-framework/dist/Syncher';
import {divideURL} from '../utils/utils';
import EventEmitter from '../utils/EventEmitter'; // for receiving
import obj from './obj';
import config from  './stunTurnserverConfig'

class Sender extends EventEmitter{ // extends EventEmitter because we need to recieve events

  constructor(hypertyURL, bus, configuration) {
    if (!hypertyURL) throw new Error('The hypertyURL is a needed parameter');
    if (!bus) throw new Error('The MiniBus is a needed parameter');
    if (!configuration) throw new Error('The configuration is a needed parameter');
    super();

    this._domain = divideURL(hypertyURL).domain;
    this._objectDescURL = 'hyperty-catalogue://' + this._domain + '/.well-known/dataschemas/FakeDataSchema';
    this._syncher = new Syncher(hypertyURL, bus, configuration);
    this.hypertyDiscovery = new HypertyDiscovery(hypertyURL, bus);
    this.constraints = {
      audio: false,
      video: true
    };
    this.myUrl = null; // this.me = null;
    this.partner = null;
    this.pc = null;
    this.ice = false;
    this.iceBuffer = [];
    this.remoteIce = false;
    this.remoteIceBuffer = [];

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
        .then(function(objReporter) {
          console.info('1. Return Created WebRTC Object Reporter', objReporter);
          _this.objReporter = objReporter;
          _this.invite()
          .then((offer)=>{
            console.log("offer is that: ", offer)
          
            objReporter.data.connection = { // owner has that
              name    : '',
              status  : "offer",
              owner   : "hyperty://example.com/alicehy",
              peer    : "connection://example.com/alice/bob27012016",
              ownerPeer : {
                connectionDescription: offer,
                iceCandidates: []
              }
            };
          });
          console.log("00000000000000000000000000")
          objReporter.onSubscription(function(event) {
            console.info('-------- Receiver received subscription request --------- \n');
            event.accept(); // All subscription requested are accepted
            resolve(objReporter);
          });
          console.log("111111111111111111111111")
        })
        .catch(function(reason) {
          console.error(reason);
          reject(reason);
        });



    }); 
  }

    //Alice: invite a partner (Bob) to a call
  invite(){
    var _this = this;
    this.createPC();
    return new Promise((resolve, reject) => {
      console.log("papapapapaappap")
      navigator.mediaDevices.getUserMedia(this.constraints)
      .then(function(stream){
          console.log("localviodeo")
          document.getElementById('localVideo').srcObject = stream;
          _this.pc.addStream(stream);
          _this.pc.createOffer({
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 1
          })
          .then(function(offer){
            _this.pc.setLocalDescription(new RTCSessionDescription(offer), function(){
              console.log("9812364981984691624")
              resolve(offer);
            }, function (){
              console.log("alsfhlahsdfgiaihfg")
              reject();
            })
          });
      });
    });
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
      
      console.log("event.from: ", event.from);
      _this.objObserver = objObserver;
      _this.changePeerInformation(objObserver);

    }).catch(function(reason) {
      console.error(reason);
    });
  }

 // WEBRTC FUNCTIONS HERE

  //send all ICE candidates from buffer to partner
  emptyIceBuffer(){
    console.log("icebuffer: ", this.iceBuffer);
    if (this.iceBuffer && this.iceBuffer.length) this.rek(this);
  }

  rek(that){
    // give the syncer time to sync or it will fail
    setTimeout(function() {
      if (that.iceBuffer.length>0) {
        console.log("iceBuffer[0]: ", that.iceBuffer[0]);
        if (that.iceBuffer[0]) that.iceBuffer[0].type = 'candidate';
        that.sendIceCandidate(that.iceBuffer[0]);
        that.iceBuffer.splice(0, 1);
        that.rek(that);
      } else {
        console.log("emptyIceBuffer has finished - that.iceBuffer.length: ", that.iceBuffer.length);
      }
    }, 5);
  }

  sendIceCandidate (c) {
    console.log("this.objReporter.data: ", this.objReporter.data);
    this.objReporter.data.connection.ownerPeer.iceCandidates.push(c);
  }

  //send one ICE candidate to partner
  addIceCandidate(cand){
    this.iceBuffer.push(cand);
  }


  // remote ice buffer
  emptyRemoteIceBuffer() {
    console.log("remoteIcebuffer: ", this.remoteIceBuffer);
    if (this.remoteIceBuffer && this.remoteIceBuffer.length) this.rekRemote(this);
  }

  rekRemote(that){
    console.log("rekremoterek")
    setTimeout(function() {
      if (that.remoteIceBuffer.length>0) {
        console.log("remoteIceBuffer[0]: ", that.remoteIceBuffer[0]);
        that.pc.addIceCandidate(new RTCIceCandidate({candidate: that.remoteIceBuffer[0].candidate}));
        that.remoteIceBuffer.splice(0, 1);
        that.rekRemote(that);
      } else {
        console.log("emptyRemoteIceBuffer has finished - that.remoteIceBuffer.length: ", that.remoteIceBuffer.length);
      }
    }, 5);
  }

/////////////////////////////////////////////////////////////////////////


  //create a peer connection with its event handlers
  createPC() {
    var _this = this;
    this.pc = new RTCPeerConnection();
    // this.pc = new RTCPeerConnection({'iceServers': config.ice});

    //event handler for when remote stream is added to peer connection
    this.pc.onaddstream = function(obj){
      console.log('onaddstream', _this.pc);
      document.getElementById('remoteVideo').srcObject = obj.stream;
    }

    //event handler for when local ice candidate has been found
    this.pc.onicecandidate = function(e){
      console.log("myicecandidateevent: ", e)
      var cand = e.candidate;
      if(!cand) return;
      cand.type = 'candidate';
      console.log("the candidate is: ", cand);
      if(!_this.ice)  _this.iceBuffer.push(cand);
      else            _this.sendIceCandidate(cand);
    }

    this.pc.addEventListener('iceconnectionstatechange', function(event) {
      console.info('iceconnectionstatechange', event.currentTarget.iceConnectionState);
      let data = _this.objReporter.data;
      if (data.hasOwnProperty('connection')) {
        data.connection.status = event.currentTarget.iceConnectionState;
      }
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


  
  //////////////////////////////////// 

  // HypertyConnector functions
  changePeerInformation(dataObjectObserver) {
    let _this = this;
    let data = dataObjectObserver.data;
    let isOwner = data.hasOwnProperty('connection');
    console.log(data);
    let peerData = isOwner ? data.connection.ownerPeer : data.peer;

    console.info('Peer Data:', peerData);

    if (peerData.hasOwnProperty('connectionDescription')) {
      _this.processPeerInformation(peerData.connectionDescription);
    }

    if (peerData.hasOwnProperty('iceCandidates')) {
      peerData.iceCandidates.forEach(function(ice) {
        _this.processPeerInformation(ice);
      });
    }

    dataObjectObserver.onChange('*', function(event) {
      console.info('Observer on change message: ', event);
      _this.processPeerInformation(event.data);
    });
  }

  processPeerInformation(data) {
    let _this = this;
    console.info("processPeerInformation: ", JSON.stringify(data));

    if (data.type === 'offer' || data.type === 'answer') {
      console.info('Process Connection Description: ', data);
      _this.pc.setRemoteDescription(new RTCSessionDescription(data))
      .then(()=>{
        console.log("remote success")
        _this.emptyIceBuffer();
        _this.remoteIce = true;
        _this.emptyRemoteIceBuffer();
      })
      .catch((e)=>{
        console.log("remote error: ", e)
      });
      
    }

    if (data.candidate || data.type == 'candidate') {
      if (_this.remoteIce) {
        console.info('Process Ice Candidate: ', data);
        _this.pc.addIceCandidate(new RTCIceCandidate({candidate: data.candidate}, _this.iceSuccess, _this.iceError));
      } else {
        _this.remoteIceBuffer.push(data);
      }
      
    }
  }


  remoteDescriptionSuccess() {
    console.info('remote success');
  }

  remoteDescriptionError(error) {
    console.error('error: ', error);
  }

  iceSuccess() {
    console.info('ice success');
  }

  iceError(error) {
    console.error('ice error: ', error);
  }

}

export default function activate(hypertyURL, bus, configuration) {
  return {
    name: 'Sender4DTWebRTC',
    instance: new Sender(hypertyURL, bus, configuration)
  };
}