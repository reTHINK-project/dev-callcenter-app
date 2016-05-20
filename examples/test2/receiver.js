var hyperty;

function hypertyLoaded(result) {
  hyperty = result.instance;
  console.log("hypertyObserver: ", hyperty);
  addContent();
  $('.selection-panel').hide();
  $('.hyperty-panel').append('<p>Hyperty Observer URL:<br>' + result.runtimeHypertyURL + '</p>');
	initListeners();
}

function addContent() {
  var place = document.getElementById("box1");
    $(place).empty();
    $(place).append('<div class="selection-panel"></div><div class="hyperty-panel"></div><div class="my-panel"><input id="slider1" type="range" min="0" max="100" value="0" step="1" onchange="showValue(this.value)" /><span id="myrange">0</span></div><div class="invitation-panel"></div><div id="smth"></div>');
  }

// send back methods
function showValue(newValue) { // when slider is moved by the receiver
  $('#myrange').html(newValue);
  updateDataObject(newValue);
}

function updateDataObject(v) { // send it to the sender
  console.log("new slider value: ", v);

  if (!hyperty.connectedBack) {
    console.log("[receiver] [updateDataObject] connect toHyperty: ", hyperty.counterpart);
    connectBack(hyperty.counterpart);
  } else {
    console.log("[receiver] [updateDataObject] connected toHyperty: ", hyperty.counterpart);
    hyperty.slideback($("#slider1").val());
  }
}

function connectBack(toHyperty) {
  hyperty.connect(toHyperty)
  .then(function(obj) {
    console.log('Slider obj: ', obj);
    hyperty.connectedBack = true;
    console.log("[receiver] [updateDataObject] now calling slideback");
    hyperty.slideback($("#slider1").val());
  })
	.catch(function(reason) {
    console.error(reason);
    //reject(reason); // is not caught
  });
}

// helping functions
Handlebars.getTemplate = function(name) {
  return new Promise((resolve, reject) => {
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
function initListeners() {
	hyperty.addEventListener('invitation', function(identity) {
    console.log('Invitation event received from:', identity);
    $('.invitation-panel').append(`<p> Invitation received from:\n ` + identity.email +  '</p>');
  });

  hyperty.addEventListener('slide', function(event) {
    console.log('Slide event received:', event);
    $("#slider1").val(event.slider);
    $("#myrange").html(event.slider);
    $("#smth").html(event.reporter);
    $("#smth").append(event);
    if (!hyperty.counterpart)
      hyperty.counterpart = event.reporter;
  });
}



// var addContent = function addContent(place) {
//     var selectObjekt = document.createElement("div");
//     selectObjekt.className = "selection-panel";

//     var hypertyObjekt = document.createElement("div");
//     hypertyObjekt.className = "hyperty-panel";

//     var inviteObjekt = document.createElement("div");
//     inviteObjekt.className = "invitation-panel";

//     var smthObjekt = document.createElement("div");
//     smthObjekt.id = "smth";

//     var myObjekt = document.createElement("div");
//     myObjekt.className = "my-panel";

//     var slider = document.createElement("input");
//     slider.id = "slider1";
//     slider.type = "range";
//     slider.setAttribute("min", "0");
//     slider.setAttribute("max", "100");
//     slider.setAttribute("step", "1");
//     slider.setAttribute("onchange", "showValue(this.value)");
//     var span = document.createElement("span");
//     span.id = "myrange";
//     myObjekt.appendChild(slider);
//     myObjekt.appendChild(span);

//     place.appendChild(selectObjekt);
//     place.appendChild(hypertyObjekt);
//     place.appendChild(myObjekt);
//     place.appendChild(inviteObjekt);
//     place.appendChild(smthObjekt);
//   };

//   var bla = document.getElementById("box1");
//   addContent(bla);