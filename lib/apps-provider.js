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
  function(connection, interfaceName, methodName, args) {
    var callback = args[args.length - 1];

    var appInterface = this.api[interfaceName];
    if (!appInterface) {
      return callback(errors.ERR_INTERFACE_NOT_FOUND);
    }

    var method = appInterface[methodName];
    if (!method) {
      return callback(errors.ERR_METHOD_NOT_FOUND);
    }

    var context = { connection: connection };
    method.apply(context, args);
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

// Generic server applications provider class. Your are free to substitute it
// with whatever suits your needs.
//
function ServerApplicationsProvider() {
  this._applications = {};
}

apps.ServerApplicationsProvider = ServerApplicationsProvider;

// Get an application
//   applicationName - name of the application to get
//
ServerApplicationsProvider.prototype.getApplication =
  function(applicationName) {
    return this._applications[applicationName];
  };

// Register a new application
//   application - application instance or application name
//   api - second argument for the Application constructor (only needed if you
//     have passed a string as the first argument)
//
ServerApplicationsProvider.prototype.registerApplication =
  function(application, api) {
    if (typeof(application) === 'string') {
      application = new Application(application, api);
    }

    this._applications[application.name] = application;
  };

// Generic client application provider class. Your are free to substitute it
// with whatever suits your needs.
//   application - application instance or application name
//   api - second argument for the Application constructor (only needed if you
//     have passed a string as the first argument)
//
function ClientApplicationProvider(application, api) {
  if (application instanceof Application) {
    this._application = application;
  } else {
    this._application = new Application(application, api);
  }
}

apps.ClientApplicationProvider = ClientApplicationProvider;

// Get the application
//
ClientApplicationProvider.prototype.getApplication = function() {
  return this._application;
};
