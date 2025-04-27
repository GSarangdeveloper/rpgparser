"use strict";
// code.ts (Updated with SVG Export)
// Main plugin logic. Needs to be compiled to code.js (e.g., using `tsc`)
// Show the UI defined in ui.html
figma.showUI(__html__, { width: 400, height: 500 }); // Adjust size as needed
// Listen for messages from the UI
figma.ui.onmessage = async (msg) => {
    if (msg.type === 'generate-json') {
        await processSelection(); // Await the async processing
    }
};
async function processSelection() {
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
    if (selectedNode.type !== 'FRAME' && selectedNode.type !== 'COMPONENT' && selectedNode.type !== 'INSTANCE') {
        figma.ui.postMessage({ type: 'error', message: `Error: Please select a Frame, Component, or Instance (selected type: ${selectedNode.type}).` });
        return;
    }
    try {
        // --- Processing ---
        const componentName = sanitizeName(selectedNode.name);
        // Await the result of the asynchronous processing
        const rootElementJson = await processNode(selectedNode);
        if (!rootElementJson) {
            figma.ui.postMessage({ type: 'error', message: 'Error: Could not process the selected node.' });
            return;
        }
        const finalJson = {
            componentName: componentName,
            description: `Component generated from Figma layer: ${selectedNode.name}`,
            rootElement: rootElementJson
        };
        const jsonString = JSON.stringify(finalJson, null, 2);
        figma.ui.postMessage({ type: 'json-generated', data: jsonString });
    }
    catch (error) {
        console.error("Error processing node:", error);
        figma.ui.postMessage({ type: 'error', message: `Error processing: ${error.message || 'Unknown error'}` });
    }
}
// --- SVG Export Helper ---
async function getSvgData(node) {
    try {
        console.log(`Attempting to export ${node.name} as SVG...`);
        const svgBytes = await node.exportAsync({ format: 'SVG' });
        const svgString = new TextDecoder().decode(svgBytes);
        console.log(`Successfully exported ${node.name} as SVG.`);
        return svgString;
    }
    catch (error) {
        console.error(`Error exporting ${node.name} (${node.id}) as SVG:`, error);
        // Optionally notify the UI about specific export failures
        // figma.ui.postMessage({ type: 'warning', message: `Could not export ${node.name} as SVG.` });
        return null; // Return null if export fails
    }
}
// Recursive function to process a Figma node and its children (now async)
async function processNode(node) {
    // Optional: Skip invisible nodes
    // if (!node.visible) {
    //     console.log(`Skipping invisible node: ${node.name}`);
    //     return null;
    // }
    const nodeType = mapFigmaTypeToJsonType(node); // Determine type early for logic
    // --- Handle SVG Export for specific types ---
    let svgString = null;
    if (nodeType === 'Icon' || nodeType === 'VectorGraphic') {
        svgString = await getSvgData(node);
        // If SVG export fails, maybe fall back to Container or skip?
        // if (!svgString) return null; // Option: Skip node if SVG fails
    }
    const jsonNode = {
        type: nodeType,
        name: sanitizeName(node.name),
        tag: svgString ? 'svg' : inferTag(node),
        styles: {},
        attributes: {},
        // children: [] // Initialize later after async processing
    };
    // --- Extract Styles (Avoid certain styles for SVG nodes) ---
    extractSizeStyles(node, jsonNode.styles); // Might still want size for wrapper
    if (!svgString) { // Only apply layout/visual styles if not embedding raw SVG
        extractLayoutStyles(node, jsonNode.styles);
        extractFillStyles(node, jsonNode.styles); // Avoid background for SVG wrapper
        extractStrokeStyles(node, jsonNode.styles);
        extractEffectStyles(node, jsonNode.styles);
        extractCornerRadiusStyles(node, jsonNode.styles);
    }
    else {
        // For SVG nodes, maybe only keep layout-related styles for a potential wrapper?
        // Example: Keep margin if needed
        // if ('margin' in calculatedStyles) jsonNode.styles.margin = calculatedStyles.margin;
    }
    extractTextStyles(node, jsonNode.styles); // Apply text styles regardless (though maybe not needed for SVG type)
    // --- Extract Content (for Text nodes) ---
    if (node.type === 'TEXT' && node.characters) {
        jsonNode.content = node.characters;
    }
    // --- Extract Attributes ---
    jsonNode.attributes.id = node.id; // Keep Figma ID
    // --- Add SVG Data if available ---
    if (svgString) {
        jsonNode.svgData = svgString;
        // Remove potentially conflicting styles if directly embedding SVG
        delete jsonNode.styles.backgroundColor;
        delete jsonNode.styles.border;
        // Keep width/height styles? Or let SVG define its own size? Often better to let SVG define.
        // delete jsonNode.styles.width;
        // delete jsonNode.styles.height;
    }
    // --- Process Children Recursively (Asynchronously) ---
    let childrenJson = [];
    if (!svgString && 'children' in node && node.children.length > 0) { // Don't process children if we embedded SVG
        // Use Promise.all to wait for all async child processing
        const childResults = await Promise.all(node.children.map(child => processNode(child)));
        // Filter out null results (e.g., invisible or skipped nodes)
        childrenJson = childResults.filter(childJson => childJson !== null);
    }
    if (childrenJson.length > 0) {
        jsonNode.children = childrenJson;
    }
    // --- Clean up empty objects/arrays ---
    if (Object.keys(jsonNode.styles).length === 0)
        delete jsonNode.styles;
    if (Object.keys(jsonNode.attributes).length === 0)
        delete jsonNode.attributes;
    if (!jsonNode.content)
        delete jsonNode.content;
    // Children are handled above
    return jsonNode;
}
// --- Helper Functions for Mapping and Extraction (Keep the previous helpers) ---
function mapFigmaTypeToJsonType(node) {
    // Prioritize Vector types for SVG export check
    if (node.type === 'VECTOR' || node.type === 'ELLIPSE' || node.type === 'POLYGON' || node.type === 'STAR' || node.type === 'LINE') {
        // Heuristic: Check name for clues like "icon"
        if (node.name.toLowerCase().includes('icon'))
            return 'Icon';
        return 'VectorGraphic'; // Generic vector type
    }
    // Heuristic: Check Frames/Components named like icons
    if ((node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && node.name.toLowerCase().includes('icon')) {
        return 'Icon'; // Treat frames named 'icon' as potential SVG exports
    }
    // Original mapping logic for non-vector types
    switch (node.type) {
        case 'FRAME':
        case 'COMPONENT':
        case 'INSTANCE':
        case 'GROUP':
        case 'RECTANGLE':
            if (node.name.toLowerCase().includes('button'))
                return 'Button';
            if (node.name.toLowerCase().includes('input'))
                return 'Input'; // Check before Container
            if (node.name.toLowerCase().includes('image'))
                return 'Image';
            return 'Container';
        case 'TEXT':
            if (node.name.toLowerCase().includes('link'))
                return 'Link';
            return 'Text';
        default:
            console.log(`Skipping unsupported node type: ${node.type} (${node.name})`);
            return 'Unknown'; // Or skip by returning null earlier
    }
}
function inferTag(node) {
    // Infer HTML tag based on Figma type and potentially name
    const nodeType = mapFigmaTypeToJsonType(node); // Use the mapped type
    // If it's an Icon or Vector, the tag might be handled differently (e.g., wrapper div or direct svg)
    // This function primarily infers for non-SVG elements now.
    if (nodeType === 'Icon' || nodeType === 'VectorGraphic') {
        return 'div'; // Default to a wrapper div, SVG data will be inside
    }
    switch (node.type) { // Use original Figma type for tag inference where appropriate
        case 'FRAME':
        case 'COMPONENT':
        case 'INSTANCE':
        case 'GROUP':
        case 'RECTANGLE':
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
            return 'div';
        case 'TEXT':
            const fontSize = node.fontSize;
            const fontWeight = node.fontWeight;
            if (typeof fontSize === 'number' && fontSize > 20 && typeof fontWeight === 'number' && fontWeight >= 600)
                return 'h2';
            if (typeof fontSize === 'number' && fontSize > 17 && typeof fontWeight === 'number' && fontWeight >= 600)
                return 'h3';
            if (node.name.toLowerCase().includes('label'))
                return 'label';
            if (node.name.toLowerCase().includes('legend'))
                return 'legend';
            if (node.name.toLowerCase().includes('link'))
                return 'a';
            if (node.name.toLowerCase().includes('paragraph') || node.characters.length > 100)
                return 'p';
            return 'span';
        // Removed VECTOR case as it's handled by nodeType check above
        case 'ELLIPSE':
        case 'POLYGON':
        case 'STAR':
        case 'LINE':
            return 'div'; // Treat basic shapes as divs
        default:
            return 'div';
    }
}
function extractSizeStyles(node, styles) {
    if ('width' in node)
        styles.width = `${round(node.width)}px`;
    if ('height' in node)
        styles.height = `${round(node.height)}px`;
}
function extractLayoutStyles(node, styles) {
    if ('layoutMode' in node && node.layoutMode !== 'NONE') {
        styles.display = 'flex';
        styles.flexDirection = node.layoutMode === 'VERTICAL' ? 'column' : 'row';
        if (node.primaryAxisAlignItems)
            styles.justifyContent = mapAlignItems(node.primaryAxisAlignItems);
        if (node.counterAxisAlignItems)
            styles.alignItems = mapAlignItems(node.counterAxisAlignItems);
        if (node.itemSpacing && node.itemSpacing > 0)
            styles.gap = `${round(node.itemSpacing)}px`;
    }
    const padding = {};
    if ('paddingTop' in node && node.paddingTop > 0)
        padding.top = round(node.paddingTop);
    if ('paddingBottom' in node && node.paddingBottom > 0)
        padding.bottom = round(node.paddingBottom);
    if ('paddingLeft' in node && node.paddingLeft > 0)
        padding.left = round(node.paddingLeft);
    if ('paddingRight' in node && node.paddingRight > 0)
        padding.right = round(node.paddingRight);
    if (Object.keys(padding).length > 0)
        styles.padding = formatSpacing(padding);
    if ('x' in node && 'y' in node && 'constraints' in node) {
        styles.position = 'absolute';
        styles.left = `${round(node.x)}px`;
        styles.top = `${round(node.y)}px`;
    }
}
function mapAlignItems(figmaAlign) {
    switch (figmaAlign) {
        case 'MIN': return 'flex-start';
        case 'MAX': return 'flex-end';
        case 'CENTER': return 'center';
        case 'SPACE_BETWEEN': return 'space-between';
        default: return 'flex-start';
    }
}
function formatSpacing(padding) {
    var _a, _b, _c, _d;
    const top = (_a = padding.top) !== null && _a !== void 0 ? _a : 0;
    const bottom = (_b = padding.bottom) !== null && _b !== void 0 ? _b : 0;
    const left = (_c = padding.left) !== null && _c !== void 0 ? _c : 0;
    const right = (_d = padding.right) !== null && _d !== void 0 ? _d : 0;
    if (top === bottom && left === right && top === left)
        return `${top}px`;
    if (top === bottom && left === right)
        return `${top}px ${left}px`;
    if (left === right)
        return `${top}px ${left}px ${bottom}px`;
    return `${top}px ${right}px ${bottom}px ${left}px`;
}
function extractFillStyles(node, styles) {
    if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) {
        const topFill = node.fills.find(fill => fill.visible);
        if (topFill && topFill.type === 'SOLID') {
            // Use 'color' for text nodes, 'backgroundColor' otherwise
            if (node.type === 'TEXT') {
                styles.color = formatColor(topFill.color, topFill.opacity);
            }
            else {
                styles.backgroundColor = formatColor(topFill.color, topFill.opacity);
            }
        }
        // Add gradient support if needed
    }
}
function extractStrokeStyles(node, styles) {
    if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
        const topStroke = node.strokes.find(stroke => stroke.visible);
        if (topStroke && topStroke.type === 'SOLID') {
            const weight = 'strokeWeight' in node && typeof node.strokeWeight === 'number' ? round(node.strokeWeight) : 1;
            if (weight > 0) { // Only add border if weight > 0
                styles.border = `${weight}px solid ${formatColor(topStroke.color, topStroke.opacity)}`;
            }
        }
    }
}
function extractEffectStyles(node, styles) {
    if ('effects' in node && Array.isArray(node.effects) && node.effects.length > 0) {
        const shadow = node.effects.find(eff => eff.visible && eff.type === 'DROP_SHADOW');
        const blur = node.effects.find(eff => eff.visible && eff.type === 'LAYER_BLUR');
        if (shadow && shadow.type === 'DROP_SHADOW') {
            styles.boxShadow = `${round(shadow.offset.x)}px ${round(shadow.offset.y)}px ${round(shadow.radius)}px ${formatColor(shadow.color)}`;
        }
        if (blur && blur.type === 'LAYER_BLUR') {
            styles.filter = `blur(${round(blur.radius)}px)`;
        }
    }
}
function extractCornerRadiusStyles(node, styles) {
    var _a, _b, _c, _d;
    if ('cornerRadius' in node) {
        if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
            styles.borderRadius = `${round(node.cornerRadius)}px`;
        }
        else if (typeof node.cornerRadius !== 'number' && 'topLeftRadius' in node) {
            // Handle individual radii - create shorthand if possible
            const tl = round((_a = node.topLeftRadius) !== null && _a !== void 0 ? _a : 0);
            const tr = round((_b = node.topRightRadius) !== null && _b !== void 0 ? _b : 0);
            const bl = round((_c = node.bottomLeftRadius) !== null && _c !== void 0 ? _c : 0);
            const br = round((_d = node.bottomRightRadius) !== null && _d !== void 0 ? _d : 0);
            if (tl === tr && tr === bl && bl === br && tl > 0) {
                styles.borderRadius = `${tl}px`;
            }
            else if (tl > 0 || tr > 0 || bl > 0 || br > 0) {
                // Format as 4 values if not all equal
                styles.borderRadius = `${tl}px ${tr}px ${br}px ${bl}px`;
            }
        }
    }
}
function extractTextStyles(node, styles) {
    if (node.type === 'TEXT') {
        if (node.fontSize && typeof node.fontSize === 'number')
            styles.fontSize = `${round(node.fontSize)}px`;
        if (node.fontWeight && typeof node.fontWeight === 'number')
            styles.fontWeight = node.fontWeight.toString();
        if (node.fontName && typeof node.fontName !== 'symbol')
            styles.fontFamily = node.fontName.family;
        // Correct fontStyle mapping
        if (node.fontName && typeof node.fontName !== 'symbol' && node.fontName.style) {
            const styleLower = node.fontName.style.toLowerCase();
            styles.fontStyle = styleLower.includes('italic') ? 'italic' : 'normal';
        }
        if (node.lineHeight && typeof node.lineHeight !== 'symbol' && node.lineHeight.unit !== 'AUTO') {
            styles.lineHeight = node.lineHeight.unit === 'PIXELS' ? `${round(node.lineHeight.value)}px` : `${round(node.lineHeight.value / node.fontSize * 100) / 100}`; // Unitless based on font size
        }
        if (node.textAlignHorizontal)
            styles.textAlign = node.textAlignHorizontal.toLowerCase();
        if (node.textDecoration) {
            if (node.textDecoration === 'UNDERLINE')
                styles.textDecoration = 'underline';
            if (node.textDecoration === 'STRIKETHROUGH')
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
    const a = opacity !== null && opacity !== void 0 ? opacity : ('a' in color ? color.a : 1);
    if (a === 1) {
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    else {
        return `rgba(${r}, ${g}, ${b}, ${round(a, 2)})`;
    }
}
function round(num, decimalPlaces = 0) {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(num * factor) / factor;
}
function sanitizeName(name) {
    return name
        .replace(/[^a-zA-Z0-9\s_-]/g, '') // Remove invalid chars
        .split(/[\s_-]+/) // Split by space, underscore, hyphen
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}
