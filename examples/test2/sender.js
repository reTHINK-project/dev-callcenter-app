var hyperty

function hypertyLoaded(result) {
  hyperty = result.instance;
  console.log(hyperty);
  $('.selection-panel').hide();
  $('.hyperty-panel').append('<p>Hyperty Reporter URL:<br>' + result.runtimeHypertyURL + '</p>');
  $('.hello-panel').append( '<form class="say-hello">Hyperty URL: ' +
                   				'<input class="to-hyperty-input" type="text" name="toHyperty">' +
                   				'<br>' +
                   				'<input type="submit" value="connect">' +
                   				'</form>');
  $('.say-hello').on('submit', connectToHyperty);
	initListeners();

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
  .then(function(helloObject) {
    console.log('helloObject: ', helloObject);
    $('.hello-panel').hide();
  }).catch(function(reason) {
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
