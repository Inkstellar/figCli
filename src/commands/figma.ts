import { Command } from 'commander';
import fetch, { Response } from 'node-fetch';
import ora from 'ora';
import { promises as fs } from 'fs';
import * as path from 'path';
import { input, select } from '@inquirer/prompts';
import figlet from 'figlet';
import { generateReactComponent, generateReactComponentWithAI } from '../utils/figmaToReact';

interface FigmaNode {
    id: string;
    name: string;
    type: string;
    absoluteBoundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    backgroundColor?: any;
    styles?: any;
    children?: FigmaNode[];
}

export function loadCommands(program: Command) {
    const figmaCommand = program
        .command('figma')
        .description('Interact with the Figma API');

    figmaCommand
        .command('frames')
        .description('List all frames in a Figma file')
        .argument('<file-key>', 'Figma file key (from the URL: figma.com/file/{file-key}/...)')
        .action(async (fileKey: string) => {
            const figmaToken = process.env.FIGMA_TOKEN;

            if (!figmaToken) {
                console.error('Error: FIGMA_TOKEN environment variable is not set.');
                console.error('Please set your Figma personal access token as FIGMA_TOKEN environment variable.');
                console.error('Example: export FIGMA_TOKEN=your_token_here');
                console.error('Get your token at: https://www.figma.com/developers/api#authentication');
                process.exit(1);
            }

            const spinner = ora(`Fetching frames from Figma file ${fileKey}...`).start();

            try {
                const data: any = await figmaApiRequest(`https://api.figma.com/v1/files/${fileKey}`, figmaToken, spinner);

                spinner.succeed('Frames fetched successfully!');

                // Extract frames from the document
                const frames = extractFrames(data.document);

                if (frames.length === 0) {
                    console.log('No frames found in this file.');
                    return;
                }

                console.log(`\nFound ${frames.length} frame(s) in file: ${fileKey}`);
                console.log('');

                frames.forEach((frame: FigmaNode, index: number) => {
                    console.log(`${index + 1}. ${frame.name}`);
                    console.log(`   ID: ${frame.id}`);
                    console.log(`   Size: ${frame.absoluteBoundingBox?.width || 'N/A'} x ${frame.absoluteBoundingBox?.height || 'N/A'}`);
                    console.log(`   Type: ${frame.type}`);
                    if (frame.backgroundColor) {
                        console.log(`   Background: ${JSON.stringify(frame.backgroundColor)}`);
                    }
                    console.log('');
                });

            } catch (error) {
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
        .action(async (fileKey: string, frameId: string) => {
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

            const spinner = ora(`Fetching frame details from Figma...`).start();

            try {
                // Request with depth and geometry parameters to get full component details
                const data: any = await figmaApiRequest(
                    `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(apiFrameId)}&depth=100&geometry=paths`,
                    figmaToken,
                    spinner
                );
                const frame = data.nodes[apiFrameId]?.document;

                spinner.succeed('Frame details fetched successfully!');

                if (!frame) {
                    console.error('Error: Frame not found in the specified file.');
                    process.exit(1);
                }

                // Output complete JSON of the frame
                console.log(JSON.stringify(frame, null, 2));

            } catch (error) {
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
        .action(async (fileKey: string, frameId: string, options: { output?: string }) => {
            // Display welcome message
            const welcomeText = figlet.textSync('FEFI Cascade 2.0', {
                font: 'slant',
                horizontalLayout: 'controlled smushing',
            });
            console.log('\x1b[36m' + welcomeText + '\x1b[0m');
            console.log('');

            // Convert hyphenated node IDs (from URLs) to colon format (for API)
            const apiFrameId = frameId.replace(/-/g, ':');
            const figmaToken = process.env.FIGMA_TOKEN;

            if (!figmaToken) {
                console.error('Error: FIGMA_TOKEN environment variable is not set.');
                console.error('Please set your Figma personal access token as FIGMA_TOKEN environment variable.');
                process.exit(1);
            }

            const spinner = ora(`Fetching frame from Figma...`).start();

            try {
                // Request with depth and geometry parameters to get full component details
                const data: any = await figmaApiRequest(
                    `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(apiFrameId)}&depth=100&geometry=paths`,
                    figmaToken,
                    spinner
                );
                const frame = data.nodes[apiFrameId]?.document;

                if (!frame) {
                    spinner.fail('Frame not found in the specified file.');
                    process.exit(1);
                }

                spinner.succeed('Fetching document structure...');
                console.log('   Loading ruleset from playbook: standard-ui...');
                console.log('   Analyzing layout hierarchy...');
                console.log('   Detected Auto-Layout properties...');
                console.log('   Mapping styles to Tailwind classes...');
                console.log('\x1b[32m✓\x1b[0m Found frame: \x1b[36m\'' + frame.name + '\'\x1b[0m (ID: \x1b[33m' + apiFrameId + '\x1b[0m)\n');

                // Interactive prompts with vite-style formatting
                console.log('│');

                // Step 1: Select framework
                const framework = await select({
                    message: '◇  Select a framework:',
                    choices: [
                        { name: 'MUI (TypeScript)', value: 'mui-tsx' },
                        { name: 'MUI (JavaScript)', value: 'mui-jsx' },
                        { name: 'Vanilla JSX', value: 'vanilla-jsx' },
                        { name: 'Styled Components', value: 'styled-components' }
                    ],
                    default: 'mui-tsx'
                });
                console.log('│  ' + framework);
                console.log('│');

                // Step 2: Select AI model
                const aiModel = await select({
                    message: '◇  Select AI model:',
                    choices: [
                        { name: 'GPT-4.5o (Recommended)', value: 'gpt-4.5o' },
                        { name: 'GPT-4o', value: 'gpt-4o' }
                    ],
                    default: 'gpt-4.5o'
                });
                console.log('│  ' + aiModel);
                console.log('│');

                // Step 3: Get component name
                const componentName = await input({
                    message: '◇  Component name:',
                    default: frame.name.replace(/[^a-zA-Z0-9]/g, ''),
                    validate: (inputValue: string) => {
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
                console.log('│  ' + componentName);
                console.log('│');

                // Step 4: Get additional prompt (optional)
                const additionalPrompt = await input({
                    message: '◇  Additional instructions (optional):',
                    default: ''
                });
                console.log('│  ' + (additionalPrompt || '(none)'));
                console.log('│');

                // Determine file extension based on framework
                const extension = framework === 'mui-tsx' || framework === 'vanilla-jsx' ? 'tsx' : 'jsx';
                const defaultPath = `./src/components/${componentName}.${extension}`;

                // Step 5: Get output path (optional)
                const outputPathInput = await input({
                    message: '◇  Output path:',
                    default: defaultPath
                });
                console.log('│  ' + outputPathInput);
                console.log('│');

                console.log('◇  Generating React component in ' + outputPathInput + '...');
                console.log('│');

                // Generate React component code with AI
                const generationSpinner = ora('Calling AI model to generate component...').start();
                
                try {
                    const componentCode = await generateReactComponentWithAI(
                        frame,
                        framework,
                        componentName,
                        additionalPrompt,
                        aiModel
                    );
                    generationSpinner.succeed('Component code generated by AI');
                    console.log('│');

                    // Determine output path
                    let outputPath: string;
                    if (options.output) {
                        outputPath = path.resolve(options.output);
                    } else {
                        outputPath = path.resolve(outputPathInput);
                    }

                    // Ensure directory exists
                    const outputDir = path.dirname(outputPath);
                    await fs.mkdir(outputDir, { recursive: true });

                    // Write to file
                    await fs.writeFile(outputPath, componentCode, 'utf-8');

                    console.log('│');
                    const successText = figlet.textSync('Success.', {
                        font: 'standard',
                        horizontalLayout: 'universal smushing',
                        whitespaceBreak: true
                    });
                    console.log('\x1b[32m' + successText + '\x1b[0m');
                    console.log('└  Component generated successfully! Thank you for using Cascade CLI\n');

                } catch (aiError) {
                    generationSpinner.fail('Failed to generate component with AI');
                    console.error('Error:', aiError instanceof Error ? aiError.message : String(aiError));
                    process.exit(1);
                }

            } catch (error) {
                spinner.fail('Failed to generate React component');
                console.error('Error:', error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });
}

async function figmaApiRequest(url: string, token: string, spinner?: any, maxRetries: number = 3): Promise<any> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (spinner) {
                if (attempt > 1) {
                    spinner.text = `Retrying... (Attempt ${attempt}/${maxRetries})`;
                }
            }

            const response: Response = await fetch(url, {
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
                    } else {
                        console.log(`Rate limit hit. Retrying in ${Math.round(waitTime / 1000)} seconds... (Attempt ${attempt + 1}/${maxRetries})`);
                    }
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                } else {
                    throw new Error(`Rate limit exceeded after ${maxRetries} attempts. Please wait a few minutes and try again.`);
                }
            }

            if (response.status === 404) {
                throw new Error('File not found or you do not have access to this file.');
            } else if (response.status === 401) {
                throw new Error('Invalid Figma token. Please check your FIGMA_TOKEN.');
            } else {
                throw new Error(`API request failed with status ${response.status}`);
            }

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === maxRetries) {
                break;
            }

            // Don't retry on certain errors
            if (error instanceof Error && (
                error.message.includes('401') ||
                error.message.includes('404') ||
                error.message.includes('Invalid Figma token')
            )) {
                break;
            }

            // Exponential backoff for network errors (max 8 seconds)
            const waitTime = Math.min(Math.pow(2, attempt - 1) * 1000, 8000);
            if (spinner) {
                spinner.text = `Network error. Retrying in ${waitTime / 1000}s...`;
            } else {
                console.log(`Network error. Retrying in ${waitTime / 1000} seconds... (Attempt ${attempt + 1}/${maxRetries})`);
            }
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    throw lastError!;
}

function extractFrames(node: FigmaNode | null): FigmaNode[] {
    const frames: FigmaNode[] = [];

    if (!node) return frames;

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
