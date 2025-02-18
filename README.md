# Enhanced ACF Gallery Field

A WordPress plugin that extends the Advanced Custom Fields (ACF) Pro Gallery field with multi-select capabilities and enhanced functionality.

## Features

- **Multi-Select Mode**: Select multiple images using various selection methods:
  - Toggle Selection: Click to select/deselect individual images
  - Range Selection: Select a range of images at once
  - Select All: Quickly select all images in the gallery
  
- **Enhanced Image Management**:
  - Bulk deletion of multiple selected images
  - Progress bar for bulk operations
  - Unified deletion experience for both single and multiple images
  
- **Improved UI Controls**:
  - Dynamic zoom controls for image thumbnails
  - Smooth transitions between selection modes
  - Visual feedback for selected items
  
- **Batch Processing**:
  - Efficient handling of large image sets
  - Progress indicators for uploads and deletions
  - Error handling and recovery

## Requirements

- WordPress 5.0 or higher
- Advanced Custom Fields PRO 5.7.0 or higher
- PHP 7.0 or higher

## Installation

1. Download the plugin zip file
2. Go to WordPress admin panel > Plugins > Add New
3. Click "Upload Plugin" and select the downloaded zip file
4. Click "Install Now" and then "Activate"
5. ACF Pro must be installed and activated for this plugin to work

## Usage

### Basic Usage

1. Create a new ACF Field Group
2. Add a new field and select "Enhanced Gallery" as the field type
3. Configure the field settings as you would with a regular ACF Gallery field
4. The enhanced features will be automatically available in the admin interface

### Multi-Select Features

- **Toggle Selection Mode**:
  1. Click the "Select Toggle" button
  2. Click individual images to select/deselect them
  3. Use the bulk actions on selected images

- **Range Selection**:
  1. Click the "Select Range" button
  2. Click the first image in your desired range
  3. Click the last image to select everything in between

- **Bulk Operations**:
  1. Select images using any selection method
  2. Click "Delete Selected" to remove multiple images at once
  3. Confirm the deletion when prompted

### Zoom Controls

- Use the zoom slider to adjust thumbnail sizes
- Click the + and - buttons for incremental adjustments
- Zoom settings persist between sessions

## Shortcode Usage

Use the `[fsm_gallery]` shortcode to display the gallery on your front end:

```php
[fsm_gallery]
```

The shortcode will automatically display images from the ACF field named 'fsm_test'.

## Developer Notes

### Hooks and Filters

The plugin provides several hooks for customization:

```php
// Example filter to modify the gallery output
add_filter('fsm_gallery_output', function($output, $gallery) {
    // Modify output here
    return $output;
}, 10, 2);
```

### CSS Customization

The plugin includes default styles that can be overridden in your theme:

```css
.acf-gallery .enhanced-tools {
    /* Your custom styles */
}
```

## Troubleshooting

### Common Issues

1. **Sidebar Not Closing**: Make sure your theme isn't conflicting with the ACF admin styles.
2. **Selection Not Working**: Check for JavaScript errors in your browser console.
3. **Upload Issues**: Verify your server's upload limits and permissions.

### Performance Tips

- Keep the number of images per gallery manageable
- Optimize images before upload
- Consider using a CDN for better performance

## Support

For bug reports or feature requests, please use the GitHub issues page or contact the plugin author.

## License

GPL v2 or later - http://www.gnu.org/licenses/gpl-2.0.html

## Credits

Created by Raymond Turk
Based on the Advanced Custom Fields PRO Gallery field by Elliot Condon
