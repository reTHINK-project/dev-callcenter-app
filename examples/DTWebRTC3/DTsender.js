var hyperty;

function hypertyLoaded(result) {
  hyperty = result.instance;
  console.log("hypertyReporter: ", hyperty);
  addContent();
  $('.selection-panel').hide();
  $('.hyperty-panel').append('<p>Hyperty Reporter URL:<br>' + result.runtimeHypertyURL + '</p>');
  $('.send-panel').append('<form class="connect">Hyperty URL: ' +
                   				'<input class="to-hyperty-input" type="text" name="toHyperty">' +
                   				'<br>' +
                   				'<input type="submit" value="connect">' +
                   				'</form>');
  $('.connect').on('submit', connectToHyperty);
  $('.send-panel').append('<form class="invite">Hyperty URL: ' +
                          '<input class="webrtc-hyperty-input" type="text" name="webrtcHyperty">' +
                          '<br>' +
                          '<input type="submit" value="webrtcconnect">' +
                          '</form>');
  $('.webrtcconnect').on('submit', webrtcconnectToHyperty);
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
                      <video id="localVideo" autoplay style="width: 200px; border: 1px solid grey;"></video>
                    </div>
                    <div class="send-panel"></div>');
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
  })
  .catch(function(reason) {
    console.error(reason);
    // reject(reason);
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
}
