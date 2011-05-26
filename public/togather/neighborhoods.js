(function(){
  var self = {},
      options = {
        containerId: 'neighborhoods',
        selectorId: 'neighborhood-selector'
      },
      neighborhoodEjs = new EJS({url: 'views/neighborhoods.ejs'}),
      $container = $('#' + options.containerId),
      neighborhoods = [];
    
  var bindEvents = function() {
    $('#' + options.selectorId).change(function(){
      console.log(this.value);
      window.location = '/?n=' + this.value;
    });
  };
  
  var init = function() {
    $.ajax({
      url: 'neighborhoods',
      type: 'GET',
      dataType: 'json',
      success: function(data, textStatus, jqXHR) {
        console.log(data);
        neighborhoods = data;
        
        $container.html(neighborhoodEjs.render( {'neighborhoods': data } ));
        bindEvents();
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log(errorThrown);
      }
    });    
  };
  
  init();
  
  return self;
})();