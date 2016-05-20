var hyperty;

function hypertyLoaded(result) {
  hyperty = result.instance;
  console.log("hypertyReporter: ", hyperty);
  addContent();
  $('.selection-panel').hide();
  $('.hyperty-panel').append('<p>Hyperty Reporter URL:<br>' + result.runtimeHypertyURL + '</p>');
  $('.send-panel').append( '<form class="connect">Hyperty URL: ' +
                   				'<input class="to-hyperty-input" type="text" name="toHyperty">' +
                   				'<br>' +
                   				'<input type="submit" value="connect">' +
                   				'</form>');
  $('.connect').on('submit', connectToHyperty);
	initListeners();
}

function addContent() {
  var place = document.getElementById("box1");
    $(place).empty();
    $(place).append('<div class="selection-panel"></div><div class="hyperty-panel"></div><div class="my-panel"><input id="slider1" type="range" min="0" max="100" value="0" step="1" onchange="showValue(this.value)" /><span id="myrange">0</span></div><div class="invitation-panel"></div><div id="smth"></div><div class="send-panel"></div>');
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

Handlebars.getTemplate = function(name) {
  return new Promise(function(resolve, reject) {
    if (Handlebars.templates === undefined || Handlebars.templates[name] === undefined)
      Handlebars.templates = {};
    else
      resolve(Handlebars.templates[name]);
    $.ajax({
      url: 'templates/' + name + '.hbs',
      success: function(data) {
        Handlebars.templates[name] = Handlebars.compile(data);
        resolve(Handlebars.templates[name]);
      },
      fail: function(reason) {
        reject(reason);
      }
    });
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
