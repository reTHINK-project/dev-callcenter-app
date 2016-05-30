var hyperty;

function hypertyLoaded(result) {
  hyperty = result.instance;
  console.log("hypertyReporter: ", result);
  addContent();
  $('.hyperty-panel').append('<p>Hyperty Reporter URL:<br>' + result.runtimeHypertyURL + '</p>');
  $('.send-panel').append('<form class="webrtcconnect">' +
    '<input type="text" class="webrtc-hyperty-input block"  placeholder="awesome Hyperty-URL" name="webrtctoHyperty">' +
    '<button type="submit" class="block"> webRTC to Hyperty</button>'+
    '</form>');
  $('.email-panel').append('<form class="searchemail">'+ 
    '<input type="email" class="friend-email validate block" placeholder="your friends email" id="email" required aria-required="true"  > '+
    '<input type="text" class="friend-domain validate block" placeholder="Search in domain" id="domain" >'+
    '<button type="submit" class="block">Search</button>'+
    '</form>'+
    '<ul class="collection hide">'+
    '<li class="collection-header"><h4>Useres Hyperty</h4></li>'+
    '</ul>');

  $('.webrtcconnect').on('submit', webrtcconnectToHyperty);
  initListeners();
  $.getScript("/examples/DTWebRTC3/adapter.js");

  // Prepare to discover email:
  var hypertyDiscovery = result.instance.hypertyDiscovery;
  discoverEmail(hypertyDiscovery);
  
}


function addContent() {
  var place = document.getElementById("box1");
  $(place).empty();
  $(place).append('<div class="selection-panel"></div>'+
    '<div class="hyperty-panel"></div>'+
    '<div class="email-panel"></div>'+
    '<div class="send-panel"></div>'+
    '<br>' +
    '<div class="invitation-panel"></div>'+
    '<div id="smth"></div>'+
    '<div id="smth2">'+
    '<video id="remoteVideo" class="block" autoplay style="border: 1px solid grey;"></video>'+
    '<video id="localVideo" class="halfblock" autoplay style="border: 1px solid grey;"></video>'+
    '</div>');
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

function webrtcconnectToHyperty(toHyperty) {
  // event.preventDefault();
  // let toHypertyForm = $(event.currentTarget);
  // let toHyperty = toHypertyForm.find('.webrtc-hyperty-input').val();
  // console.log(toHyperty);

  hyperty.webrtcconnect(toHyperty)
  .then(function(obj) {
    console.log('Webrtc obj: ', obj);
    $('.webrtcconnect').hide();
    hyperty.invite();
  })
  .catch(function(reason) {
    console.error(reason);
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

  hyperty.addEventListener('webrtcreceive', function(event) {
    console.log('Webrtc receive event received:', event);
    switch(event.webrtc.msg.body.type){
      case 'invitation':         hyperty.handleInvite(event.webrtc.msg, event.reporter); break;
      case 'accepted':         hyperty.handleAccepted(event.webrtc.msg); break;
      case 'icecandidate': hyperty.handleIceCandidate(event.webrtc.msg); break;
    }
  });
}


// #############################-EMAIL-DISCOVER-############################################


function discoverEmail(hypertyDiscovery) {

  var section = $('.email-panel');
  var searchForm = section.find('.searchemail');
  var inputField = searchForm.find('.friend-email');
  var inputDomain = searchForm.find('.friend-domain');

  section.removeClass('hide');

  $('.searchemail').on('submit', function(event) {
    console.log(':::::::::::::::::::::::::::::::::::::1');
    event.preventDefault();

    var collection = section.find('.collection');
    var collectionItem = '<li class="collection-item item-loader"><div class="preloader-wrapper small active"><div class="spinner-layer spinner-blue-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div></li>';

    collection.removeClass('hide');
    collection.addClass('center-align');
    collection.prepend(collectionItem);

    var email = inputField.val();
    var domain = inputDomain.val();
    console.log(':::::::::::::::::::::::::::::::::::::2', email);
    hypertyDiscovery.discoverHypertyPerUser(email, domain).then(emailDiscovered).catch(emailDiscoveredError);
    console.log(':::::::::::::::::::::::::::::::::::::3');

  });
}

function emailDiscovered(result) {
  console.log(':::::::::::::::::::::::::::::::::::::::Email Discovered: ', result);

  var section = $('.discover');
  var collection = section.find('.collection');
  var collectionItem = '<li data-url="' + result.id + '" class="collection-item avatar">' +
  '<span class="title"><b>Email: </b>' + result.id + '</span><p>&nbsp;</p>' +
  '<p>' + result.descriptor + '<br>' + result.hypertyURL + '</p>' +
  '<a title="Call to ' + result.id + '" class="waves-effect waves-light btn call-btn secondary-content"><i class="material-icons">call</i></a>' +
  '</li>';

  collection.removeClass('center-align');
  var loader = collection.find('li.item-loader');
  loader.remove();

  var itemsFound = collection.find('li[data-url="' + result.id + '"]');
  if (itemsFound.length) {
    itemsFound[0].remove();
  }

  collection.append(collectionItem);

  var callBtn = collection.find('.call-btn');
  callBtn.on('click', function(event) {
    event.preventDefault();
    openVideo(result);
  });


  webrtcconnectToHyperty(result.hypertyURL);


}

function emailDiscoveredError(result) {

  console.error('Email Discovered Error: ', result);

  var section = $('.discover');
  var collection = section.find('.collection');

  var collectionItem = '<li class="collection-item orange lighten-3"><i class="material-icons left circle">error_outline</i>' + result + '</li>';

  collection.empty();
  collection.removeClass('center-align');
  collection.removeClass('hide');
  collection.append(collectionItem);
}