var ical = require('../parsers/ical'), 
    md = require('../parsers/microdata'),
    auth = require('../settings/auth'),
    SimpleGeo = require('simplegeo-client').SimpleGeo,
    sg = new SimpleGeo(auth.simplegeo.key, auth.simplegeo.secret),
    gm = require('googlemaps'),
    time = require('time'),
    cradle = require('cradle'),
    crypto = require('crypto');

//datejs modifies the Date prototype and doesn't work as a module, though it is loaded with npm
require('datejs');

//Setup the DB connection
var eventsDb = new (cradle.Connection)(auth.db.host, auth.db.port).database('togather_events'),
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
  return (a.startDate - b.startDate);
};

var zeroPad = function(n, pad) {
  return n < pad ? '0' + n : n;
};

//Get the events we've already stored for this url
exports.get = function(callback) {
  eventsDb.view('events/origin_url', 
    function (err, results) {
      var i, event, startDate, eventsArray = [];
      
      if (err) {
        console.log(err);
      } else {
        for (i=0; i<results.length; i++) {
          event = results[i].value;
          startDate = new time.Date(time.Date.parse(event.startDate));
          startDate.setTimezone(event.tzid);
          event.prettyStartDate = startDate.getMonth()+1 + '/' + zeroPad(startDate.getDate(), 2);
          event.prettyStartTime = startDate.getHours() + ':' + zeroPad(startDate.getMinutes(), 2);
          
          eventsArray.push(event);
        }
        
        eventsArray.sort(sortByStart);
      }
      
      if (callback) {
        callback(eventsArray);
      }
    }
  );
};

var filter = function(list, filterKey, filterValue) {
  var i
    , evt
    , results = [];

  for (i=0; i < list.length; i++) {
    evt = list[i];
    if (evt[filterKey] === filterValue) {
      results.push(evt);
    }
  }

  return results;
};

// filter a list of events by a key and value
exports.filter = function(list, filterKey, filterValue, callback) {
  callback(filter(list, filterKey, filterValue));
};


// Gets the events sorted into groups by day
var groupByDay = function(events) {
  var groups, i, eventDate;

  groups = {
    today: [],
    tomorrow: [],
    future: []
  };
  
  for ( i=0; i < events.length; i++) {
    event = events[i];

    eventDate = Date.parse(event.startDate);

    if (Date.equals(eventDate, Date.today())) {
      groups.today.push(event);
    } else {
      if ( Date.equals(eventDate, Date.today().add(1).day())) {
        groups.tomorrow.push(event);
      } else {
        groups.future.push(event);
      }
    }
  }

  return groups;
};

//henrique
exports.addByDay = function(req, res, next) {
  exports.get(function(events) {
    var f;
    
    res.events = events;
    
    for (f in req.query) {
      if (req.query.hasOwnProperty(f)) {
        events = filter(events, f, req.query[f]);
      }
    }
    
    res.groups = groupByDay(events);
    
    next();
  });
};

exports.getCategories = function(callback) {
  exports.get(function(events) {
    var categories = [], 
        i, 
        event;

    for ( i=0; i < events.length; i++) {
      event = events[i];
      if (event.categories) {
        categories.push(event.categories);
      }
    }
    callback(categories);
  });
};

//henrique
exports.addCategories = function(req, res, next) {
  exports.getCategories(function(categories) {
    res.categories = categories;
    next();
  });
};

exports.getNeighborhoods = function(callback) {
  eventsDb.view('neighborhood/count', { group: true },
    function (err, results) {
      var i, hoods = [];
      
      if (err) {
        console.log(err);
      } else {
        for (i=0; i<results.length; i++) {
          hoods.push(results[i].key);
        }
        
        hoods.sort();
      }
      
      if (callback) {
        callback(err, hoods);
      }
    }
  );
};

//henrique
exports.addNeighborhoods = function(req, res, next) {
  exports.getNeighborhoods(function(err, neighborhoods) {
    if (err) {
      next(new Error("Could not get neighborhoods."));
    } else {
      res.neighborhoods = neighborhoods;
      next();
    }
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
      missingProps = getMissingProperties(standardResult),
      startDate;
    
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
      
      gm.geocode(standardResult.streetAddress + ' ' + 
        standardResult.city + ' ' + standardResult.state, function(err, result) {
        var lat, lon;
        
        if (result && result.results && result.results.length > 0) {
          lat = result.results[0].geometry.location.lat;
          lon = result.results[0].geometry.location.lng;

          //Extract the TZ and Neighborhood via SimpleGeo
          sg.getContextByLatLng(lat, lon, function(err, data) {
            var i, j, feat, classifier;

            if (data) {
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

                if (data.query) {
                  standardResult.lon = data.query.longitude;
                  standardResult.lat = data.query.latitude;
                }
              }

              //Set the tzOffset
              startDate = new time.Date(time.Date.parse(standardResult.startDate));
              startDate.setTimezone(standardResult.tzid);
              standardResult.tzOffset = -(startDate.getTimezoneOffset() / 60);
            } else {
              console.log(err);
              console.log(data);
            }
            console.log(standardResult);

            if (callback) {
              callback(err, [standardResult]);
            }
          });
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
      
      eventsDb.save('_design/neighborhood', {
        count: {
          map: function(doc) {
            emit(doc.neighborhood, 1);
          },
          reduce: '_sum'
        },
        events: {
          map: function(doc) {
            emit(doc.neighborhood, doc);
          }
        }
      });
    });
  });
};
