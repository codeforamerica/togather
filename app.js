var express = require('express'),
  events = require('./lib/controllers/events');

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
  events.getByDay(function(groups){
    events.getCategories(function(categories){
      res.render('days', {
        'title': 'Events Dashboard',
        'groups': groups,
        'categories': categories
      });
    });
  });
});

// index page for categories
app.get('/category', function(req, res) {
  events.getCategories(function(cats) {
    res.render('categories', {
        'categories': cats
    });
  });
});

// category list page
app.get('/category/:cat', function(req, res) {
  events.get(function(allEvents) {
    events.filterEvents(allEvents, 'categories', 'Environment', function(list) {
      res.render('events', {
          'events': list,
          'categories': ['test cat']
      });
    });
  });
});

//Parses out an event from a url
app.get('/parse', function(req, res) {
  events.parseMicrodata(decodeURIComponent(req.query.url), function(err, evts) {
    if (err) {
      res.send(err.message, 500);
    } else {
      res.contentType('application/json');
      res.send(evts);
    }
  });
});

//Saves an array of events
app.post('/save', function(req, res) {
  events.save(JSON.parse(req.body.events), function(evts) {
    res.contentType('application/json');
    res.send(evts);
  });
});

app.get('/neighborhoods', function(req, res) {
  events.getNeighborhoods(function(neighborhoods){
    res.contentType('application/json');
    res.send(neighborhoods);
  });
});

//Give the client access to the views
app.get('/views/:file.:format', function(req, res) {
  res.contentType('text/plain');
  res.sendfile(__dirname + '/views/' + req.params.file + '.' + req.params.format);
});


// Only listen on $ node app.js
if (!module.parent) {
  app.listen(8080);
  console.log("Express server listening on port %d", app.address().port);
}
