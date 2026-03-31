<?php
/**
 * Content REST API Controller
 *
 * @package HeadlessOptimizer\Api
 */

namespace HeadlessOptimizer\Api;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class ContentController
 *
 * Custom REST API endpoints that give your Next.js/Nuxt frontend a
 * cleaner, faster API than WP's default /wp/v2/* routes.
 *
 * JS analogy:
 *   Think of this as a BFF (Backend For Frontend) layer — exactly what
 *   you'd write in a Node API gateway to reshape the upstream data:
 *
 *   // Node/Express equivalent
 *   router.get('/posts', async (req, res) => {
 *     const raw = await wpClient.get('/wp/v2/posts');
 *     res.json(raw.map(post => ({
 *       id: post.id,
 *       slug: post.slug,
 *       title: post.title.rendered,
 *       excerpt: post.excerpt.rendered,
 *       date: post.date,
 *     })));
 *   });
 *
 * Routes registered:
 *   GET /wp-json/headless-optimizer/v1/posts
 *   GET /wp-json/headless-optimizer/v1/posts/{slug}
 *   GET /wp-json/headless-optimizer/v1/menu/{location}
 */
class ContentController {

	/**
	 * REST namespace.
	 *
	 * @var string
	 */
	private string $namespace = 'headless-optimizer/v1';

	/**
	 * Register routes.
	 */
	public function register_routes(): void {
		register_rest_route(
			$this->namespace,
			'/posts',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_posts' ],
				'permission_callback' => '__return_true', // public endpoint
				'args'                => [
					'per_page' => [
						'default'           => 10,
						'type'              => 'integer',
						'minimum'           => 1,
						'maximum'           => 100,
						'sanitize_callback' => 'absint',
					],
					'page'  => [
						'default'           => 1,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					],
					'category' => [
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					],
				],
			]
		);

		register_rest_route(
			$this->namespace,
			'/posts/(?P<slug>[a-z0-9-]+)',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_post_by_slug' ],
				'permission_callback' => '__return_true',
				'args'                => [
					'slug' => [
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					],
				],
			]
		);

		register_rest_route(
			$this->namespace,
			'/menu/(?P<location>[a-z0-9_-]+)',
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_menu' ],
				'permission_callback' => '__return_true',
			]
		);
	}

	/**
	 * GET /headless-optimizer/v1/posts
	 *
	 * Returns a clean, minimal post list — no HTML bloat in the response.
	 *
	 * Analogous to: GET /api/posts with a projection that drops unused fields
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response
	 */
	public function get_posts( \WP_REST_Request $request ): \WP_REST_Response {
		$args = [
			'post_type'      => 'post',
			'post_status'    => 'publish',
			'posts_per_page' => $request->get_param( 'per_page' ),
			'paged'          => $request->get_param( 'page' ),
		];

		$category_slug = $request->get_param( 'category' );
		if ( $category_slug ) {
			$args['category_name'] = $category_slug;
		}

		$query = new \WP_Query( $args );
		$posts = array_map( [ $this, 'shape_post' ], $query->posts );

		$response = rest_ensure_response( $posts );
		$response->header( 'X-WP-Total',      (string) $query->found_posts );
		$response->header( 'X-WP-TotalPages', (string) $query->max_num_pages );

		return $response;
	}

	/**
	 * GET /headless-optimizer/v1/posts/{slug}
	 *
	 * Returns a single post with rendered content.
	 * Analogous to: GET /api/posts/:slug
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_post_by_slug( \WP_REST_Request $request ) {
		$posts = get_posts(
			[
				'name'        => $request->get_param( 'slug' ),
				'post_type'   => 'post',
				'post_status' => 'publish',
				'numberposts' => 1,
			]
		);

		if ( empty( $posts ) ) {
			return new \WP_Error(
				'post_not_found',
				__( 'Post not found.', 'headless-optimizer' ),
				[ 'status' => 404 ]
			);
		}

		$post     = $posts[0];
		$shaped   = $this->shape_post( $post );
		// Add full rendered content only for single-post endpoint
		$shaped['content'] = apply_filters( 'the_content', $post->post_content );

		return rest_ensure_response( $shaped );
	}

	/**
	 * GET /headless-optimizer/v1/menu/{location}
	 *
	 * Returns a nav menu as a clean array your frontend can iterate over.
	 *
	 * Analogous to: GET /api/navigation/:location
	 * (the kind of endpoint you'd write to feed a Next.js Layout component)
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response|\WP_Error
	 */
	public function get_menu( \WP_REST_Request $request ) {
		$location = $request->get_param( 'location' );
		$locations = get_nav_menu_locations();

		if ( ! isset( $locations[ $location ] ) ) {
			return new \WP_Error(
				'menu_not_found',
				sprintf(
					/* translators: %s: menu location slug */
					__( 'Menu location "%s" not found.', 'headless-optimizer' ),
					$location
				),
				[ 'status' => 404 ]
			);
		}

		$menu  = wp_get_nav_menu_object( $locations[ $location ] );
		$items = wp_get_nav_menu_items( $menu->term_id );

		if ( ! $items ) {
			return rest_ensure_response( [] );
		}

		$shaped = array_map(
			fn( \WP_Post $item ) => [
				'id'       => $item->ID,
				'label'    => $item->title,
				'url'      => $item->url,
				'target'   => $item->target ?: '_self',
				'parentId' => (int) $item->menu_item_parent,
				'order'    => (int) $item->menu_order,
			],
			$items
		);

		return rest_ensure_response( $shaped );
	}

	/**
	 * Shape a WP_Post object into a clean, frontend-friendly array.
	 *
	 * Analogous to: a Prisma `select` projection or a GraphQL resolver
	 * that strips fields your frontend doesn't need.
	 *
	 * @param \WP_Post $post
	 * @return array
	 */
	private function shape_post( \WP_Post $post ): array {
		return [
			'id'           => $post->ID,
			'slug'         => $post->post_name,
			'title'        => get_the_title( $post ),
			'excerpt'      => get_the_excerpt( $post ),
			'date'         => $post->post_date_gmt,
			'modified'     => $post->post_modified_gmt,
			'featuredImage' => get_the_post_thumbnail_url( $post, 'full' ) ?: null,
			'categories'   => wp_get_post_terms( $post->ID, 'category', [ 'fields' => 'slugs' ] ),
			'tags'         => wp_get_post_terms( $post->ID, 'post_tag', [ 'fields' => 'slugs' ] ),
			'link'         => get_permalink( $post ),
		];
	}
}
