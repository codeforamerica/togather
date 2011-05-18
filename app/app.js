var express = require('express'),
    events = require('./cal-events');

var app = module.exports = express.createServer();

// Configuration
app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express['static'](__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
    app.use(express.errorHandler()); 
});

// Routes
app.get('/', function(req, res) {
    events.get(function(evts){
        res.render('event-microdata', {
            'title': 'Events Dashboard (hCal)',
            'events': evts
        });
    });
});

app.get('/add/:url', function(req, res) {
    events.get(function(evts){
        res.send('url: ' + req.params.url);
        events.addUrl(req.params.url);
    });
});


// Only listen on $ node app.js
if (!module.parent) {
    app.listen(8080);
    console.log("Express server listening on port %d", app.address().port);
}