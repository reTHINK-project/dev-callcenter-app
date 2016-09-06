/* jshint undef: true */
//import HypertyDiscovery from 'service-framework/dist/HypertyDiscovery';
import Discovery from 'service-framework/dist/Discovery';
import {Syncher} from 'service-framework/dist/Syncher';
import {divideURL} from '../utils/utils';
import EventEmitter from '../utils/EventEmitter'; // for receiving
import iceconfig from './stunTurnserverConfig';
import config from '../../config.json';
import IdentityManager from '../IdentityManager';

class DTWebRTC extends EventEmitter { // extends EventEmitter because we need to recieve events

  constructor(hypertyURL, bus, configuration) {
    if (!hypertyURL) throw new Error('The hypertyURL is a needed parameter');
    if (!bus) throw new Error('The MiniBus is a needed parameter');
    if (!configuration) throw new Error('The configuration is a needed parameter');
    super(); // call event emitter constructor to be able to receive things

    this._domain = divideURL(hypertyURL).domain;
    this._objectDescURL = 'hyperty-catalogue://catalogue.' + this._domain + '/.well-known/dataschema/Connection';
    this._syncher = new Syncher(hypertyURL, bus, configuration);
    this.hypertyDiscovery = new Discovery(hypertyURL, bus);
    this.identityManager = new IdentityManager(hypertyURL, configuration.runtimeURL, bus);

    this.constraints = {
      'audio': true,
      'video': true
    };
    this.receivingConstraints = {
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1
    };
    this.sender = null; // sender == false --> I'm the receiver @ start
    this.myUrl = null; // runtimeurl;
    this.partner = null; // hypertyURL of the other hyperty
    this.pc = null; // the peer connection object of WebRTC
    this.mediaStream = null;

    // receiving starts here
    let that = this;
    this._syncher.onNotification(function(event) {
      that._onNotification(event);
    });
  }


  // reveicing starts here
  _onNotification(event) {
    let that = this;
    if (that.sender == null) {
      that.sender = false;
    }
    console.info('[DTWebRTC]: Event Received: ', event);
    switch (event.type) {
      case "create":
        this.trigger('invitation', event.identity);
        event.ack(); // Acknowledge reporter about the Invitation was received
        // Subscribe to Object
        this._syncher.subscribe(this._objectDescURL, event.url)
          .then(function(objObserver) {
            console.info("[DTWebRTC]: [_onNotification] objObserver ", objObserver);

            console.log("[DTWebRTC]: event.from: ", event.from);
            if (that.sender) {
              that.objObserver = objObserver
            } else {
              that.handleInvite(objObserver.data, event.from);
            }
            that.changePeerInformation(objObserver);

            objObserver.onChange('connectionDescription', function(event) {
              console.info('connectionDescription received:', event); // Object was changed
            });
          }).catch(function(reason) {
            console.error(reason);
          });
        break;
      case "delete":
        this.trigger('disconnected');
        break;
    }
  }

  // sending starts here
  connect(hypertyURL) {
    this.partner = hypertyURL;
    let that = this;
    let syncher = that._syncher;
    if (that.sender == null) {
      that.sender = true;
    }


    return new Promise(function(resolve, reject) {
      syncher.create(that._objectDescURL, [hypertyURL], {})
        .then(function(objReporter) {
          console.info('1. Return Created WebRTC Object Reporter', objReporter);
          that.objReporter = objReporter;
          if (that.sender) {
            that.invite()
              .then((offer) => {
                // console.log("[DTWebRTC]: offer is that: ", offer)
                objReporter.data.Connection = { // owner has that
                  name: '',
                  status: "offer",
                  owner: that.myUrl,
                  peer: ""
                };

                objReporter.data.ownerPeer = {
                  connectionDescription: offer,
                  iceCandidates: []
                };
              });
          } else {
            objReporter.data.peer = {
              name: '',
              connectionDescription: {},
              iceCandidates: []
            };
          }
          objReporter.onSubscription(function(event) {
            console.info('-------- Receiver received subscription request --------- \n');
            event.accept(); // all subscription requested are accepted
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
  setMediaOptions(opt) {
    this.constraints = opt;
  }

  // callee handles incoming invite from the caller
  handleInvite(data, partner) {
    this.partner = partner;
    console.log('got invite');
    this.trigger('incomingcall', data);
  }

  // caller invites a callee
  invite() {
    var that = this;
    this.createPC();
    return new Promise((resolve, reject) => {
      console.log('>>>Constrains', this.constraints);
      navigator.mediaDevices.getUserMedia(this.constraints)
        .then(function(stream) {
          console.log("[DTWebRTC]: localviodeo")
          that.trigger('localvideo', stream);
          //document.getElementById('localVideo').srcObject = stream;
          that.mediaStream = stream;
          that.pc.addStream(stream);
          that.pc.createOffer(that.receivingConstraints)
            .then(function(offer) {
              that.pc.setLocalDescription(new RTCSessionDescription(offer), function() {
                resolve(offer);
              }, function() {
                reject();
              })
            })
            .catch((e) => {
              reject("Create Offer failed: ", e);
            });
        });
    });
  }

  // calle accepted the invitation
  invitationAccepted(data) {
    let that = this;
    this.createPC();

    let offer;
    if (data.ownerPeer.connectionDescription.type == "offer") {
      console.log("[DTWebRTC]: OFFER RECEIVED: ", data)
      offer = data.ownerPeer.connectionDescription;
    } else {
      console.log("[DTWebRTC]: offer was't set in the invitation - data: ", data);
      return;
    }
    console.log('>>>Constraints', this.constraints);
    navigator.mediaDevices.getUserMedia(this.constraints)
      .then(function(stream) {
        that.trigger('localvideo', stream);
        that.mediaStream = stream;
        that.pc.addStream(stream); // add the stream to the peer connection so the other peer can receive it later
        that.pc.setRemoteDescription(new RTCSessionDescription(offer), function() {
          that.pc.createAnswer()
            .then(function(answer) {
              that.pc.setLocalDescription(new RTCSessionDescription(answer), function() {
                console.log("[DTWebRTC]: answer from callee: ", answer);
                that.connect(that.partner) // connect to the other hyperty now
                  .then((objReporter) => {
                    console.log("[DTWebRTC]: the objreporter is as follows: ", objReporter);
                    that.objReporter = objReporter;
                    that.objReporter.data.peer.connectionDescription = answer;
                  });
              });
            });
        });
      });
  }

  // choose ICE-Server(s), if (mode != 0) use only Stun/Turn from Settings-GUI
  setIceServer(ice, mode) {
    iceconfig.ice = mode ? ice : ice.concat(iceconfig.ice);
  }

  //create a peer connection with its event handlers
  createPC() {
    if ( this.pc )
      return;

    var that = this;
    this.pc = new RTCPeerConnection({
      'iceServers': iceconfig.ice
    });
    console.log("[DTWebRTC]: created PeerConnection", this.pc);

    //event handler for when remote stream is added to peer connection
    this.pc.onaddstream = function(obj) {
      console.log('>>>onaddstream', that.pc);
      that.trigger('remotevideo', obj.stream);
    }

    //event handler for when local ice candidate has been found
    this.pc.onicecandidate = function(e) {
      console.log("[DTWebRTC]: icecandidateevent occured: ", e)
      if (!e.candidate) return;
      let icecandidate = {
        type: 'candidate',
        candidate: e.candidate.candidate,
        // SD: these two lines where not present before
        sdpMid: e.candidate.sdpMid,
        sdpMLineIndex: e.candidate.sdpMLineIndex
      };

      if (! that.objReporter ) {
        console.log("[DTWebRTC]: got  iceCandidate before objReporter ... skipping");
        return;
      }
      if (that.sender) {
        that.objReporter.data.ownerPeer.iceCandidates.push(icecandidate);
      } else {
        that.objReporter.data.peer.iceCandidates.push(icecandidate);
      }
    }

    // unfortunately onremovestream() didn't recognizes the remove of a stream

    this.pc.onRemoteStreamRemoved = function(a) {
      console.log('>>>stream removed from remote', a);
    }
  }

  ////////////////////////////////////

  // HypertyConnector functions
  changePeerInformation(dataObjectObserver) {
    let that = this;
    let data = dataObjectObserver.data;
    console.log(data);
    let peerData = data && data.Connection ? data.ownerPeer : data.peer;
    console.info('Peer Data:', peerData);

    if (peerData.hasOwnProperty('connectionDescription')) {
      that.processPeerInformation(peerData.connectionDescription);
    }

    if (peerData.hasOwnProperty('iceCandidates')) {
      peerData.iceCandidates.forEach(function(ice) {
        that.processPeerInformation(ice);
      });
    }

    dataObjectObserver.onChange('*', function(event) {
      console.info('Observer on change message: ', event);

      // this event also includes the answer from the callee so we need to
      // process the answer from event.data and the candidates which might trickle
      // from event.data[0]
      if (event.data[0]) { // [0] this does the trick when ice candidates are trickling ;)
        console.log('>>event.data[0]', event.data[0]);
        that.processPeerInformation(event.data[0]);
      } else {
        console.log('>>event.data', event.data);
        that.processPeerInformation(event.data);
      }
    });
  }

  processPeerInformation(data) {
    let that = this;
    console.info("[DTWebRTC]: processPeerInformation: ", JSON.stringify(data));
    this.createPC();

    if (data.type === 'offer' || data.type === 'answer') {
      // if (data.type === 'answer') {
      console.info('Process Connection Description: ', data);
      that.pc.setRemoteDescription(new RTCSessionDescription(data))
        .then(() => {
          if (that.sender) {
            console.log("[DTWebRTC]: remote success")
          }
        })
        .catch((e) => {
          console.log("[DTWebRTC]: remote error: ", e)
        });

    }

    if (data.candidate) {
      console.info('Process Ice Candidate: ', data);
      that.pc.addIceCandidate(new RTCIceCandidate({
        candidate: data.candidate
      }));
    }
  }

  showidentity(url) {
    let that = this;
    let syncher = that._syncher;
    console.log('>>>Identity', this.identityManager, "\n", this.identityManager.discoverUserRegistered(url));
  }

  disconnect() {
    let that = this;
    console.log('>>>lets disconnect', that);
    return new Promise(function(resolve, reject) {
      try {
        that.pc.getLocalStreams().forEach((stream) => {
          that.pc.removeStream(stream);
        });
        if (that.objReporter) {
          that.objReporter.delete();
        }
        if (that.objObserver) {
          that.objObserver.delete();
        }
        that.pc.close();
        that.pc = null;
        that.trigger('disconnected');
      } catch (e) {
        reject(e);
      }
    });
  }
}

export default function activate(hypertyURL, bus, configuration) {
  return {
    name: 'DTWebRTC',
    instance: new DTWebRTC(hypertyURL, bus, configuration)
  };
}
