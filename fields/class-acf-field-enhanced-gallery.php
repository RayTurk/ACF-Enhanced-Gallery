<?php
/**
 * ACF Enhanced Gallery Field
 */

if (!defined('ABSPATH')) {
    exit;
}

function include_field_enhanced_gallery($version = false) {

    if (!class_exists('acf_field_gallery')) {
        return;
    }

    class ACF_Field_Enhanced_Gallery extends acf_field_gallery {

        /**
         * Initialize the field
         */
        public function __construct() {
            // name (string) Single word, no spaces. Underscores allowed
            $this->name = 'enhanced_gallery';

            // label (string) Multiple words, can include spaces
            $this->label = __('Enhanced Gallery', 'acf-enhanced-gallery');

            // category (string) basic | content | choice | relational | jquery | layout | CUSTOM GROUP NAME
            $this->category = 'content';

            // Call parent constructor to properly initialize the field
            parent::__construct();

            // Add custom hooks
            add_action('acf/input/admin_enqueue_scripts', array($this, 'input_admin_enqueue_scripts'));
        }

        /**
         * Render field settings
         *
         * @param array $field The field settings array
         */
        public function render_field_settings($field) {
            // Render parent settings first
            parent::render_field_settings($field);
        }

        /**
         * Render field
         *
         * @param array $field The field array
         */
        public function render_field($field) {
            // Add our enhanced class
            $field['wrapper']['class'] = isset($field['wrapper']['class'])
                ? $field['wrapper']['class'] . ' acf-field-enhanced-gallery'
                : 'acf-field-enhanced-gallery';

            // Call parent render_field
            parent::render_field($field);
        }

        /**
         * Enqueue scripts and styles
         */
        public function input_admin_enqueue_scripts() {
            wp_register_style(
                'acf-enhanced-gallery',
                ACF_ENHANCED_GALLERY_URL . 'assets/css/acf-enhanced-gallery.css',
                array('acf-input'),
                ACF_ENHANCED_GALLERY_VERSION
            );
            wp_enqueue_style('acf-enhanced-gallery');

            wp_register_script(
                'acf-enhanced-gallery',
                ACF_ENHANCED_GALLERY_URL . 'assets/js/acf-enhanced-gallery.js',
                array('acf-input'),
                ACF_ENHANCED_GALLERY_VERSION,
                true
            );
            wp_enqueue_script('acf-enhanced-gallery');

            wp_localize_script('acf-enhanced-gallery', 'acfEnhancedGalleryL10n', array(
                'deleteConfirm' => __('Are you sure you want to delete these %d images?', 'acf-enhanced-gallery'),
                'selectRange' => __('Select Range', 'acf-enhanced-gallery'),
                'selectToggle' => __('Select Toggle', 'acf-enhanced-gallery'),
                'selectAll' => __('Select All', 'acf-enhanced-gallery'),
                'selectNone' => __('Select None', 'acf-enhanced-gallery'),
            ));
        }
    }

    // Initialize
    acf_register_field_type('ACF_Field_Enhanced_Gallery');
}

// Include field
add_action('acf/include_field_types', 'include_field_enhanced_gallery');