#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const figma_1 = require("./commands/figma");
const program = new commander_1.Command();
program
    .name('typescript-cli-tool')
    .description('A powerful CLI tool built with TypeScript')
    .version('1.0.0');
// loadGithubCommands(program);
(0, figma_1.loadCommands)(program);
program.parse(process.argv);
