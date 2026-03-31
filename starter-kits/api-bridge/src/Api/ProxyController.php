<?php
/**
 * API Proxy Controller
 *
 * @package ApiBridge\Api
 */

namespace ApiBridge\Api;

use ApiBridge\Services\SecureApiClient;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ProxyController
 *
 * Proxies authenticated requests from the browser to an external API,
 * keeping the API key server-side and out of JS bundles.
 *
 * JS analogy:
 *   This is your Express "proxy route" — the same pattern used to hide
 *   API keys from the browser in Node backends:
 *
 *   // Node (what you'd normally do)
 *   app.get('/api/proxy/users', async (req, res) => {
 *     const data = await axios.get('https://external-api.com/users', {
 *       headers: { Authorization: `Bearer ${process.env.API_KEY}` }
 *     });
 *     res.json(data);
 *   });
 *
 *   // WordPress equivalent (this class)
 *   GET /wp-json/api-bridge/v1/proxy/users
 *   POST /wp-json/api-bridge/v1/proxy/items
 *
 * Security:
 *   - All proxy routes require manage_options capability by default.
 *   - If you need public endpoints, override check_permission() with
 *     return true — but NEVER expose the raw API key to clients.
 */
class ProxyController {

	/**
	 * REST namespace.
	 *
	 * @var string
	 */
	private string $namespace = 'api-bridge/v1';

	/**
	 * Authenticated API client.
	 *
	 * @var SecureApiClient
	 */
	private SecureApiClient $client;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->client = new SecureApiClient();
	}

	/**
	 * Register proxy REST routes.
	 *
	 * Analogous to: app.use('/api/proxy', proxyRouter)
	 */
	public function register_routes(): void {
		// GET proxy — forward to external API and return response
		register_rest_route(
			$this->namespace,
			'/proxy/(?P<path>.+)',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'proxy_get' ],
					'permission_callback' => [ $this, 'check_permission' ],
					'args'                => [
						'path' => [
							'required'          => true,
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_text_field',
						],
					],
				],
				[
					'methods'             => \WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'proxy_post' ],
					'permission_callback' => [ $this, 'check_permission' ],
				],
			]
		);
	}

	/**
	 * Proxy a GET request to the external API.
	 *
	 * Usage: GET /wp-json/api-bridge/v1/proxy/users
	 * Forwards to: {api_base_url}/users (with API key header)
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function proxy_get( \WP_REST_Request $request ) {
		$path     = $request->get_param( 'path' );
		$response = $this->client->get( '/' . ltrim( $path, '/' ) );

		if ( null === $response ) {
			return new \WP_Error(
				'proxy_error',
				__( 'External API request failed. Check your API key and base URL in Settings.', 'api-bridge' ),
				[ 'status' => 502 ]
			);
		}

		return rest_ensure_response( $response );
	}

	/**
	 * Proxy a POST request to the external API.
	 *
	 * Usage: POST /wp-json/api-bridge/v1/proxy/items
	 *        Body: { "name": "Thing" }
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function proxy_post( \WP_REST_Request $request ) {
		$path     = $request->get_param( 'path' );
		$body     = $request->get_json_params() ?? [];
		$response = $this->client->post( '/' . ltrim( $path, '/' ), $body );

		if ( null === $response ) {
			return new \WP_Error(
				'proxy_error',
				__( 'External API request failed. Check your API key and base URL in Settings.', 'api-bridge' ),
				[ 'status' => 502 ]
			);
		}

		return rest_ensure_response( $response );
	}

	/**
	 * Only logged-in admins can use the proxy by default.
	 * Override this to loosen permissions (e.g. return true for public endpoints).
	 *
	 * @return bool|\WP_Error
	 */
	public function check_permission() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new \WP_Error(
				'rest_forbidden',
				__( 'Proxy access requires manage_options capability.', 'api-bridge' ),
				[ 'status' => 403 ]
			);
		}

		return true;
	}
}
