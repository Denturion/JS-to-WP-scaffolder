'use strict';

const path = require('path');
const fs = require('fs-extra');
const Handlebars = require('handlebars');
const chalk = require('chalk');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/**
 * Generate all plugin files from Handlebars templates.
 *
 * @param {object} config    - Enriched plugin config
 * @param {string} outputDir - Absolute destination directory
 * @param {object} options   - CLI options: { dryRun }
 */
async function generatePlugin(config, outputDir, options = {}) {
  const { dryRun } = options;
  const files = buildFileManifest(config);

  for (const { template, output } of files) {
    const templatePath = path.join(TEMPLATES_DIR, template);
    const outputPath = path.join(outputDir, output);

    if (!fs.existsSync(templatePath)) {
      console.warn(chalk.yellow('  [skip] ') + `Template not found: ${template}`);
      continue;
    }

    const templateSrc = fs.readFileSync(templatePath, 'utf8');
    const compiled = Handlebars.compile(templateSrc, { noEscape: true });
    const content = compiled(config);

    if (dryRun) {
      console.log(chalk.dim('  [dry-run] ') + output);
    } else {
      fs.ensureDirSync(path.dirname(outputPath));
      fs.writeFileSync(outputPath, content, 'utf8');
      console.log(chalk.green('  [created] ') + output);
    }
  }

  // Scaffold empty-but-present directories (templates/, assets/)
  const placeholderDirs = ['templates', 'assets'];
  for (const dir of placeholderDirs) {
    const keepFile = path.join(outputDir, dir, '.gitkeep');
    if (dryRun) {
      console.log(chalk.dim('  [dry-run] ') + `${dir}/.gitkeep`);
    } else {
      fs.ensureDirSync(path.join(outputDir, dir));
      fs.writeFileSync(keepFile, '');
      console.log(chalk.green('  [created] ') + `${dir}/.gitkeep`);
    }
  }
}

/**
 * Build the ordered list of { template, output } pairs based on active features.
 * Add entries here when you add a new template file.
 *
 * @param {object} config
 * @returns {Array<{template: string, output: string}>}
 */
function buildFileManifest(config) {
  const { features = {}, plugin } = config;

  // Always-generated core files
  const files = [
    {
      template: 'plugin-entry.php.hbs',
      output: `${plugin.slug}.php`,
    },
    {
      template: 'Plugin.php.hbs',
      output: 'src/Plugin.php',
    },
    {
      template: 'composer.json.hbs',
      output: 'composer.json',
    },
    {
      template: 'Models/Settings.php.hbs',
      output: 'src/Models/Settings.php',
    },
    {
      template: 'Services/HttpClient.php.hbs',
      output: 'src/Services/HttpClient.php',
    },
  ];

  // Feature-gated files
  if (features.adminMenu) {
    files.push({
      template: 'Hooks/AdminInit.php.hbs',
      output: 'src/Hooks/AdminInit.php',
    });
  }

  if (features.restApi) {
    files.push({
      template: 'Api/SettingsController.php.hbs',
      output: 'src/Api/SettingsController.php',
    });
  }

  if (features.settingsPage) {
    files.push(
      {
        template: 'Admin/src/index.js.hbs',
        output: 'src/Admin/src/index.js',
      },
      {
        template: 'Admin/src/App.jsx.hbs',
        output: 'src/Admin/src/App.jsx',
      },
      {
        template: 'Admin/src/index.css.hbs',
        output: 'src/Admin/src/index.css',
      },
      {
        template: 'Admin/package.json.hbs',
        output: 'src/Admin/package.json',
      }
    );
  }

  return files;
}

module.exports = { generatePlugin };
