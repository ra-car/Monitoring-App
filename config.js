/*
* Create and export configuration varaiables
*/

// Container for all the environments
let environments = {};

// Staging (default) environment

environments.staging = {
  'httpPort': 3000,
  'httpsPort': 3001,
  'envName': 'staging',
  'hashingSecret': 'thisIsASecret'
};

environments.production = {
  'httpPort': 5000,
  'httpsPort': 5001,
  'envName': 'production',
  'hashingSecret': 'thisIsASecret'
};

// Determine wich enviroment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase():'';

// Check thta the current environment is one of the environments above, if not, default to Staging
var environmnetToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = environmnetToExport;
