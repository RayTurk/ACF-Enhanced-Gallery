(function($) {
  'use strict';

  if (typeof acf === 'undefined') {
      console.error('ACF not found');
      return;
  }

  var enhancedFields = new WeakSet();
  var DEFAULT_ZOOM = 100;
  var MIN_ZOOM = 50;
  var MAX_ZOOM = 200;

  function enhanceGalleryField($el) {
      var $field = $el.find('.acf-gallery').first();

      if (!$field.length || enhancedFields.has($field[0])) {
          return;
      }

      enhancedFields.add($field[0]);

      // Initialize field components
      var $toolbar = $field.find('.acf-gallery-toolbar ul.acf-hl').first();
      var $attachments = $field.find('.acf-gallery-attachments').first();
      var $sortSelect = $field.find('.acf-gallery-sort');
      var selectedItems = new Set();
      var selectionMode = null;
      var rangeStartItem = null;

      // Add zoom controls
      var $zoomControls = $([
          '<li class="enhanced-zoom-controls">',
              '<button class="zoom-out" title="Zoom Out">-</button>',
              '<input type="range" class="zoom-slider" min="' + MIN_ZOOM + '" max="' + MAX_ZOOM + '" step="10">',
              '<button class="zoom-in" title="Zoom In">+</button>',
              '<span class="zoom-level"></span>',
          '</li>'
      ].join(''));

      // Add custom buttons
      var $customButtons = $([
          '<li class="enhanced-tools">',
              '<a href="#" class="acf-button button button-secondary select-range">Select Range</a>',
              '<a href="#" class="acf-button button button-secondary select-toggle">Select Toggle</a>',
              '<a href="#" class="acf-button button button-secondary select-all">Select All</a>',
              '<a href="#" class="acf-button button button-secondary select-none">Select None</a>',
              '<a href="#" class="acf-button button button-secondary bulk-delete">Delete Selected</a>',
          '</li>'
      ].join(''));

      $toolbar.find('li.acf-fr').before($customButtons);
      $toolbar.find('li.acf-fr').before($zoomControls);

      // Initialize zoom
      var storedZoom = localStorage.getItem('acf_gallery_zoom');
      var currentZoom = storedZoom ? parseInt(storedZoom) : DEFAULT_ZOOM;

      function updateZoom(zoom) {
          currentZoom = Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
          localStorage.setItem('acf_gallery_zoom', currentZoom);

          $zoomControls.find('.zoom-slider').val(currentZoom);
          $zoomControls.find('.zoom-level').text(currentZoom + '%');

          var scale = currentZoom / 100;
          $attachments.find('.acf-gallery-attachment').css({
              'width': (160 * scale) + 'px',
              'height': (160 * scale) + 'px'
          });
      }

      // Initialize zoom controls
      $zoomControls.find('.zoom-slider').val(currentZoom);
      updateZoom(currentZoom);

      // Zoom event handlers
      $zoomControls.find('.zoom-slider').on('input change', function() {
          updateZoom(parseInt($(this).val()));
      });

      $zoomControls.find('.zoom-in').on('click', function(e) {
          e.preventDefault();
          updateZoom(currentZoom + 10);
      });

      $zoomControls.find('.zoom-out').on('click', function(e) {
          e.preventDefault();
          updateZoom(currentZoom - 10);
      });

      function resetSelectionState() {
          selectionMode = null;
          rangeStartItem = null;
          $customButtons.find('a').removeClass('active');
      }

      // Initialize Enhanced Sortable functionality
      function initSortable() {
          var acfField = acf.getField($field);
          if (!acfField) return;

          // Get the original sortable instance
          var $sortable = $attachments;

          // Wait for ACF to fully initialize
          setTimeout(function() {
              // Remove existing sortable if present
              if ($sortable.hasClass('ui-sortable')) {
                  $sortable.sortable('destroy');
              }

              // Initialize enhanced sortable
              $sortable.sortable({
                  items: '.acf-gallery-attachment',
                  cursor: 'move',
                  scrollSensitivity: 40,
                  tolerance: 'pointer',
                  helper: function(e, $item) {
                      var $selectedItems = $attachments.find('.selected');

                      // If dragged item isn't selected, only drag that item
                      if (!$item.hasClass('selected')) {
                          return $item;
                      }

                      // Create helper with visual feedback
                      var $helper = $('<div class="acf-gallery-sort-helper"/>')
                          .css({
                              width: $item.outerWidth(),
                              height: $item.outerHeight(),
                              backgroundColor: '#fff',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                              padding: '5px',
                              overflow: 'hidden'
                          });

                      // Add first image and count badge
                      var totalSelected = $selectedItems.length;
                      $helper.append($item.find('img').clone().css({
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                      }));

                      if (totalSelected > 1) {
                          $helper.append($('<div class="multi-drag-count"/>')
                              .text(totalSelected + ' images')
                              .css({
                                  position: 'absolute',
                                  top: '5px',
                                  right: '5px',
                                  background: '#2271b1',
                                  color: '#fff',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                              }));
                      }

                      // Store selected items (excluding dragged item)
                      var $others = $selectedItems.not($item);
                      if ($others.length) {
                          $item.data('selectedAttachments', $others);
                          $others.hide();
                      }

                      return $helper;
                  },
                  start: function(e, ui) {
                      var $item = ui.item;
                      var $selected = $item.data('selectedAttachments');

                      // Style the placeholder
                      ui.placeholder.css({
                          width: $item.outerWidth(),
                          height: $item.outerHeight(),
                          margin: $item.css('margin')
                      }).addClass('acf-gallery-attachment');

                      // Create placeholders for additional selected items
                      if ($selected && $selected.length) {
                          for (var i = 0; i < $selected.length; i++) {
                              ui.placeholder.clone()
                                  .insertAfter(ui.placeholder);
                          }
                      }
                  },
                  stop: function(e, ui) {
                      var $item = ui.item;
                      var $selected = $item.data('selectedAttachments');

                      // Move all selected items to new position
                      if ($selected && $selected.length) {
                          $selected.insertAfter($item).show();
                          $item.removeData('selectedAttachments');
                      }

                      // Remove extra placeholders
                      $('.ui-sortable-placeholder').remove();

                      // Trigger change for ACF
                      acfField.$input().trigger('change');
                  }
              });
          }, 100);
      }

      // Initialize sortable when field is ready
      initSortable();

      // Handle sorting
      $sortSelect.off('change').on('change', function(e) {
          e.preventDefault();
          var val = $(this).val();

          if (!val) return;

          // If no selection, sort entire gallery
          if (selectedItems.size === 0) {
              var $allAttachments = $attachments.find('.acf-gallery-attachment');
              var allArray = $allAttachments.get();

              // Sort all items
              allArray.sort(function(a, b) {
                  var $a = $(a);
                  var $b = $(b);
                  var nameA = $a.find('.filename').text();
                  var nameB = $b.find('.filename').text();

                  switch(val) {
                      case 'date':
                          var dateA = $a.data('date') || 0;
                          var dateB = $b.data('date') || 0;
                          return dateB - dateA;
                      case 'modified':
                          var modA = $a.data('modified') || 0;
                          var modB = $b.data('modified') || 0;
                          return modB - modA;
                      case 'title':
                          return nameA.localeCompare(nameB);
                      case 'reverse':
                          return 0;
                  }
              });

              if (val === 'reverse') {
                  allArray.reverse();
              }

              // Reattach all items in new order
              $allAttachments.detach();
              $(allArray).each(function(index, item) {
                  $attachments.append(item);
              });
          } else {
              // Sort only selected items
              var $selectedAttachments = $attachments.find('.acf-gallery-attachment.selected');
              var selectedArray = $selectedAttachments.get();
              var originalPositions = [];

              // Store original positions of selected items
              $selectedAttachments.each(function() {
                  var $this = $(this);
                  var position = $attachments.find('.acf-gallery-attachment').index($this);
                  originalPositions.push(position);
              });

              // Sort selected items
              selectedArray.sort(function(a, b) {
                  var $a = $(a);
                  var $b = $(b);
                  var nameA = $a.find('.filename').text();
                  var nameB = $b.find('.filename').text();

                  switch(val) {
                      case 'date':
                          var dateA = $a.data('date') || 0;
                          var dateB = $b.data('date') || 0;
                          return dateB - dateA;
                      case 'modified':
                          var modA = $a.data('modified') || 0;
                          var modB = $b.data('modified') || 0;
                          return modB - modA;
                      case 'title':
                          return nameA.localeCompare(nameB);
                      case 'reverse':
                          return 0;
                  }
              });

              if (val === 'reverse') {
                  selectedArray.reverse();
              }

              // Remove selected items
              $selectedAttachments.detach();

              // Reinsert sorted items at their original positions
              originalPositions.sort(function(a, b) { return a - b; });
              $(selectedArray).each(function(index, item) {
                  var position = originalPositions[index];
                  var $currentItems = $attachments.find('.acf-gallery-attachment');

                  if (position >= $currentItems.length) {
                      $attachments.append(item);
                  } else {
                      $(item).insertBefore($currentItems.eq(position));
                  }
              });
          }

          // Reset select to default
          $(this).val('');
      });

      // Function to clear ACF's native selection state
      function clearACFSelection($field) {
          $field.find('.acf-gallery-attachment.active').removeClass('active');
          $field.removeClass('-edit');
          var $sidebar = $field.find('.acf-gallery-side');
          $sidebar.removeClass('visible').hide();
          setTimeout(function() {
              $sidebar.removeClass('visible').hide();
          }, 50);
      }

      // Button event handlers
      $customButtons.on('click', 'a.select-range', function(e) {
          e.preventDefault();
          if (selectionMode === 'range') {
              selectionMode = null;
              rangeStartItem = null;
              $(this).removeClass('active');
          } else {
              $attachments.find('.acf-gallery-attachment').removeClass('selected');
              selectedItems.clear();
              clearACFSelection($field);
              selectionMode = 'range';
              rangeStartItem = null;
              $customButtons.find('a').removeClass('active');
              $(this).addClass('active');
          }
      });

      $customButtons.on('click', 'a.select-toggle', function(e) {
          e.preventDefault();
          if (selectionMode === 'toggle') {
              selectionMode = null;
              $(this).removeClass('active');
          } else {
              $attachments.find('.acf-gallery-attachment').removeClass('selected');
              selectedItems.clear();
              clearACFSelection($field);
              selectionMode = 'toggle';
              $customButtons.find('a').removeClass('active');
              $(this).addClass('active');
          }
      });

      $customButtons.on('click', 'a.select-all', function(e) {
          e.preventDefault();
          resetSelectionState();
          $attachments.find('.acf-gallery-attachment').each(function() {
              $(this).addClass('selected');
              selectedItems.add(this);
          });
      });

      $customButtons.on('click', 'a.select-none', function(e) {
          e.preventDefault();
          $attachments.find('.acf-gallery-attachment').removeClass('selected');
          selectedItems.clear();
          resetSelectionState();
      });

      $customButtons.on('click', 'a.bulk-delete', function(e) {
          e.preventDefault();
          var count = selectedItems.size;
          if (count === 0) return;

          if (confirm(acfEnhancedGalleryL10n.deleteConfirm.replace('%d', count))) {
              selectedItems.forEach(function(item) {
                  $(item).find('a.acf-icon.-cancel').trigger('click');
              });
              selectedItems.clear();
          }
      });

      // Handle attachment clicks
      $attachments.on('click', '.acf-gallery-attachment', function(e) {
          var $attachment = $(this);

          // If no selection mode is active, let ACF handle the click
          if (!selectionMode && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
              return;
          }

          // Don't interfere with the remove button
          if ($(e.target).hasClass('-cancel') || $(e.target).closest('a.-cancel').length) {
              return;
          }

          e.preventDefault();
          e.stopPropagation();

          if (selectionMode === 'range') {
              if (!rangeStartItem) {
                  rangeStartItem = $attachment;
                  selectedItems.clear();
                  $attachments.find('.acf-gallery-attachment').removeClass('selected');
                  $attachment.addClass('selected');
                  selectedItems.add(this);
              } else {
                  var start = $attachments.find('.acf-gallery-attachment').index(rangeStartItem);
                  var end = $attachments.find('.acf-gallery-attachment').index($attachment);

                  if (start > end) [start, end] = [end, start];

                  selectedItems.clear();
                  $attachments.find('.acf-gallery-attachment').removeClass('selected');

                  $attachments.find('.acf-gallery-attachment').slice(start, end + 1).each(function() {
                      $(this).addClass('selected');
                      selectedItems.add(this);
                  });

                  rangeStartItem = null;
                  selectionMode = null;
                  $customButtons.find('a').removeClass('active');
              }
          } else if (selectionMode === 'toggle') {
              if (selectedItems.has(this)) {
                  selectedItems.delete(this);
                  $attachment.removeClass('selected');
              } else {
                  selectedItems.add(this);
                  $attachment.addClass('selected');
              }
          }
      });
  }

  // Initialize when ACF is ready
  acf.addAction('ready', function($el) {
      $('.acf-field-gallery').each(function() {
          enhanceGalleryField($(this));
      });
  });

  // Initialize new fields added dynamically
  acf.addAction('append', function($el) {
      $el.find('.acf-field-gallery').each(function() {
          enhanceGalleryField($(this));
      });
  });

})(jQuery);