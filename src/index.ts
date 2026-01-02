#!/usr/bin/env node
import { Command } from 'commander';
import { loadCommands as loadGithubCommands } from './commands/github';
import { loadCommands as loadFigmaCommands } from './commands/figma';

const program = new Command();
program
    .name('typescript-cli-tool')
    .description('A powerful CLI tool built with TypeScript')
    .version('1.0.0');

// loadGithubCommands(program);
loadFigmaCommands(program);

program.parse(process.argv);
