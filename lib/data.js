/*
* Library for storing and editing data
*/

// Dependencies
var  fs = require('fs');
var path = require('path');
let helpers = require('./helpers');

// Container for the module (to be exported)
var lib= {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname,'/../.data/')

// Function that write data to a file
lib.create = function(dir,file,data,callback){
  // Open the file for writing
  fs.open(lib.baseDir+dir+'/'+file+'.json','wx',function(err,FileDescriptor){
    if(!err && FileDescriptor){
      // Convert data to stringify
      var stringData = JSON.stringify(data);
      // Write data to file and close
      fs.writeFile(FileDescriptor,stringData,function(err){
        if(!err){
          fs.close(FileDescriptor, function(err){
            if(!err){
              callback(false);
            } else {
              callback('Error closing file');
            }
          });
        } else {
          callback('Error writing to new file');
        }
      });
    } else {
      callback('Could not create new file, it may already exist');
    }
  });
};

// Read data from a file
lib.read = function(dir,file,callback){
  fs.readFile(lib.baseDir+dir+'/'+file+'.json','utf8',function(err,data){
    if(!err && data){
      let parseData = helpers.parseJsonToObject(data);
      callback(false,parseData);
    } else{
      callback(err,data);
    }
  });
};

// Update data
lib.update = function(dir,file,data,callback){
  // Open the file for writing
  fs.open(lib.baseDir+dir+'/'+file+'.json','r+',function(err,FileDescriptor){
    if(!err && FileDescriptor){
      // Convert data to stringify
      var stringData = JSON.stringify(data);
      // Truncate the file
      fs.ftruncate(FileDescriptor,function(err){
        if(!err){
          // Write to the file and close it
          fs.writeFile(FileDescriptor,stringData,function(err){
            if(!err){
              fs.close(FileDescriptor,function(err){
                if(!err){
                  callback(false);
                } else {
                  callback('Error closing the existing file');
                }
              });
            } else {
              callback('Error writing to existing file')
            }
          });
        } else {
          callback('Error trunncting file');
        }
      });
    } else {
      callback('Could not open file for updating, it may not exist yet');
    }
  });
};

// Delete
lib.delete = function(dir,file,callback){
  // Unlink the file
  fs.unlink(lib.baseDir+dir+'/'+file+'.json',function(err){
    if(!err){
      callback(false);
    } else {
      callback('Error deleting file');
    }
  });
};

// Export the module
module.exports = lib;
