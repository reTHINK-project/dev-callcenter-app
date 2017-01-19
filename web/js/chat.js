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
    console.log("[DTWebRTC.chat] chat CREATE done, controller is:", chatController);
    this._controller = chatController;
    this._isInitiator = true;
    this._setupControllerListeners();

  }).catch(function(reason) {
    console.error(reason);
  });
}


Chat.prototype.onInvitation = function(event) {
  console.log('[DTWebRTC.chat] On Invitation: ', event);

  this._manager.join(event.url).then( (chatController) => {
    this._controller = chatController;
    this._isInitiator = false;
    this._setupControllerListeners();

    setTimeout(() => {
      let users = event.value.participants;

      users.forEach((user) => {
        this._processNewUser(user.cn);
      });

    }, 500);
  }).catch(function(reason) {
    console.error('Error connectin to', reason);
  });
}

Chat.prototype.submitMessage = function() {
  let text = this._chatInput.value;
  this._controller.send(text).then( (result) => {
    this._appendText("me", text);
    this._chatInput.value = "";
  }).catch(function(reason) {
    console.error('message error', reason);
  });
}

Chat.prototype._appendText = function(from, text) {
  this._chatArea.value += from + "> " + text + "\n";
}

Chat.prototype._processNewUser = function(user) {
  console.log("processing new User: ", user);
  this._appendText(user, "joined chat");
}

Chat.prototype._processUserLeft = function(user) {
  console.log("processing User left: ", user);
  this._appendText(user, "left chat");
}


Chat.prototype._setupControllerListeners = function() {
  console.log('Chat Group Controller: setting up listeners... ');

  this._controller.onMessage( (m) => {
    console.info('new message received: ', m);
    let from = m.identity ? m.identity.userProfile.cn: "unknown";
    this._appendText(from, m.value.message);
  });

  this._controller.onChange((event) => {
    console.log('App - OnChange Event:', event);
  });

  this._controller.onUserAdded((event) => {
    console.log('App - onUserAdded Event:', event);
    if ( ! event.data )
      return
    event.data.forEach( (data) => {
      this._processNewUser(data.cn);
    });
  });

  this._controller.onUserRemoved((event) => {
    console.log('App - onUserRemoved Event:', event);
    if ( ! event.data )
      return
    event.data.forEach( (data) => {
      this._processNewUser(data.cn);
    });
  });

  this._controller.onClose((event) => {
    console.log('App - onClose Event:', event);
    $('.chat-section').remove();
  });
}

Chat.prototype.close = function() {
  this._controller.close().then( (result) => {
    console.log('Chat closed: ', result);
    this._chatArea.value = "";
    this._chatInput.value = "";

  }).catch(function(reason) {
    console.log('An error occured:', reason);
  });
}
