'use strict';

var errors = require('./errors');

var apps = {};
module.exports = apps;

// Generic application class. You are free to substitute it with whatever suits
// your needs.
//   name - application name
//   api - application API
//
function Application(name, api) {
  this.name = name;
  this.api = api;
}

apps.Application = Application;

// Call application method
//   connection - JSTP connection
//   interfaceName - name of the interface
//   methodName - name of the method
//   args - method arguments (including callback)
//
Application.prototype.callMethod =
  function(connection, interfaceName, methodName, args, callback) {
    var appInterface = this.api[interfaceName];
    if (!appInterface) {
      return callback(errors.ERR_INTERFACE_NOT_FOUND);
    }

    var method = appInterface[methodName];
    if (!method) {
      return callback(errors.ERR_METHOD_NOT_FOUND);
    }

    method.apply(null, [connection].concat(args, callback));
  };

// Get an array of methods of an interface
//   interfaceName - name of the interface to inspect
//
Application.prototype.getMethods = function(interfaceName) {
  var appInterface = this.api[interfaceName];

  if (appInterface) {
    return Object.keys(appInterface);
  } else {
    return null;
  }
};

// Create an index of applications from an array
//   applications - array of JSTP applications
//
apps.createAppsIndex = function(applications) {
  var index = {};

  applications.forEach(function(application) {
    index[application.name] = application;
  });

  return index;
};
