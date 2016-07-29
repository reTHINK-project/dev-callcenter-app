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
    if(key == "DTWebRTC"){
      loadHyperty(0,key);
      //add search-form
      $dropDown.append(
        '<div><div class="input-group searchemail" data-name="DTHCsender">'+
        '<input type="email" class="friend-email block2 validate form-control " style="width: 50%; border-right: none;" placeholder="your friends email" id="email"> '+
        '<input type="text"  class="friend-domain block2 validate form-control" style="width: 50%;" placeholder="your friends domain" id="domain"> '+
        '<span class="input-group-btn"><button id="gosearch" class="btn btn-default">Search</button>'+
        '<button  class="btn btn-default"  onclick="toggleSettings();"><i style="color: #777;"  class="fa fa-cog fa-1x fa-fw"></i></button>'+
        '</span></div></div>');

      //Add call-answare-modal
      $(document.body).append('<div class="modal fade" id="myModal" role="dialog"><div class="modal-dialog modal-lg"><div class="modal-content"><div class="modal-body">'+
        '<div class="information" id="modalinfo"></div>'+
        '<div class="modal-footer">'+
        '<button type="button" id="btn-accept" class=" btn btn-default" data-dismiss="modal">accept</button>'+
        '<button type="button" id="btn-reject" class=" btn btn-default" data-dismiss="modal">reject</button>'+
        '</div></div></div></div></div>');
      $('#gosearch').on('click',discoverEmail);
    }else{}
  });
  //add settings-form
  $dropDown.append('<div></div><br><div></div>'+
    '<div><form class="form-horizontal" role="form" id="settings" style="display:none;" class="settings">'+
    '<div class="darktext form-group"><label class="col-sm-1 control-label">Stun</label><div class="col-sm-4"> <input id="stun" class="form-control" value="" placeholder="192.168.7.126:3478"></div>'+
    '<label class="col-sm-1 control-label">Turn</label><div class="col-sm-4"> <input id="turn" class="form-control" value="" size="20" placeholder="192.168.7.126"></div>'+
    '<label><input type="checkbox" id="strictice" >use strict</label></div>'+
    '<div class="darktext form-group"><label class="col-sm-1 control-label">user</label><div class="col-sm-4"><input id="turn_user"  class="form-control" value="" size="10" placeholder="wonder"></div>'+
    '<label class="col-sm-1 control-label">pass</label><div class="col-sm-4"><input id="turn_pass"  class="form-control" value="" size="10" type="password" /></div></div>'+
    '<div class="darktext form-group"><div class="col-sm-6"></div><div class="col-sm-4"><select  value="" class="darktext" id="camResolution"></select></div>'+
    '<div class="col-sm-2"><button type="submit" id="saveConfig" class="btn btn-default btn-sm" >Save profile</button></div></div>'+
    '</form></div>');
$('#settings').on('submit',saveProfile);
$('#settings').on('submit',toggleSettings);
fillResoultionSelector();
loadProfile();
}).catch(function(reason) {
  console.error(reason);
});



function getListOfHyperties(domain) {

  let hypertiesURL = 'https://catalogue.' + domain + '/.well-known/hyperty/';
  if (config.development) {
    hypertiesURL = 'https://' + domain + '/.well-known/hyperty/Hyperties.json';
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
  let hypertyPath = 'hyperty-catalogue://catalogue.' + domain + '/.well-known/hyperty/' + hypertyName;
  if (config.development) {
    hypertyPath = 'hyperty-catalogue://' + domain + '/.well-known/hyperties/' + hypertyName;
  }
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
  $('.hyperty-panel').html('<p>Hyperty Observer URL:<br>' + result.runtimeHypertyURL + '</p>');
  initListeners();
  $.getScript("../src/adapter.js");
  hyperty.myUrl = result.runtimeHypertyURL;
  hypertyDiscovery = result.instance.hypertyDiscovery;

}

function addContent() {
  var place = document.getElementById("box1");
  $(place).html(
    '<div class="hyperty-panel"></div>'+
    '<div class="send-panel"></div>'+
    '<div class="invitation-panel"></div>'+
    '<div id="video"class="hide">'+
      '<video id="remoteVideo" class="block7 " autoplay poster="web/media/load3.gif" ></video>'+
      '<video id="localVideo" class="block3 " autoplay poster="web/media/load3.gif" ></video>'+
      '<button id="hangup"  class="btn btn-default btn-sm ">hangup</button>'+
    '</div>');
  $('#hangup').on('click',hangup);

}

function webrtcconnectToHyperty(event) {
  event.preventDefault();
  saveProfile();
  getIceServers();
  prepareMediaOptions();
  let toHyperty = $(event.currentTarget).find('.webrtc-hyperty-input').val();
  $('.invitation-panel').html('<center><br><i style="color: #e20074;" class="center fa fa-cog fa-spin fa-5x fa-fw"></i></center><p>wait for answer...</p>');
  console.log(toHyperty);
  $('.send-panel').addClass('hide');
  hyperty.connect(toHyperty)
  .then(function(obj) {
    console.log('Webrtc obj: ', obj);
  })
  .catch(function(reason) {
    console.error(reason);
  });
}

function hangup (){
  hyperty.disconnect();
}

function fillmodal(calleeInfo){
  $('#modalinfo').html(
//  '<div class="container-fluid"><div class="row"><div class="col-sm-2 avatar"><img src="' + calleeInfo.infoToken.picture + '" ></div>'+
  '<div class="container-fluid"><div class="row"><div class="col-sm-2 avatar"><img src="" ></div>'+
  '<div class="col-sm-9 col-sm-offset-1"><div><span class=" black-text">Name: '+ calleeInfo.infoToken.name + '</span></div><div><span class=" black-text">Email: ' + calleeInfo.infoToken.email + '</span></div><div><span class=" black-text">Ort: ' + calleeInfo.infoToken.locale + '</span></div>' +
  '</div></div></div>');
}


// receiving code here
function initListeners() {
  hyperty.addEventListener('invitation', function(identity) {
    console.log('Invitation event received from:', identity);
    $('.invitation-panel').html('<p> Invitation received from:\n ' + identity.email +  '</p>');
    fillmodal(identity);
    prepareMediaOptions();
  });

  hyperty.addEventListener('incomingcall', function(data) {
    console.log('incomingcall received');
    $('#myModal').find('#btn-accept').on('click', ()=>{hyperty.invitationAccepted(data)});
    $('#myModal').find('#btn-reject').on('click', ()=>{hangup});
    $('#myModal').modal('show');

    console.log('>>>data', data);
    // if (!confirm('Incoming call. Answer?')) return false;
    // hyperty.invitationAccepted(data);
  });

  hyperty.addEventListener('localvideo', function(stream) {
    console.log('local stream received');
    document.getElementById('localVideo').srcObject = stream;
  });

  hyperty.addEventListener('remotevideo', function(stream) {
    console.log('remotevideo received');
    document.getElementById('remoteVideo').srcObject = stream;
    $('#video').removeClass('hide');
  });

   hyperty.addEventListener('disconnected', function() {
    console.log('>>>disconnected');
    $('.send-panel').removeClass('hide');
    $('.webrtcconnect').empty();
    $('.invitation-panel').empty();
    $('#video').addClass('hide');
  });
}

function discoverEmail(event) {
  if(event){event.preventDefault();}

  var email = $('.searchemail').find('.friend-email').val();
  var domain = $('.searchemail').find('.friend-domain').val();
  console.log('>>>email',email,domain);
  hypertyDiscovery.discoverHypertyPerUser(email, domain)
  .then(function (result) {
    $('.send-panel').html('<br><form class="webrtcconnect">' +
      '<input type="text" class="webrtc-hyperty-input form-control ">' +
      '<button type="submit" class="btn btn-default btn-sm btn-block ">webRTC to Hyperty </button>'+
      '</form><br>');
    $('.send-panel').find('.webrtc-hyperty-input').val(result.hypertyURL);
    $('.webrtcconnect').on('submit', webrtcconnectToHyperty);
    $('.webrtcconnect').find("button").focus();
  }).catch(function (err) {
    console.error('Email Discovered Error: ', err);
  });
}

// ###################################################################################################################
// ################################## Profile-Settings ###################################################################
// ###################################################################################################################

var PROFILE_KEY = "WEBRTC-SIMPLE-SETTINGS";

function getIceServers() {
  var stun = $("#stun").val();
  var turn = $("#turn").val();
  var turn_user = $("#turn_user").val();
  var turn_pass = $("#turn_pass").val();
  var mode = $("#strictice").is(':checked') ?  "strictice" : null ;
  console.log('>>>mode:', mode);
  var iceServers = [];
  if (stun)
    iceServers.push({urls: "stun:" + stun});
  if (turn)
    iceServers.push({
      urls: "turn:" + turn,
      username: turn_user,
      credential: turn_pass
    });
  hyperty.setIceServer(iceServers,mode);
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
  $("#settings :checkbox").each(function (i) {
    profile[$(this).attr('id')] = $(this).is(':checked');
  });
  $("#settings #camResolution").each(function (i) {
    profile[$(this).attr('id')] = $(this).val();
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
    var target;
    for (var key in profile) {
      target=$("#settings #" + key);
      if (target[0]){
        target.attr('type') != "checkbox" ? target.val(profile[key]) : target.attr('checked', profile[key]);
      }
    }
  }
}

var resolutions = {
  "any": "--- any ---",
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
  var mediaOptions = {
    'audio': true,
    'video': true
  };
  var selectedRes = $("#camResolution").val();
  console.log("Selected Resolution: " + selectedRes);
  if ( selectedRes !== "any") {
    var resolutionArr = selectedRes.split("x");
    console.log("minWidth: " + resolutionArr[0]);
    mediaOptions.video = {
      width: { exact : resolutionArr[0] },
      height: { exact : resolutionArr[1] }
    };
  }
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
