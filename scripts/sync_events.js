var ical = require('ical'), 
    fs = require('fs'),
    cradle = require('cradle'),
    crypto = require('crypto');

//Setup the DB connection
var db = new (cradle.Connection)('127.0.0.1','5984').database('togather');

//Parse an ical ics file
var parseIcsFile = function(url) {
    ical.fromURL(url, {}, function(err, data){
        var key, 
            md5;
        
        //Each piece of data is a parsed event
        for (key in data) {
            if (data.hasOwnProperty(key)) {
                //Create a hash of the UID to make it easier to look up
                //records from the database.
                md5 = crypto.createHash('md5');
                
                //Add sync time
                data[key].synced_on = new Date();
                
                //Save this document to the database
                db.save(md5.update(key).digest('hex'), data[key], function (err, res) {
                    console.log(res);
                });
            }
        }
    }); 
};

//Each line of this file is an ics url
fs.readFile('./ics_urls.txt', function (err, data) {
    var lines = data.toString().split('\n'),
        i;
    
    for (i=0; i<lines.length; i++) {
        parseIcsFile(lines[i]);
    }
});