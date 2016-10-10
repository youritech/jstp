'use strict';

var events = require('events');

module.exports = RemoteProxy;

// Remote API proxy object class. It wraps remote methods so that they look
// like regular local methods and acts like a remote event emitter.
//   connection - JSTP connection to use
//   interfaceName - name of an interface that is proxied
//   methods - array of method names (optional)
//
function RemoteProxy(connection, interfaceName, methods) {
  events.EventEmitter.call(this);

  this._connection = connection;
  this._interfaceName = interfaceName;

  if (methods) {
    for (var i = 0; i < methods.length; i++) {
      RemoteProxy.wrapRemoteMethod(this, methods[i]);
    }
  }
}

// Emit an event. By default, when the dontRetranslate parameter is false or
// undefined, the event is also emmited on the other part of the JSTP
// connection so all the 'on' handlers will work on both sides regardless of
// where event has been emitted. However, you can turn it off by setting
// dontRetranslate to true.
//   eventName - name of an event
//   eventArgs - object of event arguments
//   dontRetranslate - turn off sending the corresponding event packet over the
//                     JSTP connection
//
RemoteProxy.emit = function(eventName, eventArgs, dontRetranslate) {
  if (!dontRetranslate) {
    this._connection.event(this._interfaceName, eventName, eventArgs);
  }

  events.EventEmitter.prototype.emit.call(this, eventName, eventArgs);
};

// Create a method in a remote proxy that will call the corresponding remote
// method. This is implemented as a static method rather than an instance
// method so that it will not be rewritten by a remote API method with the same
// name.
//   instance - remote proxy object
//   method - name of a method
//
RemoteProxy.wrapRemoteMethod = function(instance, methodName) {
  instance[methodName] = remoteMethodWrapper.bind(instance, methodName);
};

// Remote method wrapper
//   this - remote proxy instance
//   methodName - name of a remote method
//
function remoteMethodWrapper(methodName) {
  var callback = arguments[arguments.length - 1];
  var args = Array.prototype.slice.call(arguments, 1, -1);

  if (typeof(callback) !== 'function') {
    args.push(callback);
    callback = null;
  }

  this._connection.call(this._interfaceName, methodName, args, callback);
}
