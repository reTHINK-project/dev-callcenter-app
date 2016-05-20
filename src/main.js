// jshint browser:true, jquery: true
// jshint varstmt: true
import RuntimeLoader from 'service-framework/dist/RuntimeLoader';
import InstallerFactory from '../resources/factories/InstallerFactory';
import config from '../config.json';

import {getTemplate, serialize} from './utils/utils';

// import hyperties from '../resources/descriptors/Hyperties';

let installerFactory = new InstallerFactory();

window.KJUR = {};

let domain = config.domain;

let runtime = 'https://catalogue.' + domain + '/.well-known/runtime/Runtime';

let runtimeLoader = new RuntimeLoader(installerFactory, runtime);

runtimeLoader.install().then(function() {

  return getListOfHyperties(domain);

}).then(function(hyperties) {

  let $dropDown = $('#hyperties-dropdown');

  hyperties.forEach(function(key) {
    let $item = $(document.createElement('li'));
    let $link = $(document.createElement('a'));

    // create the link features
    $link.html(key);
    $link.css('text-transform', 'none');
    $link.attr('data-name', key);
    $link.on('click', loadHyperty);

    $item.append($link);

    $dropDown.append($item);
  });

}).catch(function(reason) {
  console.error(reason);
});

function getListOfHyperties(domain) {

  let hypertiesURL = 'https://' + domain + '/.well-known/hyperty/Hyperties.json';
  if (config.env === 'production') {
    hypertiesURL = 'https://' + domain + '/.well-known/hyperty/';
  }

  return new Promise(function(resolve, reject) {
    $.ajax({
      url: hypertiesURL,
      success: function(result) {
        let response = [];
        if (typeof result === 'object') {
          Object.keys(result).forEach(function(key) {
            response.push(key);
          });
        } else if (typeof result === 'string') {
          response = JSON.parse(result);
        }
        resolve(response);
      },
      fail: function(reason) {
        reject(reason);
      }

    });
  });

}

function loadHyperty(event) {
  event.preventDefault();

  let hypertyName = $(event.currentTarget).attr('data-name');
  let hypertyPath = 'hyperty-catalogue://' + domain + '/.well-known/hyperties/' + hypertyName;

  runtimeLoader.requireHyperty(hypertyPath).then(hypertyDeployed).catch(hypertyFail);

}

function hypertyDeployed(hyperty) {

  // Add some utils
  serialize();

  let $mainContent = $('.main-content').find('.row');

  let template = '';
  let script = '';

  switch (hyperty.name) {

    case 'Receiver':
    template = 'test2/receiver';
    script =  'test2/receiver.js';
    break;
    case 'Sender':
    template = 'test2/sender';
    script =  'test2/sender.js';
    break;


    case 'HypertyConnector':
    template = 'hyperty-connector/HypertyConnector';
    script =  'hyperty-connector/demo.js';
    break;

    case 'HypertyChat':
    template = 'hyperty-chat/HypertyChat';
    script =  'hyperty-chat/demo.js';
    break;

    case 'HelloWorldObserver':
    template = 'hello-world/helloWorld';
    script =  'hello-world/helloObserver.js';
    break;

    case 'HelloWorldReporter':
    template = 'hello-world/helloWorld';
    script =  'hello-world/helloReporter.js';
    break;
  }

  if (!template) {
    throw Error('You must need specify the template for your example');
  }

  // var addContent = function addContent(place) {
  //   var selectObjekt = document.createElement("div");
  //   selectObjekt.className = "selection-panel";

  //   var hypertyObjekt = document.createElement("div");
  //   hypertyObjekt.className = "hyperty-panel";

  //   var inviteObjekt = document.createElement("div");
  //   inviteObjekt.className = "invitation-panel";

  //   var smthObjekt = document.createElement("div");
  //   smthObjekt.id = "smth";

  //   var myObjekt = document.createElement("div");
  //   myObjekt.className = "my-panel";

  //   var slider = document.createElement("input");
  //   slider.id = "slider1";
  //   slider.type = "range";
  //   slider.setAttribute("min", "0");
  //   slider.setAttribute("max", "100");
  //   slider.setAttribute("step", "1");
  //   slider.setAttribute("onchange", "showValue(this.value)");
  //   var span = document.createElement("span");
  //   span.id = "myrange";
  //   myObjekt.appendChild(slider);
  //   myObjekt.appendChild(span);

  //   place.appendChild(selectObjekt);
  //   place.appendChild(hypertyObjekt);
  //   place.appendChild(myObjekt);
  //   place.appendChild(inviteObjekt);
  //   place.appendChild(smthObjekt);
  // };

  // var addContent = function addContent(place) {
  //   $(place).empty();
  //   $(place).append('<div class="selection-panel"></div><div class="hyperty-panel"></div><div class="my-panel"><input id="slider1" type="range" min="0" max="100" value="0" step="1" onchange="showValue(this.value)" /><span id="myrange">0</span></div><div class="invitation-panel"></div><div id="smth"></div>');
  // }

  
  


// ######################################################
//var blub = require('../examples/test2/receiver');
//var test = '../examples/test2/receiver.js';
  // var blub = require(test);
  $.getScript(script)
  .done(function (foo) {
    console.log("<<<<<<<<<<<<<<<<<<<<<",foo);
    hypertyLoaded(hyperty);
  })
  .fail((err) => {console.log(">>>>>>>>>>>>>>>", err)});
// ###################################################
console.log( "###########################");

  // getTemplate(template, script).then(function(template) {
  //   let html = template();
  //   $mainContent.html(html);

//   if (typeof blub.hypertyLoaded === 'function') {
//    blub.hypertyLoaded(hyperty);
//  } else {
//   console.info('If you need pass the hyperty to your template, create a function called hypertyLoaded');
// }
  // });

}

function hypertyFail(reason) {
  console.error(reason);
}

// runtimeCatalogue.getHypertyDescriptor(hyperty).then(function(descriptor) {
//   console.log(descriptor);
// }).catch(function(reason) {
//   console.error('Error: ', reason);
// });
