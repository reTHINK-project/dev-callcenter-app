
function Chat(myHyperty, chatArea, chatInput) {
  this._manager = myHyperty.instance;
  this._hypertyURL = myHyperty.runtimeHypertyURL;
  this._chatArea = chatArea;
  this._chatInput = chatInput;
  this._controller;
  this._onInviteCallback;

  this._isInitiator = false;

  this._manager.onInvitation((event) => {
    this._onInvitation(event);
  });
}

/**
Creates a chat and invites ONE user.
**/
Chat.prototype.create = function(name, user, domain) {
  return new Promise( (resolve, reject) => {
    this._manager.create(name, [user], [domain]).then( (chatController) => {
      console.log("[DTWebRTC.chat] chat CREATE done, controller is:", chatController);
      this._controller = chatController;
      this._isInitiator = true;
      this._setupControllerListeners();
      resolve();
    }).catch(function(reason) {
      console.error(reason);
      reject();
    })
  });
}

Chat.prototype.onNewChat = function(callback) {
  this._onInviteCallback = callback;
}

Chat.prototype.submitMessage = function() {
  let text = this._chatInput.value;
  this._controller.send(text).then( (result) => {
    this._appendText("me", text);
    this._chatInput.value = "";
  }).catch(function(reason) {
    console.error('[DTWebRTC.chat] message error', reason);
  });
}

Chat.prototype.close = function() {
  this._chatArea.value = "";
  this._chatInput.value = "";

  this._controller.close().then( (result) => {
    console.log('[DTWebRTC.chat] Chat closed: ', result);
  }).catch( (reason) => {
    console.log('[DTWebRTC.chat] An error occured - only the owner can close the chat:', reason);
  });
}

Chat.prototype._onInvitation = function(event) {
  console.log('[DTWebRTC.chat] On Invitation: ', event);

  this._manager.join(event.url).then( (chatController) => {
    console.log("[DTWebRTC.chat] joined invited chat with url : ", event.url);
    this._controller = chatController;
    this._isInitiator = false;
    this._setupControllerListeners();
    // notify GUI about new chat
    console.log("[DTWebRTC.chat] GUI callback is: ", this._onInviteCallback);
    if ( this._onInviteCallback ) {
      console.log("[DTWebRTC.chat] invoking GUI callback with identity: ", event.identity);
      this._onInviteCallback(event.identity);
      console.log("[DTWebRTC.chat] done: ");
    }

    // setTimeout(() => {
    //   let users = event.value.participants;
    //
    //   users.forEach((user) => {
    //     this._processNewUser(user.cn);
    //   });
    //
    // }, 500);
  }).catch(function(reason) {
    console.error('Error connectin to', reason);
  });
}

Chat.prototype._appendText = function(from, text) {
  this._chatArea.value += from + "> " + text + "\n";
}

Chat.prototype._processNewUser = function(user) {
  console.log("[DTWebRTC.chat] processing new User: ", user);
  this._appendText(user, "joined chat");
}

Chat.prototype._processUserLeft = function(user) {
  console.log("[DTWebRTC.chat] processing User left: ", user);
  this._appendText(user, "left chat");
}


Chat.prototype._setupControllerListeners = function() {
  console.log('[DTWebRTC.chat] Chat Group Controller: setting up listeners... ');

  this._controller.onMessage( (m) => {
    console.info('[DTWebRTC.chat] new message received: ', m);
    let from = m.identity ? m.identity.userProfile.cn: "unknown";
    this._appendText(from, m.value.content);
  });

  this._controller.onChange((event) => {
    console.log('[DTWebRTC.chat] App - OnChange Event:', event);
  });

  this._controller.onUserAdded((event) => {
    console.log('[DTWebRTC.chat] App - onUserAdded Event:', event);
    try {
      let user = event.username ? event.username : "peer";
      this._processNewUser(user);
    } catch (e) {  }
  });

  this._controller.onUserRemoved((event) => {
    console.log('[DTWebRTC.chat] App - onUserRemoved Event:', event);
    if ( ! event.data )
      return
    event.data.forEach( (data) => {
      this._processNewUser(data.cn);
    });
  });

  this._controller.onClose((event) => {
    console.log('[DTWebRTC.chat] App - onClose Event:', event);
  });
}
