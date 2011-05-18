/****************
 *  A tolerant, minimal icalendar parser
 *  (http://tools.ietf.org/html/rfc5545)
 *
 *  <peterbraden@peterbraden.co.uk>
 * **************/

var request = require('request'),
    fs = require('fs'),
    time = require('time');


var storeParam = function(name){
  return function(val, params, curr){
    if (params && params.length && !(params.length==1 && params[0]==='CHARSET=utf-8')){
      curr[name] = {params:params, val:val};
    }
    else
      curr[name] = val;

    return curr;
  };
};

var dateParam = function(name){  
  return function(val, params, curr){
    var matches,
        tz,
        floatDateRe =     /^(\d{4})(\d{2})(\d{2})$/,
        floatDateTimeRe = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/,
        utcDateTimeRe =   /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;
    
    //TZID included, use this to create the date
    if (params && params.length && params[0].indexOf('TZID') !== -1) {
      tz = params[0].split('=')[1];
    } else {
      tz = 'UTC';
    }
    
    curr[name] = new time.Date(1900, 1, 0);
    curr[name].setTimezone(tz);
    curr[name].setSeconds(0);
    
    if (floatDateRe.test(val)) { //Floating date format
      matches = floatDateRe.exec(val);
      if (matches !== null) {
        curr[name].setFullYear(matches[1]);
        curr[name].setMonth(parseInt(matches[2], 10)-1);
        curr[name].setDate(matches[3]);
      }
    } else if (floatDateTimeRe.test(val)) { //Floating datetime format
      matches = floatDateTimeRe.exec(val);
      if (matches !== null) {
        curr[name].setFullYear(matches[1]);
        curr[name].setMonth(parseInt(matches[2], 10)-1);
        curr[name].setDate(matches[3]);
        curr[name].setHours(matches[4]);
        curr[name].setMinutes(matches[5]);
      }      
    } else { //typical RFC date-time format
      matches = utcDateTimeRe.exec(val);
      if (matches !== null) {
        curr[name].setFullYear(matches[1]);
        curr[name].setMonth(parseInt(matches[2], 10)-1);
        curr[name].setDate(matches[3]);
        curr[name].setHours(matches[4]);
        curr[name].setMinutes(matches[5]);
      }
    }
    
    return curr;
  };
};

exports.objectHandlers = {
  'BEGIN' : function(component, params, curr){
    if (component === 'VCALENDAR')
      return curr;
    return {type:component, params:params};
  },

  'END' : function(component, params, curr, par){
    if (curr.uid)
      par[curr.uid] = curr;
  },
  
  'TZID': function(component, params, curr) {
    console.log(component);
    console.log(params);
  },

  'SUMMARY' : storeParam('summary'),
  'URL' : storeParam('url'),
  'UID' : storeParam('uid'),
  'LOCATION' : storeParam('location'),
  'DTSTART' : dateParam('start'),
  'DTEND' : dateParam('end'),
  'CLASS' : storeParam('location')
};

exports.handleObject = function(name, val, params, stack, par, line){
  if(exports.objectHandlers[name]) {
    return exports.objectHandlers[name](val, params, stack, par, line);
  }
  return stack;
};

exports.parseICS = function(str){
  var lines = str.split(/\r?\n/),
      out = {},
      ctx = {},
      l,
      value,
      kp,
      name,
      params,
      i;

  for (i = 0, ii = lines.length, l = lines[0]; i<ii; i++, l=lines[i]){
    //Unfold : RFC#3.1
    while (lines[i+1] && /[ \t]/.test(lines[i+1][0])) {
      l += lines[i+1].slice(1);
      i += 1;
    }

    var kv = l.split(":");

    if (kv.length < 2){
      // Invalid line - must have k&v
      continue;
    }

    // Although the spec says that vals with colons should be quote wrapped
    // in practise nobody does, so we assume further colons are part of the
    // val
    value = kv.slice(1).join(":");
    
    kp = kv[0].split(";");
    name = kp[0];
    params = kp.slice(1);

    ctx = exports.handleObject(name, value, params, ctx, out, l) || {};
  }

  return out;
};

exports.fromURL = function(url, opts, cb){
  if (!cb) {
    return;
  }

  request({uri:url}, function(err, r, data){
    if (err) {
      throw err;
    }
    cb(undefined, exports.parseICS(data));
  });
};

exports.parseFile = function(filename){
  return exports.parseICS(fs.readFileSync(filename, 'utf8'));
};