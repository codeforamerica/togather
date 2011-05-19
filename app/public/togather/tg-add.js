(function(){
  var self = {},
      options = {
        openDialogButtonId: 'cal-dialog-open-button',
        closeDialogButtonId: 'cal-dialog-close-button',
        addUrlButtonId: 'cal-add-button',
        addUrlInputId: 'cal-add-input',
        overlayId: 'cal-overlay',
        boxId: 'cal-box'
      },
      sb,
      eventEjs = new EJS({url: 'views/event-microdata.ejs'}),
      $box = $('#' + options.boxId);
    
  var refresh = function(events) {
    $('#cal-add-preview').html(eventEjs.render( {events: [events[0]]} ));
  };
  
  self.close = function() {
    console.log('close!');
    sb.close();
  };
  
  self.open = function() {
    sb.open();
  };
  
  var bindEvents = function() {
    
    $('#' + options.closeDialogButtonId).click(function(){
      self.close();
    });
    
    //Open the dialog
    $('#' + options.openDialogButtonId).click(function() {
      self.open();
    });
    
    $('#' + options.addUrlButtonId).click(function() {
      var url = $('#' + options.addUrlInputId).val();
      
      //TODO: make a regex check
      if (url) {
        $.ajax({
          url: 'parse',
          type: 'GET',
          dataType: 'json',
          data: { url: encodeURIComponent(url) },
          success: function(data, textStatus, jqXHR) {
            console.log(data);
            
            refresh(data);
            
            //self.close();
          },
          error: function(jqXHR, textStatus, errorThrown) {
            console.log(errorThrown);
          }
        });
      }
    });
  };
  
  var init = function() {
    $('<div id="cal-overlay" class="skinny-overlay"></div>' + 
      '<div id="cal-box" class="skinny-box"><header><h2>Enter the URL for your event:</h2></header>' + 
      '<section><input type="text" id="cal-add-input" value="" /><button id="cal-add-button">Add</button></section>' + 
      '<section id="cal-add-preview"></section>' + 
      '<footer><button id="'+options.closeDialogButtonId+'">close!</button><footer></div>').appendTo('body');
    
    sb = skinnybox({
      overlay: options.overlayId, 
      box: options.boxId
    });
      
    bindEvents();
  };
  
  init();
  
  return self;
})();