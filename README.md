# js-to-wp-scaffolder

A Node.js CLI that generates modern, OOP-based WordPress plugins from a single JSON config file — designed for developers who think in JavaScript/Node but need to ship WordPress plugins.

## The Concept

WordPress plugin development feels alien to JS developers. This tool maps familiar JS/Node patterns onto WordPress idioms so you can reason about WP code the same way you reason about a Node backend:

| JavaScript / Node          | WordPress / PHP                            |
|----------------------------|--------------------------------------------|
| `require('module')`        | `composer.json` + PSR-4 autoload           |
| Express `app.listen()`     | `Plugin::get_instance()` (singleton)       |
| `app.use(middleware)`      | `add_action('admin_init', ...)`            |
| Express Router             | `register_rest_route()` controller         |
| `fetch(url)`               | `wp_remote_get($url)`                      |
| `response.json()`          | `json_decode(wp_remote_retrieve_body(...))`|
| `localStorage.setItem()`   | `update_option()`                          |
| `sessionStorage` with TTL  | `set_transient()`                          |
| `process.env`              | `define('MY_PLUGIN_CONST', ...)`           |
| `<div id="root" />`        | `echo '<div id="plugin-admin-root"></div>'`|
| webpack dev server         | `@wordpress/scripts` (`wp-scripts start`) |
| `window.__INITIAL_STATE__` | `wp_localize_script()`                     |

---

## Generated Plugin Architecture

```
my-plugin/
├── src/
│   ├── Plugin.php                  # Main singleton entry point
│   ├── Api/
│   │   └── SettingsController.php  # REST endpoints (like Express routes)
│   ├── Services/
│   │   └── HttpClient.php          # Wraps wp_remote_get/post (like axios)
│   ├── Models/
│   │   └── Settings.php            # Wraps get_option/update_option
│   ├── Hooks/
│   │   └── AdminInit.php           # WP action/filter registrations
│   └── Admin/                      # React settings page
│       ├── src/
│       │   ├── index.js            # createRoot() mount point
│       │   └── App.jsx             # Main React component
│       └── package.json            # @wordpress/scripts setup
├── templates/                      # PHP view files
├── assets/                         # Static files
├── composer.json                   # PSR-4 autoloading
├── my-plugin.php                   # WP bootstrap (thin entry point)
└── config.json                     # Example input config
```

---

## Installation

```bash
git clone https://github.com/yourname/js-to-wp-scaffolder
cd js-to-wp-scaffolder
npm install
```

To use as a global CLI:

```bash
npm link
# or
npm install -g .
```

---

## Usage

### Basic

```bash
wp-scaffold config.json
```

Generates a plugin folder next to `config.json`, named after `plugin.slug`.

### Options

```bash
wp-scaffold <config>          # Path to your JSON config file
  -o, --output <dir>          # Output directory (defaults to config file's directory)
  --dry-run                   # Preview generated files without writing
  -V, --version               # Show version
  -h, --help                  # Show help
```

### Examples

```bash
# Generate from config, output to current directory
wp-scaffold config.json

# Output to a specific directory
wp-scaffold config.json --output ./plugins

# Preview what would be generated
wp-scaffold config.json --dry-run
```

---

## Config Schema

```jsonc
{
  "plugin": {
    "name":         "My Plugin",           // Display name
    "slug":         "my-plugin",           // Lowercase, hyphenated (used as folder name)
    "namespace":    "MyPlugin",            // PHP namespace (PascalCase)
    "description":  "What the plugin does",
    "version":      "1.0.0",
    "author":       "Your Name",
    "authorUri":    "https://yoursite.com",
    "pluginUri":    "https://yoursite.com/my-plugin",
    "textDomain":   "my-plugin",           // i18n text domain (usually matches slug)
    "minWpVersion": "6.0",
    "minPhpVersion": "8.0"
  },

  "features": {
    "settingsPage": true,   // Generate React settings page + @wordpress/scripts setup
    "restApi":      true,   // Generate REST API controller (SettingsController.php)
    "adminMenu":    true    // Generate admin menu + asset enqueuing (AdminInit.php)
  },

  "settings": [
    {
      "key":     "api_key",   // option key in the DB and REST payload
      "label":   "API Key",   // human-readable label
      "type":    "text",      // text | email | url | number | boolean | textarea
      "default": ""
    }
  ]
}
```

---

## After Scaffolding

### 1. Install PHP dependencies

```bash
cd my-plugin
composer install
```

### 2. Build the React settings page (if `settingsPage: true`)

```bash
cd src/Admin
npm install
npm run build     # production build
npm run start     # development with watch
```

### 3. Activate in WordPress

Copy the plugin folder to `wp-content/plugins/`, then activate from the WordPress admin.

---

## Scaffolder Project Structure

```
js-to-wp-scaffolder/
├── bin/
│   └── scaffold.js              # CLI entry point (Commander)
├── src/
│   ├── index.js                 # Main scaffold() function + config enrichment
│   ├── generator.js             # File manifest + Handlebars compilation
│   └── config-validator.js      # Input validation
├── templates/
│   ├── plugin-entry.php.hbs     # WP plugin header + bootstrap
│   ├── Plugin.php.hbs           # Singleton main class
│   ├── composer.json.hbs        # PSR-4 autoloader
│   ├── Api/
│   │   └── SettingsController.php.hbs
│   ├── Services/
│   │   └── HttpClient.php.hbs
│   ├── Models/
│   │   └── Settings.php.hbs
│   ├── Hooks/
│   │   └── AdminInit.php.hbs
│   └── Admin/
│       ├── src/
│       │   ├── index.js.hbs
│       │   └── App.jsx.hbs
│       └── package.json.hbs
├── config.json                  # Example input config
└── package.json
```

---

## Extending

### Adding a new template

1. Add a `.php.hbs` file to `templates/`
2. Register it in `src/generator.js` inside `buildFileManifest()`
3. Gate it on a feature flag if needed: `if (features.myFeature) { ... }`

### Available Handlebars variables

All keys from your `config.json` are available, plus these derived values computed at runtime:

| Variable                    | Example value             | Source              |
|-----------------------------|---------------------------|---------------------|
| `{{plugin.constantPrefix}}` | `MY_AWESOME_PLUGIN`       | slug → UPPER_SNAKE  |
| `{{plugin.jsGlobal}}`       | `myAwesomePluginData`     | slug → camelCase    |
| `{{plugin.author_slug}}`    | `your-name`               | author → kebab-case |
| `{{setting.defaultValue}}`  | `''` / `false` / `3600`   | PHP-formatted value |

---

## License

MIT
