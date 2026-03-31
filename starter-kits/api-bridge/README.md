# The API Bridge

**Securely connect WordPress to any external API — without touching spaghetti PHP.**

You know how to do this in Node:

```js
// The thing you WANT to write
const client = axios.create({
  baseURL: process.env.API_BASE_URL,
  headers: { Authorization: `Bearer ${process.env.API_KEY}` },
});
const data = await client.get('/users');
```

This plugin gives you the exact same pattern in WordPress — API key stored in the database, auto-injected on every request, optional caching, and a proxy endpoint so your frontend never touches the key directly.

---

## What's inside

```
api-bridge/
├── src/
│   ├── Plugin.php                    # Singleton bootstrap (like server.js)
│   ├── Services/
│   │   ├── HttpClient.php            # wp_remote_get/post wrapper (like axios)
│   │   └── SecureApiClient.php       # Auto-injects API key from DB settings
│   ├── Api/
│   │   ├── SettingsController.php    # REST: GET/POST /api-bridge/v1/settings
│   │   └── ProxyController.php       # REST proxy: /api-bridge/v1/proxy/{path}
│   ├── Models/
│   │   └── Settings.php             # get_option / set_transient layer
│   └── Hooks/
│       └── AdminInit.php            # Admin menu + asset enqueuing
└── src/Admin/                       # React settings UI (@wordpress/scripts)
    └── src/App.jsx                  # Settings form + apiFetch
```

---

## Customize it in 5 minutes

### 1. Install and activate

```bash
composer install
cd src/Admin && npm install && npm run build
```

Copy the `api-bridge/` folder into `wp-content/plugins/`, then activate it in WP Admin.

### 2. Enter your API key

Go to **WP Admin → The API Bridge** and enter:
- Your API Key
- The API Base URL (e.g. `https://api.example.com/v1`)

### 3. Call your API from PHP

```php
use ApiBridge\Services\SecureApiClient;

$client = new SecureApiClient();

// GET /users — API key is injected automatically
$users = $client->get('/users');

// POST /items — same deal
$result = $client->post('/items', ['name' => 'New Thing']);
```

### 4. Call your API from JavaScript via the proxy

The `ProxyController` exposes authenticated proxy routes — your frontend never sees the key:

```js
// JS (React / Next.js / plain fetch)
// GET wp-json/api-bridge/v1/proxy/users → forwards to {api_base_url}/users
const res  = await apiFetch({ path: '/api-bridge/v1/proxy/users' });

// POST wp-json/api-bridge/v1/proxy/items
const item = await apiFetch({
  path:   '/api-bridge/v1/proxy/items',
  method: 'POST',
  data:   { name: 'New Thing' },
});
```

### 5. Loosen proxy permissions (optional)

By default, the proxy requires `manage_options`. To make an endpoint public:

```php
// In ProxyController.php, override check_permission():
public function check_permission() {
    return true; // ⚠️ Only do this for endpoints that don't expose sensitive data
}
```

---

## PHP → JS reference

| PHP (this plugin)                   | JS equivalent                                      |
|-------------------------------------|-----------------------------------------------------|
| `SecureApiClient->get('/users')`    | `axios.get('/users')` with auth header              |
| `Settings->get('api_key')`         | `process.env.API_KEY`                              |
| `Settings->cache_set($key, $val)`  | `cache.set(key, val, { ttl: 300 })`               |
| `ProxyController->proxy_get()`     | Express proxy middleware (`http-proxy-middleware`)  |
| `wp_create_nonce('wp_rest')`       | CSRF token / JWT                                   |

---

## Adding more external APIs

Extend `SecureApiClient` or create sibling classes in `Services/`:

```php
namespace ApiBridge\Services;

class StripeClient extends HttpClient {
    public function __construct() {
        $settings = new \ApiBridge\Models\Settings();
        $this->set_base_url('https://api.stripe.com/v1')
             ->with_header('Authorization', 'Bearer ' . $settings->get('stripe_key'));
    }
}
```

Then add `stripe_key` to `config.json` and re-run the scaffolder for the settings UI.

---

## Requirements

- PHP 8.0+
- WordPress 6.0+
- Composer (for PSR-4 autoloading)
- Node 16+ + npm (for the React settings page)
