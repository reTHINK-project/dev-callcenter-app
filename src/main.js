// jshint browser:true, jquery: true
// jshint varstmt: true
import RuntimeLoader from 'service-framework/dist/RuntimeLoader';
import InstallerFactory from '../resources/factories/InstallerFactory';
import config from '../config.json';

let installerFactory = new InstallerFactory();

window.KJUR = {};

let domain = config.domain;

let runtime = 'https://catalogue.' + domain + '/.well-known/runtime/Runtime';

let runtimeLoader = new RuntimeLoader(installerFactory, runtime);

runtimeLoader.install().then(function() {

  return getListOfHyperties(domain);

}).then(function(hyperties) {

  let $dropDown = $('#navbar');

  hyperties.forEach(function(key) {
    if(key == "DTReceiver"){
      loadHyperty(0,key);

    }else{
    //   let $item = $(document.createElement('li'));
    //   let $link = $(document.createElement('a'));

    // // create the link features
    // $link.html(key);
    // //$link.css('text-transform', 'none');
    // $link.attr('data-name', key);
    // $link.attr('href','#');
    // $link.on('click', loadHyperty);

    // $item.append($link);

    // $dropDown.append($item);
    $dropDown.append('<form class="searchemail" data-name="DTSender">'+ 
      '<input type="email" style="float: left" class="friend-email halfblock validate form-control " placeholder="your friends email" id="email" required aria-required="true"  > '+
      '<button type="submit"  class="btn halfblock btn-default btn-sm btn-block ">Search</button>'+
      '</form><br>');
    $('.searchemail').on('submit',loadHyperty);


  }
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

function loadHyperty(event,key) {
  let hypertyName;
  if(event){
    event.preventDefault();
    hypertyName = $(event.currentTarget).attr('data-name');
    console.log('##############################', hypertyName);
  }else{
    hypertyName = key;
  }

  let hypertyPath = 'hyperty-catalogue://' + domain + '/.well-known/hyperties/' + hypertyName;
  runtimeLoader.requireHyperty(hypertyPath).then(hypertyDeployed).catch(hypertyFail);

}

function hypertyDeployed(hyperty) {

  let $mainContent = $('.main-content').find('.row');

  let template = '';
  let script = '';

  switch (hyperty.name) {
    case 'ReceiverDTWebRTC':
    script =  'DTWebRTC3/DTreceiver.js';
    break;

    case 'SenderDTWebRTC':
    script =  'DTWebRTC3/DTsender.js';
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

// runtimeCatalogue.getHypertyDescriptor(hyperty).then(function(descriptor) {
//   console.log(descriptor);
// }).catch(function(reason) {
//   console.error('Error: ', reason);
// });
