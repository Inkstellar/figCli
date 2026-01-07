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
    backgroundColor?: { r: number; g: number; b: number; a: number };
    fills?: any[];
    strokes?: any[];
    effects?: any[];
    cornerRadius?: number;
    children?: FigmaNode[];
    characters?: string;
    style?: any;
    layoutMode?: string;
    primaryAxisSizingMode?: string;
    counterAxisSizingMode?: string;
    primaryAxisAlignItems?: string;
    counterAxisAlignItems?: string;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    itemSpacing?: number;
    layoutAlign?: string;
    layoutGrow?: number;
    opacity?: number;
}

export async function generateReactComponentWithAI(
    figmaNode: FigmaNode,
    framework: string,
    componentName: string,
    additionalPrompt: string,
    aiModel: string
): Promise<string> {
    const systemPrompt = `You are an expert React developer specializing in converting Figma designs to production-ready React components. 
Generate clean, maintainable, and properly typed React components based on Figma design data.

Framework preferences:
- mui-tsx: Use Material-UI (MUI) with TypeScript
- mui-jsx: Use Material-UI (MUI) with JavaScript
- vanilla-jsx: Use plain React with inline styles (TypeScript)
- styled-components: Use styled-components library

Important guidelines:
1. Generate ONLY the component code, no explanations
2. Use proper TypeScript types when applicable
3. Follow React best practices
4. Use semantic HTML
5. Implement responsive design where appropriate
6. Match the Figma design's layout, spacing, colors, and typography as closely as possible
7. Use flexbox/grid for layouts that have auto-layout properties
8. Extract reusable styles and patterns`;

    const userPrompt = `Convert this Figma component to a React component:

Component Name: ${componentName}
Framework: ${framework}

Figma Component Data:
${JSON.stringify(figmaNode, null, 2)}

${additionalPrompt ? `Additional Requirements:\n${additionalPrompt}\n` : ''}

Generate a complete, production-ready React component. Include all necessary imports and proper structure.`;

    try {
        const response = await fetch('http://localhost:5000/api/proxy/openai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: aiModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.7,
                max_tokens: 4000,
                username: 'cascade-cli-user',
                playbook_id: null,
            }),
        });

        if (!response.ok) {
            let errorData: any = {};
            try { 
                errorData = await response.json(); 
            } catch { 
                /* ignore parse errors */ 
            }
            const parts = [
                errorData.message || `Upstream error ${response.status} ${response.statusText}`,
                errorData.activityId ? `activityId: ${errorData.activityId}` : null,
            ].filter(Boolean);
            throw new Error(parts.join(' | '));
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response from AI model');
        }

        let componentCode = data.choices[0].message.content || '';

        // Extract code from markdown code blocks if present
        const codeBlockMatch = componentCode.match(/```(?:typescript|tsx|jsx|javascript)?\n([\s\S]*?)\n```/);
        if (codeBlockMatch) {
            componentCode = codeBlockMatch[1];
        }

        return componentCode.trim();

    } catch (error) {
        throw new Error(`Failed to generate component with AI: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function sanitizeComponentName(name: string): string {
    // Convert to PascalCase and remove invalid characters
    return name
        .split(/[\s-_/]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('')
        .replace(/[^a-zA-Z0-9]/g, '') || 'Component';
}

function rgbaToString(color: { r: number; g: number; b: number; a: number }): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    if (color.a < 1) {
        return `rgba(${r}, ${g}, ${b}, ${color.a})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
}

function getStyleFromNode(node: FigmaNode): any {
    const style: any = {};

    if (node.absoluteBoundingBox) {
        style.width = `${node.absoluteBoundingBox.width}px`;
        style.height = `${node.absoluteBoundingBox.height}px`;
    }

    // Background color
    if (node.backgroundColor) {
        style.backgroundColor = rgbaToString(node.backgroundColor);
    }

    // Fills
    if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
        const fill = node.fills[0];
        if (fill.visible !== false && fill.type === 'SOLID' && fill.color) {
            const color = fill.opacity !== undefined 
                ? { ...fill.color, a: fill.opacity }
                : { ...fill.color, a: 1 };
            style.backgroundColor = rgbaToString(color);
        }
    }

    // Border radius
    if (node.cornerRadius) {
        style.borderRadius = `${node.cornerRadius}px`;
    }

    // Strokes (borders)
    if (node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0) {
        const stroke = node.strokes[0];
        if (stroke.visible !== false && stroke.type === 'SOLID' && stroke.color) {
            style.border = `1px solid ${rgbaToString({ ...stroke.color, a: 1 })}`;
        }
    }

    // Opacity
    if (node.opacity !== undefined && node.opacity < 1) {
        style.opacity = node.opacity;
    }

    // Layout properties (Flexbox/Auto-layout)
    if (node.layoutMode) {
        style.display = 'flex';
        style.flexDirection = node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';

        if (node.primaryAxisAlignItems) {
            const alignMap: any = {
                'MIN': 'flex-start',
                'CENTER': 'center',
                'MAX': 'flex-end',
                'SPACE_BETWEEN': 'space-between'
            };
            style.justifyContent = alignMap[node.primaryAxisAlignItems] || 'flex-start';
        }

        if (node.counterAxisAlignItems) {
            const alignMap: any = {
                'MIN': 'flex-start',
                'CENTER': 'center',
                'MAX': 'flex-end'
            };
            style.alignItems = alignMap[node.counterAxisAlignItems] || 'flex-start';
        }

        if (node.paddingLeft) style.paddingLeft = `${node.paddingLeft}px`;
        if (node.paddingRight) style.paddingRight = `${node.paddingRight}px`;
        if (node.paddingTop) style.paddingTop = `${node.paddingTop}px`;
        if (node.paddingBottom) style.paddingBottom = `${node.paddingBottom}px`;

        if (node.itemSpacing) {
            style.gap = `${node.itemSpacing}px`;
        }
    }

    // Layout grow/shrink for child elements
    if (node.layoutGrow !== undefined && node.layoutGrow > 0) {
        style.flexGrow = node.layoutGrow;
    }

    // Text styles
    if (node.type === 'TEXT' && node.style) {
        if (node.style.fontSize) style.fontSize = `${node.style.fontSize}px`;
        if (node.style.fontFamily) style.fontFamily = node.style.fontFamily;
        if (node.style.fontWeight) style.fontWeight = node.style.fontWeight;
        if (node.style.letterSpacing) style.letterSpacing = `${node.style.letterSpacing}px`;
        if (node.style.lineHeightPx) style.lineHeight = `${node.style.lineHeightPx}px`;
        if (node.style.textAlignHorizontal) {
            const alignMap: any = {
                'LEFT': 'left',
                'CENTER': 'center',
                'RIGHT': 'right',
                'JUSTIFIED': 'justify'
            };
            style.textAlign = alignMap[node.style.textAlignHorizontal] || 'left';
        }
    }

    return style;
}

function generateJSXFromNode(node: FigmaNode, depth: number = 0): string {
    const indent = '  '.repeat(depth);
    const style = getStyleFromNode(node);
    const styleString = JSON.stringify(style, null, 2)
        .split('\n')
        .map((line, i) => i === 0 ? line : '  '.repeat(depth + 1) + line)
        .join('\n');

    // Handle text nodes
    if (node.type === 'TEXT' && node.characters) {
        return `${indent}<div style={${styleString}}>\n${indent}  {${JSON.stringify(node.characters)}}\n${indent}</div>`;
    }

    // Handle nodes with children
    if (node.children && node.children.length > 0) {
        const childrenJSX = node.children
            .map(child => generateJSXFromNode(child, depth + 1))
            .join('\n');
        return `${indent}<div style={${styleString}}>\n${childrenJSX}\n${indent}</div>`;
    }

    // Handle leaf nodes (no children, no text)
    return `${indent}<div style={${styleString}} />`;
}

export function generateReactComponent(
    figmaNode: FigmaNode, 
    framework: string = 'vanilla-jsx',
    componentName?: string,
    additionalPrompt?: string
): string {
    const finalComponentName = componentName || sanitizeComponentName(figmaNode.name);
    const jsx = generateJSXFromNode(figmaNode, 2);

    switch (framework) {
        case 'mui-tsx':
            return generateMUITSX(finalComponentName, jsx, additionalPrompt);
        case 'mui-jsx':
            return generateMUIJSX(finalComponentName, jsx, additionalPrompt);
        case 'styled-components':
            return generateStyledComponents(finalComponentName, jsx, additionalPrompt);
        case 'vanilla-jsx':
        default:
            return generateVanillaJSX(finalComponentName, jsx, additionalPrompt);
    }
}

function generateMUITSX(componentName: string, jsx: string, additionalPrompt?: string): string {
    const prompt = additionalPrompt ? `\n// ${additionalPrompt}` : '';
    return `import React from 'react';
import { Box, BoxProps } from '@mui/material';
${prompt}
interface ${componentName}Props extends BoxProps {
  className?: string;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ className, ...props }) => {
  return (
    <Box className={className} {...props}>
${jsx}
    </Box>
  );
};

export default ${componentName};
`;
}

function generateMUIJSX(componentName: string, jsx: string, additionalPrompt?: string): string {
    const prompt = additionalPrompt ? `\n// ${additionalPrompt}` : '';
    return `import React from 'react';
import { Box } from '@mui/material';
${prompt}
export const ${componentName} = ({ className, ...props }) => {
  return (
    <Box className={className} {...props}>
${jsx}
    </Box>
  );
};

export default ${componentName};
`;
}

function generateStyledComponents(componentName: string, jsx: string, additionalPrompt?: string): string {
    const prompt = additionalPrompt ? `\n// ${additionalPrompt}` : '';
    return `import React from 'react';
import styled from 'styled-components';
${prompt}
const Container = styled.div\`
  /* Add your styles here */
\`;

export const ${componentName} = ({ className }) => {
  return (
    <Container className={className}>
${jsx}
    </Container>
  );
};

export default ${componentName};
`;
}

function generateVanillaJSX(componentName: string, jsx: string, additionalPrompt?: string): string {
    const prompt = additionalPrompt ? `\n// ${additionalPrompt}` : '';
    return `import React from 'react';
${prompt}
interface ${componentName}Props {
  className?: string;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ className }) => {
  return (
    <div className={className}>
${jsx}
    </div>
  );
};

export default ${componentName};
`;
}
