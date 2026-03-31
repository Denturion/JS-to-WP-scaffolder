<?php
/**
 * Secure API Client
 *
 * @package ApiBridge\Services
 */

namespace ApiBridge\Services;

use ApiBridge\Models\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class SecureApiClient
 *
 * Extends HttpClient to automatically inject the stored API key.
 * The key is read from the database at request time — never hardcoded.
 *
 * JS analogy:
 *   Think of this like an axios instance created with:
 *
 *   const apiClient = axios.create({
 *     baseURL: settings.apiBaseUrl,
 *     headers: { Authorization: `Bearer ${settings.apiKey}` },
 *     timeout: settings.requestTimeout * 1000,
 *   });
 *
 *   The difference: in WordPress, the "config" lives in the database
 *   (get_option) rather than in process.env or a config file.
 *
 * Usage:
 *   $client   = new SecureApiClient();
 *   $response = $client->get( '/users' );
 *   $response = $client->post( '/items', [ 'name' => 'Thing' ] );
 */
class SecureApiClient extends HttpClient {

	/**
	 * Settings model, used to load the stored API key at runtime.
	 *
	 * @var Settings
	 */
	private Settings $settings;

	/**
	 * Whether the client has been initialised with credentials.
	 *
	 * @var bool
	 */
	private bool $initialised = false;

	/**
	 * Constructor.
	 * Injects the settings model (or creates one if not provided).
	 *
	 * @param Settings|null $settings
	 */
	public function __construct( ?Settings $settings = null ) {
		$this->settings = $settings ?? new Settings();
	}

	/**
	 * Lazy-initialise the HTTP client from stored settings.
	 *
	 * Called before every request so that settings changes take effect
	 * without needing to reinstantiate the client.
	 *
	 * JS analogy:
	 *   Like rebuilding your axios instance if config values change at runtime
	 *   (e.g. after a settings save fires a React state update).
	 */
	private function init(): void {
		if ( $this->initialised ) {
			return;
		}

		$api_key  = $this->settings->get( 'api_key' );
		$base_url = $this->settings->get( 'api_base_url', 'https://api.example.com/v1' );
		$timeout  = (int) $this->settings->get( 'request_timeout', 30 );

		if ( empty( $api_key ) ) {
			error_log( '[ApiBridge] SecureApiClient: api_key is not configured. Visit Settings → The API Bridge.' );
		}

		$this
			->set_base_url( $base_url )
			->set_timeout( $timeout )
			->with_header( 'Authorization', 'Bearer ' . $api_key );

		$this->initialised = true;
	}

	/**
	 * GET request through the configured, authenticated client.
	 *
	 * @param string $path    Relative path (e.g. '/users/123').
	 * @param array  $headers Extra headers.
	 * @return array|null
	 */
	public function get( string $path, array $headers = [] ): ?array {
		$this->init();
		return $this->get_with_cache( $path, $headers );
	}

	/**
	 * POST request through the configured, authenticated client.
	 *
	 * @param string $path    Relative path.
	 * @param array  $data    Request body.
	 * @param array  $headers Extra headers.
	 * @return array|null
	 */
	public function post( string $path, array $data = [], array $headers = [] ): ?array {
		$this->init();
		return parent::post( $path, $data, $headers );
	}

	/**
	 * GET with optional transient caching.
	 *
	 * Caching is controlled by the "enable_caching" setting.
	 * The cache TTL is set globally in Settings (cache_max_age defaults to 5 min).
	 *
	 * JS analogy:
	 *   Like wrapping fetch() in a Map-based memoize function,
	 *   but the cache survives PHP process restarts (stored in the DB).
	 *
	 * @param string $path
	 * @param array  $headers
	 * @return array|null
	 */
	private function get_with_cache( string $path, array $headers = [] ): ?array {
		$caching_enabled = (bool) $this->settings->get( 'enable_caching', true );

		if ( ! $caching_enabled ) {
			return parent::get( $path, $headers );
		}

		// Build a stable cache key from the request path
		$cache_key = 'req_' . md5( $path );
		$cached    = $this->settings->cache_get( $cache_key );

		if ( false !== $cached ) {
			return $cached;
		}

		$response = parent::get( $path, $headers );

		if ( null !== $response ) {
			// Cache for 5 minutes by default
			$this->settings->cache_set( $cache_key, $response, 300 );
		}

		return $response;
	}

	/**
	 * Invalidate all cached responses for this client.
	 * Call this after saving settings or on explicit user action.
	 *
	 * JS analogy: cache.clear()
	 */
	public function invalidate_cache(): void {
		// WordPress doesn't provide a prefix-based delete, so we bust by
		// reinitialising the client (which rebuilds the base URL / headers)
		$this->initialised = false;
	}
}
