"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReactComponent = generateReactComponent;
function sanitizeComponentName(name) {
    // Convert to PascalCase and remove invalid characters
    return name
        .split(/[\s-_/]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('')
        .replace(/[^a-zA-Z0-9]/g, '') || 'Component';
}
function rgbaToString(color) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    if (color.a < 1) {
        return `rgba(${r}, ${g}, ${b}, ${color.a})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
}
function getStyleFromNode(node) {
    const style = {};
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
            const alignMap = {
                'MIN': 'flex-start',
                'CENTER': 'center',
                'MAX': 'flex-end',
                'SPACE_BETWEEN': 'space-between'
            };
            style.justifyContent = alignMap[node.primaryAxisAlignItems] || 'flex-start';
        }
        if (node.counterAxisAlignItems) {
            const alignMap = {
                'MIN': 'flex-start',
                'CENTER': 'center',
                'MAX': 'flex-end'
            };
            style.alignItems = alignMap[node.counterAxisAlignItems] || 'flex-start';
        }
        if (node.paddingLeft)
            style.paddingLeft = `${node.paddingLeft}px`;
        if (node.paddingRight)
            style.paddingRight = `${node.paddingRight}px`;
        if (node.paddingTop)
            style.paddingTop = `${node.paddingTop}px`;
        if (node.paddingBottom)
            style.paddingBottom = `${node.paddingBottom}px`;
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
        if (node.style.fontSize)
            style.fontSize = `${node.style.fontSize}px`;
        if (node.style.fontFamily)
            style.fontFamily = node.style.fontFamily;
        if (node.style.fontWeight)
            style.fontWeight = node.style.fontWeight;
        if (node.style.letterSpacing)
            style.letterSpacing = `${node.style.letterSpacing}px`;
        if (node.style.lineHeightPx)
            style.lineHeight = `${node.style.lineHeightPx}px`;
        if (node.style.textAlignHorizontal) {
            const alignMap = {
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
function generateJSXFromNode(node, depth = 0) {
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
function generateReactComponent(figmaNode, framework = 'vanilla-jsx', componentName, additionalPrompt) {
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
function generateMUITSX(componentName, jsx, additionalPrompt) {
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
function generateMUIJSX(componentName, jsx, additionalPrompt) {
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
function generateStyledComponents(componentName, jsx, additionalPrompt) {
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
function generateVanillaJSX(componentName, jsx, additionalPrompt) {
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
