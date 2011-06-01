var autocomplete = (function(){
  return function(options) {
    var self = {},
        $input = $('#' + options.inputId),
        $list = $('#' + options.listId).addClass('autocomplete-list'),
        autocompleteData,
        selected = [];

    var indexOf = function(array, val) {
      var i;
      for (i=0; i<array.length; i++) {
        if (array[i] === val) {
          return i;
        }
      }
      return -1;
    };
    
    var refreshList = function() {
      var i, html = '';
      for (i=0; i<selected.length; i++) {
        html += '<li><span class="ui-icon ui-icon-circle-close"></span>' + 
          '<span class="autocomplete-item">' + selected[i] + '</span></li>';
      }
      
      $list.html(html);
      
      if (options.callback) {
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
        selected.push(val);
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
        if(event.keyCode === 13) {
          addToList($input.val());
          $input.val('');
        }
      });
      
      if (options.buttonId) {
        $('#' + options.buttonId).click(function(){
          addToList($input.val());
          $input.val('');
        });
      }
      
      $('.ui-icon', $list).live('click', function(event) {
        var val = $(this).next('.autocomplete-item').text();
        removeFromList(val);
      });
    };

    bindEvents();

    return self;
  };
})();