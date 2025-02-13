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
  var BATCH_SIZE = 3; // Number of files to upload simultaneously

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

      // Get the field instance
      var field = acf.getField($field);

      // Upload management
      let uploadQueue = [];
      let activeUploads = 0;
      let totalFiles = 0;
      let uploadedFiles = 0;
      let $progressContainer = null;
      let $progressBar = null;
      let uploadCancelled = false;

      async function processUploadQueue() {
          if (uploadCancelled || uploadQueue.length === 0 || activeUploads >= BATCH_SIZE) {
              return;
          }

          while (uploadQueue.length > 0 && activeUploads < BATCH_SIZE) {
              const nextFile = uploadQueue.shift();
              activeUploads++;
              uploadFile(nextFile).finally(() => {
                  activeUploads--;
                  processUploadQueue();
              });
          }
      }

      async function uploadFile(file) {
          const formData = new FormData();
          formData.append('action', 'fsm_custom_gallery_upload_image');
          formData.append('post_id', acf.get('post_id'));
          formData.append('file', file);

          try {
              const response = await $.ajax({
                  url: ajaxurl,
                  type: 'POST',
                  data: formData,
                  processData: false,
                  contentType: false,
                  xhr: function() {
                      const xhr = new window.XMLHttpRequest();
                      xhr.upload.addEventListener("progress", function(evt) {
                          if (evt.lengthComputable) {
                              // Individual file progress handled in overall count
                          }
                      }, false);
                      return xhr;
                  }
              });

              if (uploadCancelled) return;

              let data;
              if (typeof response === 'object') {
                  data = response;
              } else {
                  const jsonStart = response.indexOf('{');
                  const jsonEnd = response.lastIndexOf('}');
                  if (jsonStart >= 0 && jsonEnd >= 0) {
                      const jsonString = response.substring(jsonStart, jsonEnd + 1);
                      data = JSON.parse(jsonString);
                  } else {
                      data = JSON.parse(response);
                  }
              }

              if (data['attachment-id']) {
                  uploadedFiles++;
                  updateUploadProgress();
                  addAttachmentToGallery(data);
              }
          } catch (error) {
              console.error('Upload error:', error);
              handleUploadError(error);
          }
      }

      function updateUploadProgress() {
          const percentComplete = (uploadedFiles / totalFiles) * 100;
          $progressBar.css('width', percentComplete + '%');
          $progressBar.find('.progress-text').text(
              'Uploading ' + uploadedFiles + ' of ' + totalFiles + ' files (' + Math.round(percentComplete) + '%)'
          );

          if (uploadedFiles === totalFiles) {
              handleUploadComplete();
          }
      }

      function addAttachmentToGallery(data) {
          if (!field) return;

          const attachment = {
              id: data['attachment-id'],
              url: data['src'],
              alt: data['alt'] || '',
              title: data['title'] || '',
              filename: data['filename'] || '',
              type: 'image'
          };

          let $newAttachment;

          if (typeof field.append === 'function') {
              field.append(attachment);
              $newAttachment = $field.find('.acf-gallery-attachment:last');
              const scale = currentZoom / 100;
              $newAttachment.css({
                  'width': (160 * scale) + 'px',
                  'height': (160 * scale) + 'px'
              });
          } else {
              const currentVal = field.val() || [];
              const newVal = typeof currentVal === 'string' ?
                  (currentVal ? currentVal.split(',') : []) :
                  [...currentVal];

              newVal.push(data['attachment-id']);
              field.val(newVal);

              const scale = currentZoom / 100;
              $newAttachment = $([
                  '<div class="acf-gallery-attachment" data-id="' + data['attachment-id'] + '" style="width:' + (160 * scale) + 'px;height:' + (160 * scale) + 'px;">',
                      '<input type="hidden" name="' + field.$input().attr('name') + '[]" value="' + data['attachment-id'] + '">',
                      '<div class="margin">',
                          '<div class="thumbnail">',
                              '<img src="' + data['src'] + '" alt="">',
                          '</div>',
                      '</div>',
                      '<div class="actions">',
                          '<a href="#" class="acf-icon -cancel dark" data-id="' + data['attachment-id'] + '"></a>',
                      '</div>',
                  '</div>'
              ].join(''));
              $field.find('.acf-gallery-attachments').append($newAttachment);
          }

          if (selectionMode) {
              $newAttachment.addClass('selected');
              selectedItems.add($newAttachment[0]);
          }

          $newAttachment.find('a.acf-icon.-cancel').on('click', function(e) {
              if (!e.originalEvent) {
                  const $attachment = $(this).closest('.acf-gallery-attachment');
                  selectedItems.delete($attachment[0]);
              }
          });
      }

      function handleUploadError(error) {
          if (uploadCancelled) return;

          $progressBar.addClass('error');
          $progressBar.find('.progress-text').text('Upload failed: ' + error.message);

          // Clear the upload queue
          uploadQueue = [];
          activeUploads = 0;

          // Re-enable form submission
          $field.closest('form').off('submit');
      }

      function handleUploadComplete() {
          if (uploadCancelled) return;

          $progressBar.addClass('success');
          $progressBar.find('.progress-text').text('Upload Complete!');

          // Re-enable form submission
          $field.closest('form').off('submit');

          setTimeout(() => {
              $progressContainer.fadeOut(() => {
                  $(this).remove();
                  updateZoom(currentZoom);
                  field.$input().trigger('change');
              });
          }, 2000);
      }

      // Single click handler for Add to Gallery
      $field.find('.acf-gallery-add').off('click').on('click', function(e) {
          e.preventDefault();
          e.stopPropagation();

          const $fileInput = $('<input type="file" multiple accept="image/*" style="display:none">');

          $fileInput.on('change', function(e) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();

              const files = e.target.files;
              if (!files || !files.length) {
                  $fileInput.remove();
                  return;
              }

              // Reset upload state
              uploadQueue = Array.from(files);
              totalFiles = files.length;
              uploadedFiles = 0;
              activeUploads = 0;
              uploadCancelled = false;

              // Prevent form submission during upload
              $field.closest('form').on('submit', function(e) {
                  e.preventDefault();
                  return false;
              });

              // Create progress UI
              $progressContainer = $('<div class="upload-progress-container"></div>');
              $progressBar = $('<div class="acf-gallery-upload-progress"><div class="progress-text">Preparing to upload ' + totalFiles + ' files...</div></div>');
              $progressContainer.append($progressBar);
              $field.find('.acf-gallery-attachments').before($progressContainer);

              // Start processing the queue
              processUploadQueue();
          });

          $fileInput.appendTo('body').trigger('click');
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

          var $sortable = $attachments;

          setTimeout(function() {
              if ($sortable.hasClass('ui-sortable')) {
                  $sortable.sortable('destroy');
              }

              $sortable.sortable({
                  items: '.acf-gallery-attachment',
                  cursor: 'move',
                  scrollSensitivity: 40,
                  tolerance: 'pointer',
                  helper: function(e, $item) {
                      var $selectedItems = $attachments.find('.selected');

                      if (!$item.hasClass('selected')) {
                          return $item;
                      }

                      var $helper = $('<div class="acf-gallery-sort-helper"/>')
                          .css({
                              width: $item.outerWidth(),
                              height: $item.outerHeight(),
                              backgroundColor: '#fff',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                              padding: '5px',
                              overflow: 'hidden'
                          });

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

                      var $others = $selectedItems.not($item).sort(function(a, b) {
                          return $(a).index() - $(b).index();
                      });

                      if ($others.length) {
                          $item.data('selectedAttachments', $others);
                          $others.hide();
                      }

                      return $helper;
                  },
                  start: function(e, ui) {
                      var $item = ui.item;
                      var $selected = $item.data('selectedAttachments');

                      ui.placeholder.css({
                          width: $item.outerWidth(),
                          height: $item.outerHeight(),
                          margin: $item.css('margin')
                      }).addClass('acf-gallery-attachment');

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

                      if ($selected && $selected.length) {
                          var $lastItem = $item;
                          $selected.each(function() {
                              $(this).insertAfter($lastItem).show();
                              $lastItem = $(this);
                          });
                          $item.removeData('selectedAttachments');
                      }

                      $('.ui-sortable-placeholder').remove();
                      acfField.$input().trigger('change');
                  }
              });
          }, 100);
      }

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
                      var imgSrc = $element.find('img').attr('src');
                      var timestamp = imgSrc.match(/\/(\d+)_/);
                      return timestamp ? parseInt(timestamp[1]) : parseInt(id);
                  case 'title':
                      var imgSrc = $element.find('img').attr('src');
                      if (!imgSrc) return '';
                      var filename = imgSrc.split('/').pop();
                      filename = filename.replace(/-\d+x\d+/, '');
                      filename = filename.replace(/\.[^/.]+$/, '');
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
                      return valueB - valueA;
                  }
              });

              return itemsArray;
          }

          var $itemsToSort = selectedItems.size === 0
              ? $attachments.find('.acf-gallery-attachment')
              : $attachments.find('.acf-gallery-attachment.selected');

          var sortedItems;
          if (val === 'reverse') {
              sortedItems = $itemsToSort.get().reverse();
          } else {
              sortedItems = sortAttachments($itemsToSort, val);
          }

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

      function clearACFSelection($field) {
          // Reset any current selections
          $field.find('.acf-gallery-attachment.active').removeClass('active');
          $field.find('.acf-gallery').removeClass('-edit');

          // Let ACF clean up the sidebar
          var acfField = acf.getField($field);
          if (acfField && typeof acfField.closeDialog === 'function') {
              acfField.closeDialog();
          }
      }

      // Button event handlers
      $customButtons.on('click', 'a.select-range', function(e) {
          e.preventDefault();
          if (selectionMode === 'range') {
              // Deactivating range mode
              selectionMode = null;
              rangeStartItem = null;
              $(this).removeClass('active');
              // Clear all selections and reset state
              $attachments.find('.acf-gallery-attachment').removeClass('selected');
              selectedItems.clear();
              clearACFSelection($field);
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
              // Deactivating toggle mode
              selectionMode = null;
              $(this).removeClass('active');
              // Clear all selections and reset state
              $attachments.find('.acf-gallery-attachment').removeClass('selected');
              selectedItems.clear();
              clearACFSelection($field);
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
              const deleteQueue = Array.from(selectedItems);
              const DELETION_BATCH_SIZE = 3;
              let deletedCount = 0;
              let acfField = acf.getField($field);

              // Create progress UI for deletion
              const $deleteProgressContainer = $('<div class="upload-progress-container"></div>');
              const $deleteProgressBar = $('<div class="acf-gallery-upload-progress"><div class="progress-text">Preparing to delete ' + count + ' images...</div></div>');
              $deleteProgressContainer.append($deleteProgressBar);
              $field.find('.acf-gallery-attachments').before($deleteProgressContainer);

              function updateDeleteProgress() {
                  const percentComplete = (deletedCount / count) * 100;
                  $deleteProgressBar.css('width', percentComplete + '%');
                  $deleteProgressBar.find('.progress-text').text(
                      'Deleting ' + deletedCount + ' of ' + count + ' images (' + Math.round(percentComplete) + '%)'
                  );

                  if (deletedCount === count) {
                      $deleteProgressBar.addClass('success');
                      $deleteProgressBar.find('.progress-text').text('Deletion Complete!');
                      setTimeout(() => {
                          $deleteProgressContainer.fadeOut(() => {
                              $(this).remove();
                          });
                      }, 2000);
                  }
              }

              function processDeleteQueue() {
                  if (deleteQueue.length === 0) {
                      selectedItems.clear();
                      acfField.$input().trigger('change');
                      return;
                  }

                  const batch = deleteQueue.splice(0, DELETION_BATCH_SIZE);

                  batch.forEach(item => {
                      const $item = $(item);
                      const id = $item.data('id');

                      // Get current value and ensure it's an array
                      let value = acfField.val();
                      if (typeof value === 'string') {
                          value = value ? value.split(',') : [];
                      } else if (!Array.isArray(value)) {
                          value = [];
                      }

                      // Convert all values to strings for consistent comparison
                      const strValue = value.map(String);
                      const strId = String(id);

                      // Remove the ID from the array
                      const index = strValue.indexOf(strId);
                      if (index > -1) {
                          strValue.splice(index, 1);
                      }

                      // Update the field value
                      acfField.val(strValue);

                      // Remove the element from DOM
                      $item.remove();
                  });

                  deletedCount += batch.length;
                  updateDeleteProgress();

                  // Process next batch with a small delay
                  setTimeout(processDeleteQueue, 100);
              }

              processDeleteQueue();
          }
      });

      // Handle attachment clicks
      $attachments.on('click', '.acf-gallery-attachment', function(e) {
          var $attachment = $(this);

          if (!selectionMode && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
              return;
          }

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