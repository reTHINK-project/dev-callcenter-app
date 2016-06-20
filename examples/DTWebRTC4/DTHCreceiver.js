var hyperty;

function hypertyLoaded(result) {
  hyperty = result.instance;
  console.log("hypertyObserver: ", hyperty);
  addContent();
  $('.selection-panel').hide();
  $('.hyperty-panel').append('<p>Hyperty Observer URL:<br>' + result.runtimeHypertyURL + '</p>');
  hyperty.myUrl = result.runtimeHypertyURL;
	initListeners();
  $.getScript("/examples/DTWebRTC4/adapter.js");
}

function addContent() {
  var place = document.getElementById("box1");
  $(place).empty();
  $(place).append('<div class="selection-panel"></div>'+
                  '<div class="hyperty-panel"></div>'+
                  '<div class="my-panel"></div>'+
                  '<div class="send-panel"></div>'+
                  '<br>' +
                  '<div class="invitation-panel"></div>'+
                  '<div id="smth"></div>'+
                  '<div id="smth2">'+
                    '<video id="remoteVideo" class="block7" autoplay style="border: 1px solid grey;"></video>'+
                    '<video id="localVideo" class="block3" autoplay style="border: 1px solid grey;"></video>'+
                  '</div>');
}

function initListeners() {
	hyperty.addEventListener('invitation', function(identity) {
    console.log('Invitation event received from:', identity);
    $('.invitation-panel').append(`<p> Invitation received from:\n ` + identity.email +  '</p>');
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