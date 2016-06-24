// jshint browser:true, jquery: true
// jshint varstmt: true
import RuntimeLoader from 'service-framework/dist/RuntimeLoader';
import InstallerFactory from '../resources/factories/InstallerFactory';
import config from '../config.json';

let installerFactory = new InstallerFactory();
window.KJUR = {};
let domain = config.domain;
let runtime = 'https://catalogue.' + domain + '/.well-known/runtime/Runtime';
let runtimeLoader = new RuntimeLoader(installerFactory, runtime);

runtimeLoader.install().then(function() {
  return getListOfHyperties(domain);
}).then(function(hyperties) {
  let $dropDown = $('#navbar');


  hyperties.forEach(function(key) {
    if(key == "DTHCreceiver"){
      loadHyperty(0,key);
    }else if(key == "DTHCsender"){
     
      $dropDown.append('<div><form class="searchemail" data-name="DTHCsender">'+ 
        '<input type="email" style="float: left" class="friend-email block2 validate form-control " placeholder="your friends email" id="email" required aria-required="true"  > '+
        '<input type="text" style="float: left" class="friend-domain block2 validate form-control " placeholder="your friends domain" id="domain"> '+ 
        '<button type="submit" style="float: left"  class="btn btn-default btn-sm">Search</button>'+
        '</form></div>');
      $('.searchemail').on('submit',loadHyperty);
    }else{}
  });
    $dropDown.append('<div><i style="color: #777;" onclick="toggleSettings();" class="center fa fa-cog fa-2x fa-fw"></i></div>'+
      '<div id="settings" class="settings"><table>'+
                '<td class="darktext">Stun-Server </td><td><input id="stun" class="form-control" value="" placeholder="192.168.7.126:3478"></td><td></td>'+
                '<td class="darktext">Turn-Server </td><td><input id="turn" class="form-control" value="" size="20" placeholder="192.168.7.126"></td><td></td>'+
                '<td class="darktext"> Camera Resolution</td><td><select size="1" id="camResolution"></select></td>'+
                '<td><button id="saveConfig" class="btn btn-default btn-sm" onclick="saveProfile();toggleSettings();">Save profile</button></td>'+
           '</table></div>');
}).catch(function(reason) {
  console.error(reason);
});

function getListOfHyperties(domain) {

  let hypertiesURL = 'https://' + domain + '/.well-known/hyperty/Hyperties.json';
  if (config.env === 'production') {
    hypertiesURL = 'https://' + domain + '/.well-known/hyperty/';
  }

  return new Promise(function(resolve, reject) {
    $.ajax({
      url: hypertiesURL,
      success: function(result) {
        let response = [];
        if (typeof result === 'object') {
          Object.keys(result).forEach(function(key) {
            response.push(key);
          });
        } else if (typeof result === 'string') {
          response = JSON.parse(result);
        }
        resolve(response);
      },
      fail: function(reason) {
        reject(reason);
      }
    });
  });
}

function loadHyperty(event,key) {
  let hypertyName;
  if(event){
    event.preventDefault();
    hypertyName = $(event.currentTarget).attr('data-name');
  }else{
    hypertyName = key;
  }
  let hypertyPath = 'hyperty-catalogue://' + domain + '/.well-known/hyperties/' + hypertyName;
  runtimeLoader.requireHyperty(hypertyPath).then(hypertyLoaded).catch(hypertyFail);
}

function hypertyFail(reason) {
  console.error(reason);
}

// ###################################################################################################################
// ################################## DTCallCenter ###################################################################
// ###################################################################################################################
var hyperty;

function hypertyLoaded(result) {
  hyperty = result.instance;
  addContent();
  $('.hyperty-panel').append('<p>Hyperty Observer URL:<br>' + result.runtimeHypertyURL + '</p>');
  initListeners();
  $.getScript("../src/adapter.js");
  hyperty.myUrl = result.runtimeHypertyURL;
  if(result.name == "SenderDTWebRTC"){
    // Prepare to discover email:
    var hypertyDiscovery = result.instance.hypertyDiscovery;
    discoverEmail(hypertyDiscovery);
    hyperty.showidentity();
  }
}

function addContent() {
  var place = document.getElementById("box1");
  $(place).empty();
  $(place).append('<div class="selection-panel"></div>'+
    '<div class="hyperty-panel"></div>'+
    '<div class="my-panel"></div>'+
    '<div class="send-panel"></div>'+
    '<div class="invitation-panel"></div>'+
    '<div id="smth"></div>'+
    '<div id="smth2">'+
    '<video id="remoteVideo" class="block7 hide" autoplay  poster="web/media/load3.gif"></video>'+
    '<video id="localVideo" class="block3 hide" autoplay  poster="web/media/load3.gif"></video>'+
    '</div>');
}

function webrtcconnectToHyperty(event) {
  event.preventDefault();
  let toHypertyForm = $(event.currentTarget);
  let toHyperty = toHypertyForm.find('.webrtc-hyperty-input').val();
  toHypertyForm.append('<center><br><i style="color: #e20074;" class="center fa fa-cog fa-spin fa-5x fa-fw"></i></center>');
  console.log(toHyperty);

  hyperty.connect(toHyperty)
  .then(function(obj) {
    console.log('Webrtc obj: ', obj);
    $('.send-panel').addClass('hide');
    $('#smth2').find('.hide').removeClass('hide');
  })
  .catch(function(reason) {
    console.error(reason);
  });
}

// receiving code here
function initListeners() {
  hyperty.addEventListener('invitation', function(identity) {
    console.log('Invitation event received from:', identity);
    $('.invitation-panel').append(`<p> Invitation received from:\n ` + identity.email +  '</p>');
    $('#smth2').find('.hide').removeClass('hide');
  });

  hyperty.addEventListener('incomingcall', function(data) {
    console.log('incomingcall received');
    if (!confirm('Incoming call. Answer?')) return false;
    hyperty.invitationAccepted(data);
  });
  
  hyperty.addEventListener('localvideo', function(stream) {
    console.log('local stream received');
    document.getElementById('localVideo').srcObject = stream;
  });
    
  hyperty.addEventListener('remotevideo', function(stream) {
    console.log('remotevideo received');
    document.getElementById('remoteVideo').srcObject = stream;
  });
}

function discoverEmail(hypertyDiscovery) {

  var email = $('.searchemail').find('.friend-email').val();
  var domain = $('.searchemail').find('.friend-domain').val();
  hypertyDiscovery.discoverHypertyPerUser(email, domain)
  .then(function (result) {
    $('.send-panel').append('<br><form class="webrtcconnect">' +
      '<input type="text" class="webrtc-hyperty-input form-control ">' +
      '<button type="submit" class="btn btn-default btn-sm btn-block ">webRTC to Hyperty </button>'+
      '</form><br>');
    $('.send-panel').find('.webrtc-hyperty-input').val(result.hypertyURL);
    $('.webrtcconnect').on('submit', webrtcconnectToHyperty);
  }).catch(function (err) {
    console.error('Email Discovered Error: ', err);
  });
}