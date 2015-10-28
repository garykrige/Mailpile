Mailpile.focus_search = function() {
    $("#search-query").focus(); return false;
};


/* Search - Action Select */
Mailpile.pile_action_select = function($item, partial) {
    if (Mailpile.select_between) {
      console.log('FIXME: should do a shift select of multiple items');
    }

    // Add Tags
    var metadata = _.findWhere(Mailpile.instance.metadata, { mid: $item.attr('data-mid') });
    if (metadata && metadata.tag_tids) {
      _.each(metadata.tag_tids, function(tid, key) {
        var tag = _.findWhere(Mailpile.instance.tags, { tid: tid });
        if (tag.type === 'tag') {
          if (_.indexOf(Mailpile.tags_cache, tag.tid) === -1) {
            Mailpile.tags_cache.push(tag.tid);
          }
        }
      });
    }

    // Style & Select Checkbox
    $item.removeClass('result').addClass('result-on')
         .data('state', 'selected')
         .find('td.checkbox input[type=checkbox]')
         .prop('checked', true);

    // Update Bulk UI
    if (!partial) Mailpile.bulk_actions_update_ui();
};


/* Search - Action Unselect */
Mailpile.pile_action_unselect = function($item, partial) {
    // Remove Tags
    var metadata = _.findWhere(Mailpile.instance.metadata, { mid: $item.attr('data-mid') });
    if (metadata && metadata.tag_tids) {
      _.each(metadata.tag_tids, function(tid, key) {
        var tag = _.findWhere(Mailpile.instance.tags, { tid: tid });
        if (tag.type === 'tag') {
          if (_.indexOf(Mailpile.tags_cache, tag.tid) > -1) {
            Mailpile.tags_cache = _.without(Mailpile.tags_cache, tag.tid);
          }
        }
      });
    }

    // Style & Unselect Checkbox
    $item.removeClass('result-on').addClass('result')
         .data('state', 'normal')
         .find('td.checkbox input[type=checkbox]')
         .prop('checked', false);

    if (!partial) {
      // If something has been unselected, then not selecting all anymore!
      $item.closest('.selection-context')
           .find('#pile-select-all-action').val('');
      Mailpile.bulk_actions_update_ui();
    }
};


/* Search - Result List */
Mailpile.results_list = function() {
    // Navigation
    $('#btn-display-list').addClass('navigation-on');
    $('#btn-display-graph').removeClass('navigation-on');
    
    // Show & Hide View
    $('#pile-graph').hide('fast', function() {
        $('#form-pile-results').show('normal');
        $('.pile-results').show('fast');
        $('.pile-speed').show('normal');
        $('#footer').show('normal');
    });
};


Mailpile.render_modal_tags = function(elem) {
  var selected = Mailpile.UI.Selection.selected(elem || '.pile-results');
  if (selected.length) {

    // Open Modal with selection options
    Mailpile.API.tags_get({}, function(data) {
      Mailpile.API.with_template('template-modal-tag-picker-item',
                                 function(tag_template) {
        var priority_html = '';
        var tags_html     = '';
        var archive_html  = '';

        /// Show tags in selected messages
        var selected_tids = {};
        _.each(selected, function(mid, key) {
          if (mid != '!all') {
            var metadata = _.findWhere(Mailpile.instance.metadata, { mid: mid });
            if (metadata && metadata.tag_tids) {
              _.each(metadata.tag_tids, function(tid, key) {
                if (selected_tids[tid] === undefined) {
                  selected_tids[tid] = 1;
                } else {
                  selected_tids[tid]++;
                }
              });
            }
          }
        });

        // Build Tags List
        _.each(data.result.tags, function(tag, key) {
          if (tag.display === 'priority' && tag.type === 'tag') {
            priority_data  = _.extend(tag, { selected: selected_tids });
            priority_html += tag_template(priority_data);
          }
          else if (tag.display === 'tag' && tag.type === 'tag') {
            tag_data   = _.extend(tag, { selected: selected_tids });
            tags_html += tag_template(tag_data);
          }
          else if (tag.display === 'archive' && tag.type === 'tag') {
            archive_data  = _.extend(tag, { selected: selected_tids });
            archive_html += tag_template(archive_data);
          }
        });

        Mailpile.API.with_template('modal-tag-picker', function(modal) {
          Mailpile.UI.show_modal(modal({
            count: selected.length,
            priority: priority_html,
            tags: tags_html,
            archive: archive_html
          }));
        });
      });
    });
 
  } else {
    Mailpile.notification({ status: 'info', message: '{{_("No Messages Selected")|escapejs}}' });
  }
};


Mailpile.UI.Search.Draggable = function(element) {
  var $element = $(element);
  var initializing = true;
  $element.draggable({
    containment: 'window',
    appendTo: 'body',
    cursor: 'move',
    scroll: false,
    revert: false,
    refreshPositions: true,
    opacity: 1,
    helper: function(event) {
      var selected = Mailpile.UI.Selection.selected(element);
      if ((selected.length < 2) && (selected[0] != '!all')) {
        // Note: Dragging w/o selecting first may mean the length is zero
        drag_count = '{{_("1 message")|escapejs}}';
      }
      else {
        human_count = Mailpile.UI.Selection.human_length(selected);
        drag_count = human_count + ' {{_("messages")|escapejs}}';
      }
      return $('<div class="pile-results-drag ui-widget-header"><span class="icon-inbox"></span> {{_("Moving")|escapejs}} ' + drag_count + '</div>');
    },
    drag: function() {
      if ((!initializing) && $element.draggable('option', 'refreshPositions')) {
        setTimeout(function() {
          $element.draggable('option', 'refreshPositions', initializing);
        }, 10);
      }
    },
    start: function(event, ui) {
      Mailpile.ui_in_action += 1;

      // Style & Select Checkbox
      $(event.target).parent().removeClass('result')
                              .addClass('result-on')
                              .data('state', 'selected')
                              .find('td.checkbox input[type=checkbox]')
                              .prop('checked', true);

      // Update Bulk UI
      Mailpile.bulk_actions_update_ui();

      // Unveil the magical untagger!
      $('.sidebar-untag-dropzone').slideDown(1000, function() {
        initializing = false;
      });
    },
    stop: function(event, ui) {
      initializing = true;
      $element.draggable('option', 'refreshPositions', initializing);
      $('.sidebar-untag-dropzone').slideUp();
      setTimeout(function() { Mailpile.ui_in_action -= 1; }, 250);
    }
  });
};


Mailpile.UI.Search.Dropable = function(element, accept) {
  $(element).droppable({
    accept: accept,
    hoverClass: 'result-hover',
    tolerance: 'pointer',
    drop: function(event, ui) {
      // Suppress spurious drops that happened outside the content window
      var $box = $('#content');
      var ofs = $box.offset();
      if ((ui.position.top > ofs.top + 20) &&
          (ui.position.top < (ofs.top + $box.height() - 20)) &&
          (ui.position.left > ofs.left + 40) &&
          (ui.position.left < (ofs.left + $box.width() - 40)))
      {
        var $context = Mailpile.UI.Selection.context(event.target);
        var selected = Mailpile.UI.Selection.selected($context);
        selected.push($(event.target).data('mid'));
        Mailpile.UI.Tagging.tag_and_update_ui({
          add: ui.draggable.data('tid'),
          mid: selected,
          context: $context.find('.search-context').data('context')
        }, 'tag');
      }
      else {
        console.log('Dropped outside content area!');
      }
    }
  });
};
