<?php
/**
 * Settings REST API Controller
 *
 * @package HeadlessOptimizer\Api
 */

namespace HeadlessOptimizer\Api;

use HeadlessOptimizer\Models\Settings;

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
 *   GET  /wp-json/headless-optimizer/v1/settings
 *   POST /wp-json/headless-optimizer/v1/settings  { body: JSON.stringify(settings) }
 */
class SettingsController {

	/**
	 * REST API namespace (equivalent to your Express base path).
	 *
	 * @var string
	 */
	private string $namespace = 'headless-optimizer/v1';

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
				__( 'Request body must be a JSON object.', 'headless-optimizer' ),
				[ 'status' => 400 ]
			);
		}

		$updates = [];
		if ( array_key_exists( 'allowed_origins', $params ) ) {
			$updates['allowed_origins'] = $params['allowed_origins'];
		}
		if ( array_key_exists( 'cache_max_age', $params ) ) {
			$updates['cache_max_age'] = $params['cache_max_age'];
		}
		if ( array_key_exists( 'disable_emojis', $params ) ) {
			$updates['disable_emojis'] = $params['disable_emojis'];
		}
		if ( array_key_exists( 'disable_feeds', $params ) ) {
			$updates['disable_feeds'] = $params['disable_feeds'];
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
				__( 'You do not have permission to manage plugin settings.', 'headless-optimizer' ),
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
			'allowed_origins' => [
				'type'              => 'text',
				'required'          => false,
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => 'rest_validate_request_arg',
				'description'       => 'Allowed CORS Origins (comma-separated)',
			],
			'cache_max_age' => [
				'type'              => 'number',
				'required'          => false,
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => 'rest_validate_request_arg',
				'description'       => 'REST Cache Max-Age (seconds)',
			],
			'disable_emojis' => [
				'type'              => 'boolean',
				'required'          => false,
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => 'rest_validate_request_arg',
				'description'       => 'Disable WP Emoji Scripts',
			],
			'disable_feeds' => [
				'type'              => 'boolean',
				'required'          => false,
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => 'rest_validate_request_arg',
				'description'       => 'Disable RSS/Atom Feeds',
			],
		];
	}
}
