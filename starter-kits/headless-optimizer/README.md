# The Headless Optimizer

**Turn WordPress into a lean, fast headless CMS for your Next.js / Nuxt / Astro frontend.**

WordPress ships with a lot of stuff you don't need when you're using it as a headless backend: emoji scripts, RSS feeds, XML-RPC, oEmbed discovery, generator tags. This plugin strips all of it, adds CORS and cache headers, and exposes cleaner REST API endpoints optimised for a JS frontend.

Think of it as `helmet()` + `cors()` + a BFF layer for your WP installation.

---

## What's inside

```
headless-optimizer/
├── src/
│   ├── Plugin.php                      # Singleton bootstrap — wires everything together
│   ├── Hooks/
│   │   ├── AdminInit.php              # Admin settings page
│   │   └── WpOptimizer.php            # ← The main event
│   │       ├── disable_emojis()       # Removes ~40KB of emoji JS/CSS
│   │       ├── disable_feeds()        # Kills RSS/Atom (410 Gone)
│   │       ├── remove_bloat()         # Strips XML-RPC, oEmbed, generator tags, RSD
│   │       ├── add_cors_headers()     # CORS for your frontend origin(s)
│   │       └── add_cache_headers()    # Cache-Control on REST GET responses
│   ├── Api/
│   │   ├── SettingsController.php     # REST: GET/POST /headless-optimizer/v1/settings
│   │   └── ContentController.php      # ← BFF layer: clean post/menu endpoints
│   └── Models/
│       └── Settings.php
└── src/Admin/                         # React settings UI
```

---

## Customize it in 5 minutes

### 1. Install and activate

```bash
composer install
cd src/Admin && npm install && npm run build
```

Copy `headless-optimizer/` to `wp-content/plugins/` and activate.

### 2. Configure your frontend origin

Go to **WP Admin → The Headless Optimizer** and set:

- **Allowed CORS Origins** — your frontend URL(s), comma-separated:
  ```
  http://localhost:3000, https://yoursite.com
  ```
- **REST Cache Max-Age** — how long CDN / browser caches responses (default: 300s)
- **Disable WP Emojis** — on by default, turn off only if you need WP emoji in admin
- **Disable RSS Feeds** — on by default

### 3. Use the clean content API from your frontend

```js
// Next.js / any JS client

// Get posts (clean shape, no HTML bloat)
const posts = await fetch('/wp-json/headless-optimizer/v1/posts?per_page=10')
  .then(r => r.json());
// → [{ id, slug, title, excerpt, date, featuredImage, categories, tags, link }]

// Get single post by slug
const post = await fetch('/wp-json/headless-optimizer/v1/posts/my-post-slug')
  .then(r => r.json());
// → { ...postShape, content: '<rendered HTML>' }

// Get a navigation menu
const menu = await fetch('/wp-json/headless-optimizer/v1/menu/primary')
  .then(r => r.json());
// → [{ id, label, url, target, parentId, order }]
```

Pagination headers are set on the `/posts` endpoint:
```
X-WP-Total: 42
X-WP-TotalPages: 5
```

### 4. Add a custom endpoint

Add a new controller in `src/Api/` (the namespace + autoloading are already set up):

```php
namespace HeadlessOptimizer\Api;

class ProductsController {
    public function register_routes(): void {
        register_rest_route('headless-optimizer/v1', '/products', [
            'methods'             => \WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_products'],
            'permission_callback' => '__return_true',
        ]);
    }

    public function get_products(\WP_REST_Request $req): \WP_REST_Response {
        // Your logic here
        return rest_ensure_response([]);
    }
}
```

Wire it in `Plugin.php`:
```php
$products = new Api\ProductsController();
add_action('rest_api_init', [$products, 'register_routes']);
```

### 5. Next.js App Router setup

```js
// app/lib/wp.js — a thin client around this plugin's endpoints
const WP_URL = process.env.NEXT_PUBLIC_WP_URL;

export async function getPosts(page = 1) {
  const res = await fetch(
    `${WP_URL}/wp-json/headless-optimizer/v1/posts?page=${page}`,
    { next: { revalidate: 300 } }   // matches our Cache-Control TTL
  );
  return res.json();
}

export async function getPost(slug) {
  const res = await fetch(
    `${WP_URL}/wp-json/headless-optimizer/v1/posts/${slug}`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) notFound();
  return res.json();
}
```

---

## What gets removed

| Feature                | Why it's gone                              |
|------------------------|--------------------------------------------|
| Emoji scripts (~40 KB) | Your frontend renders emoji natively       |
| RSS/Atom feeds         | Headless frontends have their own feed strategy |
| XML-RPC                | Legacy protocol, significant attack vector |
| Generator meta tag     | Stops advertising your WP version          |
| oEmbed discovery       | Unused in headless setups                  |
| REST Link headers      | Noise in HTTP responses                    |
| Windows Live Writer    | 2008 called                                |
| User enumeration API   | `/wp/v2/users` removed for unauthenticated users |

---

## PHP → JS reference

| PHP (this plugin)                        | JS equivalent                                       |
|------------------------------------------|-----------------------------------------------------|
| `add_cors_headers()`                    | `app.use(cors({ origin: [...] }))`                  |
| `add_cache_headers()`                   | `res.setHeader('Cache-Control', 'max-age=300')`     |
| `ContentController->shape_post()`       | Prisma `select {}` / GraphQL resolver projection    |
| `ContentController->get_menu()`         | `/api/navigation/:location` in Express              |
| `WpOptimizer->remove_bloat()`          | Commenting out unused Express middleware            |
| `set_transient($key, $val, $ttl)`       | `cache.set(key, val, { ttl })` (Redis / node-cache) |

---

## Requirements

- PHP 8.0+
- WordPress 6.0+
- Composer
- Node 16+ + npm (for settings page)
- A JS frontend (Next.js, Nuxt, Astro, SvelteKit, etc.)
