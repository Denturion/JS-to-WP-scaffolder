<?php
/**
 * Plugin Name:       The API Bridge
 * Plugin URI:        https://yoursite.com/api-bridge
 * Description:       Securely store and use an external API key in WordPress. Zero PHP spaghetti — just configure and call.
 * Version:           1.0.0
 * Author:            Your Name
 * Author URI:        https://yoursite.com
 * Text Domain:       api-bridge
 * Domain Path:       /languages
 * Requires at least: 6.0
 * Requires PHP:      8.0
 *
 * @package ApiBridge
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Composer Autoloader
 *
 * Loads all PSR-4 namespaced classes from src/.
 * Analogous to: Node's require() / ESM import — resolves class files
 * the same way Node resolves modules from node_modules/.
 */
if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
	require_once __DIR__ . '/vendor/autoload.php';
} else {
	add_action(
		'admin_notices',
		function () {
			echo '<div class="notice notice-error"><p>';
			echo '<strong>The API Bridge:</strong> Composer dependencies not found. ';
			echo 'Run <code>composer install</code> in the plugin directory.';
			echo '</p></div>';
		}
	);
	return;
}

/**
 * Plugin Constants
 *
 * Analogous to: process.env.* in Node.js.
 * Defined here (in the bootstrap file) so they are available globally
 * across all classes without needing to pass them around.
 */
define( 'API_BRIDGE_VERSION',     '1.0.0' );
define( 'API_BRIDGE_PLUGIN_DIR',  plugin_dir_path( __FILE__ ) );
define( 'API_BRIDGE_PLUGIN_URL',  plugin_dir_url( __FILE__ ) );
define( 'API_BRIDGE_PLUGIN_FILE', __FILE__ );

/**
 * Bootstrap the plugin.
 *
 * Analogous to: app.listen() in Express — this single call starts everything.
 * Plugin::get_instance() returns the singleton and triggers hook registration
 * via its constructor. Nothing else needs to happen here.
 */
ApiBridge\Plugin::get_instance();
