#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const path = require('path');
const chalk = require('chalk');
const { scaffold } = require('../src/index');

const pkg = require('../package.json');

program
  .name('wp-scaffold')
  .description('Generate modern OOP WordPress plugins from a JSON config\n\nJS-to-WP Scaffolder bridges Node.js conventions to WordPress/PHP patterns.')
  .version(pkg.version)
  .argument('<config>', 'Path to the plugin config JSON file')
  .option('-o, --output <dir>', 'Output directory (defaults to config file\'s directory)', '.')
  .option('--dry-run', 'Preview generated files without writing to disk')
  .action(async (configPath, options) => {
    try {
      const resolvedConfigPath = path.resolve(process.cwd(), configPath);
      await scaffold(resolvedConfigPath, options);
    } catch (err) {
      console.error(chalk.red('\n  Error: ') + err.message + '\n');
      process.exit(1);
    }
  });

program.parse();
