var skinnybox = function(options) {
  var self = {},
      overlay = getElement(options, 'overlay'),
      box = getElement(options, 'box');
  
  //Get the element we need or throw an error
  function getElement(obj, key) {
    var id = obj ? obj[key] : null,
        el = document.getElementById(id);
    
    if (!el) {
      throw new Error('Option [' + key + '] was not provided.');
    }
    
    return el;
  };
  
  //Open the box and the overlay
  self.open = function() {
    overlay.style.height = document.body.scrollHeight + 'px';
    overlay.style.display = 'block';
    box.style.display = 'block';
  };
  
  //Close the box and clear the overlay
  self.close = function() {
    overlay.style.display = 'none';
    box.style.display = 'none';
  };

  return self;
};