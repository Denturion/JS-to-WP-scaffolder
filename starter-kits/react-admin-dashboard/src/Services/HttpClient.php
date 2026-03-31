<?php
/**
 * HTTP Client Service
 *
 * @package ReactAdminDashboard\Services
 */

namespace ReactAdminDashboard\Services;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class HttpClient
 *
 * A thin, fluent wrapper around WordPress's HTTP API functions.
 *
 * JS/Node mapping:
 *   fetch(url)                            -> $this->get($url)
 *   fetch(url, { method: 'POST', ... })   -> $this->post($url, $data)
 *   axios.create({ baseURL, headers })    -> new HttpClient() then ->set_base_url() / ->with_header()
 *   response.ok                           -> !is_wp_error() && status 2xx
 *   response.json()                       -> json_decode(wp_remote_retrieve_body($response), true)
 *   catch (err) { console.error(err) }    -> is_wp_error($response) guard
 *
 * Why not use raw wp_remote_get everywhere?
 *   Same reason you don't inline fetch() everywhere in JS — centralising
 *   HTTP logic means you can add auth headers, logging, and error handling
 *   in one place rather than repeating it across every caller.
 */
class HttpClient {

	/**
	 * Request timeout in seconds.
	 * Analogous to: axios timeout option.
	 *
	 * @var int
	 */
	private int $timeout = 30;

	/**
	 * Base URL prepended to all relative paths.
	 * Analogous to: axios.defaults.baseURL
	 *
	 * @var string
	 */
	private string $base_url = '';

	/**
	 * Headers merged into every request.
	 * Analogous to: axios.defaults.headers.common
	 *
	 * @var array<string, string>
	 */
	private array $default_headers = [
		'Content-Type' => 'application/json',
		'Accept'       => 'application/json',
	];

	/**
	 * Perform a GET request.
	 * Analogous to: fetch(url) or axios.get(url)
	 *
	 * @param string               $url     Absolute URL or path (if base_url is set).
	 * @param array<string,string> $headers Additional request headers.
	 * @return array|null Decoded JSON body on success, null on error.
	 */
	public function get( string $url, array $headers = [] ): ?array {
		$response = wp_remote_get(
			$this->build_url( $url ),
			[
				'timeout' => $this->timeout,
				'headers' => array_merge( $this->default_headers, $headers ),
			]
		);

		return $this->parse_response( $response );
	}

	/**
	 * Perform a POST request.
	 * Analogous to: fetch(url, { method: 'POST', body: JSON.stringify(data) })
	 *               or axios.post(url, data)
	 *
	 * @param string               $url     Absolute URL or path.
	 * @param array                $data    Request body (will be JSON-encoded).
	 * @param array<string,string> $headers Additional request headers.
	 * @return array|null Decoded JSON body on success, null on error.
	 */
	public function post( string $url, array $data = [], array $headers = [] ): ?array {
		$response = wp_remote_post(
			$this->build_url( $url ),
			[
				'timeout' => $this->timeout,
				'headers' => array_merge( $this->default_headers, $headers ),
				'body'    => wp_json_encode( $data ),
			]
		);

		return $this->parse_response( $response );
	}

	/**
	 * Perform a DELETE request.
	 * Analogous to: axios.delete(url)
	 *
	 * @param string               $url     Absolute URL or path.
	 * @param array<string,string> $headers Additional request headers.
	 * @return array|null
	 */
	public function delete( string $url, array $headers = [] ): ?array {
		$response = wp_remote_request(
			$this->build_url( $url ),
			[
				'method'  => 'DELETE',
				'timeout' => $this->timeout,
				'headers' => array_merge( $this->default_headers, $headers ),
			]
		);

		return $this->parse_response( $response );
	}

	/**
	 * Parse a WP HTTP API response into a plain array.
	 *
	 * Analogous to: response.json() in the Fetch API, including the ok check.
	 *
	 * @param array|\WP_Error $response Raw WP HTTP response.
	 * @return array|null
	 */
	private function parse_response( $response ): ?array {
		// Analogous to: catch (networkError) { ... }
		if ( is_wp_error( $response ) ) {
			error_log(
				sprintf(
					'[ReactAdminDashboard] HttpClient error: %s',
					$response->get_error_message()
				)
			);
			return null;
		}

		$status_code = (int) wp_remote_retrieve_response_code( $response );

		// Analogous to: if (!response.ok) throw new Error(response.statusText)
		if ( $status_code < 200 || $status_code >= 300 ) {
			error_log(
				sprintf(
					'[ReactAdminDashboard] HttpClient received non-2xx status: %d',
					$status_code
				)
			);
			return null;
		}

		$body = wp_remote_retrieve_body( $response );

		return json_decode( $body, true );
	}

	/**
	 * Prepend the base URL if the given URL is a relative path.
	 *
	 * @param string $url
	 * @return string
	 */
	private function build_url( string $url ): string {
		if ( $this->base_url && ! preg_match( '#^https?://#', $url ) ) {
			return rtrim( $this->base_url, '/' ) . '/' . ltrim( $url, '/' );
		}
		return $url;
	}

	// --- Fluent builder methods (analogous to axios.create() options) ---

	/**
	 * Set a base URL for all requests.
	 * Analogous to: axios.create({ baseURL: 'https://api.example.com' })
	 *
	 * @param string $url
	 * @return static
	 */
	public function set_base_url( string $url ): static {
		$this->base_url = $url;
		return $this;
	}

	/**
	 * Set a default header for all requests.
	 * Analogous to: axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
	 *
	 * @param string $name
	 * @param string $value
	 * @return static
	 */
	public function with_header( string $name, string $value ): static {
		$this->default_headers[ $name ] = $value;
		return $this;
	}

	/**
	 * Set the request timeout.
	 *
	 * @param int $seconds
	 * @return static
	 */
	public function set_timeout( int $seconds ): static {
		$this->timeout = $seconds;
		return $this;
	}
}
