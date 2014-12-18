'use strict';
var conf = require('simple-configure');
var async = require('async');
var ourDB;
var loggers = require('winston').loggers;
var logger = loggers.get('transactions');
var scriptLogger = loggers.get('scripts');

var CONFLICTING_VERSIONS = conf.get('beans').get('constants').CONFLICTING_VERSIONS;
var DBSTATE = {OPEN: 'OPEN', CLOSED: 'CLOSED', OPENING: 'OPENING'};
var ourDBConnectionState = DBSTATE.CLOSED;

module.exports = function (collectionName) {
  var persistence;

  function logInfo(logMessage) {
    if (collectionName === 'settingsstore') {
      scriptLogger.info(logMessage);
    }
  }

  function performInDB(callback) {
    logInfo('In performInDB');
    if (ourDBConnectionState === DBSTATE.OPEN) {
      logInfo('connection is open');
      return callback(null, ourDB);
    }
    logInfo('connection is not open, opening it');
    persistence.openDB();
    logInfo('opened connection, now trying again with timeout');
    setTimeout(function () {
      logInfo('before retry');
      performInDB(callback);
      logInfo('after retry');
    }, 5);
    logInfo('retry timeout is expired');
  }

  persistence = {
    list: function (sortOrder, callback) {
      this.listByField({}, sortOrder, callback);
    },

    listByIds: function (list, sortOrder, callback) {
      this.listByField({'id': {$in: list}}, sortOrder, callback);
    },

    listByField: function (searchObject, sortOrder, callback) {
      this.listByFieldWithOptions(searchObject, {}, sortOrder, callback);
    },

    listByFieldWithOptions: function (searchObject, options, sortOrder, callback) {
      performInDB(function (err, db) {
        if (err) { return callback(err); }
        var cursor = db.collection(collectionName).find(searchObject, options).sort(sortOrder);
        cursor.count(function (err, result) {
          cursor.batchSize(result);
          cursor.toArray(function (err, result) {
            if (err) { return callback(err); }
            callback(null, result);
          });
        });
      });
    },

    getById: function (id, callback) {
      this.getByField({id: id}, callback);
    },

    getByField: function (fieldAsObject, callback) {
      logInfo('In getByField');
      performInDB(function (err, db) {
        logInfo('In performInDB callback');
        if (err) { return callback(err); }
        logInfo('No error occurred. collectionName: ' + collectionName + ' fieldAsObject: ' + fieldAsObject);
        db.collection(collectionName).find(fieldAsObject).toArray(function (err, result) {
          logInfo('In dbCollection callback, result: ' + result);
          if (err) { return callback(err); }
          callback(null, result[0]);
        });
      });
    },

    mapReduce: function (map, reduce, options, callback) {
      performInDB(function (err, db) {
        if (err) { return callback(err); }
        db.collection(collectionName).mapReduce(map, reduce, options, callback);
      });
    },

    save: function (object, callback) {
      this.update(object, object.id, callback);
    },

    update: function (object, storedId, callback) {
      if (object.id === null || object.id === undefined) {
        return callback(new Error('Given object has no valid id'));
      }
      performInDB(function (err, db) {
        if (err) { return callback(err); }
        var collection = db.collection(collectionName);
        collection.update({id: storedId}, object, {upsert: true}, function (err) {
          if (err) { return callback(err); }
          logger.info(object.constructor.name + ' saved: ' + JSON.stringify(object));
          callback(null);
        });
      });
    },

    remove: function (objectId, callback) {
      if (objectId === null || objectId === undefined) {
        return callback(new Error('Given object has no valid id'));
      }
      performInDB(function (err, db) {
        if (err) { return callback(err); }
        var collection = db.collection(collectionName);
        collection.remove({id: objectId}, {w: 1}, function (err) {
          if (err) { return callback(err); }
          callback(null);
        });
      });
    },

    saveWithVersion: function (object, callback) {
      var self = this;
      if (object.id === null || object.id === undefined) {
        return callback(new Error('Given object has no valid id'));
      }
      performInDB(function (err, db) {
        if (err) { return callback(err); }
        var collection = db.collection(collectionName);
        var oldVersion = object.version;
        object.version = oldVersion ? oldVersion + 1 : 1;
        self.getById(object.id, function (err, result) {
          if (err) { return callback(err); }
          if (result) { // object exists
            collection.findAndModify({id: object.id, version: oldVersion}, [], object,
              {new: true, upsert: false},
              function (err, newObject) {
                if (err) { return callback(err); }
                if (!newObject.value) {
                  // something went wrong: restore old version count
                  object.version = oldVersion;
                  return callback(new Error(CONFLICTING_VERSIONS));
                }
                logger.info(object.constructor.name + ' found and modified: ' + JSON.stringify(object));
                callback(null, newObject.value);
              });
          } else { // object is not yet persisted
            self.save(object, callback);
          }
        });
      });
    },

    saveAll: function (objects, outerCallback) {
      var self = this;
      async.each(objects, function (each, callback) { self.save(each, callback); }, outerCallback);
    },

    drop: function (callback) {
      performInDB(function (err, db) {
        if (err) { return callback(err); }
        logger.info('Drop ' + collectionName + ' called!');
        db.dropCollection(collectionName, function (err) {
          callback(err);
        });
      });
    },

    openDB: function () {
      logInfo('In openDB');
      if (ourDBConnectionState !== DBSTATE.CLOSED) {
        logInfo('connection state was not closed, but ' + ourDBConnectionState + '. Returning.');
        return;
      }

      logInfo('Setting connection state to OPENING');
      ourDBConnectionState = DBSTATE.OPENING;

      var MongoClient = require('mongodb').MongoClient;
      logInfo('Connecting to Mongo');
      MongoClient.connect(conf.get('mongoURL'), function (err, db) {
        logInfo('In connect callback');
        if (err) {
          logInfo('An error occurred: ' + err);
          return logger.error(err);
        }
        ourDB = db;
        ourDBConnectionState = DBSTATE.OPEN;
        logInfo('DB state is now OPEN, db = ' + db);
      });
    },

    closeDB: function () {
      if (ourDBConnectionState === DBSTATE.CLOSED) {
        return;
      }
      performInDB(function () {
        ourDB.close();
        ourDB = undefined;
        ourDBConnectionState = DBSTATE.CLOSED;
      });
    }
  };

  persistence.openDB();
  return persistence;
};