function Chat(myHyperty, chatArea, chatInput) {
  this._manager = myHyperty.instance;
  this._hypertyURL = myHyperty.runtimeHypertyURL;
  this._chatArea = chatArea;
  this._chatInput = chatInput;
  this._controller;

  this._isInitiator = false;

  this._manager.onInvitation((event) => {
    this.onInvitation(event);
  });
}

/**
Creates a chat and invites ONE user.
**/
Chat.prototype.invite = function(name, user, domain) {
  this._manager.create(name, [user], [domain]).then( (chatController) => {
    this._controller = chatController;
    this._isInitiator = true;
    this.setupControllerListeners();

    let isOwner = true;
    prepareChat(chatController, isOwner);
    participantsForm[0].reset();

  }).catch(function(reason) {
    console.error(reason);
  });
}


Chat.prototype.onInvitation = function(event) {
  console.log('[DTWebRTC.chat] On Invitation: ', event);

  this._manager.join(event.url).then( (chatController) => {
    this._controller = chatController;
    this._isInitiator = false;
    this.setupControllerListeners();

    setTimeout(() => {
      let users = event.value.participants;

      users.forEach((user) => {
        processNewUser(user);
      });

    }, 500);
  }).catch(function(reason) {
    console.error('Error connectin to', reason);
  });
}

Chat.prototype.appendText = function(text) {
  // replace newlines with html line feed
  text = text.replace("\n", '&#xA;');
  this._chatArea.append(from + "> " + text);
}

Chat.prototype.processMessage = function() {
  console.log("processing message: ", m);
  let from = m.identity ? m.identity.userProfile.cn: "unknown";
  this.appendText(from + "> " + text);
}

Chat.prototype.processNewUser = function(event) {
  console.log("processing new User: ", event);
  this.appendText("user joined chat");
}

Chat.prototype.processUserLeft = function(event) {
  console.log("processing User left: ", event);
  this.appendText("user left chat");
}


Chat.prototype.setupControllerListeners = function() {
  console.log('Chat Group Controller: setting up listeners... ');

  this._controller.onMessage(function(message) {
    console.info('new message recived: ', message);
    this.processMessage(message);
  });

  this._controller.onChange(function(event) {
    console.log('App - OnChange Event:', event);
  });

  this._controller.onUserAdded(function(event) {
    console.log('App - onUserAdded Event:', event);
    this.processNewUser(event);
  });

  this._controller.onUserRemoved(function(event) {
    console.log('App - onUserRemoved Event:', event);
    this.processUserLeft(event);
  });

  this._controller.onClose(function(event) {
    console.log('App - onClose Event:', event);
    $('.chat-section').remove();
  });
}

Chat.prototype.close = function() {
  this._controller.close().then(function(result) {
    console.log('Chat closed: ', result);
    this._chatArea.value = "";
    this._chatInput.value = "";

  }).catch(function(reason) {
    console.log('An error occured:', reason);
  });
}
