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

    require_once ACF_ENHANCED_GALLERY_PATH . 'class-acf-field-enhanced-gallery.php';

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

/**
 * Custom Upload Handler
 */
add_action('wp_ajax_fsm_custom_gallery_upload_image', 'fsm_custom_gallery_ajax_upload_image');
function fsm_custom_gallery_ajax_upload_image() {
    $response = array(
        'attachment-id' => 0,
        'src' => '',
        'alt' => '',
        'title' => '',
        'filename' => '',
        'type' => 'image'
    );

    if (isset($_POST['post_id']) && isset($_FILES)) {
        if (!empty($_POST['post_id']) && !empty($_FILES)) {
            $attachment_id = media_handle_upload('file', $_POST['post_id']);

            if (!is_wp_error($attachment_id)) {
                // Get the attachment metadata
                $attachment = get_post($attachment_id);
                $attachment_url = wp_get_attachment_image_url($attachment_id, 'full');
                $alt_text = get_post_meta($attachment_id, '_wp_attachment_image_alt', true);

                $response = array(
                    'attachment-id' => $attachment_id,
                    'src' => $attachment_url,
                    'alt' => $alt_text,
                    'title' => $attachment->post_title,
                    'filename' => basename($attachment->guid),
                    'type' => 'image'
                );

                // If you're using the fsm__custom_gallery_item_get_data function
                if (function_exists('fsm__custom_gallery_item_get_data')) {
                    $additional_data = fsm__custom_gallery_item_get_data(array('attachmentid' => $attachment_id));
                    $response = array_merge($response, $additional_data);
                }
            }
        }
    }

    echo json_encode($response);
    wp_die();
}

/**
 * Shortcode to display the gallery on the frontend
 * Only declare if not already defined
 */
if (!function_exists('fsm_custom_gallery_shortcode')) {
    function fsm_custom_gallery_shortcode($atts) {
        // Get the current post ID
        $post_id = get_the_ID();

        // Get the ACF gallery field
        $gallery = get_field('fsm_test', $post_id);

        // Check if gallery data is valid and contains images
        if (!empty($gallery) && is_array($gallery)) {
            // Start the gallery wrapper
            $output = '<div class="facet-list gallery-list">
                        <div class="gallery-wrapper" id="gallery-container">';

            $image_count = 0;

            // Loop through the gallery images
            foreach ($gallery as $image) {
                if ($image_count >= 100) break;

                if (!isset($image['ID'])) {
                    continue;
                }

                $attachment_id = $image['ID'];
                $thumbnail_url = wp_get_attachment_image_url($attachment_id, 'medium');
                $large_url = wp_get_attachment_image_url($attachment_id, 'full');

                if (!$thumbnail_url || !$large_url) {
                    continue;
                }

                $image_alt = isset($image['alt']) ? $image['alt'] : get_post_meta($attachment_id, '_wp_attachment_image_alt', true);
                $caption = isset($image['caption']) ? $image['caption'] : '';
                if (empty($caption)) {
                    $attachment = get_post($attachment_id);
                    $caption = $attachment ? $attachment->post_excerpt : '';
                }

                $output .= '<div class="gallery-item">
                                <a href="' . esc_url($large_url) . '" data-lightbox="gallery" data-title="' . esc_attr($caption) . '">
                                    <img src="' . esc_url($thumbnail_url) . '" alt="' . esc_attr($image_alt) . '" loading="lazy" />
                                </a>
                            </div>';
                $image_count++;
            }

            $output .= '</div>';

            if (count($gallery) > 100) {
                $output .= '<div class="button-container">
                                <button id="load-more-gallery" class="et_pb_button et_pb_bg_layout_light" data-offset="100">Load More</button>
                            </div>';

                $output .= '<div id="gallery-hidden" style="display: none;">';

                foreach (array_slice($gallery, 100) as $image) {
                    if (!isset($image['ID'])) {
                        continue;
                    }

                    $attachment_id = $image['ID'];
                    $thumbnail_url = wp_get_attachment_image_url($attachment_id, 'medium');
                    $large_url = wp_get_attachment_image_url($attachment_id, 'full');

                    if (!$thumbnail_url || !$large_url) {
                        continue;
                    }

                    $image_alt = isset($image['alt']) ? $image['alt'] : get_post_meta($attachment_id, '_wp_attachment_image_alt', true);
                    $caption = isset($image['caption']) ? $image['caption'] : '';
                    if (empty($caption)) {
                        $attachment = get_post($attachment_id);
                        $caption = $attachment ? $attachment->post_excerpt : '';
                    }

                    $output .= '<div class="gallery-item">
                                    <a href="' . esc_url($large_url) . '" data-lightbox="gallery" data-title="' . esc_attr($caption) . '">
                                        <img src="' . esc_url($thumbnail_url) . '" alt="' . esc_attr($image_alt) . '" loading="lazy" />
                                    </a>
                                </div>';
                }

                $output .= '</div>';
            }

            $output .= '</div>';

        } else {
            $output = '<p>No gallery images found.</p>';
        }

        return $output;
    }
    add_shortcode('fsm_gallery', 'fsm_custom_gallery_shortcode');
}