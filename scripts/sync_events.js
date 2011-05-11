var ical = require('ical'), 
    fs = require('fs'),
    cradle = require('cradle'),
    crypto = require('crypto');

//Setup the DB connection
var eventsDb = new (cradle.Connection)('127.0.0.1','5984').database('togather_events');

//Saves new events to the database. This will create events if
//they don't exist or replace them if they do.
var saveEvents = function(newEvents, url, callback) {
    var uid,
        hash,
        docs = [];

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
            
            docs.push(newEvents[uid]);
        }
    }
    
    //Save this document to the database - id, data, callback
    eventsDb.save(docs, function (err, res) {
        console.log(res);
        
        if (callback) {
            callback(err, res);
        }
    });    
};


//Parse an ical ics file
var parseIcsFile = function(url, callback) {
    ical.fromURL(url, {}, function(err, newEvents){
        newEvents = newEvents || {};
        
        if (err) {
            console.log(err);
        }
        
        //console.log(newEvents);
        callback(newEvents, url);
    }); 
};

eventsDb.destroy(function() {
    eventsDb.create(function() {
        eventsDb.save('_design/events', {
            origin_url: {
                map: function (doc) {
                    emit(doc.origin_url, doc);
                }
            }
        });

        //Each line of this file is an ics url
        fs.readFile('./ics_urls.txt', function (err, data) {
            var lines = data.toString().split('\n'),
                i;

            for (i=0; i<lines.length; i++) {
                parseIcsFile(lines[i], function(newEvents, url) {
                    saveEvents(newEvents, url);
                });
            }
        });        
    });
});