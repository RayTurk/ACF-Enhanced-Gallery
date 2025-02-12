<?php
/**
 * Plugin Name: Enhanced ACF Gallery Field
 * Plugin URI:
 * Description: Extends ACF Pro Gallery field with multi-select capabilities and enhanced functionality
 * Version: 1.0.0
 * Author: Your Name
 * Author URI:
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: acf-enhanced-gallery
 */

if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('ACF_ENHANCED_GALLERY_VERSION', '1.0.0');
define('ACF_ENHANCED_GALLERY_PATH', plugin_dir_path(__FILE__));
define('ACF_ENHANCED_GALLERY_URL', plugin_dir_url(__FILE__));

/**
 * Initialize the plugin
 */
function acf_enhanced_gallery_init() {
    if (!class_exists('ACF')) {
        return;
    }

    // Enqueue scripts and styles
    add_action('acf/input/admin_enqueue_scripts', 'acf_enhanced_gallery_enqueue');
}
add_action('init', 'acf_enhanced_gallery_init');

/**
 * Enqueue scripts and styles
 */
function acf_enhanced_gallery_enqueue() {
    // Enqueue CSS
    wp_enqueue_style(
        'acf-enhanced-gallery',
        ACF_ENHANCED_GALLERY_URL . 'assets/css/acf-enhanced-gallery.css',
        array('acf-input'),
        ACF_ENHANCED_GALLERY_VERSION
    );

    // Enqueue JavaScript
    wp_enqueue_script(
        'acf-enhanced-gallery',
        ACF_ENHANCED_GALLERY_URL . 'assets/js/acf-enhanced-gallery.js',
        array('acf-input'),
        ACF_ENHANCED_GALLERY_VERSION,
        true
    );

    // Localize script
    wp_localize_script('acf-enhanced-gallery', 'acfEnhancedGalleryL10n', array(
        'deleteConfirm' => __('Are you sure you want to delete these %d images?', 'acf-enhanced-gallery'),
        'selectRange' => __('Select Range', 'acf-enhanced-gallery'),
        'selectToggle' => __('Select Toggle', 'acf-enhanced-gallery'),
        'selectAll' => __('Select All', 'acf-enhanced-gallery'),
        'selectNone' => __('Select None', 'acf-enhanced-gallery'),
    ));
}