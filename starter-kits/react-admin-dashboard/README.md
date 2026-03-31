# The React Admin

**A full-screen React dashboard inside WP Admin. Feels nothing like WordPress.**

Built with `@wordpress/scripts` + Tailwind CSS. The WP admin chrome is still there (sidebar, top bar), but your content area is 100% React — no WP template files, no PHP views, no legacy jQuery widgets.

If you've ever wished you could just `npx create-react-app` your way into a WordPress admin page, this is it.

---

## What's inside

```
react-admin-dashboard/
├── src/
│   ├── Plugin.php                      # Singleton bootstrap
│   ├── Api/
│   │   └── SettingsController.php      # REST settings API
│   ├── Models/
│   │   └── Settings.php               # Options DB layer
│   └── Hooks/
│       └── AdminInit.php              # Enqueues the React bundle, renders <div id="root">
└── src/Admin/                         # React app
    ├── tailwind.config.js             # Scoped to .react-admin-dashboard-app
    ├── postcss.config.js
    ├── package.json                   # @wordpress/scripts + tailwindcss
    └── src/
        ├── index.js                   # createRoot() mount
        ├── index.css                  # Tailwind directives + component layer
        └── App.jsx                    # Full-screen layout with sidebar nav
```

---

## Customize it in 5 minutes

### 1. Install and build

```bash
composer install
cd src/Admin
npm install
npm run build    # production
npm run start    # dev with hot reload
```

Copy the `react-admin-dashboard/` folder into `wp-content/plugins/`, then activate.

### 2. Add a panel

Open `src/Admin/src/App.jsx`. Panels are just React components — add yours to `NAV_ITEMS` and render it in the main content area:

```jsx
// 1. Add to nav
const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'settings', label: 'Settings' },
  { id: 'users',    label: 'Users' },   // ← add this
];

// 2. Create the component
function UsersPanel() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // apiFetch automatically includes WP nonce — no auth setup needed
    apiFetch({ path: '/wp/v2/users' }).then(setUsers);
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Users</h2>
      {users.map(u => <div key={u.id} className="card">{u.name}</div>)}
    </div>
  );
}

// 3. Render it in App
{ activePanel === 'users' && <UsersPanel /> }
```

### 3. Tailwind is already scoped

All Tailwind utilities are wrapped in `.react-admin-dashboard-app` via the `important` option in `tailwind.config.js`. Nothing bleeds into WP's own admin styles. Use any Tailwind class freely.

### 4. Fetch WP data

`apiFetch` handles nonce auth automatically. Use any WP REST endpoint:

```js
import apiFetch from '@wordpress/api-fetch';

// Posts
const posts = await apiFetch({ path: '/wp/v2/posts?per_page=10' });

// Custom endpoint (your own REST controller)
const data = await apiFetch({ path: '/react-admin-dashboard/v1/settings' });

// POST
const result = await apiFetch({
  path:   '/react-admin-dashboard/v1/settings',
  method: 'POST',
  data:   { dashboard_title: 'My New Title' },
});
```

### 5. Go full-screen (optional)

The React app already fills the content area. To hide the WP admin sidebar entirely, add to `index.css`:

```css
#adminmenuwrap, #adminmenuback { display: none !important; }
#wpcontent { margin-left: 0 !important; }
```

---

## Available Tailwind component classes

Defined in `src/Admin/src/index.css` under `@layer components`:

| Class           | What it looks like                         |
|-----------------|--------------------------------------------|
| `.card`         | White rounded card with subtle border      |
| `.stat-card`    | Card with stacked label + large value      |
| `.stat-value`   | Big bold number                            |
| `.stat-label`   | Small uppercase tracking label            |
| `.badge`        | Inline pill (green/yellow/red variants)    |
| `.btn-primary`  | Blue filled button                         |
| `.btn-secondary`| White/bordered button                      |

---

## PHP → JS reference

| PHP                              | JS equivalent                                         |
|----------------------------------|-------------------------------------------------------|
| `wp_localize_script()`          | `window.__INITIAL_STATE__` / `import.meta.env`        |
| `wp_create_nonce('wp_rest')`    | CSRF token                                            |
| `apiFetch.createNonceMiddleware`| `axios.interceptors.request.use(...)`                 |
| `register_rest_route()`         | `express.Router().get('/path', handler)`              |
| `add_menu_page()`               | `<Route path="/admin" component={AdminShell} />`      |

---

## Requirements

- PHP 8.0+
- WordPress 6.0+
- Composer
- Node 16+ + npm
