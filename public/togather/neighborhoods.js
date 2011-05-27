(function(){
  var options = {
        selectorId: 'neighborhood-selector'
      };
    
  var bindEvents = function() {
    $('#' + options.selectorId).change(function(){
      console.log(this.value);
      window.location = '/?n=' + this.value;
    });
  };
  
  bindEvents();
})();