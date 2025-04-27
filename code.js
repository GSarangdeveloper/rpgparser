"use strict";
// Main plugin logic. Needs to be compiled to code.js (e.g., using `tsc`)
// Ensure you have `typescript` and `@figma/plugin-typings` installed:
// npm install --save-dev typescript @figma/plugin-typings
// Show the UI defined in ui.html
figma.showUI(__html__, { width: 400, height: 500 }); // Adjust size as needed
// Listen for messages from the UI
figma.ui.onmessage = msg => {
    if (msg.type === 'generate-json') {
        processSelection();
    }
};
function processSelection() {
    const selection = figma.currentPage.selection;
    // --- Validation ---
    if (selection.length === 0) {
        figma.ui.postMessage({ type: 'error', message: 'Error: Please select a Frame.' });
        return;
    }
    if (selection.length > 1) {
        figma.ui.postMessage({ type: 'error', message: 'Error: Please select only one Frame.' });
        return;
    }
    const selectedNode = selection[0];
    // Allow processing Frames or Components/Instances directly
    if (selectedNode.type !== 'FRAME' && selectedNode.type !== 'COMPONENT' && selectedNode.type !== 'INSTANCE') {
        figma.ui.postMessage({ type: 'error', message: `Error: Please select a Frame, Component, or Instance (selected type: ${selectedNode.type}).` });
        return;
    }
    try {
        // --- Processing ---
        const componentName = sanitizeName(selectedNode.name); // Use node name for component name
        const rootElementJson = processNode(selectedNode);
        if (!rootElementJson) {
            figma.ui.postMessage({ type: 'error', message: 'Error: Could not process the selected node.' });
            return;
        }
        const finalJson = {
            componentName: componentName,
            description: `Component generated from Figma layer: ${selectedNode.name}`,
            rootElement: rootElementJson
        };
        // Convert to string and send back to UI
        const jsonString = JSON.stringify(finalJson, null, 2); // Pretty print
        figma.ui.postMessage({ type: 'json-generated', data: jsonString });
    }
    catch (error) {
        console.error("Error processing node:", error);
        figma.ui.postMessage({ type: 'error', message: `Error: ${error.message || 'Unknown error'}` });
    }
}
// Recursive function to process a Figma node and its children
function processNode(node) {
    // Skip invisible nodes? Optional: if (!node.visible) return null;
    const jsonNode = {
        type: mapFigmaTypeToJsonType(node),
        name: sanitizeName(node.name),
        tag: inferTag(node),
        styles: {},
        attributes: {},
        children: []
    };
    // --- Extract Styles ---
    extractSizeStyles(node, jsonNode.styles);
    extractLayoutStyles(node, jsonNode.styles); // Auto Layout, padding, etc.
    extractFillStyles(node, jsonNode.styles);
    extractStrokeStyles(node, jsonNode.styles);
    extractEffectStyles(node, jsonNode.styles); // Shadows, blurs
    extractCornerRadiusStyles(node, jsonNode.styles);
    extractTextStyles(node, jsonNode.styles); // Font size, weight, etc.
    // --- Extract Content (for Text nodes) ---
    if (node.type === 'TEXT' && node.characters) {
        jsonNode.content = node.characters;
    }
    // --- Extract Attributes (Basic Example) ---
    // You might add logic here to extract specific attributes if needed,
    // e.g., component properties, export settings (though image URLs are tricky)
    jsonNode.attributes.id = node.id; // Include Figma node ID as an example attribute
    // --- Process Children Recursively ---
    if ('children' in node && node.children.length > 0) {
        for (const child of node.children) {
            const childJson = processNode(child);
            if (childJson) { // Only add if the child was processed successfully
                jsonNode.children.push(childJson);
            }
        }
    }
    // Clean up empty objects/arrays
    if (Object.keys(jsonNode.styles).length === 0)
        delete jsonNode.styles;
    if (Object.keys(jsonNode.attributes).length === 0)
        delete jsonNode.attributes;
    if (!jsonNode.content)
        delete jsonNode.content;
    if (jsonNode.children.length === 0)
        delete jsonNode.children;
    return jsonNode;
}
// --- Helper Functions for Mapping and Extraction ---
function mapFigmaTypeToJsonType(node) {
    // Basic type mapping - This needs refinement based on heuristics (naming, structure)
    switch (node.type) {
        case 'FRAME':
        case 'COMPONENT':
        case 'INSTANCE':
        case 'GROUP':
        case 'RECTANGLE':
        case 'ELLIPSE':
        case 'POLYGON':
        case 'STAR':
        case 'VECTOR': // Treat vectors often as containers or icons
        case 'LINE':
            // Heuristic: Check name for clues like "button", "input", "icon"
            if (node.name.toLowerCase().includes('button'))
                return 'Button';
            if (node.name.toLowerCase().includes('input'))
                return 'Input';
            if (node.name.toLowerCase().includes('icon'))
                return 'Icon'; // Or handle vector data
            if (node.name.toLowerCase().includes('image'))
                return 'Image'; // If it's a frame/rect used as image placeholder
            return 'Container'; // Default container type
        case 'TEXT':
            // Heuristic: Check name for clues like "label", "link"
            if (node.name.toLowerCase().includes('label'))
                return 'Text'; // Could be more specific
            if (node.name.toLowerCase().includes('link'))
                return 'Link';
            return 'Text';
        // Add cases for other types if needed (SLICE, etc. - likely skip)
        default:
            return 'Unknown'; // Or skip unsupported types
    }
}
function inferTag(node) {
    // Infer HTML tag based on Figma type and potentially name
    switch (node.type) {
        case 'FRAME':
        case 'COMPONENT':
        case 'INSTANCE':
        case 'GROUP':
        case 'RECTANGLE': // Often divs or sections
            if (node.name.toLowerCase().includes('button'))
                return 'button';
            if (node.name.toLowerCase().includes('section'))
                return 'section';
            if (node.name.toLowerCase().includes('nav'))
                return 'nav';
            if (node.name.toLowerCase().includes('header'))
                return 'header';
            if (node.name.toLowerCase().includes('footer'))
                return 'footer';
            if (node.name.toLowerCase().includes('form'))
                return 'form';
            if (node.name.toLowerCase().includes('fieldset'))
                return 'fieldset';
            return 'div'; // Default block container
        case 'TEXT':
            // Basic semantic inference
            const textNode = node;
            const fontSize = textNode.fontSize;
            const fontWeight = textNode.fontWeight;
            // Handle tag inference based on text properties
            if (fontSize !== figma.mixed && typeof fontSize === 'number' &&
                fontWeight !== figma.mixed && typeof fontWeight === 'number') {
                if (fontSize > 20 && fontWeight >= 600)
                    return 'h2'; // Example heuristic
                if (fontSize > 17 && fontWeight >= 600)
                    return 'h3'; // Example heuristic
            }
            if (node.name.toLowerCase().includes('label'))
                return 'label';
            if (node.name.toLowerCase().includes('legend'))
                return 'legend';
            if (node.name.toLowerCase().includes('link'))
                return 'a';
            if (node.name.toLowerCase().includes('paragraph') || textNode.characters.length > 100)
                return 'p'; // Longer text as paragraph
            return 'span'; // Default inline text
        case 'VECTOR': // Often used for icons
            return 'svg'; // Placeholder - actual SVG export is complex
        case 'ELLIPSE':
        case 'POLYGON':
        case 'STAR':
        case 'LINE':
            return 'div'; // Treat shapes as divs by default, styling handles appearance
        default:
            return 'div';
    }
}
function extractSizeStyles(node, styles) {
    if ('width' in node)
        styles.width = `${round(node.width)}px`;
    if ('height' in node)
        styles.height = `${round(node.height)}px`;
    // Consider adding min/max width/height if available/needed
}
function extractLayoutStyles(node, styles) {
    // --- Auto Layout ---
    if ('layoutMode' in node && node.layoutMode !== 'NONE') {
        styles.display = 'flex'; // Assume flex for Auto Layout
        styles.flexDirection = node.layoutMode === 'VERTICAL' ? 'column' : 'row';
        // Primary Axis Alignment
        if (node.primaryAxisAlignItems) {
            styles.justifyContent = mapAlignItems(node.primaryAxisAlignItems);
        }
        // Counter Axis Alignment
        if (node.counterAxisAlignItems) {
            styles.alignItems = mapAlignItems(node.counterAxisAlignItems);
        }
        // Gap
        if (node.itemSpacing && node.itemSpacing > 0) {
            styles.gap = `${round(node.itemSpacing)}px`;
        }
    }
    // --- Padding ---
    const padding = {};
    if ('paddingTop' in node && node.paddingTop > 0)
        padding.top = round(node.paddingTop);
    if ('paddingBottom' in node && node.paddingBottom > 0)
        padding.bottom = round(node.paddingBottom);
    if ('paddingLeft' in node && node.paddingLeft > 0)
        padding.left = round(node.paddingLeft);
    if ('paddingRight' in node && node.paddingRight > 0)
        padding.right = round(node.paddingRight);
    if (Object.keys(padding).length > 0) {
        styles.padding = formatSpacing(padding);
    }
    // --- Position (Absolute) ---
    // Note: This assumes parent is relative. More complex layouts need more logic.
    if ('x' in node && 'y' in node && node.parent && 'layoutMode' in node.parent && node.parent.layoutMode === 'NONE') {
        // Only apply if parent is NOT auto-layout
        if ('constraints' in node && node.constraints && node.constraints.horizontal !== 'CENTER' && node.constraints.vertical !== 'CENTER') {
            styles.position = 'absolute';
            styles.left = `${round(node.x)}px`;
            styles.top = `${round(node.y)}px`;
        }
    }
}
function mapAlignItems(figmaAlign) {
    switch (figmaAlign) {
        case 'MIN': return 'flex-start';
        case 'MAX': return 'flex-end';
        case 'CENTER': return 'center';
        case 'SPACE_BETWEEN': return 'space-between';
        case 'BASELINE': return 'baseline';
        default: return 'flex-start'; // Default
    }
}
function formatSpacing(padding) {
    var _a, _b, _c, _d;
    // Basic attempt to use shorthand CSS padding/margin
    const top = (_a = padding.top) !== null && _a !== void 0 ? _a : 0;
    const bottom = (_b = padding.bottom) !== null && _b !== void 0 ? _b : 0;
    const left = (_c = padding.left) !== null && _c !== void 0 ? _c : 0;
    const right = (_d = padding.right) !== null && _d !== void 0 ? _d : 0;
    if (top === bottom && left === right && top === left)
        return `${top}px`; // All equal
    if (top === bottom && left === right)
        return `${top}px ${left}px`; // Vertical Horiz
    if (left === right)
        return `${top}px ${left}px ${bottom}px`; // Top Horiz Bottom
    return `${top}px ${right}px ${bottom}px ${left}px`; // All four
}
function extractFillStyles(node, styles) {
    if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) {
        // Get the topmost visible fill
        const topFill = node.fills.find(fill => fill.visible);
        if (topFill) {
            if (topFill.type === 'SOLID') {
                styles.backgroundColor = formatColor(topFill.color, topFill.opacity);
            }
            // Add support for gradients if needed (more complex)
            // else if (topFill.type === 'GRADIENT_LINEAR') { ... }
        }
    }
}
function extractStrokeStyles(node, styles) {
    if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
        const topStroke = node.strokes.find(stroke => stroke.visible); // Find first visible stroke
        if (topStroke && topStroke.type === 'SOLID') {
            const weight = 'strokeWeight' in node ? round(node.strokeWeight) : 1;
            // Basic border property
            styles.border = `${weight}px solid ${formatColor(topStroke.color, topStroke.opacity)}`;
            // Could also set individual properties like borderWidth, borderColor
        }
    }
}
function extractEffectStyles(node, styles) {
    if ('effects' in node && Array.isArray(node.effects) && node.effects.length > 0) {
        // Find the first visible drop shadow or layer blur
        const shadow = node.effects.find(eff => eff.visible && eff.type === 'DROP_SHADOW');
        const blur = node.effects.find(eff => eff.visible && eff.type === 'LAYER_BLUR');
        if (shadow && shadow.type === 'DROP_SHADOW') {
            styles.boxShadow = `${round(shadow.offset.x)}px ${round(shadow.offset.y)}px ${round(shadow.radius)}px ${formatColor(shadow.color)}`;
            // Note: Spread radius not included here, add if needed: ${round(shadow.spread)}px
        }
        if (blur && blur.type === 'LAYER_BLUR') {
            styles.filter = `blur(${round(blur.radius)}px)`;
        }
        // Add other effects like inner shadow if needed
    }
}
function extractCornerRadiusStyles(node, styles) {
    if ('cornerRadius' in node) {
        if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
            styles.borderRadius = `${round(node.cornerRadius)}px`;
        }
        else if (typeof node.cornerRadius !== 'number') {
            // Handle individual corner radii (topLeftRadius, etc.) if needed
            // This requires checking if all corners are the same for shorthand
        }
    }
}
function extractTextStyles(node, styles) {
    if (node.type === 'TEXT') {
        const textNode = node;
        // Handle fontSize - could be a mixed value or a number
        if (textNode.fontSize !== figma.mixed && typeof textNode.fontSize === 'number') {
            styles.fontSize = `${round(textNode.fontSize)}px`;
        }
        // Handle fontWeight - could be a mixed value or a number
        if (textNode.fontWeight !== figma.mixed && typeof textNode.fontWeight === 'number') {
            styles.fontWeight = textNode.fontWeight.toString();
        }
        // Handle fontName
        if (textNode.fontName && textNode.fontName !== figma.mixed) {
            styles.fontFamily = textNode.fontName.family; // Basic family name
            if (textNode.fontName.style) {
                styles.fontStyle = textNode.fontName.style.toLowerCase(); // e.g., Italic
            }
        }
        // Handle lineHeight
        if (textNode.lineHeight && textNode.lineHeight !== figma.mixed &&
            'unit' in textNode.lineHeight && textNode.lineHeight.unit !== 'AUTO') {
            if (textNode.lineHeight.unit === 'PIXELS') {
                styles.lineHeight = `${round(textNode.lineHeight.value)}px`;
            }
            else {
                styles.lineHeight = `${round(textNode.lineHeight.value / 100)}`; // Convert percent to unitless
            }
        }
        if (textNode.textAlignHorizontal) {
            styles.textAlign = textNode.textAlignHorizontal.toLowerCase();
        }
        // Text color is handled by extractFillStyles
        if (textNode.textDecoration) {
            if (textNode.textDecoration === 'UNDERLINE')
                styles.textDecoration = 'underline';
            if (textNode.textDecoration === 'STRIKETHROUGH')
                styles.textDecoration = 'line-through';
        }
        // Add letterSpacing, textCase if needed
    }
}
// --- Utility Functions ---
function formatColor(color, opacity) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    let a = opacity !== null && opacity !== void 0 ? opacity : ('a' in color ? color.a : 1); // Use explicit opacity if provided, else use color's alpha
    // Ensure alpha is a number
    if (typeof a !== 'number') {
        a = 1; // Default to fully opaque if alpha is not a number
    }
    if (a === 1) {
        // Return hex if fully opaque
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    else {
        // Return rgba if transparent/translucent
        return `rgba(${r}, ${g}, ${b}, ${round(a, 2)})`;
    }
}
// Simple rounding function
function round(num, decimalPlaces = 0) {
    // Handle mixed values
    if (num === figma.mixed) {
        return 0; // Default value for mixed properties
    }
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(num * factor) / factor;
}
// Sanitize layer names to be potentially used as CSS class names or component names
// Converts to PascalCase for componentName, could add a kebab-case version for classes
function sanitizeName(name) {
    // Remove special characters, replace spaces/hyphens, convert to PascalCase
    return name
        .replace(/[^a-zA-Z0-9\s_-]/g, '') // Remove invalid chars
        .split(/[\s_-]+/) // Split by space, underscore, hyphen
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}
