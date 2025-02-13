(function($) {
  'use strict';

  // Check if ACF is available
  if (typeof acf === 'undefined') {
      console.error('ACF not found');
      return;
  }

  // Make sure we have jQuery
  if (typeof jQuery === 'undefined') {
      console.error('jQuery not found');
      return;
  }

  var $ = jQuery;
  var enhancedFields = new WeakSet();
  var DEFAULT_ZOOM = 100;
  var MIN_ZOOM = 50;
  var MAX_ZOOM = 200;

  function enhanceGalleryField($el) {
      console.log('Enhancing gallery field:', $el);
      var $field = $el.find('.acf-gallery').first();
      console.log('Found gallery:', $field.length > 0);

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

      // Get the field instance
      var field = acf.getField($field);
      console.log('Field instance:', field);

      // Safely check for and remove ACF's default click handler
      try {
          if (field) {
              console.log('Removing click handler from field');
              field.off('click', '.acf-gallery-add');
          }

          // Safely check if gallery field type exists
          if (acf.fields && acf.fields.gallery && acf.fields.gallery.prototype && acf.fields.gallery.prototype.events) {
              console.log('Removing click handler from prototype');
              acf.fields.gallery.prototype.events['click .acf-gallery-add'] = null;
          } else {
              console.log('ACF gallery field prototype not found, skipping prototype event removal');
          }
      } catch (e) {
          console.log('Error handling event removal:', e);
      }

      // Then update the click handler:
      console.log('Adding new click handler to:', $field.find('.acf-gallery-add').length, 'elements');

      // First, let's test with a very simple click handler
      $field.find('.acf-gallery-add').on('click', function(e) {
          console.log('Simple click handler triggered');
          e.preventDefault();
          e.stopPropagation();

          // Create a hidden file input
          var $fileInput = $('<input type="file" multiple accept="image/*" style="display:none">');
          console.log('File input created');

          // Add to DOM and trigger click
          $fileInput.appendTo('body').trigger('click');
          console.log('File input added to DOM and clicked');
          e.preventDefault();
          e.stopPropagation();

          // Create a hidden file input
          var $fileInput = $('<input type="file" multiple accept="image/*" style="display:none">');

          // Add to DOM and trigger click
          $fileInput.appendTo('body').trigger('click');

          // Handle file selection
          $fileInput.on('change', function(e) {
              e.preventDefault();
              e.stopPropagation();

              var files = e.target.files;
              var postId = acf.get('post_id');

              if (!files || !files.length) {
                  $fileInput.remove();
                  return;
              }

              // Create progress container
              var $progressContainer = $('<div class="upload-progress-container"></div>');
              $field.find('.acf-gallery-attachments').before($progressContainer);

              // Upload each file
              Array.from(files).forEach(function(file, index) {
                  var $progress = $('<div class="acf-gallery-upload-progress"><div class="progress-text">' + file.name + ': 0%</div></div>');
                  $progressContainer.append($progress);

                  var formData = new FormData();
                  formData.append('action', 'fsm_custom_gallery_upload_image');
                  formData.append('post_id', postId);
                  formData.append('file', file);

                  $.ajax({
                      url: ajaxurl,
                      type: 'POST',
                      data: formData,
                      processData: false,
                      contentType: false,
                      xhr: function() {
                          var xhr = new window.XMLHttpRequest();
                          xhr.upload.addEventListener("progress", function(evt) {
                              if (evt.lengthComputable) {
                                  var percentComplete = evt.loaded / evt.total * 100;
                                  $progress.css('width', percentComplete + '%');
                                  $progress.find('.progress-text').text(file.name + ': ' + Math.round(percentComplete) + '%');
                              }
                          }, false);
                          return xhr;
                      },
                      success: function(response) {
                          try {
                              console.log('Upload response:', response);
                              var data = JSON.parse(response);
                              if (data['attachment-id']) {
                                  // Create the attachment element
                                  var attachment = {
                                      id: data['attachment-id'],
                                      url: data['src'],
                                      alt: data['alt'] || '',
                                      title: data['title'] || '',
                                      filename: data['filename'] || '',
                                      type: 'image'
                                  };

                                  console.log('Adding attachment:', attachment);

                                  // Try different methods to add the attachment
                                  if (field && typeof field.add === 'function') {
                                      console.log('Using field.add method');
                                      field.add(attachment);
                                  } else if (acf.fields && acf.fields.gallery && typeof acf.fields.gallery.prototype.add === 'function') {
                                      console.log('Using prototype.add method');
                                      acf.fields.gallery.prototype.add.call(field, attachment);
                                  } else {
                                      // Fallback: manually create and append the attachment HTML
                                      console.log('Using manual append method');
                                      var $attachment = $([
                                          '<div class="acf-gallery-attachment" data-id="' + attachment.id + '">',
                                              '<input type="hidden" name="' + field.$input().attr('name') + '[]" value="' + attachment.id + '">',
                                              '<div class="margin" title="">',
                                                  '<div class="thumbnail">',
                                                      '<img src="' + attachment.url + '" alt="' + attachment.alt + '">',
                                                  '</div>',
                                                  '<div class="filename">' + attachment.filename + '</div>',
                                              '</div>',
                                              '<div class="actions">',
                                                  '<a href="#" class="acf-icon -cancel dark" data-id="' + attachment.id + '"></a>',
                                              '</div>',
                                          '</div>'
                                      ].join(''));

                                      $field.find('.acf-gallery-attachments').append($attachment);
                                  }

                                  // Show success
                                  $progress.addClass('success');
                                  $progress.find('.progress-text').text(file.name + ': Complete');

                                  // Trigger change event
                                  if (field && field.$input) {
                                      field.$input().trigger('change');
                                  }
                              }
                          } catch(e) {
                              console.error('Upload response error:', e);
                              console.error('Response data:', response);
                              $progress.addClass('error');
                              $progress.find('.progress-text').text(file.name + ': Failed - ' + e.message);
                          }
                      },
                      error: function(xhr, status, error) {
                          console.error('Upload failed:', error);
                          $progress.addClass('error');
                          $progress.find('.progress-text').text(file.name + ': Failed - ' + error);
                      },
                      complete: function() {
                          // Remove progress bar after delay
                          setTimeout(function() {
                              $progress.fadeOut(function() {
                                  $(this).remove();
                                  // Remove container if empty
                                  if ($progressContainer.children().length === 0) {
                                      $progressContainer.remove();
                                  }
                              });
                          }, 2000);
                      }
                  });
              });

              // Remove the file input
              $fileInput.remove();
          });
      });

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

          function getSortValue($element, sortType) {
              var id = $element.find('input[type="hidden"]').val();

              switch(sortType) {
                  case 'date':
                      return parseInt(id) || 0;
                  case 'modified':
                      // Extract timestamp from filename if available
                      var imgSrc = $element.find('img').attr('src');
                      var timestamp = imgSrc.match(/\/(\d+)_/);
                      return timestamp ? parseInt(timestamp[1]) : parseInt(id);
                  case 'title':
                      var imgSrc = $element.find('img').attr('src');
                      if (!imgSrc) return '';

                      // Extract filename from URL and remove dimensions
                      var filename = imgSrc.split('/').pop();
                      // Remove the dimensions part (e.g., -260x300)
                      filename = filename.replace(/-\d+x\d+/, '');
                      // Remove the extension
                      filename = filename.replace(/\.[^/.]+$/, '');
                      // Remove the timestamp prefix if it exists (e.g., 1735952224_)
                      filename = filename.replace(/^\d+_/, '');
                      return filename.toLowerCase();
                  default:
                      return 0;
              }
          }

          function sortAttachments($items, sortType) {
              var itemsArray = $items.get();

              itemsArray.sort(function(a, b) {
                  var $a = $(a);
                  var $b = $(b);

                  var valueA = getSortValue($a, sortType);
                  var valueB = getSortValue($b, sortType);

                  if (sortType === 'title') {
                      if (!valueA && !valueB) return 0;
                      if (!valueA) return 1;
                      if (!valueB) return -1;
                      return valueA.localeCompare(valueB);
                  } else {
                      return valueB - valueA; // Descending order for dates
                  }
              });

              return itemsArray;
          }

          // If no selection, sort entire gallery
          var $itemsToSort = selectedItems.size === 0
              ? $attachments.find('.acf-gallery-attachment')
              : $attachments.find('.acf-gallery-attachment.selected');

          var sortedItems;
          if (val === 'reverse') {
              sortedItems = $itemsToSort.get().reverse();
          } else {
              sortedItems = sortAttachments($itemsToSort, val);
          }

          // Apply the new order
          if (selectedItems.size > 0) {
              var originalPositions = [];
              $itemsToSort.each(function() {
                  var position = $attachments.find('.acf-gallery-attachment').index(this);
                  originalPositions.push(position);
              });
              originalPositions.sort(function(a, b) { return a - b; });

              $itemsToSort.detach();

              $(sortedItems).each(function(index, item) {
                  var position = originalPositions[index];
                  var $currentItems = $attachments.find('.acf-gallery-attachment');

                  if (position >= $currentItems.length) {
                      $attachments.append(item);
                  } else {
                      $(item).insertBefore($currentItems.eq(position));
                  }
              });
          } else {
              $itemsToSort.detach();
              $(sortedItems).each(function(index, item) {
                  $attachments.append(item);
              });
          }

          $(this).val('');
          acf.getField($field).$input().trigger('change');
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
      console.log('ACF ready event fired');
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