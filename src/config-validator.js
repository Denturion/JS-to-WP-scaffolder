'use strict';

const REQUIRED_PLUGIN_FIELDS = [
  'name',
  'slug',
  'namespace',
  'description',
  'version',
  'author',
  'textDomain',
];

const VALID_SETTING_TYPES = ['text', 'email', 'url', 'number', 'boolean', 'textarea'];

/**
 * Validate a plugin config object and return a result with any errors.
 *
 * @param {object} config - Raw parsed JSON config
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { valid: false, errors: ['Config must be a JSON object'] };
  }

  // --- plugin section ---
  if (!config.plugin || typeof config.plugin !== 'object') {
    errors.push('Missing required "plugin" section');
  } else {
    for (const field of REQUIRED_PLUGIN_FIELDS) {
      if (!config.plugin[field]) {
        errors.push(`plugin.${field} is required`);
      }
    }

    if (config.plugin.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(config.plugin.slug)) {
      errors.push(
        'plugin.slug must be lowercase alphanumeric words separated by hyphens (e.g. "my-plugin")'
      );
    }

    if (
      config.plugin.namespace &&
      !/^[A-Z][A-Za-z0-9]*(\\[A-Z][A-Za-z0-9]*)*$/.test(config.plugin.namespace)
    ) {
      errors.push(
        'plugin.namespace must be PascalCase (e.g. "MyPlugin" or "My\\\\SubNamespace")'
      );
    }

    if (config.plugin.version && !/^\d+\.\d+\.\d+/.test(config.plugin.version)) {
      errors.push('plugin.version must follow semver (e.g. "1.0.0")');
    }
  }

  // --- features section (optional, all boolean) ---
  if (config.features !== undefined) {
    if (typeof config.features !== 'object' || Array.isArray(config.features)) {
      errors.push('"features" must be an object');
    } else {
      const KNOWN_FEATURES = ['settingsPage', 'restApi', 'adminMenu'];
      for (const [key, value] of Object.entries(config.features)) {
        if (!KNOWN_FEATURES.includes(key)) {
          errors.push(`Unknown feature "${key}". Known features: ${KNOWN_FEATURES.join(', ')}`);
        }
        if (typeof value !== 'boolean') {
          errors.push(`features.${key} must be a boolean`);
        }
      }
    }
  }

  // --- settings array (optional) ---
  if (config.settings !== undefined) {
    if (!Array.isArray(config.settings)) {
      errors.push('"settings" must be an array');
    } else {
      const seenKeys = new Set();
      config.settings.forEach((setting, i) => {
        const prefix = `settings[${i}]`;

        if (!setting.key) {
          errors.push(`${prefix}.key is required`);
        } else {
          if (!/^[a-z_][a-z0-9_]*$/.test(setting.key)) {
            errors.push(
              `${prefix}.key must be lowercase snake_case (e.g. "api_key")`
            );
          }
          if (seenKeys.has(setting.key)) {
            errors.push(`${prefix}.key "${setting.key}" is a duplicate`);
          }
          seenKeys.add(setting.key);
        }

        if (!setting.label) {
          errors.push(`${prefix}.label is required`);
        }

        if (!setting.type) {
          errors.push(`${prefix}.type is required`);
        } else if (!VALID_SETTING_TYPES.includes(setting.type)) {
          errors.push(
            `${prefix}.type must be one of: ${VALID_SETTING_TYPES.join(', ')}`
          );
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateConfig };
