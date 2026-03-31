<?php
/**
 * WordPress Bloat Remover
 *
 * @package HeadlessOptimizer\Hooks
 */

namespace HeadlessOptimizer\Hooks;

use HeadlessOptimizer\Models\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class WpOptimizer
 *
 * Strips unnecessary WordPress features that add weight and latency
 * when WP is used as a headless CMS behind a Next.js/Nuxt/Astro frontend.
 *
 * JS analogy:
 *   In Node, you'd just not import express-session or passport.
 *   In WordPress, these things are on by default — you have to explicitly
 *   remove them. This class is the equivalent of a "strip unused middleware"
 *   pass before app.listen().
 *
 * Each optimization is gated on a setting so the buyer can toggle them
 * without touching PHP.
 *
 * Hook lifecycle mapping:
 *   init           -> runs on every request (like app-level middleware)
 *   wp_loaded      -> runs after all plugins are loaded
 *   send_headers   -> runs before headers are sent (like res.setHeader())
 *   rest_api_init  -> runs when the REST API is initialised
 */
class WpOptimizer {

	/**
	 * @var Settings
	 */
	private Settings $settings;

	/**
	 * Constructor.
	 *
	 * @param Settings|null $settings
	 */
	public function __construct( ?Settings $settings = null ) {
		$this->settings = $settings ?? new Settings();
	}

	/**
	 * Register all optimization hooks based on current settings.
	 * Called from Plugin::register_hooks().
	 */
	public function register(): void {
		if ( $this->settings->get( 'disable_emojis', true ) ) {
			$this->disable_emojis();
		}

		if ( $this->settings->get( 'disable_feeds', true ) ) {
			$this->disable_feeds();
		}

		// Always apply headless performance optimizations
		$this->remove_bloat();
		$this->add_cors_headers();
		$this->add_cache_headers();
	}

	// ── Emoji removal ──────────────────────────────────────────────────────────

	/**
	 * Remove WordPress emoji scripts and styles.
	 *
	 * WP loads ~40 KB of emoji-related JS/CSS on every page (even API responses).
	 * In a headless setup, your frontend handles emoji natively — no need for WP's.
	 *
	 * Analogous to: removing an unused webpack plugin from your config
	 */
	private function disable_emojis(): void {
		remove_action( 'wp_head',             'print_emoji_detection_script', 7 );
		remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
		remove_action( 'wp_print_styles',     'print_emoji_styles' );
		remove_action( 'admin_print_styles',  'print_emoji_styles' );
		remove_filter( 'the_content_feed',    'wp_staticize_emoji' );
		remove_filter( 'comment_text_rss',    'wp_staticize_emoji' );
		remove_filter( 'wp_mail',             'wp_staticize_emoji_for_email' );
		add_filter( 'tiny_mce_plugins',       [ $this, 'remove_tinymce_emoji' ] );
		add_filter( 'wp_resource_hints',      [ $this, 'remove_emoji_dns_prefetch' ], 10, 2 );
	}

	/**
	 * @internal
	 * @param array $plugins
	 * @return array
	 */
	public function remove_tinymce_emoji( array $plugins ): array {
		return array_diff( $plugins, [ 'wpemoji' ] );
	}

	/**
	 * @internal
	 * @param array  $urls
	 * @param string $relation_type
	 * @return array
	 */
	public function remove_emoji_dns_prefetch( array $urls, string $relation_type ): array {
		if ( 'dns-prefetch' !== $relation_type ) {
			return $urls;
		}
		return array_filter( $urls, fn( $url ) => false === strpos( $url, 'twemoji' ) );
	}

	// ── Feed removal ───────────────────────────────────────────────────────────

	/**
	 * Disable RSS/Atom feeds — a headless frontend has its own feed strategy.
	 *
	 * Analogous to: removing an unused Express route handler
	 */
	private function disable_feeds(): void {
		add_action(
			'do_feed',
			[ $this, 'block_feed' ],
			1
		);
		add_action( 'do_feed_rdf',        [ $this, 'block_feed' ], 1 );
		add_action( 'do_feed_rss',        [ $this, 'block_feed' ], 1 );
		add_action( 'do_feed_rss2',       [ $this, 'block_feed' ], 1 );
		add_action( 'do_feed_atom',       [ $this, 'block_feed' ], 1 );
		add_action( 'do_feed_rss2_comments', [ $this, 'block_feed' ], 1 );
		add_action( 'do_feed_atom_comments', [ $this, 'block_feed' ], 1 );

		// Remove feed discovery links from <head>
		remove_action( 'wp_head', 'feed_links', 2 );
		remove_action( 'wp_head', 'feed_links_extra', 3 );
	}

	/**
	 * @internal
	 */
	public function block_feed(): void {
		wp_die(
			esc_html__( 'Feed disabled — this is a headless WordPress installation.', 'headless-optimizer' ),
			'',
			[ 'response' => 410 ] // 410 Gone is more accurate than 404
		);
	}

	// ── General bloat removal ──────────────────────────────────────────────────

	/**
	 * Strip WP features that serve no purpose in a headless setup.
	 *
	 * Analogous to: commenting out unused Express middleware in server.js
	 */
	private function remove_bloat(): void {
		// WordPress version tag leaks version info in HTML and REST responses
		remove_action( 'wp_head', 'wp_generator' );

		// XML-RPC is a legacy protocol and an attack vector
		add_filter( 'xmlrpc_enabled', '__return_false' );

		// oEmbed adds a discovery link that headless frontends don't need
		remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
		remove_action( 'wp_head', 'wp_oembed_add_host_js' );

		// Remove unnecessary REST API links from <Link> headers
		remove_action( 'template_redirect', 'rest_output_link_header', 11 );
		remove_action( 'wp_head',           'rest_output_link_wp_head', 10 );

		// Remove Windows Live Writer link
		remove_action( 'wp_head', 'wlwmanifest_link' );

		// Remove RSD link (Really Simple Discovery — used by old blog editors)
		remove_action( 'wp_head', 'rsd_link' );

		// Remove shortlink from <head>
		remove_action( 'wp_head', 'wp_shortlink_wp_head', 10 );

		// Hide the REST API user enumeration endpoint
		add_filter( 'rest_endpoints', [ $this, 'remove_user_enumeration' ] );
	}

	/**
	 * Remove the /wp/v2/users endpoint to prevent username enumeration.
	 * Your frontend can still use the authenticated endpoint if needed.
	 *
	 * @param array $endpoints
	 * @return array
	 */
	public function remove_user_enumeration( array $endpoints ): array {
		if ( isset( $endpoints['/wp/v2/users'] ) ) {
			unset( $endpoints['/wp/v2/users'] );
		}
		if ( isset( $endpoints['/wp/v2/users/(?P<id>[\d]+)'] ) ) {
			unset( $endpoints['/wp/v2/users/(?P<id>[\d]+)'] );
		}
		return $endpoints;
	}

	// ── CORS headers ───────────────────────────────────────────────────────────

	/**
	 * Add CORS headers to REST API responses.
	 *
	 * Allows your Next.js/Nuxt frontend to call the WP REST API from
	 * a different origin (e.g. localhost:3000 in dev, yourdomain.com in prod).
	 *
	 * Analogous to: app.use(cors({ origin: allowedOrigins })) in Express
	 *
	 * The allowed origins list is configurable via the Settings page.
	 */
	private function add_cors_headers(): void {
		add_action( 'rest_api_init', [ $this, 'send_cors_headers' ] );
		add_action( 'send_headers',  [ $this, 'send_cors_headers' ] );
	}

	/**
	 * @internal
	 */
	public function send_cors_headers(): void {
		$raw_origins     = $this->settings->get( 'allowed_origins', 'http://localhost:3000' );
		$allowed_origins = array_map( 'trim', explode( ',', $raw_origins ) );
		$request_origin  = $_SERVER['HTTP_ORIGIN'] ?? '';

		if ( in_array( $request_origin, $allowed_origins, true ) ) {
			header( 'Access-Control-Allow-Origin: ' . $request_origin );
			header( 'Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS' );
			header( 'Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce' );
			header( 'Access-Control-Allow-Credentials: true' );
		}

		// Handle preflight OPTIONS requests
		if ( 'OPTIONS' === $_SERVER['REQUEST_METHOD'] ) {
			status_header( 200 );
			exit;
		}
	}

	// ── Cache headers ──────────────────────────────────────────────────────────

	/**
	 * Add Cache-Control headers to REST API responses.
	 *
	 * Analogous to: res.setHeader('Cache-Control', `public, max-age=${ttl}`)
	 * in an Express API that sits behind a CDN.
	 *
	 * The TTL is configurable via the Settings page (cache_max_age).
	 */
	private function add_cache_headers(): void {
		add_filter( 'rest_post_dispatch', [ $this, 'set_cache_headers' ], 10, 3 );
	}

	/**
	 * @internal
	 * @param \WP_REST_Response $result
	 * @param \WP_REST_Server   $server
	 * @param \WP_REST_Request  $request
	 * @return \WP_REST_Response
	 */
	public function set_cache_headers(
		\WP_REST_Response $result,
		\WP_REST_Server $server,
		\WP_REST_Request $request
	): \WP_REST_Response {
		// Only cache GET requests from unauthenticated users
		if ( 'GET' !== $request->get_method() || is_user_logged_in() ) {
			return $result;
		}

		$max_age = (int) $this->settings->get( 'cache_max_age', 300 );
		$result->header( 'Cache-Control', "public, max-age={$max_age}, stale-while-revalidate=60" );
		$result->header( 'Vary', 'Origin, Accept-Encoding' );

		return $result;
	}
}
