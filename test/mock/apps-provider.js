'use strict';

var constants = require('../constants');
var applicationMock = require('./application');

var apps = {};
module.exports = apps;

// Create applications provider mock for JSTP server
//
apps.createServerApplicationsProviderMock = function() {
  var appsProvider = {};

  appsProvider.getApplications = function(applicationName) {
    if (applicationName === constants.TEST_APPLICATION) {
      return applicationMock;
    }
  };

  return appsProvider;
};

// Create application provider mock for JSTP client
//
apps.createClientApplicationProviderMock = function() {
  var appProvider = {};

  appProvider.getApplication = function() {
    return applicationMock;
  };

  return appProvider;
};
