/*
* Primary file for the API
*
*/

// Dependencies
const http = require('http'); //http module
const https = require('https'); //https module
const url = require('url'); //url module
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config'); //config file module
const fs = require('fs');  //file system module
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// Instantiate the HTTP server
const httpServer = http.createServer(function(req,res){
  unifiedServer(req,res);
});
// Start the HTTP server
httpServer.listen(config.httpPort,function(){
  console.log("The server is listening on port "+config.httpPort+" in " + config.envName + " mode");
});

// Instantiate the HTTPS server
let htppsServerOptions = {
  'key': fs.readFileSync('./https/key.pem'),
  'cert': fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(htppsServerOptions,function(req,res){
  unifiedServer(req,res);
});
// Start the HTTPS server
httpsServer.listen(config.httpsPort,function(){
  console.log("The server is listening on port "+config.httpsPort+" in " + config.envName + " mode");
});

// All the server logic for both http and https server
let unifiedServer = function(req,res){

    // Get the URL and parse it
    let parsedUrl = url.parse(req.url,true);
    // Get the path of the URL
    let path = parsedUrl.pathname;
    let trimPath = path.replace(/^\/+|\/+$/g,'');

    // Get the query String as an object
    let queryStringObject = parsedUrl.query;

    // Get the HTTP Method
    let method = req.method.toLowerCase();

    // Get the headers as an object
    let headers = req.headers;

    // Get the payload, if any
    let decoder = new StringDecoder('utf-8');
    let buffer = '';
    req.on('data',function(data){
      buffer+= decoder.write(data);
    });
    req.on('end',function(){
      buffer += decoder.end();

      // Choose the handler this request should go to. If one is not found, use the not found handler
      let chosenHandler = typeof(router[trimPath]) !== 'undefined' ? router[trimPath] : handlers.notFound;
      // Construct the data object to send to the handler
      let data = {
        'trimmedPath' : trimPath,
        'queryStringObject' : queryStringObject,
        'method' : method,
        'headers' : headers,
        'payload': helpers.parseJsonToObject(buffer)
      };

      // Route the request to the handler specified in the router
      chosenHandler(data,function(statusCode,payload){
        // Use the status code called back by the handler, or defalut to 200
        statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
        // Use the pauload called backby the handler, or to an empty queryStringObject
        payload = typeof(payload) == 'object' ? payload : {};

        // Convert the payload to a string
        var payloadString = JSON.stringify(payload);

        // Return the response
        res.setHeader('Content-Type', 'application/json')
        res.writeHead(statusCode);
        res.end(payloadString);

        // Log the path
        console.log('Returning this response: ',statusCode,payloadString);
      });
    });
};

// Define a request router
var router = {
  'ping': handlers.ping,
  'users' : handlers.users,
  'tokens' : handlers.tokens
};
