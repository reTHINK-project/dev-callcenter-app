var hyperty;

function hypertyLoaded(result) {
  hyperty = result.instance;
  console.log("hypertyReporter: ", hyperty);
  addContent();
  $('.selection-panel').hide();
  $('.hyperty-panel').append('<p>Hyperty Reporter URL:<br>' + result.runtimeHypertyURL + '</p>');
  $('.send-panel').append('<form class="connect">' +
                   	        '<input type="text" class="to-hyperty-input"  class="block" placeholder="awesome Hyperty-URL" name="toHyperty">' +
                            '<input type="submit" value="connect to Hyperty">' +
                   				'</form>');
  $('.connect').on('submit', connectToHyperty);
	initListeners();
}

function addContent() {
  var place = document.getElementById("box1");
    $(place).empty();
    $(place).append('<div class="selection-panel"></div>'+
                    '<div class="hyperty-panel"></div>'+
                    '<div class="send-panel"></div>'+
                    '<br>'+
                    '<div class="my-panel">'+
                      '<input id="slider1" type="range" min="0" max="100"  value="0" step="1" onchange="showValue(this.value)" />'+
                      '<span id="myrange">0</span>'+
                    '</div>'+
                    '<div class="invitation-panel"></div>'+
                    '<div id="smth"></div>');
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
