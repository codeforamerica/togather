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
app.get('/', events.addByDay, events.addCategories, function(req, res) {
  res.render('days', {
    'title': 'Events Dashboard',
    'groups': res.groups,
    'categories': res.categories,
    'neighborhoods': req.query.neighborhood ? req.query.neighborhood.split(',') : ''
  });
});

// index page for categories
app.get('/categories', function(req, res) {
  events.getCategories(function(cats) {
    res.contentType('application/json');
    res.send(cats);
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
app.get('/category/:cat', events.addCategories, function(req, res) {
  events.get(function(allEvents) {
    events.filter(allEvents, 'categories', req.params.cat, function(list) {
      res.render('category', {
          'events': list,
          'category': req.params.cat,
          'categories': res.categories,
          'neighborhoods': req.query.neighborhood ? req.query.neighborhood.split(',') : ''
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
  events.getNeighborhoods(function(err, neighborhoods){
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
