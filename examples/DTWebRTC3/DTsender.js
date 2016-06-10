var hyperty;

function hypertyLoaded(result) {
  hyperty = result.instance;
  console.log("HHHHHHHHHHHHHHHHHHHHHHHHHHHhypertyReporter: ", result);
  addContent();
  $('.hyperty-panel').append('<p>Hyperty Reporter URL:<br>' + result.runtimeHypertyURL + '</p>');
  
  

  
  initListeners();
  $.getScript("/examples/DTWebRTC3/adapter.js");

  // Prepare to discover email:
  var hypertyDiscovery = result.instance.hypertyDiscovery;
  discoverEmail(hypertyDiscovery);
   // hyperty.showidentity();

 }


 function addContent() {
  var place = document.getElementById("box1");
  $(place).empty();
  $(place).append('<div class="selection-panel"></div>'+
    '<div class="hyperty-panel"></div>'+
    '<div class="email-panel"></div>'+
    '<div class="send-panel"></div>'+
    '<div class="invitation-panel"></div>'+
    '<div id="smth"></div>'+
    '<div id="smth2">'+
    '<video id="remoteVideo" class="block hide" autoplay "></video>'+
    '<video id="localVideo" class="halfblock hide" autoplay "></video>'+
    '</div>');
}

function webrtcconnectToHyperty(event) {
  event.preventDefault();
  let toHypertyForm = $(event.currentTarget);
  let toHyperty = toHypertyForm.find('.webrtc-hyperty-input').val();
  toHypertyForm.append('<center><br><i style="color: #e20074;"" class="center fa fa-cog fa-spin fa-5x fa-fw"></i></center>');
  console.log(toHyperty);

  hyperty.webrtcconnect(toHyperty)
  .then(function(obj) {
    console.log('Webrtc obj: ', obj);
    hyperty.invite();
    $('.send-panel').addClass('hide');
    $('#smth2').find('.hide').removeClass('hide');
  })
  .catch(function(reason) {
    console.error(reason);
  });
}

// helping functions
// receiving code here
function initListeners () {
  hyperty.addEventListener('invitation', function(identity) {
    console.log('Invitation event received from:', identity);
    $('.invitation-panel').append('<p> Invitation received from:\n ' + identity.email +  '</p>');
  });

  hyperty.addEventListener('webrtcreceive', function(event) {
    console.log('Webrtc receive event received:', event);
    switch(event.webrtc.msg.body.type){
      case 'invitation':         hyperty.handleInvite(event.webrtc.msg, event.reporter); break;
      case 'accepted':         hyperty.handleAccepted(event.webrtc.msg); break;
      case 'icecandidate': hyperty.handleIceCandidate(event.webrtc.msg); break;
    }
  });
}


// #############################-EMAIL-DISCOVER-############################################


function discoverEmail(hypertyDiscovery) {

  var email = $('.searchemail').find('.friend-email').val();
  console.log('>>>>><',email);
  hypertyDiscovery.discoverHypertyPerUser(email, 0)
  .then(function (result) {
    console.log('öööööööööööööööööööö',result )
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
