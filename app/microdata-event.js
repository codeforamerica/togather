var $ = require('jquery'),
    request = require('request'),
    util = require('util'),
    time = require('time');

var specs = {
    // null spec means to just use the element value
    //'data-vocabulary.org/Event'
    'summary': null,
    'url': { attributes: ['href'] },
    'location': null,
    'description': null,
    'startDate': { attributes: ['datetime'] },
      'dtstart': { alias: 'startDate' },
    'endDate': { attributes: ['datetime'] },
      'dtend': { alias: 'endDate' },
    'duration': null,
    'eventType': null,
      'category': { alias: 'eventType'},
    //'geo': { elements: ['latitude', 'longitude'] },
    'photo': { attributes: ['src'] },
    //'data-vocabulary.org/Organization'
    'name': null,
      'fn': { alias: 'name' },
      'org': { alias: 'name' },
    'url': { attributes: ['href'] },
    //'address': { elements: ['street-address', 'locality', 'region', 'postal-code', 'country-name']},
      'adr': { alias: 'address' },
    'tel': null,
    //'geo': { elements: ['latitude', 'longitude'] },
    //'data-vocabulary.org/Address'
    'street-address': null, 
      'stress-address': { alias: 'street-address'}, //Craziness from Meetup.com
    'locality': null, 
    'region': null, 
    'postal-code': null, 
    'country-name': null
  };

var parseItemProp = function($itemprop, $itemscope) {
  var propName = $itemprop.attr('itemprop'),
      spec = specs[propName],
      itemResults = {};

  //This is just an alias, get the real spec
  if (spec && spec.alias) {
    propName = spec.alias;
    spec = specs[propName];
  }
  
  if (spec) {
    if (spec.attributes) {
      $.each(spec.attributes, function(i, attr) {
        itemResults.val = $itemprop.attr(attr);
        
        if (itemResults.val) {
          //Break out of the loop
          return false;
        }
      });
    }
  } else {
    //console.log('default spec for ' + propName);
    itemResults.val = $itemprop.text();
  }
  itemResults.key = propName;
  
  return itemResults;
};

var parseItemScope = function($itemscope, depth) {
  var scopeResults = {};
  
  //This will get every itemprop in this scope, regardless of nesting
  $('[itemprop]', $itemscope).each(function(j, itemprop) {
    var $itemprop = $(itemprop),
      itemResults;

    //Enforce nesting - the number of itemscope parents is the depth
    //of the nesting.
    if (depth === $itemprop.parents('[itemscope]').length) {
      //This itemprop is also an itemscope so go parse its children
      if ($itemprop.is('[itemscope]')) {
        //console.log($itemprop.attr('itemprop') + ' is also an itemscope!');
        scopeResults[$itemprop.attr('itemprop')] = parseItemScope($itemprop, depth+1);
        //console.log('Saving itemscope ' + $itemprop.attr('itemprop'));      
      } else {
        //console.log('Saving ' + $itemprop.attr('itemprop'));
        itemResults = parseItemProp($itemprop, $itemscope);
        scopeResults[itemResults.key] = itemResults.val;
      }
    }

    //console.log('depth: ' + depth);
    //console.log(util.inspect(scopeResults, true, 2));
  });

  //console.log('returning ' + util.inspect(scopeResults, true, 2));
  return scopeResults;  
};

exports.fromUrl = function(url, callback) { 
  request({uri:url}, function(err, r, html) {
    exports.parse(html, callback);
  });
};

exports.parse = function(html, callback) {
  //Get the roots - itemscopes that are not also itemprops
  var result = parseItemScope($('[itemscope]:not([itemprop])', html), 1),
    standardResult = {
      //what
      summary: result.summary,
      description: result.description,
      url: result.url,
      //when
      startDate: result.startDate,
      endDate: result.endDate,
      tzOffset: -4, //EDT
      //where
      streetAddress: (result && result.locality) ? result.locality.address['street-address'] : null,
      city: (result && result.locality) ? result.locality.address.locality : null
    };
      
  if (callback) {
    callback(standardResult);
  }
};