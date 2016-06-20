var hyperty;

function hypertyLoaded(result) {
  hyperty = result.instance;
  addContent();
  $('.hyperty-panel').append('<p>Hyperty Reporter URL:<br>' + result.runtimeHypertyURL + '</p>');
  $('.email-panel').append('<form class="searchemail">'+ 
    '<input type="email" class="friend-email validate form-control " placeholder="your friends email" id="email" required aria-required="true"  > '+
    '<input type="text" class="friend-domain validate form-control " placeholder="Search in domain" id="domain" >'+
    '<button type="submit" class="btn btn-default btn-sm btn-block ">Search</button>'+
    '</form><br>');
  $('.send-panel').append('<br><form class="webrtcconnect">' +
    '<input type="text" class="webrtc-hyperty-input form-control "  placeholder="awesome Hyperty-URL" name="webrtctoHyperty">' +
    '<button type="submit" class="btn btn-default btn-sm btn-block ">webRTC to Hyperty </button>'+
    '</form><br>');
  

  $('.webrtcconnect').on('submit', webrtcconnectToHyperty);
  initListeners();
  $.getScript("/examples/DTWebRTC4/adapter.js");

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
    '<div class="invitation-panel"></div>'+
    '<div id="smth"></div>'+
    '<div id="smth2">'+
    '<video id="remoteVideo" class="block hide" autoplay style="border: 1px solid grey;"></video>'+
    '<video id="localVideo" class="halfblock hide" autoplay style="border: 1px solid grey;"></video>'+
    '</div>');
}

function webrtcconnectToHyperty(event) {
  event.preventDefault();
  let toHypertyForm = $(event.currentTarget);
  let toHyperty = toHypertyForm.find('.webrtc-hyperty-input').val();
  toHypertyForm.append('<center><br><i style="color: #e20074;"" class="center fa fa-cog fa-spin fa-5x fa-fw"></i></center>');
  console.log(toHyperty);

  hyperty.connect(toHyperty)
  .then(function(obj) {
    console.log('Webrtc obj: ', obj);
    $('.send-panel').addClass('hide');
    $('#smth2').find('.hide').removeClass('hide');
  })
  .catch(function(reason) {
    console.error(reason);
  });
}

function initListeners () {
  hyperty.addEventListener('invitation', function(identity) {
    console.log('Invitation event received from:', identity);
    $('.invitation-panel').append(`<p> Invitation received from:\n ` + identity.email +  '</p>');
  });
}

// #############################-EMAIL-DISCOVER-############################################
function discoverEmail(hypertyDiscovery) {

  var section = $('.email-panel');
  var searchForm = section.find('.searchemail');
  section.removeClass('hide');

  $('.searchemail').on('submit', function(event) {
    event.preventDefault();
    var email = searchForm.find('.friend-email').val();
    var domain = searchForm.find('.friend-domain').val();
    hypertyDiscovery.discoverHypertyPerUser(email, domain)
    .then(function (result) {
      $('.send-panel').find('.webrtc-hyperty-input').val(result.hypertyURL);
      section.addClass('hide');
    }).catch(function (err) {
      console.error('Email Discovered Error: ', err);
    });
  });
}