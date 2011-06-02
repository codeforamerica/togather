var autocomplete = (function(){
  return function(options) {
    var self = {},
        $input = $('#' + options.inputId),
        $list = $('#' + options.listId).addClass('autocomplete-list'),
        autocompleteData,
        selected = options.defaultList || [];

    var indexOf = function(array, val) {
      var i;
      for (i=0; i<array.length; i++) {
        if (array[i] === val) {
          return i;
        }
      }
      return -1;
    };
    
    var refreshList = function(preventCallback) {
      var i, html = '';
      for (i=0; i<selected.length; i++) {
        html += '<li><span class="ui-icon ui-icon-circle-close"></span>' + 
          '<span class="autocomplete-item">' + selected[i] + '</span></li>';
      }
      
      $list.html(html);
      
      if (options.callback && !preventCallback) {
        options.callback(selected);
      }
    };

    var removeFromList = function(val) {
      var i= indexOf(selected, val);
      if (i !== -1) {
        selected.splice(i, 1);
        refreshList();
      }
    };

    var addToList = function(val) {
      if (indexOf(selected, val) === -1) {
        selected = selected.concat(val);
        refreshList();
      }
    };

    var bindEvents = function() {
      $.ajax({
        url: options.sourceUrl,
        success: function(data, textStatus, jqXHR) {
          autocompleteData = data;

          $input.autocomplete({
            source: autocompleteData,
            select: function(event, ui) {
              //Add to the list
              addToList(ui.item.value);
              ui.item.value = '';
            }
          });
        },
        error: function(jqXHR, textStatus, errorThrown) {
          console.log(jqXHR);
        }
      });
      
      $input.keyup(function(event){
        var val = $input.val();
        if(val && event.keyCode === 13) {
          addToList(val);
          $input.autocomplete('close');
          $input.val('');
        }
      });
      
      if (options.buttonId) {
        $('#' + options.buttonId).click(function(){
          var val = $input.val();
          if(val) {
            addToList($input.val());
            $input.autocomplete('close');
            $input.val('');
          }
        });
      }
      
      $('.ui-icon', $list).live('click', function(event) {
        var val = $(this).next('.autocomplete-item').text();
        removeFromList(val);
      });
    };

    bindEvents();
    
    refreshList(true);
    
    return self;
  };
})();