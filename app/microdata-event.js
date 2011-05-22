var $ = require('jquery'),
    request = require('request'),
    util = require('util');

var results = [],
  specs = {
    itemtype: 'http://data-vocabulary.org/Event',
    children: {
      summary: '',
      url: '',
      location: '',
      description: '',
      startDate: 'datetime',
      endDate: 'datetime',
      duration: '',
      eventType: '',
      geo: '',
      photo: 'src'
    }
  
  };

var parse = function(itemscope) {
  var results =  {};
  console.log('');
  
  $('[itemprop]', itemscope).each(function(j, itemprop) {
    var $itemprop = $(itemprop);
    
    if ($itemprop.is('[itemscope]')) {
      console.log($itemprop.attr('itemprop') + ' is also an itemscope!');
      results[$itemprop.attr('itemprop')] = parse($itemprop);
    } else {
      console.log('Saving ' + $itemprop.attr('itemprop'));        
      results[$itemprop.attr('itemprop')] = $itemprop.text();
    }
    console.log(util.inspect(results, true, 2));
  });

  return results;  
};

exports.parse = function(url, callback) { 
  request({uri:url}, function(err, r, html) {
    var tada = parse($('[itemscope]:not([itemprop])', html));
    console.log('final!');
    console.log(tada);
  });
};