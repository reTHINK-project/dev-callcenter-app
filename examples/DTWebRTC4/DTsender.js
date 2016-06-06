var hyperty;

function hypertyLoaded(result) {
  hyperty = result.instance;
  console.log("hypertyReporter: ", result);
  addContent();
  $('.hyperty-panel').append('<p>Hyperty Reporter URL:<br>' + result.runtimeHypertyURL + '</p>');
  $('.send-panel').append('<form class="webrtcconnect">' +
                            '<input type="text" class="webrtc-hyperty-input block"  placeholder="awesome Hyperty-URL" name="webrtctoHyperty">' +
                            '<input type="submit" class="block" value="webRTC to Hyperty">' +
                          '</form>');
  $('.webrtcconnect').on('submit', webrtcconnectToHyperty);
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
                  '<br>' +
                  '<div class="invitation-panel"></div>'+
                  '<div id="smth"></div>'+
                  '<div id="smth2">'+
                    '<video id="remoteVideo" class="block" autoplay style="border: 1px solid grey;"></video>'+
                    '<video id="localVideo" class="halfblock" autoplay style="border: 1px solid grey;"></video>'+
                  '</div>');
}

function showValue(v) {
  $('#myrange').html(v);
	hyperty.slide(v);
}

function connectToHyperty(event) {
  event.preventDefault();
  let toHypertyForm = $(event.currentTarget);
  let toHyperty = toHypertyForm.find('.to-hyperty-input').val();
  console.log(toHyperty);

  hyperty.connect(toHyperty)
  .then(function(obj) {
    console.log('Slider obj: ', obj);
    $('.connect').hide();
  })
  .catch(function(reason) {
    console.error(reason);
    // reject(reason);
  });
}

function webrtcconnectToHyperty(event) {
  event.preventDefault();
  let toHypertyForm = $(event.currentTarget);
  let toHyperty = toHypertyForm.find('.webrtc-hyperty-input').val();
  console.log(toHyperty);

  hyperty.webrtcconnect(toHyperty)
  .then(function(obj) {
    console.log('Webrtc obj: ', obj);
    $('.webrtcconnect').hide();
    hyperty.invite();
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
    $('.invitation-panel').append(`<p> Invitation received from:\n ` + identity.email +  '</p>');
  });

  hyperty.addEventListener('slideback', function(event) {
    console.log('Slideback event received on sender side:', event);
    $("#slider1").val(event.slider);
    $("#myrange").html(event.slider);
    $("#smth").html(event.reporter);
    $("#smth").append(event);
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
