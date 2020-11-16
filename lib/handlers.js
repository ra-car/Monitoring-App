/*
* Request handlers
*/

// Dependencies
let _data = require('./data');
let helpers = require('./helpers');
const config = require('../config');

// Define the handlers
let handlers = {};

// Users
handlers.users = function(data,callback){
    let acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data,callback);
    } else{
        callback(405);
    }
};

// Container for the user methods
handlers._users = {};

// User - Post
// Require data : firs Name, last Name, phone, password, tosAgreement
handlers._users.post = function(data,callback){
    // Check that all required fields are filled out

    let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    let tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if(firstName && lastName && phone && password && tosAgreement){
        // Verify that the user doesnt  already exist
        _data.read('users',phone,function(err,data){
            if(err){
                // Hash the pasword
                let hashedPassword = helpers.hash(password);
                
                if(hashedPassword){
                    // Create user Object
                    var userObject = {
                        'firstName' : firstName,
                        'lastName' : lastName,
                        'phone' : phone,
                        'hashedPassword' : hashedPassword,
                        'tosAgreement': true
                    };
                    //Store the User
                    _data.create('users',phone,userObject,function(err){
                        if(!err){
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500,{'Error':'Could not create the new user'});
                        }
                    });
                } else {
                    callback(500,{'error':'Could not hash the user'})
                }
            }else {
                callback(400,{'error': 'A user with that phone number already exist'});
            }
        });
    } else {
        callback(404,{'error': 'Missing required fields'});
    }
};

// User - Get
// Require data: PhonE
handlers._users.get = function(data,callback){
    // Check that the phone number is valid
    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone){
        // Get the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token (from the headers) is valid for the phone number
        handlers._tokens.verifyTokens(token,phone, function(tokenIsValid){
            if(tokenIsValid){
                // looking up the user
                _data.read('users',phone, function(err,data){
                    if(!err && data){
                        // Remove the hashed password from the user object before returning it to the requester
                        delete data.hashedPassword;
                        callback(200,data);
                    } else {
                        callback(404);
                    }
                });
            } else {
                callback(403, {'error' : 'Missing required token in header, or token is invalid'});
            }
        });
    } else {
        callback(400, {'error' : 'Missing required file'})
    }
};
// User - Put
// Require data: PhonE

handlers._users.put = function(data,callback){
    // Check that the phone number is valid
    let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    // Check for optional fields
    let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    if(phone){
        // Error if nothing is sent to update
        if(firstName || lastName || password){
            let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            // Verify that the given token (from the headers) is valid for the phone number
            handlers._tokens.verifyTokens(token,phone, function(tokenIsValid){
                if(tokenIsValid){
                    //Look up for user
                    _data.read('users',phone,function(err,userData){
                        if(!err && userData){
                            //Update the field necessary
                            if(firstName){
                                userData.firstName = firstName;
                            }
                            if(lastName){
                                userData.lastName = lastName;
                            }
                            if(password){
                                
                                userData.hashedPassword = helpers.hash(password);
                            }
                            // Store the new updates
                            _data.update('users',phone,userData, function(err){
                                if(!err){
                                    callback(200);
                                } else {
                                    console.log(err);
                                    callback(500, {'error':'Could not update the user'});
                                }
                            });
                        } else{
                            callback(400,{'error':'The user does not exist'});
                        }
                    });
                } else {
                    callback(403, {'error' : 'Missing required token in header, or token is invalid'});
                }
            });
        } else {
            callback(400,{'error':'Missing fields to update'});
        }
    } else {
        callback(400,{'error':'Missing required field'});
    }
};
// User - Delete
// Require data: PhonE
// @TODO Cleanup (delete) any other data files associated with this user
handlers._users.delete = function(data,callback){
    // Check that the phone number is valid
    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone){
        // Get the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token (from the headers) is valid for the phone number
        handlers._tokens.verifyTokens(token,phone, function(tokenIsValid){
            if(tokenIsValid){
                // looking up the user
                _data.read('users',phone, function(err,data){
                    if(!err && data){
                        _data.delete('users',phone, function(err){
                            if(!err){
                                // Delete each of the checks associated with the user
                                var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                                var checksToDelete = userChecks.length;
                                if(checksToDelete > 0){
                                    var checksDeleted = 0;
                                    var deletionErrors = false;
                                    // Loop through the checks
                                    userChecks.forEach(function(checkId){
                                      // Delete the check
                                    _data.delete('checks',checkId,function(err){
                                        if(err){
                                            deletionErrors = true;
                                        }
                                        checksDeleted++;
                                        if(checksDeleted == checksToDelete){
                                            if(!deletionErrors){
                                                callback(200);
                                            } else {
                                                callback(500,{'Error' : "Errors encountered while attempting to delete all of the user's checks. All checks may not have been deleted from the system successfully."})
                                            }
                                        }
                                        });
                                    });
                                } else {
                                    callback(200);
                                }
                            } else {
                                callback(500, {'error' : 'Could not delete the especified user'});
                            }
                        });
                    } else {
                        callback(400,{'error': 'Could not find the specified user'});
                    }
                });
            } else {
                callback(403, {'error' : 'Missing required token in header, or token is invalid'});
            }
        });
    } else {
        callback(400, {'error' : 'Missing required file'});
    }
};

// Tokens
handlers.tokens = function(data,callback){
    let acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._tokens[data.method](data,callback);
    } else{
        callback(405);
    }
};

// Container for the tokens methods
handlers._tokens = {};

// Tokens - Post
// Rquire data: phone, password
handlers._tokens.post = function(data,callback){
    let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    if(phone && password){
        // Look up the user that matches that phone number
        _data.read('users',phone, function(err,usrData){
            if(!err && usrData){
                // Hash the sent password, and compare it with the password stored in the user object
                let hashedPassword = helpers.hash(password);
                if(hashedPassword == usrData.hashedPassword){
                    // If valid, create a new token witha random name. Set expiration date 1 hour in the future
                    let tokenId = helpers.createRandomString(20);
                    let expires = Date.now() + 1000*60*60;
                    let tokenObject = {
                        'phone': phone,
                        'id': tokenId ,
                        'expires' :expires
                    };
                    // Store the token
                    _data.create('tokens',tokenId,tokenObject, function(err){
                        if(!err){
                            callback(200,tokenObject);
                        } else {
                            callback(400,{'error':'Could not create the new Token'});
                        }
                    });
                } else{
                    callback(400, {'error': 'The password did not match the specified user\'s stored password'});
                }
            } else {
                callback(400,{'error': 'Could not find the specified user'});
            }
        });

    } else{
        callback(400,{'error' : 'Missing required field(s)'});
    }
};

// Tokens - Get
// Required data: id
handlers._tokens.get = function(data,callback){
    // Check that the id is valid
    let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        // looking up the user
        _data.read('tokens',id, function(err,tokenData){
            if(!err && tokenData){
                callback(200,tokenData);
            }
            else {
                callback(404);
            }
        });
    } else {
        callback(400, {'error' : 'Missing required field'})
    }
};

// Tokens - Put
// Required data: id,extend
handlers._tokens.put = function(data,callback){
    let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    let extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if(id && extend){
        // Look up the token
        _data.read('tokens',id,function(err,tokenData){
            if(!err && tokenData){
                // check to make sure the token isn't already expired
                if(tokenData.expires > Date.now()){
                    // Set the expiration an hour from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    //Store the new updates
                    _data.update('tokens',id,tokenData,function(err){
                        if(!err){
                            callback(200, {});
                        } else {
                            callback(500, {'error' : 'Could not update the token\'s expiration'});
                        }
                    })
                } else {
                    callback(400, {'error': 'The token has already expired, and cannot be extended'})
                }
            } else {
                callback(400, {'error': 'Specified token does not exist'})
            }
        });
    } else {
        callback(400, {'error':'Missing required field(s) or field(s) are invalid'});
    }
};

// Tokens - Delete
// Required Data: id
handlers._tokens.delete = function(data,callback){
    // Check that the id is valid
    let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        // looking up the token by id
        _data.read('tokens',id, function(err,tokenData){
            if(!err && tokenData){
                _data.delete('tokens',id, function(err){
                    if(!err){
                        callback(200);
                    } else {
                        callback(500, {'error' : 'Could not delete the especified token'});
                    }
                });
            }
            else {
                callback(400,{'error': 'Could not find the specified token'});
            }
        });
    } else {
        callback(400, {'error' : 'Missing required file'});
    }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyTokens = function(id,phone,callback){
    // Look up thw tokwn
    _data.read('tokens',id,function(err,tokenData){
        if(!err && tokenData){
            // Check if the token is for the given user and has not expired
            if(tokenData.phone == phone && tokenData.expires > Date.now())
            {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};

// Checks
handlers.checks = function(data,callback){
    let acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._checks[data.method](data,callback);
    } else{
        callback(405);
    }
};

// Container for the checks methods
handlers._checks = {};

// Checks - post
// @TODO Validate token 
// Required data: protocol, url, method, sucessCodes, timeoutSeconds
handlers._checks.post = function(data,callback){
    // Validate all inputs
    let protocol = typeof(data.payload.protocol) == 'string' && ['http','https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    let url = typeof(data.payload.url) == 'string' &&  data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    let method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    let sucessCodes = typeof(data.payload.sucessCodes) == 'object' && data.payload.sucessCodes instanceof Array && data.payload.sucessCodes.length > 0 ? data.payload.sucessCodes : false;
    let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' &&  data.payload.timeoutSeconds % 1 == 0  && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 10 ? data.payload.timeoutSeconds : false;
    if(protocol && url && method && sucessCodes && timeoutSeconds){
        // Get the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Lookup the user by reading the token
        _data.read('tokens',token,function(err,tokenData){
            if(!err && tokenData){
                var userPhone = tokenData.phone;
                // Lookup the user data
                _data.read('users',userPhone,function(err,userData){
                    if(!err && userData){
                        let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                        // Verify the max number of checks
                        if(userChecks.length < config.maxChecks){
                            // Create a random id for the check
                            let checkId = helpers.createRandomString(20);
                            //Create the check object, and include the user's phone
                            var checkObject = {
                                'id' : checkId,
                                'userPhone': userPhone,
                                'protocol': protocol,
                                'url':url,
                                'method':method,
                                'sucessCodes':sucessCodes,
                                'timeoutSeconds':timeoutSeconds
                            };
                            // Save the project
                            _data.create('checks',checkId,checkObject,function(err){
                                if(!err){
                                    // add the check id to the user's object
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);
                                    // Save the new user data
                                    _data.update('users',userPhone,userData,function(err){
                                        if(!err){
                                            callback(200,checkObject);
                                        } else {
                                            callback(500,{'error':'Could not update the user with the new checks'})
                                        }
                                    });
                                } else {
                                    callback(500, {'error': 'Could not create the new check'})
                                }
                            });
                        } else {
                            callback(400,{'error' : 'The user has already the maximu number of checks'});
                        }
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(403)
            }
        });
    } else {
        callback(400,{'error' : 'Missing required inputs, or iputs are invalid'});
    }
    
};

// Checks - get
// Required data: id
handlers._checks.get = function(data,callback){
    // Check that id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
      // Lookup the check
        _data.read('checks',id,function(err,checkData){
            if(!err && checkData){
                // Get the token that sent the request
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                // Verify that the given token is valid and belongs to the user who created the check
                console.log("This is check data",checkData);
                handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
                    if(tokenIsValid){
                        // Return check data
                        callback(200,checkData);
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(404);
            }
        });
    } else {
        callback(400,{'Error' : 'Missing required field, or field invalid'})
    }
};

// Checks - put
// Required data: id
handlers._checks.put = function(data,callback){
    // Check for required field
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    // Check for optional fields
    var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
    // Error if id is invalid
    if(id){
        // Error if nothing is sent to update
        if(protocol || url || method || successCodes || timeoutSeconds){
            // Lookup the check
            _data.read('checks',id,function(err,checkData){
                if(!err && checkData){
                    // Get the token that sent the request
                    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                    // Verify that the given token is valid and belongs to the user who created the check
                    handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
                        if(tokenIsValid){
                            // Update check data where necessary
                            if(protocol){
                                checkData.protocol = protocol;
                            }
                            if(url){
                                checkData.url = url;
                            }
                            if(method){
                                checkData.method = method;
                            }
                            if(successCodes){
                                checkData.successCodes = successCodes;
                            }
                            if(timeoutSeconds){
                                checkData.timeoutSeconds = timeoutSeconds;
                            }
                            // Store the new updates
                            _data.update('checks',id,checkData,function(err){
                                if(!err){
                                    callback(200);
                                } else {
                                    callback(500,{'Error' : 'Could not update the check.'});
                                }
                            });
                        } else {
                            callback(403);
                        }
                    });
                } else {
                    callback(400,{'Error' : 'Check ID did not exist.'});
                }
            });
        } else {
            callback(400,{'Error' : 'Missing fields to update.'});
        }
    } else {
        callback(400,{'Error' : 'Missing required field.'});
    }
};

  // Checks - delete
  // Required data: id
handlers._checks.delete = function(data,callback){
    // Check that id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
        // Lookup the check
        _data.read('checks',id,function(err,checkData){
            if(!err && checkData){
                // Get the token that sent the request
                var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                // Verify that the given token is valid and belongs to the user who created the check
                handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
                    if(tokenIsValid){
                        // Delete the check data
                        _data.delete('checks',id,function(err){
                            if(!err){
                                // Lookup the user's object to get all their checks
                                _data.read('users',checkData.userPhone,function(err,userData){
                                    if(!err){
                                        var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                                        // Remove the deleted check from their list of checks
                                        var checkPosition = userChecks.indexOf(id);
                                        if(checkPosition > -1){
                                            userChecks.splice(checkPosition,1);
                                            // Re-save the user's data
                                            userData.checks = userChecks;
                                            _data.update('users',checkData.userPhone,userData,function(err){
                                            if(!err){
                                                callback(200);
                                            } else {
                                                callback(500,{'Error' : 'Could not update the user.'});
                                            }
                                            });
                                        } else {
                                            callback(500,{"Error" : "Could not find the check on the user's object, so could not remove it."});
                                        }
                                    } else {
                                    callback(500,{"Error" : "Could not find the user who created the check, so could not remove the check from the list of checks on their user object."});
                                    }
                                });
                            } else {
                            callback(500,{"Error" : "Could not delete the check data."})
                            }
                        });
                    } else {
                    callback(403);
                    }
                });
            } else {
            callback(400,{"Error" : "The check ID specified could not be found"});
            }
        });
    } else {
      callback(400,{"Error" : "Missing valid id"});
    }
};

// Ping handler
handlers.ping = function(data,callback){
    callback(202);
};

// Not found handler
handlers.notFound = function(data,callback){
    callback(404);
};

// Export the module
module.exports = handlers;