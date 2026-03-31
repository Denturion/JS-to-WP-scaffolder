<?php
/**
 * Admin Init Hook Handler
 *
 * @package ReactAdminDashboard\Hooks
 */

namespace ReactAdminDashboard\Hooks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class AdminInit
 *
 * Registers WordPress admin hooks: menu pages, settings, and asset enqueuing.
 *
 * JS/Node analogy:
 *   - This class is like an Express sub-router for /admin routes.
 *   - register_admin_menu()    == router.get('/admin', renderAdminShell)
 *   - register_settings()      == app.use(bodyParser) — parsing/registering input shape
 *   - enqueue_admin_assets()   == webpack injecting <script> tags into the page
 *   - render_admin_page()      == res.send('<div id="root"></div>')
 *
 * Hook lifecycle mapping:
 *   admin_menu              -> runs when WP builds the sidebar nav (analogous to route registration)
 *   admin_init              -> runs on every admin page load (analogous to admin middleware)
 *   admin_enqueue_scripts   -> runs when WP outputs <head> on admin pages (like webpack HtmlPlugin)
 */
class AdminInit {

	/**
	 * Register the plugin's top-level admin menu page.
	 *
	 * Hooked into: admin_menu
	 * Analogous to: app.use('/admin', express.Router())
	 */
	public function register_admin_menu(): void {
		add_menu_page(
			/* page_title */ __( 'The React Admin', 'react-admin-dashboard' ),
			/* menu_title */ __( 'The React Admin', 'react-admin-dashboard' ),
			/* capability */ 'manage_options',
			/* menu_slug  */ 'react-admin-dashboard',
			/* callback   */ [ $this, 'render_admin_page' ],
			/* icon_url   */ 'dashicons-admin-generic',
			/* position   */ 80
		);
	}

	/**
	 * Register plugin settings via the WordPress Settings API.
	 *
	 * Hooked into: admin_init
	 * Analogous to: defining a Joi/Zod schema that express-validator uses
	 */
	public function register_settings(): void {
		register_setting(
			'react-admin-dashboard_options_group',
			'react-admin-dashboard_settings',
			[
				'sanitize_callback' => [ $this, 'sanitize_settings' ],
				'default'           => [],
			]
		);
	}

	/**
	 * Enqueue the React admin bundle on this plugin's admin page only.
	 *
	 * Hooked into: admin_enqueue_scripts
	 *
	 * Analogous to:
	 *   webpack HtmlWebpackPlugin injecting <script src="bundle.js"> into index.html,
	 *   but conditional — only on this plugin's admin page.
	 *
	 * @wordpress/scripts generates an `index.asset.php` file alongside the bundle.
	 * It contains the dependency handles (other WP scripts this bundle depends on)
	 * and a content hash for cache-busting. This is equivalent to webpack's
	 * chunk manifest / content hashes.
	 *
	 * @param string $hook_suffix The current admin page hook suffix.
	 */
	public function enqueue_admin_assets( string $hook_suffix ): void {
		// Only load assets on our page — equivalent to a route guard
		if ( false === strpos( $hook_suffix, 'react-admin-dashboard' ) ) {
			return;
		}

		$asset_file = REACT_ADMIN_DASHBOARD_PLUGIN_DIR . 'src/Admin/build/index.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			// Build hasn't run yet — equivalent to "bundle.js not found"
			return;
		}

		// Analogous to: reading webpack's asset manifest for chunk hashes + deps
		$asset = include $asset_file;

		wp_enqueue_script(
			'react-admin-dashboard-admin',
			REACT_ADMIN_DASHBOARD_PLUGIN_URL . 'src/Admin/build/index.js',
			$asset['dependencies'],
			$asset['version'],
			true // Load in footer, analogous to <script defer>
		);

		wp_enqueue_style(
			'react-admin-dashboard-admin',
			REACT_ADMIN_DASHBOARD_PLUGIN_URL . 'src/Admin/build/index.css',
			[ 'wp-components' ],
			$asset['version']
		);

		/**
		 * Pass PHP-side data to the React app via the global window object.
		 *
		 * Analogous to: SSR's window.__INITIAL_STATE__ = { ... }
		 * or Vite's import.meta.env / define() plugin.
		 *
		 * In React, access via: const { apiUrl, nonce } = window.reactAdminDashboardData;
		 */
		wp_localize_script(
			'react-admin-dashboard-admin',
			'reactAdminDashboardData',
			[
				'apiUrl'    => rest_url( 'react-admin-dashboard/v1' ),
				'nonce'     => wp_create_nonce( 'wp_rest' ),
				'siteUrl'   => get_site_url(),
				'pluginUrl' => REACT_ADMIN_DASHBOARD_PLUGIN_URL,
			]
		);
	}

	/**
	 * Render the admin page shell that React mounts into.
	 *
	 * Analogous to: serving index.html with <div id="root"></div>
	 * The React app (src/Admin/src/App.jsx) mounts into this div.
	 */
	public function render_admin_page(): void {
		echo '<div id="react-admin-dashboard-admin-root"></div>';
	}

	/**
	 * Sanitize settings input before saving to the database.
	 *
	 * Analogous to: express-validator's sanitization chain, or Joi's .sanitize()
	 *
	 * @param mixed $input Raw form input (may not be an array if tampered with).
	 * @return array Sanitized settings.
	 */
	public function sanitize_settings( mixed $input ): array {
		if ( ! is_array( $input ) ) {
			return [];
		}

		$sanitized = [];
		if ( isset( $input['dashboard_title'] ) ) {
			$sanitized['dashboard_title'] = sanitize_text_field( $input['dashboard_title'] );
		}
		if ( isset( $input['primary_color'] ) ) {
			$sanitized['primary_color'] = sanitize_text_field( $input['primary_color'] );
		}
		if ( isset( $input['items_per_page'] ) ) {
			$sanitized['items_per_page'] = sanitize_text_field( $input['items_per_page'] );
		}

		return $sanitized;
	}
}
