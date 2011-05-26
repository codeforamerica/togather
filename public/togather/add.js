(function(){
  var self = {},
      options = {
        openDialogButtonId: 'cal-dialog-open-button',
        closeDialogButtonId: 'cal-dialog-close-button',
        previewButtonId: 'cal-preview-button',
        previewInputId: 'cal-preview-input',
        saveButtonId: 'cal-save-button',
        overlayId: 'cal-overlay',
        boxId: 'cal-box'
      },
      sb,
      eventEjs = new EJS({url: 'views/event.ejs'}),
      $box = $('#' + options.boxId),
      $saveButton,
      events = [];
    
  var refresh = function() {
    $saveButton.show();
    
    $('#cal-add-preview').html(eventEjs.render( {'event': events[0] } ));
  };
  
  self.close = function() {
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
    
    $('#' + options.previewButtonId).click(function() {
      var url = $('#' + options.previewInputId).val();
      
      //TODO: make a regex check
      if (url) {
        $.ajax({
          url: 'parse',
          type: 'GET',
          dataType: 'json',
          data: { url: encodeURIComponent(url) },
          success: function(data, textStatus, jqXHR) {
            console.log(data);
            events = data;
            refresh();
            
            //self.close();
          },
          error: function(jqXHR, textStatus, errorThrown) {
            console.log(jqXHR);
            $('#cal-add-preview').html('<div class="error">' + jqXHR.responseText + '</div>');
          }
        });
      }
    });
    
    $saveButton.click(function() {
      $.ajax({
        url: 'save',
        type: 'POST',
        dataType: 'json',
        data: { events: JSON.stringify(events) },
        success: function(data, textStatus, jqXHR) {
          console.log(data);
          
          location.reload();
        },
        error: function(jqXHR, textStatus, errorThrown) {
          console.log(errorThrown);
        }
      });
    });
  };
  
  var init = function() {
    $('<div id="cal-overlay" class="skinny-overlay"></div>' + 
      '<div id="cal-box" class="skinny-box"><header><h2>Enter the URL for your event</h2></header>' + 
      '<section class="preview-input-container"><input type="text" id="'+options.previewInputId+'" class="textfield" value="" />' + 
      '<button id="'+options.previewButtonId+'">Preview</button></section>' + 
      '<section id="cal-add-preview"></section>' + 
      '<footer><button id="'+options.saveButtonId+'">Save</button>' +
      '<a id="'+options.closeDialogButtonId+'" href="javascript:void(0);">Close</a></footer></div>').appendTo('body');
    
    sb = skinnybox({
      overlay: options.overlayId, 
      box: options.boxId
    });
    
    $saveButton = $('#' + options.saveButtonId);
      
    bindEvents();
  };
  
  init();
  
  return self;
})();