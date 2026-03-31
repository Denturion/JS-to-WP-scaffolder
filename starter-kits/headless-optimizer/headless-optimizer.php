<?php
/**
 * Plugin Name:       The Headless Optimizer
 * Plugin URI:        https://yoursite.com/headless-optimizer
 * Description:       Strips WP bloat, adds CORS headers, and exposes clean REST endpoints for Next.js or Nuxt frontends.
 * Version:           1.0.0
 * Author:            Your Name
 * Author URI:        https://yoursite.com
 * Text Domain:       headless-optimizer
 * Domain Path:       /languages
 * Requires at least: 6.0
 * Requires PHP:      8.0
 *
 * @package HeadlessOptimizer
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
			echo '<strong>The Headless Optimizer:</strong> Composer dependencies not found. ';
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
define( 'HEADLESS_OPTIMIZER_VERSION',     '1.0.0' );
define( 'HEADLESS_OPTIMIZER_PLUGIN_DIR',  plugin_dir_path( __FILE__ ) );
define( 'HEADLESS_OPTIMIZER_PLUGIN_URL',  plugin_dir_url( __FILE__ ) );
define( 'HEADLESS_OPTIMIZER_PLUGIN_FILE', __FILE__ );

/**
 * Bootstrap the plugin.
 *
 * Analogous to: app.listen() in Express — this single call starts everything.
 * Plugin::get_instance() returns the singleton and triggers hook registration
 * via its constructor. Nothing else needs to happen here.
 */
HeadlessOptimizer\Plugin::get_instance();
