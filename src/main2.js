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
    //$link.css('text-transform', 'none');
    $link.attr('data-name', key);
    $link.attr('href','#');
    $link.on('click', loadHyperty);
    $item.append($link);
    $dropDown.append($item);
  });
  $('.nav li a').on('click', function() {
    $(this).parent().parent().find('.active').removeClass('active');
    $(this).parent().addClass('active');
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
  serialize();
  let script = '';

  switch (hyperty.name) {
    case 'ReceiverDTWebRTC':
    script =  'DTWebRTC4/DTHCreceiver.js';
    break;

    case 'SenderDTWebRTC':
    script =  'DTWebRTC4/DTHCsender.js';
    break;

    case 'DTSlider1':
    script =  'DTSlider/DTSlider1.js';
    break;

    case 'DTSlider2':
    script =  'DTSlider/DTSlider2.js';
    break;

    case 'HypertyConnector':
    script =  'hyperty-connector/demo.js';
    break;
  }
  if (!script) {
    throw Error('You must need specify the js-script for your example');
  }
  $.getScript(script)
  .done(function (foo){
    console.log(">>>>>>>>>>> " + script + " loaded"); hypertyLoaded(hyperty);
  })
  .fail(function (err){
    console.log("!!!!!!!!!!! cant load " + script, err);
  });
}

function hypertyFail(reason) {
  console.error(reason);
}