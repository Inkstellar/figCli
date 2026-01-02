"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCommands = loadCommands;
const node_fetch_1 = __importDefault(require("node-fetch"));
const ora_1 = __importDefault(require("ora"));
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
        .argument('<frame-id>', 'Frame node ID')
        .action(async (fileKey, frameId) => {
        var _a;
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
            const data = await figmaApiRequest(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${frameId}`, figmaToken, spinner);
            const frame = (_a = data.nodes[frameId]) === null || _a === void 0 ? void 0 : _a.document;
            spinner.succeed('Frame details fetched successfully!');
            if (!frame) {
                console.error('Error: Frame not found in the specified file.');
                process.exit(1);
            }
            console.log(`\nFrame Details: ${frame.name}`);
            console.log(`ID: ${frame.id}`);
            console.log(`Type: ${frame.type}`);
            if (frame.absoluteBoundingBox) {
                console.log(`Position: (${frame.absoluteBoundingBox.x}, ${frame.absoluteBoundingBox.y})`);
                console.log(`Size: ${frame.absoluteBoundingBox.width} x ${frame.absoluteBoundingBox.height}`);
            }
            if (frame.backgroundColor) {
                console.log(`Background Color: ${JSON.stringify(frame.backgroundColor)}`);
            }
            if (frame.styles) {
                console.log('Styles:', JSON.stringify(frame.styles, null, 2));
            }
            if (frame.children && frame.children.length > 0) {
                console.log(`\nContains ${frame.children.length} child element(s):`);
                frame.children.forEach((child, index) => {
                    console.log(`  ${index + 1}. ${child.name} (${child.type})`);
                });
            }
        }
        catch (error) {
            spinner.fail('Failed to fetch frame details');
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
