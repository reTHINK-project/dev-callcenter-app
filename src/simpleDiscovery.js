import rethink from '../resources/factories/rethink';
import config from '../config.json';

window.KJUR = {};

let HYPERTY_NAME = "SimpleDiscovery";
let hyperty;
let runtimeLoader;

rethink.install(config).then(function(result) {
  runtimeLoader = result;
  console.info('Runtime Installed in production mode:', result);

  // init some click handlers
  $('#gosearch').on('click', discoverEmail);

  // actually load the hyperty
  let hypertyPath = 'hyperty-catalogue://catalogue.' + config.domain + '/.well-known/hyperty/' + HYPERTY_NAME;
  runtimeLoader.requireHyperty(hypertyPath).then(
    hypertyLoaded
  ).catch(
    hypertyFail
  );

}).catch(function(reason) {
  console.error(reason);
});

function hypertyFail(reason) {
  console.error(reason);
}

// ###################################################################################################################
// ################################## DTCallCenter ###################################################################
// ###################################################################################################################

function hypertyLoaded(result) {
  hyperty = result.instance;
  hyperty.myUrl = result.runtimeHypertyURL;
  addContent();

  // get registered user
  hyperty.identityManager.discoverUserRegistered().then((identity) => {
    console.log("[SimpleDiscovery.main]: registered user is: ", identity);
    hyperty.myIdentity = identity;
    let userInfo = "<p>Authenticated as: <br> " +
      (hyperty.myIdentity.avatar ? '<img src="' + hyperty.myIdentity.avatar + '" class="logo" />' : "") + "<br>" +
      (hyperty.myIdentity.cn ? hyperty.myIdentity.cn : "") + ", " +
      (hyperty.myIdentity.username ? hyperty.myIdentity.username : "") +
      "</p>";
    $('.hyperty-panel').html(userInfo + '<p>SimpleDiscovery - Hyperty is registered as URL:<br>' + result.runtimeHypertyURL + '</p>');
  }).catch((reason) => {
    console.log("[SimpleDiscovery.main]: error while discovery of registered user. Error is ", reason);
    $('.hyperty-panel').html(userInfo + '<p>Hyperty URL:<br>' + result.runtimeHypertyURL + '</p>');
  });

  console.log("[SimpleDiscovery.main]:############ hyperty loaded, result is:", result);

}

function addContent() {
  var place = document.getElementById("content");
  $(place).html(
    '<div class="hyperty-panel"></div>' +
    '<div class="send-panel"></div>' +
    '<div class="invitation-panel"></div>'
  );
}

function discoverEmail(event) {
  if (event) {
    event.preventDefault();
  }

  var email = $('.searchemail').find('.friend-email').val();
  var domain = $('.searchemail').find('.friend-domain').val();
  console.log('>>>email', email, domain);

  var msg = 'searching for:  ' + email + ' in domain:  ' + domain + ' ...';
  if (!domain)
    msg = 'searching for:  ' + email + ' in the own domain ...';

  $('.send-panel').html(msg);

  hyperty.discovery.discoverHypertyPerUser(email, domain)
    .then(function(result) {
      $('.send-panel').html(
        '<input type="text" class="webrtc-hyperty-input form-control ">' +
        '<button  id="dosomething" class="btn btn-default btn-sm btn-block ">do something with me ...</button>' +
        '<br>');
      $('.send-panel').find('.webrtc-hyperty-input').val(result.hypertyURL);
      $('#dosomething').on('click', doSomethingWithTheHyperty);
    }).catch(function(err) {
      $('.send-panel').html(
        '<div>No hyperty found!</div>'
      );
      console.error('Email Discovered Error: ', err);
    });
}

function doSomethingWithTheHyperty(event) {
  if (event) {
    event.preventDefault();
  }
  let toHyperty = $('.webrtc-hyperty-input').val()
  console.log("hyperty", toHyperty);
  alert("doing something with the hyperty-URL: " + toHyperty);
}
