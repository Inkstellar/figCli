"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCommands = loadCommands;
const node_fetch_1 = __importDefault(require("node-fetch"));
const ora_1 = __importDefault(require("ora"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const prompts_1 = require("@inquirer/prompts");
const figmaToReact_1 = require("../utils/figmaToReact");
function loadCommands(program) {
    const figmaCommand = program
        .command('figma')
        .description('Interact with the Figma API');
    figmaCommand
        .command('frames')
        .description('List all frames in a Figma file')
        .argument('<file-key>', 'Figma file key (from the URL: figma.com/file/{file-key}/...)')
        .action(async (fileKey) => {
        const figmaToken = process.env.FIGMA_TOKEN;
        if (!figmaToken) {
            console.error('Error: FIGMA_TOKEN environment variable is not set.');
            console.error('Please set your Figma personal access token as FIGMA_TOKEN environment variable.');
            console.error('Example: export FIGMA_TOKEN=your_token_here');
            console.error('Get your token at: https://www.figma.com/developers/api#authentication');
            process.exit(1);
        }
        const spinner = (0, ora_1.default)(`Fetching frames from Figma file ${fileKey}...`).start();
        try {
            const data = await figmaApiRequest(`https://api.figma.com/v1/files/${fileKey}`, figmaToken, spinner);
            spinner.succeed('Frames fetched successfully!');
            // Extract frames from the document
            const frames = extractFrames(data.document);
            if (frames.length === 0) {
                console.log('No frames found in this file.');
                return;
            }
            console.log(`\nFound ${frames.length} frame(s) in file: ${fileKey}`);
            console.log('');
            frames.forEach((frame, index) => {
                var _a, _b;
                console.log(`${index + 1}. ${frame.name}`);
                console.log(`   ID: ${frame.id}`);
                console.log(`   Size: ${((_a = frame.absoluteBoundingBox) === null || _a === void 0 ? void 0 : _a.width) || 'N/A'} x ${((_b = frame.absoluteBoundingBox) === null || _b === void 0 ? void 0 : _b.height) || 'N/A'}`);
                console.log(`   Type: ${frame.type}`);
                if (frame.backgroundColor) {
                    console.log(`   Background: ${JSON.stringify(frame.backgroundColor)}`);
                }
                console.log('');
            });
        }
        catch (error) {
            spinner.fail('Failed to fetch frames');
            console.error('Error:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    figmaCommand
        .command('frame')
        .description('Get detailed metadata for a specific frame')
        .argument('<file-key>', 'Figma file key')
        .argument('<frame-id>', 'Frame node ID (use format from URL, e.g., 7-16 or 7:16)')
        .action(async (fileKey, frameId) => {
        var _a;
        // Convert hyphenated node IDs (from URLs) to colon format (for API)
        const apiFrameId = frameId.replace(/-/g, ':');
        const figmaToken = process.env.FIGMA_TOKEN;
        if (!figmaToken) {
            console.error('Error: FIGMA_TOKEN environment variable is not set.');
            console.error('Please set your Figma personal access token as FIGMA_TOKEN environment variable.');
            console.error('Example: export FIGMA_TOKEN=your_token_here');
            console.error('Get your token at: https://www.figma.com/developers/api#authentication');
            process.exit(1);
        }
        const spinner = (0, ora_1.default)(`Fetching frame details from Figma...`).start();
        try {
            // Request with depth and geometry parameters to get full component details
            const data = await figmaApiRequest(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(apiFrameId)}&depth=100&geometry=paths`, figmaToken, spinner);
            const frame = (_a = data.nodes[apiFrameId]) === null || _a === void 0 ? void 0 : _a.document;
            spinner.succeed('Frame details fetched successfully!');
            if (!frame) {
                console.error('Error: Frame not found in the specified file.');
                process.exit(1);
            }
            // Output complete JSON of the frame
            console.log(JSON.stringify(frame, null, 2));
        }
        catch (error) {
            spinner.fail('Failed to fetch frame details');
            console.error('Error:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    figmaCommand
        .command('to-react')
        .description('Convert a Figma frame to a React component')
        .argument('<file-key>', 'Figma file key')
        .argument('<frame-id>', 'Frame node ID (use format from URL, e.g., 7-16 or 7:16)')
        .option('-o, --output <path>', 'Output file path for the React component')
        .action(async (fileKey, frameId, options) => {
        var _a;
        // Convert hyphenated node IDs (from URLs) to colon format (for API)
        const apiFrameId = frameId.replace(/-/g, ':');
        const figmaToken = process.env.FIGMA_TOKEN;
        if (!figmaToken) {
            console.error('Error: FIGMA_TOKEN environment variable is not set.');
            console.error('Please set your Figma personal access token as FIGMA_TOKEN environment variable.');
            process.exit(1);
        }
        const spinner = (0, ora_1.default)(`Fetching frame from Figma...`).start();
        try {
            // Request with depth and geometry parameters to get full component details
            const data = await figmaApiRequest(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(apiFrameId)}&depth=100&geometry=paths`, figmaToken, spinner);
            const frame = (_a = data.nodes[apiFrameId]) === null || _a === void 0 ? void 0 : _a.document;
            if (!frame) {
                spinner.fail('Frame not found in the specified file.');
                process.exit(1);
            }
            spinner.succeed('Frame fetched successfully!');
            console.log('');
            // Interactive prompts
            console.log('\x1b[1m\x1b[36m📋 Component Configuration\x1b[0m\n');
            // Step 1: Select framework
            const framework = await (0, prompts_1.select)({
                message: '\x1b[1mStep 1/3:\x1b[0m Select component framework:',
                choices: [
                    { name: 'MUI (TypeScript)', value: 'mui-tsx' },
                    { name: 'MUI (JavaScript)', value: 'mui-jsx' },
                    { name: 'Vanilla JSX', value: 'vanilla-jsx' },
                    { name: 'Styled Components', value: 'styled-components' }
                ],
                default: 'mui-tsx'
            });
            // Step 2: Get component name
            const componentName = await (0, prompts_1.input)({
                message: '\x1b[1mStep 2/3:\x1b[0m Enter component name:',
                default: frame.name.replace(/[^a-zA-Z0-9]/g, ''),
                validate: (inputValue) => {
                    if (!inputValue.trim()) {
                        return 'Component name cannot be empty';
                    }
                    if (!/^[A-Z]/.test(inputValue)) {
                        return 'Component name must start with an uppercase letter';
                    }
                    if (!/^[A-Za-z0-9]+$/.test(inputValue)) {
                        return 'Component name can only contain letters and numbers';
                    }
                    return true;
                }
            });
            // Step 3: Get additional prompt (optional)
            const additionalPrompt = await (0, prompts_1.input)({
                message: '\x1b[1mStep 3/3:\x1b[0m Additional instructions (optional):',
                default: ''
            });
            console.log('');
            const generatingSpinner = (0, ora_1.default)('Generating React component...').start();
            // Generate React component code with user preferences
            const componentCode = (0, figmaToReact_1.generateReactComponent)(frame, framework, componentName, additionalPrompt);
            // Determine output path
            let outputPath;
            if (options.output) {
                outputPath = path.resolve(options.output);
            }
            else {
                const extension = framework === 'mui-tsx' || framework === 'vanilla-jsx' ? 'tsx' : 'jsx';
                outputPath = path.resolve(`./${componentName}.${extension}`);
            }
            // Write to file
            await fs_1.promises.writeFile(outputPath, componentCode, 'utf-8');
            generatingSpinner.succeed('React component generated successfully!');
            console.log(`\n\x1b[32m✓\x1b[0m Component saved to: \x1b[36m${outputPath}\x1b[0m`);
            console.log(`\x1b[32m✓\x1b[0m Framework: \x1b[36m${framework}\x1b[0m`);
            console.log(`\x1b[32m✓\x1b[0m Component name: \x1b[36m${componentName}\x1b[0m`);
        }
        catch (error) {
            spinner.fail('Failed to generate React component');
            console.error('Error:', error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
}
async function figmaApiRequest(url, token, spinner, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (spinner) {
                if (attempt > 1) {
                    spinner.text = `Retrying... (Attempt ${attempt}/${maxRetries})`;
                }
            }
            const response = await (0, node_fetch_1.default)(url, {
                headers: {
                    'X-Figma-Token': token
                }
            });
            if (response.ok) {
                return await response.json();
            }
            if (response.status === 429) {
                const retryAfter = parseInt(response.headers.get('retry-after') || '60');
                // Cap the wait time to a maximum of 30 seconds for user experience
                const waitTime = attempt === 1 ? Math.min(retryAfter * 1000, 30000) : Math.pow(2, attempt - 1) * 1000;
                if (attempt < maxRetries) {
                    if (spinner) {
                        spinner.text = `Rate limit hit. Waiting ${Math.round(waitTime / 1000)}s before retry...`;
                    }
                    else {
                        console.log(`Rate limit hit. Retrying in ${Math.round(waitTime / 1000)} seconds... (Attempt ${attempt + 1}/${maxRetries})`);
                    }
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                else {
                    throw new Error(`Rate limit exceeded after ${maxRetries} attempts. Please wait a few minutes and try again.`);
                }
            }
            if (response.status === 404) {
                throw new Error('File not found or you do not have access to this file.');
            }
            else if (response.status === 401) {
                throw new Error('Invalid Figma token. Please check your FIGMA_TOKEN.');
            }
            else {
                throw new Error(`API request failed with status ${response.status}`);
            }
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt === maxRetries) {
                break;
            }
            // Don't retry on certain errors
            if (error instanceof Error && (error.message.includes('401') ||
                error.message.includes('404') ||
                error.message.includes('Invalid Figma token'))) {
                break;
            }
            // Exponential backoff for network errors (max 8 seconds)
            const waitTime = Math.min(Math.pow(2, attempt - 1) * 1000, 8000);
            if (spinner) {
                spinner.text = `Network error. Retrying in ${waitTime / 1000}s...`;
            }
            else {
                console.log(`Network error. Retrying in ${waitTime / 1000} seconds... (Attempt ${attempt + 1}/${maxRetries})`);
            }
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    throw lastError;
}
function extractFrames(node) {
    const frames = [];
    if (!node)
        return frames;
    // If this node is a frame, add it to the list
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        frames.push(node);
    }
    // Recursively search through children
    if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
            frames.push(...extractFrames(child));
        }
    }
    return frames;
}
