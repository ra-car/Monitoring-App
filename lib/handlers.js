/*
* Request handlers
*/

// Dependencies
let _data = require('./data');
let helpers = require('./helpers');

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
// @TODO Only let authenticated user acces their object. Don't let then access anyone else's
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
                                callback(200);
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