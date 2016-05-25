

// "use strict";

var hyperty

function hypertyLoaded(result) {


  hyperty = result.instance;

  console.log(hyperty);
  addContent();

  $('.selection-panel').hide();

  let hypertyPanel = $('.hyperty-panel');

  let hi = '<p>Hyperty Reporter URL: <br>' + result.runtimeHypertyURL + '</p>';

  hypertyPanel.append(hi);


  let hello = $('.hello-panel');

  let sayHelloTo = '<form class="say-hello"> Hyperty URL: <input class="to-hyperty-input" type="text" size="60" name="toHyperty"><br><input type="submit" value="Say Hello"></form>'

  hello.append(sayHelloTo);

  $('.say-hello').on('submit', sayHello);
}

function addContent() {
  var place = document.getElementById("box1");
    $(place).empty();
    $(place).append('<div class="selection-panel"></div><div class="hyperty-panel"></div><div class="invitation-panel"></div><div class="hello-panel"></div><div class="bye-panel"></div><div class="msg-panel"></div>');
  }

function sayHello(event) {

event.preventDefault();

let toHypertyForm = $(event.currentTarget);

let toHyperty = toHypertyForm.find('.to-hyperty-input').val();

console.log(toHyperty);

  hyperty.hello(toHyperty).then(function(helloObject) {

    console.log('helloUrl: ', helloObject);

    $('.hello-panel').hide();

    var helloUrl = '<p>Hello URL: '+ helloObject.url + '</p>';

    let bye = $('.bye-panel');

    let sayByeTo = '<button class="say-bye">Say Bye</button>';

    bye.append(helloUrl);

    bye.append(sayByeTo);

    $('.bye-panel').on('click', sayBye);
  }).catch(function(reason) {
    console.error(reason);
  });

}

function sayBye() {

  hyperty.bye();

}


Handlebars.getTemplate = function(name) {

  return new Promise(function(resolve, reject) {

    if (Handlebars.templates === undefined || Handlebars.templates[name] === undefined) {
      Handlebars.templates = {};
    } else {
      resolve(Handlebars.templates[name]);
    }

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
