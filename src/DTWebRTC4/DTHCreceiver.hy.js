/* jshint undef: true */
import {Syncher} from 'service-framework/dist/Syncher';
import {divideURL} from '../utils/utils';
import EventEmitter from '../utils/EventEmitter';
import config from  './stunTurnserverConfig';
import IdentityManager from '../IdentityManager';

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
      audio: true,
      video: true
    };
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

  // sending starts here
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

  // WEBRTC FUNCTIONS HERE

  // callee handles incoming invite from the caller
  handleInvite(data, partner) {
    this.partner = partner;
    console.log('got invite');
    this.trigger('incomingcall', data);
  }

  //set Options for Media the partner get
  setMediaOptions(opt) {
    this.constraints = opt;
  }

  // calle accepted the invitation
  invitationAccepted(data) {
    let that = this;
    this.createPC();
    
    let offer;
    if (data.connection.ownerPeer.connectionDescription.type == "offer") {
      console.log("OFFER RECEIVED: ", data)
      offer = data.connection.ownerPeer.connectionDescription;
    } else {
      console.log("offer was't set in the invitation - data: ", data);
      return;
    }
    console.log('>>>Constrains', this.constraints );
    navigator.mediaDevices.getUserMedia(this.constraints)
    .then(function(stream){
      that.trigger('localvideo', stream);
      that.pc.addStream(stream); // add the stream to the peer connection so the other peer can receive it later
      that.pc.setRemoteDescription(new RTCSessionDescription(offer), function(){
        that.pc.createAnswer()
        .then(function(answer){
          that.pc.setLocalDescription(new RTCSessionDescription(answer), function(){
            console.log("answer from callee: ", answer);
            that.connect(that.partner) // connect to the other hyperty now
            .then((objReporter)=>{
              console.log("the objreporter is as follows: ", objReporter);
              that.objReporter = objReporter;
              that.objReporter.data.peer.connectionDescription = answer;
              that.ice = true;
              that.emptyIceBuffer(); // empty the buffer after the description has been handled to be safe
            });
          });
        });
      });
    });
  }

  // choose ICE-Server(s), if (mode != 0) use only Stun/Turn from Settings-GUI
  setIceServer(ice,mode) {
    config.ice = mode ? ice : ice.concat(config.ice);
  }

  //create a peer connection with its event handlers
  createPC() {
    var _this = this;
    this.pc = new RTCPeerConnection({'iceServers': config.ice});

    //event handler when a remote stream is added to the peer connection
    this.pc.onaddstream = function(obj){
      console.log('onaddstream', _this.pc);
      _this.trigger('remotevideo', obj.stream);
    }

    //event handler for when a local ice candidate has been found
    this.pc.onicecandidate = function(e){
      console.log("icecandidateevent occured: ", e)
      var cand = e.candidate;
      if(!cand) return;
      cand.type = 'candidate'; // for compatibility with the hyperty connector
      if(!_this.ice)  _this.addIceCandidate(cand);
      else            _this.sendIceCandidate(cand);
    }
  }

  //send one ICE candidate to partner
  addIceCandidate(c){
    // if (!c.type) c.type = 'candidate';
    this.iceBuffer.push(c);
  }

  // send ice candidates to the remote hyperty
  sendIceCandidate (c) {
    console.log("this.objReporter.data: ", this.objReporter.data);
    this.objReporter.data.peer.iceCandidates.push(c);
  }

  //send all ICE candidates from the buffer to the partner
  emptyIceBuffer(){
    console.log("icebuffer: ", this.iceBuffer);
    if (this.iceBuffer && this.iceBuffer.length) this.rek(this);
  }

  // recursive function needed to use 'timeout' to keep the order of the ice candidates so the syncher doesn't choke
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


  //////////////////////////////////// 

  // HypertyConnector functions
  changePeerInformation(dataObjectObserver) {
    let _this = this;
    let data = dataObjectObserver.data;
    console.log(data);

    let peerData = data.connection.ownerPeer;
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

    if (data.type === 'offer') {
      console.info('Process Connection Description: ', data.sdp);
      _this.pc.setRemoteDescription(new RTCSessionDescription(data));
    }

    if (data.candidate) {
      console.info('Process Ice Candidate: ', data);
      _this.pc.addIceCandidate(new RTCIceCandidate({candidate: data.candidate}));
    }
  }

  showidentity(url){
    let _this = this;
    let syncher = _this._syncher;
    console.log('>>>Identity',this.identityManager,"\n",this.identityManager.discoverUserRegistered(url));
  }
}

export default function activate(hypertyURL, bus, configuration) {
  return {
    name: 'ReceiverDTWebRTC',
    instance: new Receiver(hypertyURL, bus, configuration)
  };
}


