var ical = require('./ical'), 
    md = require('./microdata-event'),
    auth = require('./settings/auth'),
    fs = require('fs'),
    SimpleGeo = require('simplegeo-client').SimpleGeo,
    sg = new SimpleGeo(auth.simplegeo.key, auth.simplegeo.secret),
    time = require('time'),
    cradle = require('cradle'),
    crypto = require('crypto');

//Setup the DB connection
var eventsDb = new (cradle.Connection)('togather.iriscouch.com','5984').database('togather_events'),
  requiredProps = ['summary', 'startDate', 'streetAddress', 'city'];

//Saves new events to the database. This will create events if
//they don't exist or replace them if they do.
exports.save = function(events, callback) {    
    //Save this document to the database - id, data, callback
    eventsDb.save(events, function (err, res) {        
        if (callback) {
            callback(events);
        }
        
        console.log('saved');
    });
};

var sortByStart = function(a, b) {
  return (a.startDate.milliseconds - b.startDate.milliseconds);
};

//Get the events we've already stored for this url
exports.get = function(callback) {
    eventsDb.view('events/origin_url', 
        function (err, results) {
            var i, eventsArray = [];
            
            if (err) {
                console.log(err);
            } else {
                for (i=0; i<results.length; i++) {                                    
                  eventsArray.push(results[i].value);
                }
                
                eventsArray.sort(sortByStart);
            }
            
            if (callback) {
              callback(eventsArray);
            }
        }
    );
};

// Gets the events sorted into groups by day
exports.getByDay = function(callback) {
    exports.get(function(events) {
        var groups, i, today, eventDate, todayStart, todayEnd, tomorrowStart, tomorrowEnd;

        groups = {
            today: [],
            tomorrow: [],
            future: []
        };

        today = new Date();
        for ( i=0; i < events.length; i++) {
          event = events[i];

          eventDate = new Date(event.startDate);

          todayStart = new Date();
          todayStart.setHours(0);
          todayStart.setMinutes(0);
          todayStart.setSeconds(0);

          todayEnd = new Date();
          todayEnd.setHours(23);
          todayEnd.setMinutes(59);
          todayEnd.setSeconds(59);

          tomorrowStart = new Date();
          tomorrowStart.setDate(tomorrowStart.getDate() + 1);
          tomorrowStart.setHours(0);
          tomorrowStart.setMinutes(0);
          tomorrowStart.setSeconds(0);

          tomorrowEnd = new Date();
          tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
          tomorrowEnd.setHours(23);
          tomorrowEnd.setMinutes(59);
          tomorrowEnd.setSeconds(59);

          if (eventDate >= todayStart && eventDate <= todayEnd) {
            groups.today.push(event);
          } else {
            if (eventDate >= tomorrowStart && eventDate <= tomorrowEnd) {
              groups.tomorrow.push(event);
            } else {
              groups.future.push(event);
            }
          }
        }

        callback(groups);
    });
};

exports.parseIcs = function(url, callback) {
  ical.fromURL(url, {}, function(err, newEvents){
    var uid,
        hash,
        eventsArray = [];

    newEvents = newEvents || {};

    if (err) {
      console.log(err);
    }

    for (uid in newEvents) {
      if (newEvents.hasOwnProperty(uid)) {
        //Create a hash of the UID to make it easier to look up
        //records from the database.
        hash = crypto.createHash('md5').update(uid).digest('hex');
        
        //Add origin url
        newEvents[uid].origin_url = url;
        
        //Add sync time
        newEvents[uid].synced_on = new Date();
        
        //Add couch id
        newEvents[uid]._id = hash;
        
        eventsArray.push(newEvents[uid]);
      }
    }
    
    eventsArray.sort(sortByStart);
    
    if (callback) {
      callback(eventsArray);
    }
  });
};


var getMissingProperties = function(standardResult) {
  var i, 
    missing = [],
    standarResult = standardResult || {};
  
  for (i=0; i<requiredProps.length; i++) {
    if (!standardResult[requiredProps[i]]) {
      missing.push(requiredProps[i]);
    }
  }
  
  return missing;
};

exports.parseMicrodata = function(url, callback) {
  md.fromUrl(url, function(standardResult) {
    var hash,
      missingProps = getMissingProperties(standardResult);
    
    console.log(missingProps);
    
    if (missingProps.length === 0) {
      //Create a hash of the UID to make it easier to look up
      //records from the database.
      hash = crypto.createHash('md5').update(url).digest('hex');
    
      //Add origin url
      standardResult.origin_url = url;
    
      //Set the url if it doesn't exist
      standardResult.url = standardResult.url || url;
        
      //Add sync time
      standardResult.synced_on = new Date();
    
      //Add couch id
      standardResult._id = hash;
    
      //Extract the TZ and Neighborhood via SimpleGeo
      sg.getContextByAddress(standardResult.streetAddress + ' ' + standardResult.city, function(err, data) {
        var i, j, feat, classifier;
        for (i=0; i<data.features.length; i++) {
          feat = data.features[i];
        
          if (feat.classifiers && feat.classifiers.length) {
            for(j=0; j<feat.classifiers.length; j++) {
              classifier = feat.classifiers[j];
                          
              if (classifier.category === 'Neighborhood') {
                standardResult.neighborhood = feat.name;
              }
            
              if (classifier.category === 'Time Zone') {
                standardResult.tzid = feat.name;
              }
            }
          }
        }
      
        console.log(standardResult);
      
        if (callback) {
          callback(err, [standardResult]);
        }
      });
    } else {
      console.log('missing ' + missingProps);
      console.log(standardResult);
    
      if (callback) {
        callback({
          name: 'MissingPropertiesError',
          message: 'Could not find these event properties: ' + missingProps.join(', ') + '. ' +
            'These may not be set in the source event or not publicly accessible. Consider ' + 
            'checking the <a href="'+url+'">event source</a> to make them accessible.',
          data: missingProps
        }, [standardResult]);
      }
    }
  });
};

exports.resetDb = function() {
  eventsDb.destroy(function() {
    eventsDb.create(function() {
      eventsDb.save('_design/events', {
        origin_url: {
          map: function (doc) {
            emit(doc.origin_url, doc);
          }
        }
      });
    });
  });
};
