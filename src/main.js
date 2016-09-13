// jshint browser:true, jquery: true
// jshint varstmt: true
import rethink from '../resources/factories/rethink';
import config from '../config.json';

window.KJUR = {};

let HYPERTY_NAME = "DTWebRTC";
let hyperty;
let runtimeLoader;
let autoConnect = false;

rethink.install(config).then(function(result) {
  runtimeLoader = result;

  console.info('Runtime Installed in production mode:', result);

}).then( function(hyperties) {

  // init some click handlers
  $('#gosearch').on('click', discoverEmail);
  $('#settings').on('submit', saveProfile);
  $('#settings').on('submit', toggleSettings);

  fillResoultionSelector();
  loadProfile();

  // actually load the hyperty
  loadHyperty((0, HYPERTY_NAME));

}).catch(function(reason) {
  console.error(reason);
});

function loadHyperty(hypertyName) {
  let hypertyPath = 'hyperty-catalogue://catalogue.' + config.domain + '/.well-known/hyperty/' + hypertyName;
  runtimeLoader.requireHyperty(hypertyPath).then(
    hypertyLoaded
  ).catch(
    hypertyFail
  );
}

function hypertyFail(reason) {
  console.error(reason);
}

// ###################################################################################################################
// ################################## DTCallCenter ###################################################################
// ###################################################################################################################

function hypertyLoaded(result) {
  hyperty = result.instance;
  hyperty.myUrl = result.runtimeHypertyURL;
  addContent();

  // get registered user
  hyperty.identityManager.discoverUserRegistered().then((identity) => {
    console.log("[DTWebRTC.main]: registered user is: ", identity);
    hyperty.myIdentity = identity;
    let userInfo = "<p>Authenticated as: <br> " +
        (hyperty.myIdentity.avatar ? '<img src="' + hyperty.myIdentity.avatar + '" class="logo" />' : "") + "<br>" +
        (hyperty.myIdentity.cn ? hyperty.myIdentity.cn : "") + ", " +
        (hyperty.myIdentity.username ? hyperty.myIdentity.username : "") +
      "</p>";
      $('.hyperty-panel').html( userInfo + '<p>Hyperty URL:<br>' + result.runtimeHypertyURL + '</p>');
  }).catch((reason) => {
    console.log("[DTWebRTC.main]: error while discovery of registered user. Error is ", reason);
    $('.hyperty-panel').html( userInfo + '<p>Hyperty URL:<br>' + result.runtimeHypertyURL + '</p>');
  });

  initListeners();
  $.getScript("../src/adapter.js");

  console.log("[DTWebRTC.main]:############ hyperty loaded, result is:", result);

  // try to perform an automatic discovery and connect, if suitable params where given
  tryAutoConnect();
}

function tryAutoConnect() {
  // extract params from browser url (found here: http://stackoverflow.com/questions/979975/how-to-get-the-value-from-the-get-parameters)
  var params = window.location.search
  .substring(1)
  .split("&")
  .map(v => v.split("="))
  .reduce((map, [key, value]) => map.set(key, decodeURIComponent(value)), new Map());

  let uid = params.get("target_uid");
  let domain = params.get("target_domain");

  console.log("[DTWebRTC.main]:############# URL: " + window.location.search);
  console.log("[DTWebRTC.main]:############# uid: " + uid);
  console.log("[DTWebRTC.main]:############# domain: " + domain);

  // put them to the search fields
  if (uid && domain) {
    $('.searchemail').find('.friend-email').val(uid);
    $('.searchemail').find('.friend-domain').val(domain);
    // and start discovery automatically
    autoConnect = true;
    discoverEmail();
  }
}

function addContent() {
  var place = document.getElementById("content");
  $(place).html(
    '<div class="hyperty-panel"></div>' +
    '<div class="send-panel"></div>' +
    '<div class="invitation-panel"></div>' +
    '<div id="video"class="hide">' +
    '<video id="remoteVideo" class="block7 " autoplay poster="web/media/load3.gif" ></video>' +
    '<video id="localVideo" class="block3 " autoplay poster="web/media/load3.gif" ></video>' +
    '<button id="hangup"  class="btn btn-default btn-sm ">hangup</button>' +
    '</div>');
  $('#hangup').on('click', hangup);
}

function webrtcconnectToHyperty(event) {
  if (event) {
    event.preventDefault();
  }
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

function hangup() {
  hyperty.disconnect();
}

function fillmodal(calleeInfo) {
  let picture = calleeInfo.infoToken ? calleeInfo.infoToken.picture : calleeInfo.userProfile ? calleeInfo.userProfile.avatar : "";
  let name = calleeInfo.infoToken ? calleeInfo.infoToken.name : calleeInfo.userProfile ? calleeInfo.userProfile.cn : "";
  let email = calleeInfo.infoToken ? calleeInfo.infoToken.email : calleeInfo.userProfile ? calleeInfo.userProfile.username : "";
  let locale = calleeInfo.infoToken ? calleeInfo.infoToken.locale : calleeInfo.userProfile ? calleeInfo.userProfile.locale : "";
  $('#modalinfo').html(
    '<div class="container-fluid"><div class="row"><div class="col-sm-2 avatar"><img src="' + picture + '" ></div>' +
    '<div class="col-sm-9 col-sm-offset-1"><div><span class=" black-text">Name: ' + name + '</span></div><div><span class=" black-text">Email: ' + email + '</span></div><div><span class=" black-text">Ort: ' + locale + '</span></div>' +
    '</div></div></div>');
}


// receiving code here
function initListeners() {

  hyperty.addEventListener('invitation', function(identity) {
    console.log('incomingcall event received from:', identity);
    $('.invitation-panel').html('<p> Invitation received from:\n ' + identity.email ? identity.email : identity.username + '</p>');
    fillmodal(identity);
    prepareMediaOptions();
  });

  hyperty.addEventListener('incomingcall', function(data) {
    $('#myModal').find('#btn-accept').on('click', () => {
      hyperty.invitationAccepted(data);
    });
    $('#myModal').find('#btn-reject').on('click', () => {
      hangup
    });
    $('#myModal').modal('show');

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
    $('.invitation-panel').empty();
  });

  hyperty.addEventListener('disconnected', function() {
    console.log('>>>disconnected');
    $('.send-panel').removeClass('hide');
    $('.webrtcconnect').empty();
    $('.invitation-panel').empty();
    document.getElementById('localVideo').src = "";
    document.getElementById('remoteVideo').src = "";
    $('#video').addClass('hide');
  });
}

function discoverEmail(event) {
  if (event) {
    event.preventDefault();
  }

  var email = $('.searchemail').find('.friend-email').val();
  var domain = $('.searchemail').find('.friend-domain').val();
  console.log('>>>email', email, domain);

  var msg = 'searching for:  ' + email + ' in domain:  ' + domain + ' ...';
  if ( ! domain )
    msg = 'searching for:  ' + email + ' in the own domain ...';

  $('.send-panel').html(msg);

  hyperty.discovery.discoverHypertyPerUser(email, domain)
    .then(function(result) {
      $('.send-panel').html(
        '<br><form class="webrtcconnect">' +
          '<input type="text" class="webrtc-hyperty-input form-control ">' +
          '<button type="submit" class="btn btn-default btn-sm btn-block ">webRTC to Hyperty </button>' +
        '</form><br>');
      $('.send-panel').find('.webrtc-hyperty-input').val(result.hypertyURL);
      $('.webrtcconnect').on('submit', webrtcconnectToHyperty);
      $('.webrtcconnect').find("button").focus();
      // if params where given and automatic search was done, do an auto-connect to the disocvered Hyperty
      if (autoConnect) {
        console.log("[DTWebRTC.main]:performing an auto-connect to the discoverd hyperty ...");
        $('.webrtcconnect').find("button").click();
        // webrtcconnectToHyperty();
      }
    }).catch(function(err) {
      $('.send-panel').html(
        '<div>No hyperty found!</div>'
      );
      console.error('Email Discovered Error: ', err);
    });
}

// ###################################################################################################################
// ################################## Profile-Settings ###################################################################
// ###################################################################################################################

var PROFILE_KEY = "WEBRTC-SIMPLE-SETTINGS";

function getIceServers() {
  //  {"url":"stun:stun.l.google.com:19302"},
  //  {"url":"turn:185.17.229.168:3478","credential":"luis123","username":"luis"}

  var stun = $("#stun").val();
  var turn = $("#turn").val();
  var turn_user = $("#turn_user").val();
  var turn_pass = $("#turn_pass").val();
  var mode = $("#strictice").is(':checked') ? "strictice" : null;
  console.log('>>>mode:', mode);
  var iceServers = [];
  if (!turn) {
    turn = "numb.viagenie.ca";
    turn_user = "steffen.druesedow@telekom.de";
    turn_pass = "w0nd3r";
  }
  if (stun)
    iceServers.push({
      urls: "stun:" + stun
    });
  if (turn)
    iceServers.push({
      urls: "turn:" + turn,
      username: turn_user,
      credential: turn_pass
    });
  hyperty.setIceServer(iceServers, mode);

}

function saveProfile() {
  event.preventDefault();
  var profile = {};
  console.log("[DTWebRTC.main]:save profile " + PROFILE_KEY);
  // transfer all values from all text-inputs of the settings div to profile
  $("#settings :text").each(function(i) {
    profile[$(this).attr('id')] = $(this).val();
  });
  $("#settings  :password").each(function(i) {
    profile[$(this).attr('id')] = $(this).val();
  });
  $("#settings :checkbox").each(function(i) {
    profile[$(this).attr('id')] = $(this).is(':checked');
  });
  $("#settings #camResolution").each(function(i) {
    profile[$(this).attr('id')] = $(this).val();
  });

  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function loadProfile() {
  console.log("[DTWebRTC.main]:loading profile " + PROFILE_KEY);
  var profile = null;
  var s = localStorage.getItem(PROFILE_KEY);
  if (s) {
    try {
      profile = JSON.parse(s);
    } catch (e) {
      console.log("[DTWebRTC.main]:error while parsing settings from local storage");
    }
  }
  if (profile !== null) {
    var target;
    for (var key in profile) {
      target = $("#settings #" + key);
      if (target[0]) {
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
  console.log("[DTWebRTC.main]:Selected Resolution: " + selectedRes);
  if (selectedRes !== "any") {
    var resolutionArr = selectedRes.split("x");
    console.log("[DTWebRTC.main]:minWidth: " + resolutionArr[0]);
    mediaOptions.video = {
      width: {
        exact: resolutionArr[0]
      },
      height: {
        exact: resolutionArr[1]
      }
    };
  }
  hyperty.setMediaOptions(mediaOptions);
}

function fillResoultionSelector() {
  $("#camResolution")
  var mySelect = $("#camResolution")
  $.each(resolutions, function(val, text) {
    mySelect.append(
      $('<option></option>').val(val).html(text)
    );
  });
}
