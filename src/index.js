'use strict';

const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const { generatePlugin } = require('./generator');
const { validateConfig } = require('./config-validator');

/**
 * Main scaffold function.
 * Reads a config file, validates it, enriches it with derived values,
 * then delegates to the generator to write out the plugin files.
 *
 * @param {string} configPath - Absolute path to config JSON file
 * @param {object} options    - CLI options: { output, dryRun }
 */
async function scaffold(configPath, options = {}) {
  console.log(chalk.bold.blue('\n  JS-to-WP Scaffolder\n'));

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  let config;
  try {
    config = fs.readJsonSync(configPath);
  } catch (err) {
    throw new Error(`Invalid JSON in config file: ${err.message}`);
  }

  const { valid, errors } = validateConfig(config);
  if (!valid) {
    throw new Error(`Config validation failed:\n  - ${errors.join('\n  - ')}`);
  }

  config = enrichConfig(config);

  // Determine output directory: next to the config file by default
  const outputBase = options.output === '.'
    ? path.dirname(configPath)
    : path.resolve(options.output);
  const outputDir = path.join(outputBase, config.plugin.slug);

  if (options.dryRun) {
    console.log(chalk.yellow('  Dry run — no files will be written.\n'));
  }

  const activeFeatures = Object.entries(config.features || {})
    .filter(([, v]) => v)
    .map(([k]) => k);

  console.log(chalk.cyan('  Plugin:    ') + config.plugin.name);
  console.log(chalk.cyan('  Slug:      ') + config.plugin.slug);
  console.log(chalk.cyan('  Namespace: ') + config.plugin.namespace);
  console.log(chalk.cyan('  Output:    ') + outputDir);
  console.log(chalk.cyan('  Features:  ') + (activeFeatures.join(', ') || 'none'));
  console.log('');

  await generatePlugin(config, outputDir, options);

  if (!options.dryRun) {
    console.log(chalk.green.bold('\n  Plugin scaffolded successfully!\n'));
    console.log(chalk.dim('  Next steps:\n'));
    console.log(chalk.white(`    cd ${outputDir}`));
    console.log(chalk.white('    composer install'));
    if (config.features?.settingsPage) {
      console.log(chalk.white('    cd src/Admin && npm install && npm run build'));
    }
    console.log('');
  }
}

/**
 * Enrich the raw config with derived values needed by templates.
 *
 * @param {object} config
 * @returns {object}
 */
function enrichConfig(config) {
  const plugin = { ...config.plugin };

  // MY_PLUGIN_SLUG — used for PHP constants (analogous to process.env variable names)
  plugin.constantPrefix = plugin.slug.toUpperCase().replace(/-/g, '_');

  // myPluginSlugData — passed to window via wp_localize_script (analogous to window.__INITIAL_STATE__)
  plugin.jsGlobal = toCamelCase(plugin.slug) + 'Data';

  // Composer "vendor/name" slug
  plugin.author_slug = plugin.author
    ? plugin.author.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    : 'author';

  // Format setting defaults as PHP literals for use in templates
  const settings = (config.settings || []).map(setting => ({
    ...setting,
    defaultValue: formatPhpDefault(setting.default, setting.type),
  }));

  return { ...config, plugin, settings };
}

/**
 * Convert kebab-case to camelCase.
 * e.g. "my-awesome-plugin" -> "myAwesomePlugin"
 *
 * @param {string} str
 * @returns {string}
 */
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Format a JS default value as a PHP literal string.
 * e.g. false -> 'false', 3600 -> '3600', "hello" -> "'hello'"
 *
 * @param {*}      value
 * @param {string} type
 * @returns {string}
 */
function formatPhpDefault(value, type) {
  if (value === undefined || value === null) {
    return type === 'boolean' ? 'false' : "''";
  }
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'number' || type === 'integer') return String(value);
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

module.exports = { scaffold };
