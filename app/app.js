var express = require('express'),
  events = require('./cal-events');

var app = module.exports = express.createServer();

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/public/views');
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
  events.getByDay(function(groups){
    res.render('days', {
      'title': 'Events Dashboard',
      'groups': groups
    });
  });
});

//Parses out an event from a url
app.get('/parse', function(req, res) {
  events.parseMicrodata(decodeURIComponent(req.query.url), function(evts) {
    res.contentType('application/json');
    res.send(evts);
  });
});

//Saves an array of events
app.post('/save', function(req, res) {
  events.save(JSON.parse(req.body.events), function(evts) {
    res.contentType('application/json');
    res.send(evts);
  });
});


// Only listen on $ node app.js
if (!module.parent) {
  app.listen(8080);
  console.log("Express server listening on port %d", app.address().port);
}
