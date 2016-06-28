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
var hypertyDiscovery;


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
    '<div><form id="settings" class="settings"><table>'+
    '<td class="darktext">Stun-Server </td><td><input id="stun" class="form-control" value="" placeholder="192.168.7.126:3478"></td><td></td>'+
    '<td class="darktext">Turn-Server </td><td><input id="turn" class="form-control" value="" size="20" placeholder="192.168.7.126"></td><td></td>'+
    '<td class="darktext">user</td><td><input id="turn_user"  class="form-control" value="" size="10" placeholder="wonder"></td>'+
    '<td class="darktext">pass</td><td><input id="turn_pass"  class="form-control" value="" size="10" type="password" /></td>'+
    '<td class="darktext"> Camera Resolution</td><td><select size="1" value="" class="darktext" id="camResolution"></select></td>'+
    '<td><button type="submit" id="saveConfig" class="btn btn-default btn-sm" >Save profile</button></td>'+
    '</table></form></div>');
  $('#settings').on('submit',saveProfile);
  $('#settings').on('submit',toggleSettings);
  fillResoultionSelector();
  loadProfile();
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
    hypertyDiscovery = result.instance.hypertyDiscovery;
    discoverEmail(0);
    $('.searchemail').off('submit').on('submit',discoverEmail);
    // hyperty.showidentity();
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
  saveProfile();
  getIceServers();
  prepareMediaOptions();
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
    prepareMediaOptions();
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

function discoverEmail(event) {
  if(event){event.preventDefault();}

  var email = $('.searchemail').find('.friend-email').val();
  var domain = $('.searchemail').find('.friend-domain').val();
  hypertyDiscovery.discoverHypertyPerUser(email, domain)
  .then(function (result) {
    $('.send-panel').empty();
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

var PROFILE_KEY = "WEBRTC-SIMPLE-SETTINGS";

function getIceServers() {
  var stun = $("#stun").val();
  var turn = $("#turn").val();
  var turn_user = $("#turn_user").val();
  var turn_pass = $("#turn_pass").val();
  var iceServers = [];
  if (stun)
    iceServers.push({urls: "stun:" + stun});
  if (turn)
    iceServers.push({
      urls: "turn:" + turn,
      username: turn_user,
      credential: turn_pass
    });
  hyperty.setIceServer(iceServers);
}

function saveProfile() {
  event.preventDefault();
  var profile = {};
  console.log("save profile " + PROFILE_KEY);
  // transfer all values from all text-inputs of the settings div to profile
  $("#settings :text").each(function (i) {
    profile[$(this).attr('id')] = $(this).val();
  });
  $("#settings  :password").each(function (i) {
    profile[$(this).attr('id')] = $(this).val();
  });
  $("#settings #camResolution").each(function (i) {
    profile[$(this).attr('id')] = $(this).val();
    console.log('BLA',$(this).val() );
  });

  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function loadProfile() {
  console.log("loading profile " + PROFILE_KEY);
  var profile = null;
  var s = localStorage.getItem(PROFILE_KEY);
  if (s) {
    try {
      profile = JSON.parse(s);
    }
    catch (e) {
      console.log("error while parsing settings from local storage");
    }
  }
  if (profile !== null) {
    for (var key in profile) {
      // set value either in settings-div or if not found there in a plain field with this id
      if ($("#settings #" + key)[0]){
        $("#settings #" + key).val(profile[key]);
      }
    }
  }
}



var resolutions = {
    "1920x1080": "FHD 16:9 1920x1080",
    "1680x1050": "WSXGA+ 16:10 1680x1050",
    "1600x1200": "UXGA 4:3 1600x1200",
    "1280x800": "WXGA 16:10 1280x800",
    "1280x720": "WXGA 16:9 1280x720",
    "800x600": "SVGA 4:3 800x600",
    "640x480": "VGA 4:3 640x480",
    "320x200": "CGA 8:5 320x200",
    "32x20": "CGA 8:5 32x20",
    "4096x2160": "4K 17:9 4096x2160"
};



function prepareMediaOptions() {
    var mediaOptions = {};
    var selectedRes = $("#camResolution").val();
    var resolutionArr = selectedRes.split("x");
    console.log("Selected Resolution: " + selectedRes);
    console.log("minWidth: " + resolutionArr[0]);
    mediaOptions = {
        'audio': true,
        'video': {
            mandatory: {
                minWidth: resolutionArr[0],
                minHeight: resolutionArr[1],
                maxWidth: resolutionArr[0],
                maxHeight: resolutionArr[1]
            }
        }
    };
    hyperty.setMediaOptions(mediaOptions);
}

function fillResoultionSelector() {
    $("#camResolution")
    var mySelect = $("#camResolution")
    $.each(resolutions, function (val, text) {
        mySelect.append(
                $('<option></option>').val(val).html(text)
                );
    });
}