var hyperty;

function hypertyLoaded(result) {
  hyperty = result.instance;
  console.log("hypertyObserver: ", hyperty);
  addContent();
  $('.selection-panel').hide();
  $('.hyperty-panel').append('<p>Hyperty Observer URL:<br>' + result.runtimeHypertyURL + '</p>');
  hyperty.myUrl = result.runtimeHypertyURL;
	initListeners();
  $.getScript("/examples/DTWebRTC3/adapter.js");
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

function connectBack(toHyperty) {
  hyperty.connect(toHyperty)
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

  hyperty.addEventListener('webrtcreceive', function(event) {
    console.log('Webrtc receive event received:', event);
    switch(event.webrtc.msg.body.type){
        case 'invitation':         hyperty.handleInvite(event.webrtc.msg, event.reporter); break;
        case 'accepted':         hyperty.handleAccepted(event.webrtc.msg); break;
        case 'icecandidate': hyperty.handleIceCandidate(event.webrtc.msg); break;
        case 'iceallowed':   hyperty.iceallowed(); break;
    }
  });

}