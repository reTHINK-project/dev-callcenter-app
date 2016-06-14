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
    this.myUrl = null;    // runtimeurl;
    this.partner = null;  // hypertyURL of the other hyperty
    this.pc = null;       // the peer connection object of WebRTC
    this.ice = false;     // if true then ice candidates will be handled
    this.iceBuffer = [];  // the buffer for local ice candidates

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
        objReporter.data.peer = {
          name : '',
          connectionDescription: {},
          iceCandidates: []
        };
        objReporter.onSubscription(function(event) {
          console.info('-------- Receiver received subscription request --------- \n');
          event.accept(); // All subscription requested are accepted
          resolve(objReporter);
        });
      })
      .catch(function(reason) {
        console.error(reason);
        reject(reason);
      });
    });
  }

  // reveicing starts here
  _onNotification(event) {
    let _this = this;
    console.info( 'Event Received: ', event);
    this.trigger('invitation', event.identity);
    event.ack(); // acknowledge reporter about the invitation was received

    // Subscribe to Object
    this._syncher.subscribe(this._objectDescURL, event.url)
    .then(function(objObserver) {
      console.info("[_onNotification] objObserver ", objObserver);
      
      console.log("event.from: ", event.from);
      _this.handleInvite(objObserver.data, event.from);
      _this.changePeerInformation(objObserver);

      objObserver.onChange('connectionDescription', function(event) {
        console.info('connectionDescription received:', event); // Object was changed
      });
    }).catch(function(reason) {
      console.error(reason);
    });
  }

  // WEBRTC FUNCTIONS HERE

  //create a peer connection with its event handlers
  createPC() {
    var _this = this;
    this.pc = new RTCPeerConnection();

    //event handler when a remote stream is added to the peer connection
    this.pc.onaddstream = function(obj){
      console.log('onaddstream', _this.pc);
      document.getElementById('remoteVideo').srcObject = obj.stream;
    }

    //event handler for when a local ice candidate has been found
    this.pc.onicecandidate = function(e){
      console.log("myicecandidateevent: ", e)
      var cand = e.candidate;
      if(!cand) return;
      cand.type = 'candidate';  // for compatibility with the hyperty connector
      if (_this.objReporter)  _this.objReporter.data.peer.iceCandidates.push(cand);
      else                    _this.addIceCandidate(cand);
    }
  }

  //send all ICE candidates from the buffer to the partner
  emptyIceBuffer(){
    console.log("icebuffer: ", this.iceBuffer);
    if (this.iceBuffer && this.iceBuffer.length) this.rek(this);
  }

  // recursive function needed to use 'timeout' to keep the order of the ice candidates so the syncher doesn't choke when the messaging node dosn't keep the order
  rek(that){
    setTimeout(()=>{
      if (that.iceBuffer.length>0) {
        console.log("iceBuffer[0]: ", that.iceBuffer[0]);
        that.sendIceCandidate(that.iceBuffer[0]);
        that.iceBuffer.splice(0, 1);
        that.rek(that);
      } else {
        console.log("emptyIceBuffer has finished - that.iceBuffer.length: ", that.iceBuffer.length);
      }
    }, 5);
  }

  // send ice candidates to the remote hyperty
  sendIceCandidate (c) {
    if (!this.objReporter.data.peer.iceCandidates)
      this.objReporter.data.peer.iceCandidates = []; // SHOULD BE REMOVED I GUESS BECAUSE OF "PEER"
    console.log("this.objReporter.data: ", this.objReporter.data);
    this.objReporter.data.peer.iceCandidates.push(c);
  }

  //send one ICE candidate to partner
  addIceCandidate(cand){
    if (!cand.type) cand.type = 'candidate'; // just make sure it's set
    this.iceBuffer.push(cand);
  }

  // callee handles incoming invite from the caller
  handleInvite(data, partner){
    let _this = this;
    this.partner = partner;
    console.log('got invite');
    if(!confirm('Incoming call. Answer?')) return; // TODO: move it to js file
    this.createPC();
    
    let offer;
    if (data.connection.ownerPeer.connectionDescription.type == "offer") {
      console.log("OFFER RECEIVED: ", data)
      offer = data.connection.ownerPeer.connectionDescription;
    } else {
      console.log("offer was't set in the invitation - data: ", data);
      return;
    }
    
    // access the camera
    navigator.mediaDevices.getUserMedia(this.constraints)
    .then(function(stream){
      document.getElementById('localVideo').srcObject = stream; // TODO: move this to the js file
      _this.pc.addStream(stream); // add the stream to the peer connection so the other peer can receive it later
      _this.pc.setRemoteDescription(new RTCSessionDescription(offer), function(){
        _this.pc.createAnswer()
        .then(function(answer){
          _this.pc.setLocalDescription(new RTCSessionDescription(answer), function(){
            console.log("answer from callee: ", answer);
            _this.connect(partner) // connect to the other hyperty now
            .then((objReporter)=>{
              console.log("the objreporter is as follows: ", objReporter);
              _this.objReporter = objReporter;
              _this.objReporter.data.peer.connectionDescription = answer;
              _this.emptyIceBuffer(); // empty the buffer after the description has been handled to be safe
            });
          });
        });
      });
    });
  }

  //////////////////////////////////// 

  // HypertyConnector functions
  changePeerInformation(dataObjectObserver) {
    let _this = this;
    let data = dataObjectObserver.data;
    console.log(data);

    // decide if I am the caller or callee TODO: set it statically
    let peerData = isOwner ? data.connection.ownerPeer : data.peer;

    console.info('Peer Data:', peerData);

    if (peerData.hasOwnProperty('connectionDescription')) {
      _this.processPeerInformation(peerData.connectionDescription);
    }

    if (peerData.hasOwnProperty('iceCandidates')) {
      console.log("it has icecandidates")
      peerData.iceCandidates.forEach(function(ice) {
        _this.processPeerInformation(ice);
      });
    }

    dataObjectObserver.onChange('*', function(event) {
      console.info('Observer on change message: ', event);
      _this.processPeerInformation(event.data[0]); // this does the trick when ice candidates are trickling ;)
    });
  }

  processPeerInformation(data) {
    let _this = this;
    console.info("processPeerInformation: ", data);

    if (data.type === 'offer' || data.type === 'answer') { // TODO: set it statically
      console.info('Process Connection Description: ', data.sdp);
      _this.pc.setRemoteDescription(new RTCSessionDescription(data));
    }

    if (data.candidate) {
      console.info('Process Ice Candidate: ', data);
      _this.pc.addIceCandidate(new RTCIceCandidate({candidate: data.candidate}));
    }
  }
}

export default function activate(hypertyURL, bus, configuration) {
  return {
    name: 'Receiver4DTWebRTC',
    instance: new Receiver(hypertyURL, bus, configuration)
  };
}
