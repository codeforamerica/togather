(function(){
  var options = {
        selectorId: 'neighborhood-selector'
      },
      $selector = $('#' + options.selectorId),
      neighborhoods;
    
  var bindEvents = function() {
    $.ajax({
      url: 'neighborhoods',
      success: function(data, textStatus, jqXHR) {
        neighborhoods = data;
        
        $selector.autocomplete({
          source: neighborhoods,
          select: function(event, ui) {
            console.log('select');
            window.location = '/?neighborhood=' + ui.item.value;
          },
          change: function() {
            console.log('change');
            window.location = '/?neighborhood=' + ui.item.value;
          }
        });
      },
      error: function(jqXHR, textStatus, errorThrown) {
        console.log(jqXHR);
      }
    });
  };
  
  bindEvents();
})();