// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const CONCEPT_MAP = [
  { js: 'fetch(url)',                php: 'wp_remote_get($url)' },
  { js: 'axios.post(url, data)',     php: 'wp_remote_post($url, $args)' },
  { js: 'localStorage.setItem()',    php: 'update_option($key, $value)' },
  { js: 'sessionStorage + TTL',      php: 'set_transient($key, $val, $ttl)' },
  { js: 'process.env.API_KEY',       php: "define('MY_PLUGIN_API_KEY', ...)" },
  { js: 'app.use(middleware)',        php: "add_action('admin_init', $handler)" },
  { js: 'express.Router()',          php: 'register_rest_route($namespace, ...)' },
  { js: 'module.exports = app',      php: 'Plugin::get_instance()  // singleton' },
  { js: 'window.__INITIAL_STATE__',  php: 'wp_localize_script($handle, $obj)' },
  { js: 'import from node_modules',  php: 'composer.json + PSR-4 autoload' },
];

const KITS = [
  {
    icon: '📝',
    title: 'Blog Plugin Kit',
    slug: 'blog-plugin',
    tagline: 'A complete blogging plugin with Custom Post Types, REST endpoints, and a React admin panel — all from one config.json.',
    features: [
      'Custom Post Type registration via config',
      'REST endpoints for fetching and filtering posts',
      'React admin dashboard for content management',
      'PSR-4 namespaced, Composer-ready out of the box',
    ],
  },
  {
    icon: '🔌',
    title: 'API Integration Kit',
    slug: 'api-bridge',
    tagline: 'Securely connect WordPress to any external API. Credentials stay server-side, always.',
    features: [
      'SecureApiClient auto-injects stored API key',
      'Proxy REST endpoint — your key never hits the browser',
      'Optional transient caching per request',
      'React settings page — key, base URL, timeout',
    ],
  },
  {
    icon: '🛒',
    title: 'WooCommerce Addon Kit',
    slug: 'woocommerce-addon',
    tagline: 'Extend WooCommerce without writing PHP from scratch. Custom product meta, hooks, and a React settings panel.',
    features: [
      'Custom product meta fields via OOP class',
      'WooCommerce hook handlers pre-wired',
      'REST endpoint for extended product data',
      'React settings panel for addon configuration',
    ],
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Write a config.json',
    body: 'Define your plugin name, PHP namespace, features, and settings. Same as package.json — but for a WordPress plugin.',
    code: `{
  "plugin": { "name": "My Plugin", "slug": "my-plugin",
              "namespace": "MyPlugin" },
  "features": { "settingsPage": true, "restApi": true },
  "settings": [{ "key": "api_key", "type": "text" }]
}`,
  },
  {
    n: '02',
    title: 'Run one command',
    body: 'The CLI reads your config, compiles Handlebars templates, and writes a ready-to-activate plugin folder.',
    code: `$ wp-scaffold config.json --output ./plugins

  [created] my-plugin.php
  [created] src/Plugin.php
  [created] src/Api/SettingsController.php
  [created] src/Admin/src/App.jsx
  [created] composer.json`,
  },
  {
    n: '03',
    title: 'Install deps and ship',
    body: 'Composer handles PHP autoloading. @wordpress/scripts handles the React build. Drop the folder in WordPress and activate.',
    code: `$ composer install
$ cd src/Admin && npm install && npm run build

# Copy to wp-content/plugins/ and activate.
# Done.`,
  },
];

const FAQS = [
  {
    q: "Why not just ask ChatGPT for the PHP code?",
    a: "ChatGPT gives you legacy procedural PHP — function my_plugin_init(), globals everywhere, no autoloading. It works until it doesn't, and then you're debugging code you don't understand. The scaffolder generates OOP PHP that maps directly to patterns you already know: Singleton = your module instance, PSR-4 = how Node resolves files in node_modules, hooks = middleware. The JS-analogy comments in every file mean you can actually reason about what the code does.",
  },
  {
    q: "Do I need to know PHP to use this?",
    a: "For the API Integration and React Admin templates: barely. The PHP is just wiring — configure it with JSON, and the React app is pure JSX you'll feel at home in. For the Headless Optimizer config: you'll want basic PHP comfort to add your own REST endpoints, but the pattern is identical to Express — register a route, write a callback, return data.",
  },
  {
    q: "What's different from other WP plugin boilerplates?",
    a: "Most boilerplates are written by PHP developers for PHP developers. They use WordPress conventions as the starting point. This one uses JavaScript conventions as the starting point and translates. Every file has comments mapping the WP pattern to the JS equivalent — fetch() → wp_remote_get(), not the other way around. If you've been building Node APIs, you'll read the generated code and recognise it.",
  },
  {
    q: "Is the generated code production-ready?",
    a: "Yes. PSR-4 autoloading, Singleton bootstrap, REST API routes with permission callbacks, sanitized input, escaped output. The same structural patterns used in mature plugins like WooCommerce and Yoast SEO. The React settings page uses @wordpress/components and @wordpress/api-fetch, which handle nonce auth automatically. It's free and open source — fork it, adapt it, make it your own.",
  },
  {
    q: "Why the Singleton pattern?",
    a: "WordPress loads every plugin on every PHP request. Without a Singleton, nothing stops your plugin from being instantiated multiple times — registering hooks multiple times, causing duplicate admin menu entries, double API responses. Singleton guarantees one instance per request lifecycle. It's exactly how a Node process holds a single app object for its entire lifetime.",
  },
  {
    q: "Will this work alongside WooCommerce, ACF, or other plugins?",
    a: "Yes. The generated code uses only standard WordPress APIs — add_action(), register_rest_route(), get_option(). It doesn't override core behaviour or load order. PHP namespacing prevents function name collisions. The React build uses @wordpress/scripts which is the same toolchain Gutenberg uses, so it plays nicely with the block editor.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
        <a href="#" className="font-mono text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <span className="text-green-400">⚡</span> js-to-wp
        </a>
        <nav className="flex items-center gap-6">
          <a href="#concept"  className="hidden sm:block text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Concept</a>
          <a href="#kits"     className="hidden sm:block text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Kits</a>
          <a href="#faq"      className="hidden sm:block text-sm text-zinc-400 hover:text-zinc-100 transition-colors">FAQ</a>
          <a
            href="https://github.com/Denturion/JS-to-WP-scaffolder"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://github.com/Denturion/JS-to-WP-scaffolder"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-green-400 text-zinc-950 rounded-md text-sm font-semibold hover:bg-green-300 transition-colors"
          >
            Get the kits
          </a>
        </nav>
      </div>
    </header>
  );
}

function Terminal() {
  return (
    <div className="terminal-glow">
      <div className="rounded-xl overflow-hidden border border-zinc-800 shadow-2xl shadow-black/60">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-3 text-xs text-zinc-500 font-mono">~/projects $ wp-scaffold config.json</span>
        </div>

        {/* Output */}
        <div className="bg-[#0d0d0f] p-5 font-mono text-sm leading-relaxed overflow-x-auto">
          <p className="t-line text-zinc-500">$ <span className="text-zinc-200">wp-scaffold config.json --output ./plugins</span></p>
          <p className="t-line mt-3 text-green-400 font-semibold">  JS-to-WP Scaffolder</p>
          <p className="t-line mt-2 text-zinc-500">  Plugin:    <span className="text-zinc-300">My Awesome Plugin</span></p>
          <p className="t-line text-zinc-500">  Namespace: <span className="text-zinc-300">MyAwesomePlugin</span></p>
          <p className="t-line text-zinc-500">  Features:  <span className="text-zinc-300">settingsPage, restApi, adminMenu</span></p>
          <p className="t-line mt-2 text-green-400">  [created] <span className="text-zinc-300">my-awesome-plugin.php</span></p>
          <p className="t-line text-green-400">  [created] <span className="text-zinc-300">src/Plugin.php</span></p>
          <p className="t-line text-green-400">  [created] <span className="text-zinc-300">src/Api/SettingsController.php</span></p>
          <p className="t-line text-green-400">  [created] <span className="text-zinc-300">src/Services/HttpClient.php</span></p>
          <p className="t-line text-green-400">  [created] <span className="text-zinc-300">src/Models/Settings.php</span></p>
          <p className="t-line text-green-400">  [created] <span className="text-zinc-300">src/Admin/src/App.jsx</span></p>
          <p className="t-line text-green-400">  [created] <span className="text-zinc-300">composer.json</span></p>
          <p className="t-line mt-2 text-green-400 font-semibold">  Plugin scaffolded successfully!</p>
          <p className="t-line mt-2 text-zinc-500 cursor" />
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero-bg relative pt-24 pb-32 px-6">
      <div className="relative z-10 mx-auto max-w-3xl text-center flex flex-col items-center">

        {/* Eyebrow */}
        <span className="inline-flex items-center gap-2 px-3 py-1 mb-7 rounded-full text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/60">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          For JS developers who hate WordPress PHP
        </span>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-5">
          Write WordPress plugins<br />
          <span className="text-green-400">like Node.js code.</span>
        </h1>

        {/* Subhead */}
        <p className="text-lg text-zinc-400 leading-relaxed max-w-xl mb-9">
          A CLI that generates modern, OOP WordPress plugins from a JSON config —
          PSR-4 autoloading, React settings pages, REST API controllers,
          all in patterns you already know.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 justify-center mb-14">
          <a
            href="#kits"
            className="px-5 py-2.5 bg-green-400 text-zinc-950 rounded-lg text-sm font-semibold hover:bg-green-300 transition-colors"
          >
            Browse Starter Kits →
          </a>
          <a
            href="https://github.com/Denturion/JS-to-WP-scaffolder"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-zinc-900 text-zinc-100 rounded-lg text-sm font-semibold border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
          >
            View on GitHub
          </a>
        </div>

        {/* Terminal */}
        <div className="w-full max-w-2xl mx-auto">
          <Terminal />
        </div>
      </div>
    </section>
  );
}

function Problem() {
  const pains = [
    {
      icon: '🍝',
      title: 'PHP spaghetti',
      body: 'functions.php with 400 lines of global functions. No namespacing, no modules, one bad require_once from a fatal error.',
    },
    {
      icon: '🔄',
      title: 'Permanent context switch',
      body: 'PHP for the server, jQuery for the admin, a different mental model for every layer. Nothing maps to what you know.',
    },
    {
      icon: '📚',
      title: 'WP docs are for PHP devs',
      body: "Every tutorial starts with add_action and expects you to already know what that means. There's no translation layer.",
    },
  ];

  return (
    <section className="py-20 px-6 border-t border-zinc-800/50">
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          The problem
        </p>
        <h2 className="text-center text-3xl font-bold text-white mb-12">
          You know this feeling.
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {pains.map(({ icon, title, body }) => (
            <div key={title} className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
              <span className="text-3xl mb-4 block">{icon}</span>
              <h3 className="font-semibold text-zinc-100 mb-2">{title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConceptMap() {
  return (
    <section id="concept" className="py-20 px-6 border-t border-zinc-800/50">
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          The translation
        </p>
        <h2 className="text-center text-3xl font-bold text-white mb-3">
          Your JS. Translated to WP.
        </h2>
        <p className="text-center text-zinc-400 text-sm mb-12 max-w-md mx-auto">
          Every generated file has inline comments mapping the WordPress pattern
          to the JS equivalent you already know.
        </p>

        <div className="rounded-xl overflow-hidden border border-zinc-800">
          {/* Header */}
          <div className="flex items-center gap-1.5 px-5 py-3 bg-zinc-900 border-b border-zinc-800">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-zinc-500 font-mono">concept-map.js</span>
          </div>

          {/* Table */}
          <div className="bg-[#0d0d0f] p-6 font-mono text-sm space-y-3 overflow-x-auto">
            {/* Column headers */}
            <div className="flex items-center gap-4 pb-3 border-b border-zinc-800">
              <span className="text-zinc-600 text-xs uppercase tracking-widest w-56 shrink-0">JavaScript / Node</span>
              <span className="text-zinc-600 text-xs uppercase tracking-widest w-4 shrink-0" />
              <span className="text-zinc-600 text-xs uppercase tracking-widest">WordPress / PHP</span>
            </div>
            {CONCEPT_MAP.map(({ js, php }) => (
              <div key={js} className="flex items-center gap-4 group">
                <span className="text-amber-300/90 w-56 shrink-0">{js}</span>
                <span className="text-zinc-600 w-4 shrink-0 group-hover:text-green-400 transition-colors">→</span>
                <span className="text-green-400">{php}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function KitCard({ icon, title, tagline, features }) {
  return (
    <div className="kit-card rounded-xl bg-zinc-900 border border-zinc-800 p-6">
      <div className="flex items-start justify-between mb-4">
        <span className="text-4xl">{icon}</span>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
          free
        </span>
      </div>
      <h3 className="text-lg font-bold text-white mb-1.5">{title}</h3>
      <p className="text-sm text-zinc-400 mb-5 leading-relaxed">{tagline}</p>
      <ul className="space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-zinc-400">
            <span className="text-green-400 mt-0.5 shrink-0">✓</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Kits() {
  return (
    <section id="kits" className="py-20 px-6 border-t border-zinc-800/50">
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          Starter templates
        </p>
        <h2 className="text-center text-3xl font-bold text-white mb-3">
          Free configs for common use cases.
        </h2>
        <p className="text-center text-zinc-400 text-sm mb-12 max-w-lg mx-auto">
          Drop one of these <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">config.json</code> files
          into the scaffolder and get a full plugin structure in seconds.
          All on GitHub, no strings attached.
        </p>

        <div className="grid sm:grid-cols-3 gap-5 mb-10">
          {KITS.map((kit) => (
            <KitCard key={kit.slug} {...kit} />
          ))}
        </div>

        <div className="text-center">
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href="https://github.com/Denturion/JS-to-WP-scaffolder"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-400 text-zinc-950 rounded-lg text-sm font-semibold hover:bg-green-300 transition-colors"
            >
              Get the kits →
            </a>
            <a
              href="https://buymeacoffee.com/your-username"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
              style={{ backgroundColor: '#FFDD00', color: '#1a1a1a' }}
            >
              ☕ Buy me a coffee
            </a>
          </div>
          <p className="mt-3 text-xs text-zinc-600">
            Free and open source. If it saves you time, a coffee is always appreciated.
          </p>
        </div>
      </div>
    </section>
  );
}

function StepBlock({ n, title, body, code }) {
  return (
    <div className="grid lg:grid-cols-[auto_1fr] gap-6">
      {/* Step number */}
      <div className="flex lg:flex-col items-center gap-4 lg:gap-0">
        <div className="w-10 h-10 shrink-0 rounded-lg bg-zinc-900 border border-zinc-700 text-green-400 font-mono text-sm font-bold flex items-center justify-center">
          {n}
        </div>
        <div className="hidden lg:block w-px flex-1 bg-zinc-800 mx-auto mt-3" />
      </div>

      {/* Content */}
      <div className="pb-12">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed mb-4">{body}</p>
        <pre className="rounded-lg bg-[#0d0d0f] border border-zinc-800 p-4 font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed">
          {code}
        </pre>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-6 border-t border-zinc-800/50">
      <div className="mx-auto max-w-3xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          How it works
        </p>
        <h2 className="text-center text-3xl font-bold text-white mb-16">
          Config. Command. Ship.
        </h2>

        <div>
          {STEPS.map((step, i) => (
            <StepBlock key={step.n} {...step} isLast={i === STEPS.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a }) {
  return (
    <details className="group border border-zinc-800 rounded-xl overflow-hidden">
      <summary className="flex items-center justify-between px-5 py-4 cursor-pointer">
        <span className="font-medium text-zinc-100 pr-4 text-sm sm:text-base">{q}</span>
        <span className="text-zinc-500 text-xl font-light transition-transform duration-200 group-open:rotate-45 shrink-0">
          +
        </span>
      </summary>
      <div className="px-5 pb-5 text-zinc-400 text-sm leading-relaxed border-t border-zinc-800 pt-4">
        {a}
      </div>
    </details>
  );
}

function Faq() {
  return (
    <section id="faq" className="py-20 px-6 border-t border-zinc-800/50">
      <div className="mx-auto max-w-3xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          FAQ
        </p>
        <h2 className="text-center text-3xl font-bold text-white mb-12">
          Honest answers.
        </h2>

        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <FaqItem key={q} q={q} a={a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="py-24 px-6 border-t border-zinc-800/50">
      <div className="mx-auto max-w-2xl text-center">
        {/* Subtle glow behind CTA */}
        <div className="relative inline-block">
          <div className="absolute inset-0 rounded-full bg-green-400/10 blur-3xl scale-150" />
          <span className="relative text-5xl">⚡</span>
        </div>

        <h2 className="mt-6 text-4xl font-bold text-white mb-4">
          Stop writing PHP you don&apos;t understand.
        </h2>
        <p className="text-zinc-400 text-base mb-9 leading-relaxed">
          Open source. One config file. WordPress plugins that feel like
          the Node code you write every day.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href="https://github.com/Denturion/JS-to-WP-scaffolder"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-green-400 text-zinc-950 rounded-lg font-semibold text-sm hover:bg-green-300 transition-colors"
          >
            Get the kits on GitHub →
          </a>
          <a
            href="https://buymeacoffee.com/your-username"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#FFDD00', color: '#1a1a1a' }}
          >
            ☕ Buy me a coffee
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-800/50 py-10 px-6">
      <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-mono text-sm text-zinc-500 flex items-center gap-2">
          <span className="text-green-400">⚡</span> js-to-wp-scaffolder
        </span>
        <div className="flex items-center gap-6 text-sm text-zinc-500">
          <a
            href="https://github.com/Denturion/JS-to-WP-scaffolder"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-300 transition-colors"
          >
            GitHub
          </a>
          <a href="#faq" className="hover:text-zinc-300 transition-colors">FAQ</a>
          <a href="#kits" className="hover:text-zinc-300 transition-colors">Kits</a>
        </div>
        <p className="text-xs text-zinc-600">
          Built with js-to-wp-scaffolder itself.
        </p>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Problem />
      <ConceptMap />
      <Kits />
      <HowItWorks />
      <Faq />
      <Cta />
      <Footer />
    </main>
  );
}
