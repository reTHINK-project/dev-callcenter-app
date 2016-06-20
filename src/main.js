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
      $dropDown.append('<form class="searchemail" data-name="DTHCsender">'+ 
        '<input type="email" style="float: left" class="friend-email halfblock validate form-control " placeholder="your friends email" id="email" required aria-required="true"  > '+
        '<button type="submit"  class="btn btn-default btn-sm">Search</button>'+
        '</form><br>');
      $('.searchemail').on('submit',loadHyperty);
    }else{}
  });
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
    '<video id="remoteVideo" class="block hide" autoplay  poster="web/media/load3.gif"></video>'+
    '<video id="localVideo" class="halfblock hide" autoplay  poster="web/media/load3.gif"></video>'+
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
}

function discoverEmail(hypertyDiscovery) {

  var email = $('.searchemail').find('.friend-email').val();
  hypertyDiscovery.discoverHypertyPerUser(email, 0)
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