var ical = require('ical'), 
    fs = require('fs'),
    cradle = require('cradle'),
    crypto = require('crypto');

//Setup the DB connection
var db = new (cradle.Connection)('127.0.0.1','5984').database('togather');


//Deletes current events that are not also new events
//We saved them previously, but they are no longer
//in the feed.
var deleteOldEvents = function(newEvents, currentEvents) {
    var uid,
        i,
        toDelete = [];

    for (uid in currentEvents) {
        if (currentEvents.hasOwnProperty(uid)) {
            
            //if the current event is not in the list of new events,
            //then mark it for deletion
            if (!newEvents.uid) {
                toDelete.push({
                    id: currentEvents[uid]._id,
                    rev: currentEvents[uid]._rev
                });
            }
        }
    }
    
    //Delete old records from the db
    for (i=0; i<toDelete.length; i++) {
        db.remove(toDelete[i].id, toDelete[i].rev, function (err, res) {
            console.log('deleting ', res);
        });
    }
};

//Saves new events to the db. This will create events if
//they don't exist or replace them if they do.
var saveNewEvents = function(newEvents, url, callback) {
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
    db.save(docs, function (err, res) {
        console.log(res);
        
        if (callback) {
            callback(err, res);
        }
    });    
};

//Sync events with the db
var syncEvents = function(newEvents, currentEvents, url) {
    //No old events to delete because we recreate the db
    saveNewEvents(newEvents, url);
};

//Get the events we've already stored for this url
var getCurrentEvents = function(url, callback) {
    db.view('events/origin_url', { key: url },
        function (err, docs) {
            var i, currentEvents = {};
            
            if (err) {
                console.log(err);
            } else {
                for (i=0; i<docs.length; i++) {
                    currentEvents[docs[i].value.uid] = docs[i].value;
                }
            }
            
            callback(currentEvents, url);
        }
    );
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

db.destroy(function() {
    db.create();
    
    db.save('_design/events', {
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
                getCurrentEvents(url, function(currentEvents, url2) {
                    syncEvents(newEvents, currentEvents, url2);
                });
            });
        }
    });        
});