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
// @TODO Only let authenticated user acces their object. Don't let then access anyone else's
handlers._users.get = function(data,callback){
    // Check that the phone number is valid
    let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone){
        // looking up the user
        _data.read('users',phone, function(err,data){
            if(!err && data){
                // Remove the hashed password from the user object before returning it to the requester
                delete data.hashedPassword;
                callback(200,data);
            }
            else {
                callback(404);
            }
        });
    } else {
        callback(400, {'error' : 'Missing required file'})
    }
};
// User - Put
// Require data: PhonE
// @TODO Only let authenticated user acces their object. Don't let then access anyone else's
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
            }
            else {
                callback(400,{'error': 'Could not find the specified user'});
            }
        });
    } else {
        callback(400, {'error' : 'Missing required file'});
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