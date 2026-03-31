<?php
/**
 * Settings REST API Controller
 *
 * @package ApiBridge\Api
 */

namespace ApiBridge\Api;

use ApiBridge\Models\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class SettingsController
 *
 * Registers and handles REST API endpoints for plugin settings.
 *
 * JS/Node analogy:
 *   - This is your Express Router for a /settings resource.
 *   - register_routes() == router.get('/settings', ...) + router.post('/settings', ...)
 *   - check_permission() == your auth middleware (e.g. verifyJWT)
 *   - WP_REST_Request == Express's req object (params, body, headers)
 *   - rest_ensure_response() == res.json()
 *
 * Usage in REST client (JS):
 *   GET  /wp-json/api-bridge/v1/settings
 *   POST /wp-json/api-bridge/v1/settings  { body: JSON.stringify(settings) }
 */
class SettingsController {

	/**
	 * REST API namespace (equivalent to your Express base path).
	 *
	 * @var string
	 */
	private string $namespace = 'api-bridge/v1';

	/**
	 * Settings model instance.
	 *
	 * @var Settings
	 */
	private Settings $settings_model;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->settings_model = new Settings();
	}

	/**
	 * Register REST routes.
	 *
	 * Hooked into: rest_api_init
	 * Analogous to: app.use('/api/settings', router)
	 */
	public function register_routes(): void {
		register_rest_route(
			$this->namespace,
			'/settings',
			[
				[
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get_settings' ],
					'permission_callback' => [ $this, 'check_permission' ],
				],
				[
					'methods'             => \WP_REST_Server::EDITABLE,
					'callback'            => [ $this, 'update_settings' ],
					'permission_callback' => [ $this, 'check_permission' ],
					'args'                => $this->get_endpoint_args(),
				],
			]
		);
	}

	/**
	 * Handle GET /settings
	 *
	 * Analogous to:
	 *   router.get('/settings', (req, res) => res.json(await db.getSettings()))
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response
	 */
	public function get_settings( \WP_REST_Request $request ): \WP_REST_Response {
		return rest_ensure_response( $this->settings_model->get_all() );
	}

	/**
	 * Handle POST /settings
	 *
	 * Analogous to:
	 *   router.post('/settings', (req, res) => {
	 *     const { body } = req;
	 *     await db.updateSettings(body);
	 *     res.json({ success: true, settings: await db.getSettings() });
	 *   })
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function update_settings( \WP_REST_Request $request ) {
		// Analogous to: const body = req.body
		$params = $request->get_json_params();

		if ( empty( $params ) ) {
			return new \WP_Error(
				'rest_invalid_param',
				__( 'Request body must be a JSON object.', 'api-bridge' ),
				[ 'status' => 400 ]
			);
		}

		$updates = [];
		if ( array_key_exists( 'api_key', $params ) ) {
			$updates['api_key'] = $params['api_key'];
		}
		if ( array_key_exists( 'api_base_url', $params ) ) {
			$updates['api_base_url'] = $params['api_base_url'];
		}
		if ( array_key_exists( 'request_timeout', $params ) ) {
			$updates['request_timeout'] = $params['request_timeout'];
		}
		if ( array_key_exists( 'enable_caching', $params ) ) {
			$updates['enable_caching'] = $params['enable_caching'];
		}

		if ( ! empty( $updates ) ) {
			$this->settings_model->set_many( $updates );
		}

		return rest_ensure_response(
			[
				'success'  => true,
				'settings' => $this->settings_model->get_all(),
			]
		);
	}

	/**
	 * Permission callback — runs before the route handler.
	 *
	 * Analogous to: auth middleware in Express.
	 *   app.use('/api/settings', verifyAdmin, settingsRouter)
	 *
	 * @return true|\WP_Error
	 */
	public function check_permission() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new \WP_Error(
				'rest_forbidden',
				__( 'You do not have permission to manage plugin settings.', 'api-bridge' ),
				[ 'status' => 403 ]
			);
		}

		return true;
	}

	/**
	 * Define argument schema for the POST endpoint.
	 * Analogous to: Joi/Zod validation schema on an Express route.
	 *
	 * @return array
	 */
	private function get_endpoint_args(): array {
		return [
			'api_key' => [
				'type'              => 'text',
				'required'          => false,
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => 'rest_validate_request_arg',
				'description'       => 'API Key',
			],
			'api_base_url' => [
				'type'              => 'url',
				'required'          => false,
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => 'rest_validate_request_arg',
				'description'       => 'API Base URL',
			],
			'request_timeout' => [
				'type'              => 'number',
				'required'          => false,
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => 'rest_validate_request_arg',
				'description'       => 'Request Timeout (seconds)',
			],
			'enable_caching' => [
				'type'              => 'boolean',
				'required'          => false,
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => 'rest_validate_request_arg',
				'description'       => 'Enable Response Caching',
			],
		];
	}
}
