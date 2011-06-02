(function() {
  var selected = $('li', '#neighborhood-list').map(function() {
    return $('.autocomplete-item', this).text();
  }).get();
  
  autocomplete({
    inputId: 'neighborhood-input',
    listId: 'neighborhood-list',
    buttonId: 'neighborhood-add-btn',
    sourceUrl: 'neighborhoods',
    defaultList: selected,
    callback: function(n) {
      if (n && n.length) {
        window.location = '/?neighborhood=' + n.join(',');
      } else {
        window.location = '/';
      }
    }
  });
})();