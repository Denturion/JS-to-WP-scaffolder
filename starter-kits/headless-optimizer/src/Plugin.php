<?php
/**
 * Main Plugin Class
 *
 * @package HeadlessOptimizer
 */

namespace HeadlessOptimizer;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Plugin
 *
 * The central application class using the Singleton pattern.
 *
 * JS/Node analogy:
 *   - This class is the equivalent of your Express `app` instance.
 *   - get_instance() is like `module.exports = app` — one instance, shared everywhere.
 *   - register_hooks() is like `app.use(middleware)` — wiring up handlers.
 *   - WordPress fires hooks at the right time, just as Express calls middleware
 *     in the order it's registered.
 *
 * Why Singleton?
 *   WordPress loads plugins on every request. Without a singleton, hooks could
 *   be registered multiple times. The pattern guarantees one instance per request,
 *   mirroring how a Node process holds a single `app` object for its lifetime.
 */
final class Plugin {

	/**
	 * The single instance of this class.
	 *
	 * @var Plugin|null
	 */
	private static ?Plugin $instance = null;

	/**
	 * Plugin version, pulled from the constant set in plugin-entry.php.
	 *
	 * @var string
	 */
	public string $version;

	/**
	 * Private constructor enforces the singleton — call get_instance() instead.
	 */
	private function __construct() {
		$this->version = defined( 'HEADLESS_OPTIMIZER_VERSION' )
			? HEADLESS_OPTIMIZER_VERSION
			: '1.0.0';

		$this->register_hooks();
	}

	/**
	 * Return the singleton instance, creating it on first call.
	 *
	 * Analogous to:
	 *   let app;
	 *   export function getApp() {
	 *     if (!app) app = createApp();
	 *     return app;
	 *   }
	 *
	 * @return Plugin
	 */
	public static function get_instance(): Plugin {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Register all WordPress hooks.
	 *
	 * Analogous to: calling app.use() with each middleware/router in Express.
	 * WordPress's hook system (add_action / add_filter) is the equivalent of
	 * Express's middleware chain — handlers are called at defined lifecycle points.
	 */
	private function register_hooks(): void {
		// admin_menu / admin_init — analogous to mounting an Express admin router
		$admin_init = new Hooks\AdminInit();
		add_action( 'admin_menu',            [ $admin_init, 'register_admin_menu' ] );
		add_action( 'admin_init',            [ $admin_init, 'register_settings' ] );
		add_action( 'admin_enqueue_scripts', [ $admin_init, 'enqueue_admin_assets' ] );
		// WP bloat remover + CORS + cache headers — runs at init / send_headers / rest_api_init
		// Analogous to: app.use(helmet()), app.use(cors()), app.use(compression())
		$optimizer = new Hooks\WpOptimizer();
		add_action( 'init', [ $optimizer, 'register' ] );

		// REST API controllers
		// Analogous to: app.use('/api', router) in Express
		$settings_controller = new Api\SettingsController();
		add_action( 'rest_api_init', [ $settings_controller, 'register_routes' ] );

		// BFF content endpoints — cleaner, leaner responses for the frontend
		$content_controller = new Api\ContentController();
		add_action( 'rest_api_init', [ $content_controller, 'register_routes' ] );
	}

	/**
	 * Prevent cloning the singleton.
	 */
	private function __clone() {}

	/**
	 * Prevent unserialization of the singleton.
	 *
	 * @throws \Exception
	 */
	public function __wakeup(): void {
		throw new \Exception( 'Cannot unserialize a singleton.' );
	}
}
