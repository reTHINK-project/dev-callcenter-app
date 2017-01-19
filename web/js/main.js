
window.KJUR = {};

let STATE = {
  INITIALIZING       : 0,
  INITIALIZED        : 1,
  DISCOVERY          : 2,
  WEBRTC_CONNECTING  : 3,
  WEBRTC_CONNECTED   : 4,
  WEBRTC_DISCONNECTED: 5,
  CHAT_CONNECTED     : 6,
  CHAT_CLOSED        : 7,
}
let status = STATE.INITIALIZING;

let HYPERTY_WEBRTC = "DTWebRTC";
let HYPERTY_CHAT = "GroupChatManager";
let hypertyWebRTC;
let hypertyChat;
let hypertyChatUrl;
let chat;

let runtimeLoader;
let searchResults = [];

setState( STATE.INITIALIZING );

function setState(newStatus) {
  switch (newStatus) {
    case STATE.INITIALIZING:
      $('#info').addClass('hide');
      $('#video').addClass('hide');
      $('#chat').addClass('hide');
      break;

    case STATE.HYPERTIES_LOADED:
      $('#info').removeClass('hide');
      $('#video').addClass('hide');
      $('#chat').addClass('hide');
      break;

    case STATE.DISCOVERY:
      $('#info').removeClass('hide');
      $('.send-panel').removeClass('hide');
      $('#video').addClass('hide');
      $('#chat').addClass('hide');
      break;

    case STATE.WEBRTC_CONNECTING:
      $('#info').removeClass('hide');
      $('.send-panel').addClass('hide');
      $('#video').addClass('hide');
      adjustWidth();
      break;

    case STATE.WEBRTC_CONNECTED:
      $('#info').addClass('hide');
      $('#video').removeClass('hide');
      $('#remoteVideo').removeClass('smallVideo').addClass('fullVideo');
      $('#localVideo').removeClass('fullVideo').addClass('smallVideo');
      $('.invitation-panel').empty();
      adjustWidth();
      break;

    case STATE.WEBRTC_DISCONNECTED:
      console.log('>>>disconnected');
      $('#info').removeClass('hide');
      $('#video').addClass('hide');
      $('#myModal').modal('hide');
      $('.send-panel').addClass('hide');
      $('.webrtcconnect').empty();
      $('.invitation-panel').empty();
      let rv = document.getElementById('remoteVideo');
      let lv = document.getElementById('localVideo');
      $('#localVideo').removeClass('smallVideo').addClass('fullVideo');
      $('#remoteVideo').removeClass('fullVideo').addClass('smallVideo');
      rv.src = "";
      lv.src = "";
      adjustWidth();
      break;

    case STATE.CHAT_CONNECTED:
      $('#info').addClass('hide');
      $('#chat').removeClass('hide');
      adjustWidth();
      break;

    case STATE.CHAT_CLOSED:
      $('#chat').addClass('hide');
      adjustWidth();
      break;

    default:
  }
  status = newStatus;
}

function adjustWidth() {
  let chat  = ! $('#chat').hasClass('hide')
  let video = ! $('#video').hasClass('hide')
  if ( chat && video ) {
    $('#video').addClass('col-sm-8');
    $('#chat').addClass('col-sm-4');
  }
  else if ( chat ) {
    $('#video').removeClass('col-sm-12');
    $('#video').removeClass('col-sm-8');
    $('#chat').removeClass('col-sm-4');
    $('#chat').addClass('col-sm-12');
  }
  else if ( video ) {
    $('#video').removeClass('col-sm-8');
    $('#video').addClass('col-sm-12');
    $('#chat').removeClass('col-sm-4');
    $('#chat').removeClass('col-sm-12');
  }
  else {
    $('#info').removeClass('hide');
  }
}


rethink.default.install(config).then(function(result) {
  runtimeLoader = result;

  console.info('Runtime Installed in production mode:', result);

}).then( function(hyperties) {

  // init some click handlers
  $('#gosearch').on('click', discoverEmail);
  $('#settings').on('submit', () => { saveProfile() });
  $('#settings').on('submit', toggleSettings);

  fillResoultionSelector();
  loadProfile();

  // actually load the hyperty
  loadHyperties();

}).catch(function(reason) {
  console.error(reason);
});

function loadHyperties() {
  let hypertyPathWebRTC = 'hyperty-catalogue://catalogue.' + config.domain + '/.well-known/hyperty/' + HYPERTY_WEBRTC;
  let hypertyPathChat   = 'hyperty-catalogue://catalogue.' + config.domain + '/.well-known/hyperty/' + HYPERTY_CHAT;
  runtimeLoader.requireHyperty(hypertyPathWebRTC).then( (result) => {
    hypertyWebRTC = result.instance;
    hypertyWebRTC.myUrl = result.runtimeHypertyURL;

    runtimeLoader.requireHyperty(hypertyPathChat).then((result) => {
      hypertyChat =  result.instance;
      hypertyChatUrl = result.runtimeHypertyURL;
      chat = new Chat(result, document.getElementById("chat-content"), document.getElementById("chat-input") );
      chat.onNewChat( (identity) => {
        console.log("[DTWebRTC.main] onNewChat event with identity: ", identity);
        onChatInvitation(identity)
      });


      hypertiesLoaded();
    }).catch(
      hypertyFail
    )
  }).catch(
    hypertyFail
  );
}

function hypertyFail(reason) {
  console.error(reason);
}



// ###################################################################################################################
// ################################## DTCallCenter ###################################################################
// ###################################################################################################################

function hypertiesLoaded() {
  setState(STATE.HYPERTIES_LOADED);

  // WEBRTC control listeners
  $('#hangup').on('click', hangup);
  $('#local-audio').on('click', () => {
    // let the hyperty switch stream-tracks
    hypertyWebRTC.switchLocalAudio( $('#local-audio').is(":checked") )
  });
  $('#local-video').on('click', () => {
    // let the hyperty switch stream-tracks
    hypertyWebRTC.switchLocalVideo( $('#local-video').is(":checked") )
  });

  $('#remote-audio').on('click', () => {
    console.log('[DTWebRTC] --> setting remote audio to: ' + $('#remote-audio').is(":checked"));
    let rv = document.getElementById('remoteVideo');
    rv.muted = $('#remote-audio').is(":checked");
  })
  ;
  $('#remote-video').on('click', () => {
    console.log('[DTWebRTC] --> setting remote video to: ' + $('#remote-video').is(":checked"));
    let rv = document.getElementById('remoteVideo');
    if ($('#remote-video').is(":checked"))
       rv.play();
    else
      rv.pause();
  });

  // CHAT control listeners
  $('#leaveChat').on('click', () => {
    chat.close();
    setState(STATE.CHAT_CLOSED);
  });

  // get registered user
  hypertyWebRTC.search.myIdentity().then(function(identity) {
    console.log("[DTWebRTC.main]: registered user is: ", identity);
    hypertyWebRTC.myIdentity = identity;
    let info = "Authenticated as:</br>" + identity.cn + ",  " + identity.username + '<img src="' + hypertyWebRTC.myIdentity.avatar + '" class="logo" /></br>' +
               "WebRTC Hyperty URL:  " + hypertyWebRTC.myUrl + "</br>" +
               "Chat Hyperty URL:  " + hypertyChatUrl + "</br>";
      $('.hyperty-panel').html( info );
  }).catch((reason) => {
    console.log("[DTWebRTC.main]: error while discovery of registered user. Error is ", reason);
    $('.hyperty-panel').html('<p>WebRTC Hyperty URL:   ' + hypertyWebRTC.myUrl + '</p>' +
                             '<p>Chat Hyperty URL:   ' + hypertyChatUrl + '</p>');
  });

  initListeners();
}

function connect(event) {
  event.preventDefault();
  let resultIndex = event.currentTarget.value;
  console.log("[DTWebRTC.chat] RESULT INDEX = " + resultIndex);
  if ( resultIndex > searchResults.length || resultIndex < 0 ) {
    console.log("[DTWebRTC.main] invalid search result index: " + resultIndex );
    return;
  }
  let h = searchResults[resultIndex];
  if ( h.dataSchemes.indexOf("comm") >=0 ) {
    console.log("[DTWebRTC.chat] CONNECT to TARGET HYPERTY via Chat: ", h);
    doChatConnect(h.hypertyID);
  }
  else {
    console.log("[DTWebRTC.chat] CONNECT to TARGET HYPERTY via WebRTC: ", h);
    doWebRTCConnect(h.hypertyID);
  }

}

function doWebRTCConnect(toHyperty) {
  saveProfile();
  getIceServers();
  prepareMediaOptions();

  setState(STATE.WEBRTC_CONNECTING);
  let connect_html = '<center><br><i style="color: #e20074;" class="center fa fa-cog fa-spin fa-5x fa-fw"></i></center><p>wait for answer...</p>';
  $('.invitation-panel').html(connect_html);

  setTimeout( () => {
    if ( status === STATE.WEBRTC_CONNECTING ) {
      $('.invitation-panel').append( '<button id="cancel"  class="btn btn-default btn-sm ">Cancel</button>' );
      $('#cancel').on('click', hangup );
    }
  }, 6000);

  hypertyWebRTC.connect(toHyperty).then((obj) => {
    console.log('[DTWebRTC.chat] Webrtc obj: ', obj);
  })
  .catch(function(reason) {
    console.error(reason);
  });
}

function doChatConnect(toHyperty) {
  saveProfile();
  chat.create("[DTWebRTC.chat] TestChat", "steffen.druesedow@gmail.com", "matrix2.rethink.com").then(()=>{
    setState(STATE.CHAT_CONNECTED);
  });
}

function sendChatMessage() {
  chat.submitMessage();
  return false;
}

function onChatInvitation(identity) {
  console.log("[DTWebRTC.chat] received chat invitation from identity: ", identity);
  setState(STATE.CHAT_CONNECTED);
}

function hangup() {
  hypertyWebRTC.disconnect();
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

  hypertyWebRTC.addEventListener('incomingcall', (identity) => {
    // preparing the modal dialog with the given identity info
    console.log('[DTWebRTC.chat] incomingcall event received from:', identity);
    $('.invitation-panel').html('<p> Invitation received from:\n ' + identity.email ? identity.email : identity.username + '</p>');
    fillmodal(identity);
    prepareMediaOptions();

    $('#myModal').find('#btn-accept').on('click', () => {
      hypertyWebRTC.acceptCall();
    });
    $('#myModal').find('#btn-reject').on('click', () => {
      hangup();
    });
    $('#myModal').modal('show');

  });

  hypertyWebRTC.addEventListener('localvideo', (stream) => {
    console.log('[DTWebRTC.chat] local stream received');
    document.getElementById('localVideo').srcObject = stream;
  });

  hypertyWebRTC.addEventListener('remotevideo', (stream) => {
    console.log('[DTWebRTC.chat] remotevideo received');
    let rv = document.getElementById('remoteVideo');
    rv.srcObject = stream;
    setState(STATE.WEBRTC_CONNECTED);
  });

  hypertyWebRTC.addEventListener('disconnected', () => {
    setState(STATE.WEBRTC_DISCONNECTED);
  });
}

function discoverEmail(event) {
  if (event) {
    event.preventDefault();
  }
  setState(STATE.DISCOVERY);

  var email = $('.searchemail').find('.friend-email').val();
  var domain = $('.searchemail').find('.friend-domain').val();
  console.log('[DTWebRTC.chat] >>>email', email, domain);

  var msg = 'searching for:  ' + email + ' in domain:  ' + domain + ' ...';
  if ( ! domain )
    msg = 'searching for:  ' + email + ' in the own domain ...';

  $('.send-panel').html(msg);

  // reset global search results
  searchResults = [];

  hypertyWebRTC.search.users([email], [domain], ['connection'], ['audio', 'video']).then( (webRTCResult) => {
    searchResults = webRTCResult;
    return hypertyWebRTC.search.users([email], [domain], ['comm'], ['chat']);
  }).then( (chatResult) => {
    chatResult.forEach( (element) => { searchResults.push(element)} );

    resultHTML = "";
    if ( searchResults.length == 0 ) {
      resultHTML = '<div>No matching hyperties found!</div>';
    }
    else {
      resultHTML = '</p><div>User "' + email + '" is accessible via following Hyperties: </div>'
      for( i = 0; i < searchResults.length; i++ ) {
        let h = searchResults[i];
        console.log("SEARCH-RESULT: " + i, h.hypertyID);
        let type = h.dataSchemes.indexOf("comm") >=0 ? "Chat" : "WebRTC";
        resultHTML += '<br>' +
        '<input type="text" class="hyperty-id" value="' + type + ":   " + h.hypertyID +'">' +
        '<button class="btn btn-default btn-sm btn-block" value="' + i + '" onclick="connect(event)"> Start ' + type + '!</button>';
      }
    }
    $('.send-panel').html( resultHTML );
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
  var mode = $("#strictice").is(':checked') ? "strictice" : null;
  console.log('[DTWebRTC] IceServer mode:', mode);
  var iceServers = [];
  if (!turn || !turn_user || !turn_pass) {
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
  hypertyWebRTC.setIceServer(iceServers, mode);

}

function saveProfile(event) {
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
  hypertyWebRTC.setMediaOptions(mediaOptions);
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
