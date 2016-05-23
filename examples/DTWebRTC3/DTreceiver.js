var hyperty;

function hypertyLoaded(result) {
  hyperty = result.instance;
  console.log("hypertyObserver: ", hyperty);
  addContent();
  $('.selection-panel').hide();
  $('.hyperty-panel').append('<p>Hyperty Observer URL:<br>' + result.runtimeHypertyURL + '</p>');
  hyperty.myUrl = result.runtimeHypertyURL;
	initListeners();
}

function addContent() {
  var place = document.getElementById("box1");
  $(place).empty();
  $(place).append(' <div class="selection-panel"></div>
                    <div class="hyperty-panel"></div>
                    <div class="my-panel">
                      <input id="slider1" type="range" min="0" max="100" value="0" step="1" onchange="showValue(this.value)" />
                      <span id="myrange">0</span>
                    </div>
                    <div class="invitation-panel"></div>
                    <div id="smth">
                      <video id="remoteVideo" autoplay style="width: 500px; float: left; margin-right: 20px; border: 1px solid grey;"></video>
                      <video id="localVideo" autoplay style="width: 200px; border: 1px solid grey;">PENIS HIHII</video>
                    </div>
                    <div class="send-panel"></div>');
}

// send back methods
function showValue(newValue) { // when slider is moved by the receiver
  $('#myrange').html(newValue);
  updateDataObject(newValue);
}

function updateDataObject(v) { // send it to the sender
  console.log("new slider value: ", v);

  if (!hyperty.connectedBack) {
    console.log("[receiver] [updateDataObject] connect toHyperty: ", hyperty.counterpart);
    connectBack(hyperty.counterpart);
  } else {
    console.log("[receiver] [updateDataObject] connected toHyperty: ", hyperty.counterpart);
    hyperty.slideback($("#slider1").val());
  }
}

function connectBack(toHyperty) {
  hyperty.connect(toHyperty)
  .then(function(obj) {
    console.log('Slider obj: ', obj);
    hyperty.connectedBack = true;
    console.log("[receiver] [updateDataObject] now calling slideback");
    hyperty.slideback($("#slider1").val());
  })
	.catch(function(reason) {
    console.error(reason);
    //reject(reason); // is not caught
  });
}

// helping functions
// receiving code here
function initListeners() {
	hyperty.addEventListener('invitation', function(identity) {
    console.log('Invitation event received from:', identity);
    $('.invitation-panel').append(`<p> Invitation received from:\n ` + identity.email +  '</p>');
  });

  hyperty.addEventListener('slide', function(event) {
    console.log('Slide event received:', event);
    $("#slider1").val(event.slider);
    $("#myrange").html(event.slider);
    $("#smth").html(event.reporter);
    $("#smth").append(event);
    if (!hyperty.counterpart)
      hyperty.counterpart = event.reporter;
  });

  hyperty.addEventListener('webrtcreceive', function(event) {
    console.log('Webrtc receive event received:', event);
    switch(event.webrtc.data.body.type){
        case 'invitation':         handleInvite(event.webrtc.data); break;
        case 'accepted':         handleAccepted(event.webrtc.data); break;
        case 'icecandidate': handleIceCandidate(event.webrtc.data); break;
    }
  });

}