/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/extractors.ts":
/*!***************************!*\
  !*** ./src/extractors.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ComponentExtractor: () => (/* binding */ ComponentExtractor),
/* harmony export */   LayoutExtractor: () => (/* binding */ LayoutExtractor),
/* harmony export */   TokenExtractor: () => (/* binding */ TokenExtractor)
/* harmony export */ });
// FigmaDev Accelerator - Design Information Extractors
// This file contains the extractors for design tokens, layout, and component information
/**
 * Base extractor class with shared functionality
 */
class BaseExtractor {
    /**
     * Type guard to check if a node is a SceneNode
     */
    isSceneNode(node) {
        return node && typeof node === 'object' && 'type' in node;
    }
}
/**
 * TokenExtractor class for extracting design tokens from Figma document
 */
class TokenExtractor extends BaseExtractor {
    constructor() {
        super(...arguments);
        // Cache for extracted colors, typography, and spacing
        this.colors = {};
        this.typography = {};
        this.spacing = {};
    }
    /**
     * Extract design tokens from a node and its children
     */
    extractDesignTokens(node) {
        // Reset the token collections
        this.colors = {};
        this.typography = {};
        this.spacing = {};
        // Process the node hierarchy to extract tokens
        this.traverseNodeForTokens(node);
        // Organize the tokens into the DesignTokens structure
        return {
            colors: this.colors,
            typography: this.typography,
            spacing: this.spacing
        };
    }
    /**
     * Recursively traverse node tree to find tokens
     */
    traverseNodeForTokens(node) {
        // Extract tokens from this node
        this.extractColorsFromNode(node);
        this.extractTypographyFromNode(node);
        this.extractSpacingFromNode(node);
        // Process children if any
        if ('children' in node && Array.isArray(node.children)) {
            for (const child of node.children) {
                // Only process sceneNode type children
                if (this.isSceneNode(child)) {
                    this.traverseNodeForTokens(child);
                }
            }
        }
    }
    // Using isSceneNode from BaseExtractor
    /**
     * Extract color tokens from a node
     */
    extractColorsFromNode(node) {
        // Check for fills
        if ('fills' in node && node.fills && Array.isArray(node.fills)) {
            for (const fill of node.fills) {
                if (fill.type === 'SOLID' && fill.visible !== false) {
                    // Generate a name for this color
                    const name = this.getColorTokenName(node, fill);
                    // Convert color to hex or rgba
                    const solidFill = fill;
                    const colorValue = this.rgbToHex(solidFill.color.r, solidFill.color.g, solidFill.color.b);
                    // Add to colors collection if not already present
                    if (!this.colors[name]) {
                        this.colors[name] = {
                            value: colorValue,
                            type: 'color'
                        };
                    }
                }
            }
        }
        // Check for strokes
        if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
            for (const stroke of node.strokes) {
                if (stroke.type === 'SOLID' && stroke.visible !== false) {
                    // Generate a name for this color
                    const name = this.getColorTokenName(node, stroke, 'stroke');
                    // Convert color to hex or rgba
                    const solidStroke = stroke;
                    const colorValue = this.rgbToHex(solidStroke.color.r, solidStroke.color.g, solidStroke.color.b);
                    // Add to colors collection if not already present
                    if (!this.colors[name]) {
                        this.colors[name] = {
                            value: colorValue,
                            type: 'color'
                        };
                    }
                }
            }
        }
    }
    /**
     * Extract typography tokens from text nodes
     */
    extractTypographyFromNode(node) {
        if (node.type === 'TEXT') {
            // Skip if using mixed styles
            if (node.fontName === figma.mixed || node.fontSize === figma.mixed) {
                return;
            }
            // Generate a name for this typography style
            const name = this.getTypographyTokenName(node);
            // Create a typography token with optional properties
            const fontToken = {
                fontFamily: node.fontName.family,
                fontSize: `${node.fontSize}px`,
                fontWeight: this.getFontWeight(node.fontName.style)
            };
            // Add line height if available
            if (node.lineHeight !== figma.mixed && node.lineHeight.unit !== 'AUTO') {
                if (node.lineHeight.unit === 'PIXELS') {
                    fontToken.lineHeight = `${node.lineHeight.value}px`;
                }
                else if (node.lineHeight.unit === 'PERCENT') {
                    fontToken.lineHeight = (node.lineHeight.value / 100).toString();
                }
            }
            // Add letter spacing if available
            if (node.letterSpacing !== figma.mixed) {
                fontToken.letterSpacing = `${node.letterSpacing.value}px`;
            }
            // Add to typography collection if not already present
            if (!this.typography[name]) {
                this.typography[name] = fontToken;
            }
        }
    }
    /**
     * Extract spacing tokens from layout properties
     */
    extractSpacingFromNode(node) {
        // Extract spacing from auto layout
        if ('layoutMode' in node && (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL')) {
            // Extract item spacing
            if (node.itemSpacing > 0) {
                const name = `gap-${node.itemSpacing}`;
                if (!this.spacing[name]) {
                    this.spacing[name] = {
                        value: `${node.itemSpacing}px`,
                        valueInRem: `${(node.itemSpacing / 16).toFixed(2)}rem`
                    };
                }
            }
            // Extract padding values
            if (node.paddingLeft > 0 || node.paddingRight > 0 || node.paddingTop > 0 || node.paddingBottom > 0) {
                // Add individual padding values
                const paddings = [
                    { value: node.paddingLeft, name: 'padding-left' },
                    { value: node.paddingRight, name: 'padding-right' },
                    { value: node.paddingTop, name: 'padding-top' },
                    { value: node.paddingBottom, name: 'padding-bottom' }
                ];
                for (const padding of paddings) {
                    if (padding.value > 0) {
                        const name = `${padding.name}-${padding.value}`;
                        if (!this.spacing[name]) {
                            this.spacing[name] = {
                                value: `${padding.value}px`,
                                valueInRem: `${(padding.value / 16).toFixed(2)}rem`
                            };
                        }
                    }
                }
            }
        }
    }
    /**
     * Generate a name for a color token based on node and fill
     */
    getColorTokenName(node, fill, prefix = '') {
        let name = '';
        // Try to use node name as a basis
        if (node.name && node.name.trim() !== '') {
            name = node.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        }
        else {
            // Fallback to node type
            name = node.type.toLowerCase();
        }
        // Add prefix if provided
        if (prefix) {
            name = `${prefix}-${name}`;
        }
        // We need to check fill is a SolidPaint to access color property
        if (fill.type === 'SOLID') {
            const solidFill = fill;
            // Add a color descriptor based on RGB values
            const r = Math.round(solidFill.color.r * 255);
            const g = Math.round(solidFill.color.g * 255);
            const b = Math.round(solidFill.color.b * 255);
            // Determine if this is a primary color, text, background, etc.
            if (node.type === 'TEXT') {
                name = 'text-color';
            }
            else if (name.includes('background') || name.includes('bg')) {
                name = 'background';
            }
            else if (name.includes('button') || name.includes('btn')) {
                name = 'primary';
            }
            else if (r === g && g === b) {
                // Grayscale color
                if (r < 30)
                    name = 'black';
                else if (r > 240)
                    name = 'white';
                else
                    name = `gray-${r}`;
            }
        }
        return name;
    }
    /**
     * Generate a name for a typography token based on text node
     */
    getTypographyTokenName(node) {
        let name = '';
        // Skip if font size is mixed
        if (node.fontSize === figma.mixed) {
            return 'text-style';
        }
        const fontSize = node.fontSize;
        // Try to derive semantic name from node name
        const nodeName = node.name.toLowerCase();
        if (nodeName.includes('heading') || nodeName.includes('title')) {
            if (fontSize >= 32) {
                name = 'heading-1';
            }
            else if (fontSize >= 24) {
                name = 'heading-2';
            }
            else {
                name = 'heading-3';
            }
        }
        else if (nodeName.includes('body') || nodeName.includes('paragraph')) {
            name = 'body';
        }
        else if (nodeName.includes('label') || nodeName.includes('caption')) {
            name = 'label';
        }
        else if (nodeName.includes('button')) {
            name = 'button-text';
        }
        else {
            // Fallback based on size
            if (fontSize >= 32) {
                name = 'heading-1';
            }
            else if (fontSize >= 24) {
                name = 'heading-2';
            }
            else if (fontSize >= 20) {
                name = 'heading-3';
            }
            else if (fontSize >= 16) {
                name = 'body';
            }
            else {
                name = 'caption';
            }
        }
        return name;
    }
    /**
     * Convert font style string to numeric weight
     */
    getFontWeight(fontStyle) {
        const style = fontStyle.toLowerCase();
        if (style.includes('thin'))
            return 100;
        if (style.includes('extra light') || style.includes('ultralight'))
            return 200;
        if (style.includes('light'))
            return 300;
        if (style.includes('regular') || style.includes('normal'))
            return 400;
        if (style.includes('medium'))
            return 500;
        if (style.includes('semi bold') || style.includes('semibold'))
            return 600;
        if (style.includes('bold'))
            return 700;
        if (style.includes('extra bold') || style.includes('extrabold'))
            return 800;
        if (style.includes('black') || style.includes('heavy'))
            return 900;
        return 400; // Default is regular/normal
    }
    /**
     * Convert RGB values to hex color
     */
    rgbToHex(r, g, b) {
        // Convert 0-1 range to 0-255 integers
        const rInt = Math.round(r * 255);
        const gInt = Math.round(g * 255);
        const bInt = Math.round(b * 255);
        // Convert to hex string
        return `#${rInt.toString(16).padStart(2, '0')}${gInt.toString(16).padStart(2, '0')}${bInt.toString(16).padStart(2, '0')}`;
    }
}
/**
 * LayoutExtractor class for extracting layout specifications
 */
class LayoutExtractor extends BaseExtractor {
    constructor() {
        super(...arguments);
        // Collection of layout specs
        this.autoLayouts = [];
        this.breakpoints = [375, 768, 1024, 1440]; // Default common breakpoints
    }
    /**
     * Extract layout information from a node and its children
     */
    extractLayoutInfo(node) {
        // Reset layout collections
        this.autoLayouts = [];
        // Process the node hierarchy to extract layout information
        this.traverseNodeForLayouts(node);
        // Organize the information into the LayoutSpecifications structure
        return {
            responsive: {
                breakpoints: this.breakpoints
            },
            autoLayout: this.autoLayouts
        };
    }
    /**
     * Recursively traverse node tree to find layout specifications
     */
    traverseNodeForLayouts(node) {
        // Extract auto layout information
        if ('layoutMode' in node && (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL')) {
            this.extractAutoLayoutFromNode(node);
        }
        // Process children if any
        if ('children' in node && Array.isArray(node.children)) {
            for (const child of node.children) {
                // Only process sceneNode type children
                if (this.isSceneNode(child)) {
                    this.traverseNodeForLayouts(child);
                }
            }
        }
    }
    // Using isSceneNode from BaseExtractor
    /**
     * Extract auto layout information from a frame
     */
    extractAutoLayoutFromNode(node) {
        // Check if node actually has layout mode property
        if (!('layoutMode' in node))
            return;
        // Cast to a node type that has layoutMode property
        const layoutNode = node;
        // Only process if using auto layout
        if (layoutNode.layoutMode === 'NONE')
            return;
        // Create CSS properties for this layout
        const cssProperties = {
            'display': 'flex',
            'flex-direction': layoutNode.layoutMode === 'HORIZONTAL' ? 'row' : 'column'
        };
        // Add gap if defined
        if (layoutNode.itemSpacing > 0) {
            cssProperties['gap'] = `${layoutNode.itemSpacing}px`;
        }
        // Add padding if defined
        const padding = [];
        if (layoutNode.paddingTop > 0)
            padding.push(`${layoutNode.paddingTop}px`);
        if (layoutNode.paddingRight > 0)
            padding.push(`${layoutNode.paddingRight}px`);
        if (layoutNode.paddingBottom > 0)
            padding.push(`${layoutNode.paddingBottom}px`);
        if (layoutNode.paddingLeft > 0)
            padding.push(`${layoutNode.paddingLeft}px`);
        if (padding.length > 0) {
            cssProperties['padding'] = padding.join(' ');
        }
        // Add alignment properties
        if (layoutNode.primaryAxisAlignItems === 'CENTER') {
            cssProperties['justify-content'] = 'center';
        }
        else if (layoutNode.primaryAxisAlignItems === 'MAX') {
            cssProperties['justify-content'] = 'flex-end';
        }
        else if (layoutNode.primaryAxisAlignItems === 'SPACE_BETWEEN') {
            cssProperties['justify-content'] = 'space-between';
        }
        if (layoutNode.counterAxisAlignItems === 'CENTER') {
            cssProperties['align-items'] = 'center';
        }
        else if (layoutNode.counterAxisAlignItems === 'MAX') {
            cssProperties['align-items'] = 'flex-end';
        }
        // Add to layouts collection
        this.autoLayouts.push({
            direction: layoutNode.layoutMode === 'HORIZONTAL' ? 'row' : 'column',
            gap: layoutNode.itemSpacing,
            cssProperties
        });
    }
}
/**
 * ComponentExtractor class for extracting component information
 */
class ComponentExtractor extends BaseExtractor {
    constructor() {
        super(...arguments);
        // Collection of component information
        this.components = [];
    }
    /**
     * Extract component information from a node and its children
     */
    extractComponentInfo(node) {
        // Reset component collection
        this.components = [];
        // Process the node hierarchy to extract component information
        this.traverseNodeForComponents(node);
        // Organize the information into the ComponentSpecifications structure
        return {
            components: this.components
        };
    }
    /**
     * Recursively traverse node tree to find components
     */
    traverseNodeForComponents(node) {
        // Check if this is a component or component set
        if (node.type === 'COMPONENT') {
            this.extractComponentFromNode(node);
        }
        else if (node.type === 'COMPONENT_SET') {
            this.extractComponentSetFromNode(node);
        }
        // Process children if any
        if ('children' in node && Array.isArray(node.children)) {
            for (const child of node.children) {
                // Only process sceneNode type children
                if (this.isSceneNode(child)) {
                    this.traverseNodeForComponents(child);
                }
            }
        }
    }
    // Using isSceneNode from BaseExtractor
    /**
     * Extract information from a component
     */
    extractComponentFromNode(node) {
        // Get component name
        const name = this.getComponentName(node);
        // Check if this component is already in our collection
        const existingComponent = this.components.find(c => c.name === name);
        if (existingComponent) {
            return; // Already processed
        }
        // Create a simple component entry (no variants)
        this.components.push({
            name,
            properties: []
        });
    }
    /**
     * Extract information from a component set (variants)
     */
    extractComponentSetFromNode(node) {
        // Get component name (without variant info)
        const baseName = this.getComponentBaseName(node);
        // Extract variant properties
        const variantProperties = {};
        // Process all children (variants)
        for (const child of node.children) {
            if (child.type === 'COMPONENT') {
                // Skip components with no variant properties
                if (!child.name.includes('='))
                    continue;
                // Extract variant properties from name (format: "Name, prop1=value1, prop2=value2")
                const parts = child.name.split(',').map(p => p.trim());
                for (let i = 1; i < parts.length; i++) {
                    const variantPart = parts[i];
                    if (variantPart.includes('=')) {
                        const [prop, value] = variantPart.split('=').map(p => p.trim());
                        // Initialize set for this property if not exists
                        if (!variantProperties[prop]) {
                            variantProperties[prop] = new Set();
                        }
                        // Add value to the set
                        variantProperties[prop].add(value);
                    }
                }
            }
        }
        // Create component entry with variants
        const componentInfo = {
            name: baseName,
            properties: Object.entries(variantProperties).map(([name, values]) => ({
                name,
                options: Array.from(values)
            }))
        };
        // Add to components collection
        this.components.push(componentInfo);
    }
    /**
     * Get the base component name without variant information
     */
    getComponentBaseName(node) {
        // For component sets, use the set name
        if (node.type === 'COMPONENT_SET') {
            return node.name;
        }
        // For components with variant properties, extract base name
        if (node.name.includes(',')) {
            return node.name.split(',')[0].trim();
        }
        return node.name;
    }
    /**
     * Get a cleaned component name
     */
    getComponentName(node) {
        let name = '';
        // Use node name as basis
        if (node.name && node.name.trim() !== '') {
            // Extract base name (before any variant information)
            if (node.name.includes(',')) {
                name = node.name.split(',')[0].trim();
            }
            else {
                name = node.name.trim();
            }
            // Convert to PascalCase for component names
            name = name
                .replace(/[^a-zA-Z0-9 ]/g, '')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join('');
        }
        else {
            // Fallback to generic name + ID
            name = 'Component' + node.id.substring(0, 4);
        }
        return name;
    }
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*********************!*\
  !*** ./src/code.ts ***!
  \*********************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   generateAIPackage: () => (/* binding */ generateAIPackage),
/* harmony export */   generateComponentInfo: () => (/* binding */ generateComponentInfo),
/* harmony export */   generateCssCode: () => (/* binding */ generateCssCode),
/* harmony export */   generateDesignTokens: () => (/* binding */ generateDesignTokens),
/* harmony export */   generateHtmlCode: () => (/* binding */ generateHtmlCode),
/* harmony export */   generateLayoutInfo: () => (/* binding */ generateLayoutInfo)
/* harmony export */ });
/* harmony import */ var _extractors__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./extractors */ "./src/extractors.ts");
// FigmaDev Accelerator - Main Plugin Code
// This file contains the core logic for the plugin
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

// Default configuration settings
let config = {
    cssUnits: 'px',
    classNamingStrategy: 'layer-based',
    attributeCasing: 'kebab-case',
    layoutPreference: 'flexbox',
    svgExportMode: 'inline',
    extractDesignTokens: true,
    extractLayoutInfo: true,
    extractComponentInfo: true
};
// Show the UI for plugin settings
figma.ui.onmessage = (message) => {
    if (message.type === 'update-config') {
        // Update configuration settings
        config = Object.assign(Object.assign({}, config), message.config);
        figma.clientStorage.setAsync('plugin-config', config);
    }
    if (message.type === 'get-config') {
        // Send current config to UI
        figma.ui.postMessage({
            type: 'config',
            config
        });
    }
};
// Load saved configuration on startup
function initialize() {
    return __awaiter(this, void 0, void 0, function* () {
        const savedConfig = yield figma.clientStorage.getAsync('plugin-config');
        if (savedConfig) {
            config = Object.assign(Object.assign({}, config), savedConfig);
        }
        // Register for codegen events
        figma.codegen.on('generate', (event) => {
            const { language, node } = event;
            // Check if valid node is selected
            if (!node) {
                return [{ language: 'PLAINTEXT', code: "// No node selected", title: "Error" }];
            }
            // Generate code based on requested language
            switch (language) {
                case 'HTML':
                    return [{
                            language: 'HTML',
                            code: generateHtmlCode(node, config),
                            title: 'HTML'
                        }];
                case 'CSS':
                    return [{
                            language: 'CSS',
                            code: generateCssCode(node, config),
                            title: 'CSS'
                        }];
                case 'DESIGN_TOKENS':
                    return [{
                            language: 'JSON',
                            code: generateDesignTokens(node, config),
                            title: 'Design Tokens'
                        }];
                case 'LAYOUT_INFO':
                    return [{
                            language: 'JSON',
                            code: generateLayoutInfo(node, config),
                            title: 'Layout Information'
                        }];
                case 'COMPONENT_INFO':
                    return [{
                            language: 'JSON',
                            code: generateComponentInfo(node, config),
                            title: 'Component Information'
                        }];
                case 'AI_PACKAGE':
                    return [{
                            language: 'JSON',
                            code: generateAIPackage(node, config),
                            title: 'AI Design Package'
                        }];
                default:
                    return [{
                            language: 'PLAINTEXT',
                            code: "// Language not supported: " + language,
                            title: "Unsupported"
                        }];
            }
        });
    });
}
// Initialize plugin
initialize();
/**
 * Extracts design tokens (colors, typography, spacing) from the document
 */
function generateDesignTokens(node, config) {
    const processor = new _extractors__WEBPACK_IMPORTED_MODULE_0__.TokenExtractor();
    const designTokens = processor.extractDesignTokens(node);
    // Format as nicely indented JSON
    return JSON.stringify(designTokens, null, 2);
}
/**
 * Extracts layout information from the document
 */
function generateLayoutInfo(node, config) {
    const processor = new _extractors__WEBPACK_IMPORTED_MODULE_0__.LayoutExtractor();
    const layoutInfo = processor.extractLayoutInfo(node);
    // Format as nicely indented JSON
    return JSON.stringify(layoutInfo, null, 2);
}
/**
 * Extracts component information from the document
 */
function generateComponentInfo(node, config) {
    const processor = new _extractors__WEBPACK_IMPORTED_MODULE_0__.ComponentExtractor();
    const componentInfo = processor.extractComponentInfo(node);
    // Format as nicely indented JSON
    return JSON.stringify(componentInfo, null, 2);
}
/**
 * Generates a complete AI package with all design information
 */
function generateAIPackage(node, config) {
    // Create a comprehensive package with all extracted information
    const htmlProcessor = new NodeProcessor(config);
    const htmlResult = htmlProcessor.processNodeForHtml(node);
    const cssResult = htmlProcessor.processNodeForCss(node);
    const tokenExtractor = new _extractors__WEBPACK_IMPORTED_MODULE_0__.TokenExtractor();
    const designTokens = tokenExtractor.extractDesignTokens(node);
    const layoutExtractor = new _extractors__WEBPACK_IMPORTED_MODULE_0__.LayoutExtractor();
    const layoutInfo = layoutExtractor.extractLayoutInfo(node);
    const componentExtractor = new _extractors__WEBPACK_IMPORTED_MODULE_0__.ComponentExtractor();
    const componentInfo = componentExtractor.extractComponentInfo(node);
    // Combine all data
    const aiPackage = {
        html: formatHtml(htmlResult.html),
        css: formatCss(cssResult.css),
        designTokens,
        layoutSpecifications: layoutInfo,
        componentSpecifications: componentInfo
    };
    // Format as nicely indented JSON
    return JSON.stringify(aiPackage, null, 2);
}
/**
 * Generates HTML code for the selected node
 */
function generateHtmlCode(node, config) {
    // Create a node processor for HTML generation
    const processor = new NodeProcessor(config);
    const result = processor.processNodeForHtml(node);
    // Format final HTML
    return formatHtml(result.html);
}
/**
 * Generates CSS code for the selected node
 */
function generateCssCode(node, config) {
    // Create a node processor for CSS generation
    const processor = new NodeProcessor(config);
    const result = processor.processNodeForCss(node);
    // Format final CSS
    return formatCss(result.css);
}
/**
 * Helper function to format HTML code
 */
function formatHtml(html) {
    // Simple indentation for HTML
    // For a production plugin, use a proper HTML formatter
    let indentLevel = 0;
    let formattedHtml = '';
    let inTag = false;
    for (let i = 0; i < html.length; i++) {
        const char = html[i];
        if (char === '<' && html[i + 1] !== '/') {
            if (i > 0)
                formattedHtml += '\n' + '  '.repeat(indentLevel);
            indentLevel++;
            inTag = true;
        }
        else if (char === '<' && html[i + 1] === '/') {
            indentLevel--;
            if (html[i - 1] !== '>') {
                formattedHtml += '\n' + '  '.repeat(indentLevel);
            }
            inTag = true;
        }
        else if (char === '>' && inTag) {
            inTag = false;
        }
        formattedHtml += char;
    }
    return formattedHtml;
}
/**
 * Helper function to format CSS code
 */
function formatCss(css) {
    // Simple CSS formatting
    // For a production plugin, use a proper CSS formatter
    // Format media queries specially
    let formattedCss = css;
    // Handle media queries with nested rules
    formattedCss = formattedCss.replace(/@media\s*\([^)]+\)\s*\{([^}]+)\}/g, (match, contents) => {
        // Format the media query contents with additional indentation
        const formattedContents = contents
            .replace(/([^{]+)\{([^}]+)\}/g, (innerMatch, selector, props) => {
            const trimmedSelector = selector.trim();
            const formattedProps = props
                .split(';')
                .filter((prop) => prop.trim())
                .map((prop) => `    ${prop.trim()};`)
                .join('\n');
            return `  ${trimmedSelector} {\n${formattedProps}\n  }`;
        });
        // Return the formatted media query
        return `@media (${match.split('(')[1].split(')')[0]}) {\n${formattedContents}\n}`;
    });
    // Format regular CSS rules
    formattedCss = formattedCss
        .replace(/([^@].*?)\{/g, '$1 {\n  ') // Don't match media queries here
        .replace(/;(?![^{]*\})/g, ';\n  ') // Add newlines after semicolons
        .replace(/\}(?!.*\n\s*@media)/g, '\n}\n') // Add newlines after closing braces
        .replace(/\n  \n/g, '\n') // Remove empty lines with indentation
        .replace(/\s*\n\s*\n\s*\n/g, '\n\n') // Remove excessive newlines
        .trim();
    return formattedCss;
}
/**
 * Node processor class to handle the core logic of translating
 * Figma nodes to HTML/CSS
 */
class NodeProcessor {
    constructor(config) {
        this.uniqueIdCounter = 0;
        this.config = config;
        this.cssRules = new Map();
    }
    /**
     * Process a node for HTML generation
     */
    processNodeForHtml(node) {
        // Skip hidden nodes
        if ('visible' in node && !node.visible) {
            return { html: '', classNames: [] };
        }
        // Base class name derived from node name or type
        const baseClassName = this.generateClassName(node);
        const classNames = [baseClassName];
        // Variables to store HTML content and tag type
        let htmlContent = '';
        let tagName = 'div'; // Default tag name
        let attributes = {};
        // Add semantic class for accessibility and styling
        const semanticClass = this.getSemanticClass(node);
        if (semanticClass) {
            classNames.push(semanticClass);
        }
        // Handle different node types
        switch (node.type) {
            case 'TEXT':
                // Determine appropriate text tag based on context and style
                tagName = this.determineTextTag(node);
                htmlContent = this.escapeHtml(node.characters);
                this.processFontStyles(node, baseClassName);
                break;
            case 'VECTOR':
            case 'STAR':
            case 'ELLIPSE':
            case 'POLYGON':
            case 'LINE':
                // Vector nodes can become SVGs
                if (this.config.svgExportMode === 'inline') {
                    // Generate inline SVG
                    tagName = 'svg';
                    // Set SVG attributes
                    attributes['width'] = String(Math.round(node.width));
                    attributes['height'] = String(Math.round(node.height));
                    attributes['viewBox'] = `0 0 ${Math.round(node.width)} ${Math.round(node.height)}`;
                    attributes['fill'] = 'none';
                    attributes['xmlns'] = 'http://www.w3.org/2000/svg';
                    attributes['aria-hidden'] = 'true'; // Decorative SVG
                    // In a production implementation, we would use exportAsync to get SVG data
                    // For now, create a placeholder SVG with the correct dimensions
                    htmlContent = this.generatePlaceholderSvg(node);
                }
                else {
                    // External SVG - create an img tag referencing an SVG file
                    tagName = 'img';
                    attributes['src'] = `${this.sanitizeForCSS(node.name)}.svg`;
                    attributes['alt'] = ''; // Decorative image
                    attributes['width'] = String(Math.round(node.width));
                    attributes['height'] = String(Math.round(node.height));
                }
                break;
            case 'FRAME':
            case 'GROUP':
            case 'COMPONENT':
            case 'COMPONENT_SET':
            case 'INSTANCE':
                // Determine if this should be a semantic section
                tagName = this.determineContainerTag(node);
                // Process layout styles (Auto Layout -> Flexbox/Grid)
                if ('layoutMode' in node) {
                    this.processAutoLayout(node, baseClassName);
                }
                else {
                    // Use absolute positioning for non-auto-layout containers
                    this.processPosition(node, baseClassName);
                }
                // Process children if any
                if ('children' in node) {
                    const childrenHtml = [];
                    // Process each child
                    for (const child of node.children) {
                        const result = this.processNodeForHtml(child);
                        if (result.html) {
                            childrenHtml.push(result.html);
                        }
                    }
                    htmlContent = childrenHtml.join('\n');
                }
                break;
            case 'RECTANGLE':
                // Determine if this is a button, card, or regular div
                tagName = this.determineRectangleTag(node);
                // Check if rectangle has image fill
                if ('fills' in node && node.fills && Array.isArray(node.fills)) {
                    const imageFill = node.fills.find(fill => fill.type === 'IMAGE' && fill.visible !== false);
                    if (imageFill && imageFill.type === 'IMAGE') {
                        // In a real plugin, we would handle image export properly
                        // Create an img tag with proper attributes
                        tagName = 'img';
                        // Generate a descriptive image name based on the node name
                        const imageName = this.sanitizeForCSS(node.name) || 'image';
                        attributes['src'] = `images/${imageName}.png`;
                        // Add alt text for accessibility
                        attributes['alt'] = node.name || 'Image';
                        // Add loading="lazy" for performance
                        attributes['loading'] = 'lazy';
                        // Add proper dimensions
                        if ('width' in node && 'height' in node) {
                            attributes['width'] = String(Math.round(node.width));
                            attributes['height'] = String(Math.round(node.height));
                        }
                        // Handle different scale modes (Figma's scaleMode)
                        if (imageFill.scaleMode === 'FILL') {
                            // Cover the container
                            const className = this.sanitizeForCSS(node.name);
                            const selector = `.${className}`;
                            let styleProperties = this.cssRules.get(selector);
                            if (!styleProperties) {
                                styleProperties = new Map();
                                this.cssRules.set(selector, styleProperties);
                            }
                            styleProperties.set('object-fit', 'cover');
                        }
                        else if (imageFill.scaleMode === 'FIT') {
                            // Contain within the container
                            const className = this.sanitizeForCSS(node.name);
                            const selector = `.${className}`;
                            let styleProperties = this.cssRules.get(selector);
                            if (!styleProperties) {
                                styleProperties = new Map();
                                this.cssRules.set(selector, styleProperties);
                            }
                            styleProperties.set('object-fit', 'contain');
                        }
                        else if (imageFill.scaleMode === 'TILE') {
                            // For tiled images, we'll use background-image instead
                            tagName = 'div';
                            delete attributes['src'];
                            delete attributes['alt'];
                            delete attributes['loading'];
                            // Add background properties to the CSS
                            const className = this.sanitizeForCSS(node.name);
                            const selector = `.${className}`;
                            let styleProperties = this.cssRules.get(selector);
                            if (!styleProperties) {
                                styleProperties = new Map();
                                this.cssRules.set(selector, styleProperties);
                            }
                            styleProperties.set('background-image', `url("images/${imageName}.png")`);
                            styleProperties.set('background-repeat', 'repeat');
                            styleProperties.set('width', this.convertToUnits(node.width));
                            styleProperties.set('height', this.convertToUnits(node.height));
                        }
                    }
                }
                // Process basic styling
                this.processBasicStyles(node, baseClassName);
                break;
            default:
                // Default case for other node types
                tagName = 'div';
                this.processBasicStyles(node, baseClassName);
        }
        // Build HTML tag with proper attributes
        let html = '';
        // Add class attribute
        if (classNames.length > 0) {
            attributes['class'] = classNames.join(' ');
        }
        // Generate attributes string
        const attributesString = Object.entries(attributes)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ');
        // Create the final HTML
        if (tagName === 'img') {
            // Self-closing tag for images
            html = `<img ${attributesString} />`;
        }
        else {
            // Opening tag
            html = `<${tagName}${attributesString ? ' ' + attributesString : ''}>`;
            // Content (if any)
            if (htmlContent) {
                html += htmlContent;
            }
            // Closing tag
            html += `</${tagName}>`;
        }
        return { html, classNames };
    }
    /**
     * Determine the appropriate HTML tag for a text node
     */
    determineTextTag(node) {
        // Check if this might be a heading
        const isHeading = node.name.toLowerCase().includes('heading') ||
            node.name.toLowerCase().includes('title') ||
            node.name.toLowerCase().includes('h1') ||
            node.name.toLowerCase().includes('h2');
        // Check font size to determine if it's a heading
        const isBigText = node.fontSize !== figma.mixed && node.fontSize >= 20;
        // Check if it's bold
        const isBold = node.fontName !== figma.mixed &&
            node.fontName.style.toLowerCase().includes('bold');
        // Check text length - short text might be better as span
        const isShortText = node.characters.length < 30;
        if (isHeading && isBigText) {
            // Determine heading level
            if (node.fontSize !== figma.mixed && node.fontSize >= 32) {
                return 'h1';
            }
            else if (node.fontSize !== figma.mixed && node.fontSize >= 24) {
                return 'h2';
            }
            else {
                return 'h3';
            }
        }
        else if (isShortText && !isBold) {
            return 'span';
        }
        else {
            return 'p'; // Default for text nodes
        }
    }
    /**
     * Determine the appropriate HTML tag for a container node
     */
    determineContainerTag(node) {
        const nodeName = node.name.toLowerCase();
        // First check exact semantic matches for better accuracy
        if (/^header$|^site-?header$/.test(nodeName)) {
            return 'header';
        }
        else if (/^footer$|^site-?footer$/.test(nodeName)) {
            return 'footer';
        }
        else if (/^main$|^main-?content$/.test(nodeName)) {
            return 'main';
        }
        else if (/^nav$|^navigation$|^navbar$/.test(nodeName)) {
            return 'nav';
        }
        else if (/^aside$|^sidebar$/.test(nodeName)) {
            return 'aside';
        }
        else if (/^article$/.test(nodeName)) {
            return 'article';
        }
        else if (/^section$/.test(nodeName)) {
            return 'section';
        }
        // Then check for partial matches
        if (nodeName.includes('header')) {
            return 'header';
        }
        else if (nodeName.includes('footer')) {
            return 'footer';
        }
        else if (nodeName.includes('main') || nodeName.includes('content')) {
            return 'main';
        }
        else if (nodeName.includes('section') || nodeName.includes('container')) {
            return 'section';
        }
        else if (nodeName.includes('article') || nodeName.includes('card')) {
            return 'article';
        }
        else if (nodeName.includes('aside') || nodeName.includes('sidebar')) {
            return 'aside';
        }
        else if (nodeName.includes('nav') || nodeName.includes('menu')) {
            return 'nav';
        }
        else if (nodeName.includes('list') && 'children' in node && node.children.length > 0) {
            // Check if it might be an unordered list
            const hasListItems = node.children.some(child => this.isSceneNode(child) && child.name.toLowerCase().includes('item'));
            if (hasListItems) {
                return 'ul'; // unordered list
            }
        }
        else if (nodeName.includes('form') || nodeName.includes('contact')) {
            return 'form';
        }
        // Default container
        return 'div';
    }
    /**
     * Determine the appropriate HTML tag for a rectangle
     */
    determineRectangleTag(node) {
        const nodeName = node.name.toLowerCase();
        // Check for interactive elements
        if (/^button$|^btn$|^btn-/.test(nodeName)) {
            // Exact button match
            return 'button';
        }
        else if (/^input-/.test(nodeName)) {
            // Input field
            return 'input';
        }
        else if (/^img$|^image$|^img-/.test(nodeName)) {
            // Image placeholder
            return 'img';
        }
        else if (/^card$|^card-/.test(nodeName)) {
            // Card component
            return 'article';
        }
        else if (/^link$|^cta$/.test(nodeName)) {
            // Link or call-to-action
            return 'a';
        }
        // Partial matches
        if (nodeName.includes('button') || nodeName.includes('btn')) {
            return 'button';
        }
        else if (nodeName.includes('card') || nodeName.includes('item')) {
            return 'article';
        }
        else if (nodeName.includes('input') || nodeName.includes('field')) {
            return 'input';
        }
        else if (nodeName.includes('link') || nodeName.includes('anchor')) {
            return 'a';
        }
        else if (nodeName.includes('image') || nodeName.includes('pic') || nodeName.includes('photo')) {
            return 'img';
        }
        // Special cases
        if ('cornerRadius' in node && node.cornerRadius !== figma.mixed && node.cornerRadius > 8) {
            // Elements with significant corner radius are often buttons or cards
            if (('width' in node && node.width < 200) && ('height' in node && node.height < 80)) {
                return 'button'; // Small rounded rectangle is likely a button
            }
            else {
                return 'article'; // Larger rounded rectangle might be a card
            }
        }
        return 'div'; // Default rectangle
    }
    /**
     * Get a semantic class based on node characteristics
     */
    getSemanticClass(node) {
        const nodeName = node.name.toLowerCase();
        // Identify common UI elements
        if (nodeName.includes('button') || nodeName.includes('btn')) {
            return 'button';
        }
        else if (nodeName.includes('card')) {
            return 'card';
        }
        else if (nodeName.includes('icon')) {
            return 'icon';
        }
        else if (nodeName.includes('input')) {
            return 'input';
        }
        else if (nodeName.includes('header')) {
            return 'header';
        }
        else if (nodeName.includes('footer')) {
            return 'footer';
        }
        else if (nodeName.includes('nav')) {
            return 'nav';
        }
        else {
            return null;
        }
    }
    /**
     * Process a node for CSS generation
     */
    processNodeForCss(node) {
        // First process the node to generate HTML and populate CSS rules
        const { classNames } = this.processNodeForHtml(node);
        // Extract common values for CSS variables
        const cssVariables = this.extractCssVariables();
        // Then build CSS from the collected rules
        let css = '';
        // Add CSS variables if found
        if (cssVariables.size > 0) {
            css += `:root {\n`;
            for (const [name, value] of cssVariables.entries()) {
                css += `  ${name}: ${value};\n`;
            }
            css += `}\n\n`;
        }
        // Add basic reset styles
        css += `* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\n`;
        // Add responsive container for better layout
        css += `.container {\n  width: 100%;\n  max-width: 1200px;\n  margin: 0 auto;\n  padding: 0 15px;\n}\n\n`;
        // Media query mixin for responsive design
        css += `/* Mobile First Media Queries */\n`;
        css += `@media (min-width: 768px) {\n  /* Tablet styles */\n}\n\n`;
        css += `@media (min-width: 992px) {\n  /* Desktop styles */\n}\n\n`;
        // Generate the CSS rules
        for (const [selector, properties] of this.cssRules.entries()) {
            css += `${selector} {\n`;
            for (const [property, value] of properties.entries()) {
                // Format property name based on config (camelCase vs kebab-case)
                const formattedProperty = this.formatPropertyName(property);
                // Use CSS variables where applicable
                const variableName = this.getVariableNameForValue(property, value);
                if (variableName) {
                    css += `  ${formattedProperty}: var(${variableName});\n`;
                }
                else {
                    css += `  ${formattedProperty}: ${value};\n`;
                }
            }
            css += `}\n\n`;
        }
        return { css, classNames };
    }
    /**
     * Extract common CSS values to create variables
     */
    extractCssVariables() {
        const variables = new Map();
        const valueCount = new Map();
        // Count occurrences of values
        for (const [, properties] of this.cssRules.entries()) {
            for (const [property, value] of properties.entries()) {
                // Only consider certain properties for variables
                if (this.isVariableCandidateProperty(property)) {
                    const key = `${property}:${value}`;
                    const current = valueCount.get(key) || { count: 0, property };
                    current.count++;
                    valueCount.set(key, current);
                }
            }
        }
        // Create variables for values used multiple times
        for (const [key, { count, property }] of valueCount.entries()) {
            if (count >= 2) {
                const value = key.split(':')[1];
                const varName = this.createVariableName(property, value);
                variables.set(varName, value);
            }
        }
        // Add fundamental variables
        if (!variables.has('--color-text')) {
            variables.set('--color-text', '#333');
        }
        if (!variables.has('--color-bg')) {
            variables.set('--color-bg', '#fff');
        }
        if (!variables.has('--font-main')) {
            variables.set('--font-main', "'Inter', -apple-system, BlinkMacSystemFont, sans-serif");
        }
        return variables;
    }
    /**
     * Check if property is a good candidate for a CSS variable
     */
    isVariableCandidateProperty(property) {
        return property.startsWith('color') ||
            property.startsWith('background-color') ||
            property.startsWith('font-') ||
            property === 'border-radius' ||
            property.includes('shadow');
    }
    /**
     * Create a variable name for a CSS property
     */
    createVariableName(property, value) {
        let name = '--';
        if (property === 'color' || property === 'background-color') {
            // Extract color type
            if (value.includes('rgb(0, 0, 0)') || value.includes('#000')) {
                name += 'color-black';
            }
            else if (value.includes('rgb(255, 255, 255)') || value.includes('#fff')) {
                name += 'color-white';
            }
            else if (property === 'color') {
                name += 'color-text';
            }
            else {
                name += 'color-primary';
            }
        }
        else if (property.startsWith('font-')) {
            const fontProperty = property.split('-')[1];
            name += `font-${fontProperty}`;
        }
        else if (property === 'border-radius') {
            name += 'radius';
        }
        else if (property.includes('shadow')) {
            name += 'shadow';
        }
        else {
            // Fallback - convert property name to variable name
            name += property.replace(/([A-Z])/g, '-$1').toLowerCase();
        }
        return name;
    }
    /**
     * Get a variable name for a specific property value if available
     */
    getVariableNameForValue(property, value) {
        // Look up standard properties that should use variables
        if (property === 'color' && value.includes('rgb(0, 0, 0)')) {
            return '--color-text';
        }
        else if (property === 'background-color' && value.includes('rgb(255, 255, 255)')) {
            return '--color-bg';
        }
        else if (property === 'font-family') {
            return '--font-main';
        }
        return null;
    }
    /**
     * Format CSS property name based on configuration
     */
    formatPropertyName(property) {
        if (this.config.attributeCasing === 'camelCase') {
            // Convert kebab-case to camelCase
            return property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        }
        else {
            // Keep kebab-case (default)
            return property;
        }
    }
    /**
     * Process basic visual styles (fills, strokes, effects, etc.)
     */
    processBasicStyles(node, className) {
        const selector = `.${className}`;
        const properties = new Map();
        // Initialize CSS rules for this selector if it doesn't exist
        if (!this.cssRules.has(selector)) {
            this.cssRules.set(selector, properties);
        }
        else {
            // Get existing properties
            const existingProperties = this.cssRules.get(selector);
            if (existingProperties) {
                // Merge with new properties
                for (const [key, value] of existingProperties.entries()) {
                    properties.set(key, value);
                }
            }
        }
        // Width and height
        if ('width' in node && 'height' in node) {
            properties.set('width', this.convertToUnits(node.width));
            properties.set('height', this.convertToUnits(node.height));
        }
        // Border radius
        if ('cornerRadius' in node && node.cornerRadius !== 0 && node.cornerRadius !== figma.mixed) {
            // We know cornerRadius is a number at this point
            const radius = node.cornerRadius;
            properties.set('border-radius', this.convertToUnits(radius));
        }
        // Fills (background colors, gradients)
        if ('fills' in node && node.fills && Array.isArray(node.fills)) {
            const isTextNode = node.type === 'TEXT';
            this.processFills(node.fills, properties, isTextNode, node);
        }
        // Strokes (borders)
        if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
            this.processStrokes(node, properties);
        }
        // Effects (shadows, blurs)
        if ('effects' in node && node.effects && Array.isArray(node.effects)) {
            this.processEffects(node.effects, properties);
        }
        // Update the CSS rules map
        this.cssRules.set(selector, properties);
    }
    /**
     * Process fills (backgrounds)
     */
    processFills(fills, properties, isTextNode = false, node) {
        // Filter to only visible fills
        const visibleFills = fills.filter(fill => fill.visible !== false);
        if (visibleFills.length === 0)
            return;
        // For single solid fill
        if (visibleFills.length === 1 && visibleFills[0].type === 'SOLID') {
            const fill = visibleFills[0];
            const rgba = this.rgbaToCSS(fill.color.r, fill.color.g, fill.color.b, fill.opacity || 1);
            // For text nodes, set color property instead of background-color
            if (isTextNode) {
                properties.set('color', rgba);
            }
            else {
                properties.set('background-color', rgba);
            }
            return;
        }
        // For image fills
        const imageFills = visibleFills.filter(fill => fill.type === 'IMAGE');
        if (imageFills.length > 0 && !isTextNode) {
            // Generate a descriptive image name based on the node name (if available)
            const imageName = node && 'name' in node ?
                this.sanitizeForCSS(node.name) || 'background' :
                'background';
            // Add background image properties
            properties.set('background-image', `url("images/${imageName}.png")`);
            // Handle scaling modes
            const imageFill = imageFills[0];
            if (imageFill.scaleMode === 'FILL') {
                properties.set('background-size', 'cover');
                properties.set('background-position', 'center');
            }
            else if (imageFill.scaleMode === 'FIT') {
                properties.set('background-size', 'contain');
                properties.set('background-position', 'center');
                properties.set('background-repeat', 'no-repeat');
            }
            else if (imageFill.scaleMode === 'TILE') {
                properties.set('background-size', 'auto');
                properties.set('background-repeat', 'repeat');
            }
            else if (imageFill.scaleMode === 'CROP') {
                properties.set('background-size', 'cover');
                properties.set('background-position', 'center');
                // Note: CROP typically requires precise background-position
                // For real implementation, would compute the position based on
                // imageFill.imageTransform matrix
            }
            return;
        }
        // For gradients (only apply to backgrounds, not text)
        if (!isTextNode) {
            const gradientFills = visibleFills.filter(fill => fill.type === 'GRADIENT_LINEAR' ||
                fill.type === 'GRADIENT_RADIAL' ||
                fill.type === 'GRADIENT_ANGULAR');
            if (gradientFills.length > 0) {
                // Handle first gradient only for simplicity
                const gradientFill = gradientFills[0];
                if (gradientFill.type === 'GRADIENT_LINEAR') {
                    const gradientCSS = this.linearGradientToCSS(gradientFill);
                    properties.set('background-image', gradientCSS);
                }
                else if (gradientFill.type === 'GRADIENT_RADIAL') {
                    const gradientCSS = this.radialGradientToCSS(gradientFill);
                    properties.set('background-image', gradientCSS);
                }
            }
        }
    }
    /**
     * Process strokes (borders)
     */
    processStrokes(node, properties) {
        var _a;
        if (!Array.isArray(node.strokes) || !node.strokes.length)
            return;
        // Filter to only visible strokes
        const visibleStrokes = node.strokes.filter(stroke => stroke.visible !== false);
        if (visibleStrokes.length === 0)
            return;
        // For simplicity, we'll handle only the first stroke
        const stroke = visibleStrokes[0];
        if (stroke.type === 'SOLID') {
            // Get stroke color
            const rgba = this.rgbaToCSS(stroke.color.r, stroke.color.g, stroke.color.b, stroke.opacity || 1);
            // Get stroke weight with a fallback
            const weight = node.strokeWeight !== figma.mixed ? ((_a = node.strokeWeight) !== null && _a !== void 0 ? _a : 1) : 1;
            // Set border style
            properties.set('border-style', 'solid');
            properties.set('border-width', this.convertToUnits(weight));
            properties.set('border-color', rgba);
            // Handle stroke alignment
            if (node.strokeAlign !== figma.mixed) {
                switch (node.strokeAlign) {
                    case 'INSIDE':
                        properties.set('box-sizing', 'border-box');
                        break;
                    case 'OUTSIDE':
                        // CSS doesn't have a direct equivalent for outside strokes
                        // We would need to use outline or additional elements in a real implementation
                        properties.set('outline', `${this.convertToUnits(weight)} solid ${rgba}`);
                        properties.set('outline-offset', this.convertToUnits(weight));
                        break;
                }
            }
        }
    }
    /**
     * Process effects (shadows, blurs)
     */
    processEffects(effects, properties) {
        // Filter to only visible effects
        const visibleEffects = effects.filter(effect => effect.visible !== false);
        if (visibleEffects.length === 0)
            return;
        // Process drop shadows
        const dropShadows = visibleEffects.filter(effect => effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW');
        if (dropShadows.length > 0) {
            const shadowValues = dropShadows.map(shadow => {
                const { color, offset, radius, spread, type } = shadow;
                const rgba = this.rgbaToCSS(color.r, color.g, color.b, color.a);
                const x = this.convertToUnits(offset.x);
                const y = this.convertToUnits(offset.y);
                const blur = this.convertToUnits(radius);
                const spreadValue = this.convertToUnits(spread !== null && spread !== void 0 ? spread : 0);
                // Inner shadows in CSS have the "inset" keyword
                const inset = type === 'INNER_SHADOW' ? ' inset' : '';
                return `${x} ${y} ${blur} ${spreadValue} ${rgba}${inset}`;
            }).join(', ');
            properties.set('box-shadow', shadowValues);
        }
        // Process blur effects
        const blurs = visibleEffects.filter(effect => effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR');
        if (blurs.length > 0) {
            blurs.forEach(blur => {
                if (blur.type === 'LAYER_BLUR') {
                    properties.set('filter', `blur(${this.convertToUnits(blur.radius)})`);
                }
                else if (blur.type === 'BACKGROUND_BLUR') {
                    properties.set('backdrop-filter', `blur(${this.convertToUnits(blur.radius)})`);
                }
            });
        }
    }
    /**
     * Process Auto Layout properties (translates to Flexbox/Grid)
     */
    processAutoLayout(node, className) {
        const selector = `.${className}`;
        let properties = this.cssRules.get(selector);
        if (!properties) {
            properties = new Map();
            this.cssRules.set(selector, properties);
        }
        // Determine if we should use grid or flexbox based on configuration and layout complexity
        const shouldUseGrid = this.config.layoutPreference === 'grid' && this.isGridSuitable(node);
        if (shouldUseGrid) {
            this.processGridLayout(node, properties);
        }
        else {
            this.processFlexboxLayout(node, properties);
        }
        // Map padding (common to both flexbox and grid)
        if (node.paddingLeft !== 0) {
            properties.set('padding-left', this.convertToUnits(node.paddingLeft));
        }
        if (node.paddingRight !== 0) {
            properties.set('padding-right', this.convertToUnits(node.paddingRight));
        }
        if (node.paddingTop !== 0) {
            properties.set('padding-top', this.convertToUnits(node.paddingTop));
        }
        if (node.paddingBottom !== 0) {
            properties.set('padding-bottom', this.convertToUnits(node.paddingBottom));
        }
    }
    /**
     * Process layout as Flexbox
     */
    processFlexboxLayout(node, properties) {
        // Set display type to flex
        properties.set('display', 'flex');
        // Map direction
        if (node.layoutMode === 'HORIZONTAL') {
            properties.set('flex-direction', 'row');
        }
        else if (node.layoutMode === 'VERTICAL') {
            properties.set('flex-direction', 'column');
        }
        // Map alignment
        if (node.primaryAxisAlignItems === 'MIN') {
            properties.set('justify-content', 'flex-start');
        }
        else if (node.primaryAxisAlignItems === 'CENTER') {
            properties.set('justify-content', 'center');
        }
        else if (node.primaryAxisAlignItems === 'MAX') {
            properties.set('justify-content', 'flex-end');
        }
        else if (node.primaryAxisAlignItems === 'SPACE_BETWEEN') {
            properties.set('justify-content', 'space-between');
        }
        // Map counter alignment
        if (node.counterAxisAlignItems === 'MIN') {
            properties.set('align-items', 'flex-start');
        }
        else if (node.counterAxisAlignItems === 'CENTER') {
            properties.set('align-items', 'center');
        }
        else if (node.counterAxisAlignItems === 'MAX') {
            properties.set('align-items', 'flex-end');
        }
        // Map gap
        if (node.itemSpacing !== 0) {
            properties.set('gap', this.convertToUnits(node.itemSpacing));
        }
        // Handle auto-layout wrapping
        if (node.layoutWrap === 'WRAP') {
            properties.set('flex-wrap', 'wrap');
        }
        // Add responsive breakpoints for flex items
        if ('children' in node && node.children.length > 0 && node.layoutWrap === 'WRAP') {
            // Process child constraints for flex items
            this.processFlexChildren(node);
        }
    }
    /**
     * Process layout as CSS Grid
     */
    processGridLayout(node, properties) {
        // Set display type to grid
        properties.set('display', 'grid');
        // Calculate grid template columns/rows based on children
        if ('children' in node && node.children.length > 0) {
            if (node.layoutMode === 'HORIZONTAL') {
                this.calculateGridTemplateColumns(node, properties);
                // Set alignment in the row direction
                if (node.primaryAxisAlignItems === 'SPACE_BETWEEN') {
                    properties.set('justify-content', 'space-between');
                }
                else if (node.primaryAxisAlignItems === 'CENTER') {
                    properties.set('justify-content', 'center');
                }
                else if (node.primaryAxisAlignItems === 'MAX') {
                    properties.set('justify-content', 'end');
                }
            }
            else {
                this.calculateGridTemplateRows(node, properties);
                // Set alignment in the column direction
                if (node.primaryAxisAlignItems === 'SPACE_BETWEEN') {
                    properties.set('align-content', 'space-between');
                }
                else if (node.primaryAxisAlignItems === 'CENTER') {
                    properties.set('align-content', 'center');
                }
                else if (node.primaryAxisAlignItems === 'MAX') {
                    properties.set('align-content', 'end');
                }
            }
        }
        // Set gap for grid
        if (node.itemSpacing !== 0) {
            properties.set('gap', this.convertToUnits(node.itemSpacing));
        }
        // Auto-flow based on wrap mode
        if (node.layoutWrap === 'WRAP') {
            properties.set('grid-auto-flow', node.layoutMode === 'HORIZONTAL' ? 'row' : 'column');
        }
    }
    /**
     * Calculate grid template columns based on children
     */
    calculateGridTemplateColumns(node, properties) {
        if (!('children' in node))
            return;
        // For simple grids, we can use repeat with fixed widths
        if (this.areChildrenSameSize(node.children)) {
            const columns = Math.min(node.children.length, 12); // Max 12 columns for standard grid
            properties.set('grid-template-columns', `repeat(${columns}, 1fr)`);
            return;
        }
        // For complex grids, calculate each column width
        const columnWidths = [];
        for (const child of node.children) {
            if ('width' in child) {
                // Check for constraints
                if ('layoutAlign' in child && child.layoutAlign === 'STRETCH') {
                    columnWidths.push('1fr');
                }
                else {
                    columnWidths.push(this.convertToUnits(child.width));
                }
            }
        }
        if (columnWidths.length > 0) {
            properties.set('grid-template-columns', columnWidths.join(' '));
        }
    }
    /**
     * Calculate grid template rows based on children
     */
    calculateGridTemplateRows(node, properties) {
        if (!('children' in node))
            return;
        // For simple grids, we can use repeat with fixed heights
        if (this.areChildrenSameSize(node.children)) {
            const rows = Math.min(node.children.length, 12); // Max 12 rows for standard grid
            properties.set('grid-template-rows', `repeat(${rows}, 1fr)`);
            return;
        }
        // For complex grids, calculate each row height
        const rowHeights = [];
        for (const child of node.children) {
            if ('height' in child) {
                // Check for constraints
                if ('layoutAlign' in child && child.layoutAlign === 'STRETCH') {
                    rowHeights.push('1fr');
                }
                else {
                    rowHeights.push(this.convertToUnits(child.height));
                }
            }
        }
        if (rowHeights.length > 0) {
            properties.set('grid-template-rows', rowHeights.join(' '));
        }
    }
    /**
     * Process flex children to set their flex properties based on constraints
     */
    processFlexChildren(node) {
        if (!('children' in node))
            return;
        // Process each child
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            // Only process visible scene nodes
            if (!this.isSceneNode(child) || ('visible' in child && !child.visible)) {
                continue;
            }
            // Get child class names
            const className = this.generateClassName(child);
            const selector = `.${className}`;
            let properties = this.cssRules.get(selector);
            if (!properties) {
                properties = new Map();
                this.cssRules.set(selector, properties);
            }
            // Check child constraints
            if ('layoutGrow' in child) {
                if (child.layoutGrow === 1) {
                    // Equivalent to "Fill container" in Figma
                    properties.set('flex-grow', '1');
                    properties.set('flex-shrink', '1');
                    // If horizontal layout, adjust width
                    if (node.layoutMode === 'HORIZONTAL') {
                        properties.set('width', '100%');
                    }
                    else {
                        properties.set('height', '100%');
                    }
                }
                else {
                    // "Hug contents" in Figma
                    properties.set('flex-grow', '0');
                    properties.set('flex-shrink', '0');
                }
            }
            // Add responsive behavior for wrapping layouts
            if (node.layoutWrap === 'WRAP') {
                // Make items full width on small screens if in wrapping mode
                const mediaQuery = `@media (max-width: 768px)`;
                let mediaProperties = this.cssRules.get(mediaQuery);
                if (!mediaProperties) {
                    mediaProperties = new Map();
                    this.cssRules.set(mediaQuery, mediaProperties);
                }
                // Add rule for this child in the media query
                if (node.layoutMode === 'HORIZONTAL') {
                    mediaProperties.set(`${selector} width`, '100%');
                    mediaProperties.set(`${selector} flex-basis`, '100%');
                }
            }
        }
    }
    /**
     * Check if a node is a scene node (helper)
     */
    isSceneNode(node) {
        return node && 'type' in node;
    }
    /**
     * Check if a layout is suitable for CSS Grid
     */
    isGridSuitable(node) {
        // Grid is suitable for complex layouts with multiple rows and columns
        // or when items need precise alignment in two dimensions
        if (!('children' in node) || node.children.length === 0) {
            return false;
        }
        // If it's a wrapping layout, grid is often better
        if (node.layoutWrap === 'WRAP') {
            return true;
        }
        // If there are many children, grid might be better
        if (node.children.length >= 4) {
            return true;
        }
        // If children have complex alignment needs, grid might be better
        let hasComplexAlignment = false;
        for (const child of node.children) {
            if ('layoutAlign' in child && child.layoutAlign === 'STRETCH') {
                hasComplexAlignment = true;
                break;
            }
        }
        return hasComplexAlignment;
    }
    /**
     * Check if all children are roughly the same size
     */
    areChildrenSameSize(children) {
        if (children.length <= 1) {
            return true;
        }
        let firstWidth = 0;
        let firstHeight = 0;
        // Find first valid child with dimensions
        for (const child of children) {
            if ('width' in child && 'height' in child) {
                firstWidth = child.width;
                firstHeight = child.height;
                break;
            }
        }
        // Check if all children have similar dimensions
        for (const child of children) {
            if ('width' in child && 'height' in child) {
                const widthDiff = Math.abs(child.width - firstWidth);
                const heightDiff = Math.abs(child.height - firstHeight);
                // Allow for small variations (within 5%)
                if (widthDiff > firstWidth * 0.05 || heightDiff > firstHeight * 0.05) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Process position for non-Auto Layout nodes
     */
    processPosition(node, className) {
        if (!('x' in node) || !('y' in node))
            return;
        const selector = `.${className}`;
        let properties = this.cssRules.get(selector);
        if (!properties) {
            properties = new Map();
            this.cssRules.set(selector, properties);
        }
        // Only apply absolute positioning if config allows it
        if (this.config.layoutPreference === 'allow-absolute') {
            properties.set('position', 'absolute');
            properties.set('left', this.convertToUnits(node.x));
            properties.set('top', this.convertToUnits(node.y));
        }
    }
    /**
     * Process font styles for text nodes
     */
    processFontStyles(node, className) {
        const selector = `.${className}`;
        let properties = this.cssRules.get(selector);
        if (!properties) {
            properties = new Map();
            this.cssRules.set(selector, properties);
        }
        // Handle font family
        if (node.fontName !== figma.mixed) {
            properties.set('font-family', `'${node.fontName.family}', sans-serif`);
            // Handle font weight
            if (node.fontName.style.toLowerCase().includes('bold')) {
                properties.set('font-weight', 'bold');
            }
            else if (node.fontName.style.toLowerCase().includes('light')) {
                properties.set('font-weight', '300');
            }
            else if (node.fontName.style.toLowerCase().includes('medium')) {
                properties.set('font-weight', '500');
            }
            // Handle font style
            if (node.fontName.style.toLowerCase().includes('italic')) {
                properties.set('font-style', 'italic');
            }
        }
        // Font size
        if (node.fontSize !== figma.mixed) {
            properties.set('font-size', this.convertToUnits(node.fontSize));
        }
        // Line height
        if (node.lineHeight !== figma.mixed && node.lineHeight.unit !== 'AUTO') {
            if (node.lineHeight.unit === 'PIXELS') {
                properties.set('line-height', this.convertToUnits(node.lineHeight.value));
            }
            else if (node.lineHeight.unit === 'PERCENT') {
                properties.set('line-height', `${node.lineHeight.value / 100}`);
            }
        }
        // Letter spacing
        if (node.letterSpacing !== figma.mixed) {
            properties.set('letter-spacing', this.convertToUnits(node.letterSpacing.value));
        }
        // Text alignment
        // We need to check if it's exactly equal to one of the values we're expecting
        const textAlign = node.textAlignHorizontal;
        if (textAlign === 'LEFT') {
            properties.set('text-align', 'left');
        }
        else if (textAlign === 'CENTER') {
            properties.set('text-align', 'center');
        }
        else if (textAlign === 'RIGHT') {
            properties.set('text-align', 'right');
        }
        else if (textAlign === 'JUSTIFIED') {
            properties.set('text-align', 'justify');
        }
        // Text decoration
        const textDecoration = node.textDecoration;
        if (textDecoration === 'UNDERLINE') {
            properties.set('text-decoration', 'underline');
        }
        else if (textDecoration === 'STRIKETHROUGH') {
            properties.set('text-decoration', 'line-through');
        }
        // Text case
        const textCase = node.textCase;
        if (textCase === 'UPPER') {
            properties.set('text-transform', 'uppercase');
        }
        else if (textCase === 'LOWER') {
            properties.set('text-transform', 'lowercase');
        }
        else if (textCase === 'TITLE') {
            properties.set('text-transform', 'capitalize');
        }
        // Text color - Extract from fills
        if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
            // Get the first visible solid fill for text color
            const textFill = node.fills.find(fill => fill.type === 'SOLID' && fill.visible !== false);
            if (textFill && textFill.type === 'SOLID') {
                // Use the fill color as text color, not background
                const rgba = this.rgbaToCSS(textFill.color.r, textFill.color.g, textFill.color.b, textFill.opacity || 1);
                properties.set('color', rgba);
            }
        }
    }
    /**
     * Generate a CSS class name from a node
     */
    generateClassName(node) {
        if (this.config.classNamingStrategy === 'layer-based') {
            // Generate a class name based on the node name
            if (node.name && node.name.trim() !== '') {
                // Sanitize the name to be CSS-friendly
                return this.sanitizeForCSS(node.name);
            }
        }
        else if (this.config.classNamingStrategy === 'bem') {
            // Use Block-Element-Modifier naming strategy
            return this.generateBemClassName(node);
        }
        else if (this.config.classNamingStrategy === 'unique-id') {
            // Generate a unique ID-based class name
            const nodeType = node.type.toLowerCase();
            // Get first 8 chars of node ID
            const idFragment = ('id' in node && typeof node.id === 'string') ?
                node.id.substring(0, 8) :
                this.uniqueIdCounter.toString();
            return `${nodeType}-${idFragment}`;
        }
        // Fallback to a simple type-based name with counter
        return `${node.type.toLowerCase()}-${++this.uniqueIdCounter}`;
    }
    /**
     * Generate a BEM-style class name
     */
    generateBemClassName(node) {
        // BEM format: block__element--modifier
        // Try to determine if this is a component
        const isComponent = node.type === 'COMPONENT' || node.type === 'INSTANCE';
        // Get parent path to understand nesting
        const parentNode = this.findParentNode(node);
        let blockName = '';
        let elementName = '';
        let modifiers = [];
        // Process different node types
        switch (node.type) {
            case 'COMPONENT':
            case 'COMPONENT_SET':
                // Components are always blocks
                blockName = this.sanitizeForCSS(node.name.split(',')[0].trim());
                // Extract modifiers from variant properties if any
                if (node.name.includes(',')) {
                    const parts = node.name.split(',').slice(1);
                    parts.forEach(part => {
                        if (part.includes('=')) {
                            const [prop, value] = part.split('=').map(p => p.trim());
                            modifiers.push(`${this.sanitizeForCSS(prop)}-${this.sanitizeForCSS(value)}`);
                        }
                    });
                }
                break;
            case 'INSTANCE':
                // Instances use the master component name as block
                // In a real plugin, we would access mainComponent.name
                blockName = this.sanitizeForCSS(node.name.split(',')[0].trim());
                // Extract variant properties as modifiers
                if (node.name.includes(',')) {
                    const parts = node.name.split(',').slice(1);
                    parts.forEach(part => {
                        if (part.includes('=')) {
                            const [prop, value] = part.split('=').map(p => p.trim());
                            modifiers.push(`${this.sanitizeForCSS(prop)}-${this.sanitizeForCSS(value)}`);
                        }
                    });
                }
                break;
            default:
                // For child nodes, try to determine if it's an element of a block
                if (parentNode && (parentNode.type === 'COMPONENT' || parentNode.type === 'INSTANCE' || parentNode.type === 'COMPONENT_SET')) {
                    // This is an element within a component
                    blockName = this.sanitizeForCSS(parentNode.name.split(',')[0].trim());
                    elementName = this.sanitizeForCSS(node.name);
                }
                else if (parentNode && 'parent' in parentNode) {
                    // This is a nested element, use the nearest component ancestor as block
                    const ancestorComponent = this.findAncestorComponent(node);
                    if (ancestorComponent) {
                        blockName = this.sanitizeForCSS(ancestorComponent.name.split(',')[0].trim());
                        elementName = this.sanitizeForCSS(node.name);
                    }
                    else {
                        // No component ancestor found, treat as a block
                        blockName = this.sanitizeForCSS(node.name);
                    }
                }
                else {
                    // Standalone node, treat as a block
                    blockName = this.sanitizeForCSS(node.name);
                }
        }
        // Basic validation
        if (!blockName) {
            blockName = `block-${++this.uniqueIdCounter}`;
        }
        // Construct BEM class
        let bemClass = blockName;
        // Add element part if it exists
        if (elementName) {
            bemClass += `__${elementName}`;
        }
        // Add modifiers if any
        if (modifiers.length > 0) {
            // Return base class plus individual modifier classes
            return bemClass;
        }
        return bemClass;
    }
    /**
     * Find the parent node of a scene node (simplified for demo)
     * In a real plugin, we would use the Figma API's node.parent property
     */
    findParentNode(node) {
        // This is a simplified mock implementation
        // In a real plugin, we would access node.parent
        return null;
    }
    /**
     * Find the nearest ancestor component
     * In a real plugin, we would traverse the node.parent chain
     */
    findAncestorComponent(node) {
        // This is a simplified mock implementation
        // In a real plugin, we would traverse up the parent chain
        return null;
    }
    /**
     * Convert a Figma color to CSS rgba
     */
    rgbaToCSS(r, g, b, a) {
        // Convert 0-1 range to 0-255
        const rInt = Math.round(r * 255);
        const gInt = Math.round(g * 255);
        const bInt = Math.round(b * 255);
        if (a < 1) {
            return `rgba(${rInt}, ${gInt}, ${bInt}, ${a.toFixed(2)})`;
        }
        else {
            return `rgb(${rInt}, ${gInt}, ${bInt})`;
        }
    }
    /**
     * Convert linear gradient to CSS
     */
    linearGradientToCSS(fill) {
        // Extract gradient stops
        const stops = fill.gradientStops.map(stop => {
            const color = this.rgbaToCSS(stop.color.r, stop.color.g, stop.color.b, stop.color.a);
            return `${color} ${Math.round(stop.position * 100)}%`;
        }).join(', ');
        // In a real plugin, we would calculate the correct angle from the gradient handles
        // For this example, we'll use a default angle
        return `linear-gradient(90deg, ${stops})`;
    }
    /**
     * Convert radial gradient to CSS
     */
    radialGradientToCSS(fill) {
        // Extract gradient stops
        const stops = fill.gradientStops.map(stop => {
            const color = this.rgbaToCSS(stop.color.r, stop.color.g, stop.color.b, stop.color.a);
            return `${color} ${Math.round(stop.position * 100)}%`;
        }).join(', ');
        // In a real plugin, we would calculate the correct center and shape from the gradient handles
        // For this example, we'll use default values
        return `radial-gradient(circle, ${stops})`;
    }
    /**
     * Convert a Figma value to CSS units based on config
     */
    convertToUnits(value) {
        switch (this.config.cssUnits) {
            case 'rem':
                return `${(value / 16).toFixed(2)}rem`;
            case 'em':
                return `${(value / 16).toFixed(2)}em`;
            case 'px':
            default:
                return `${Math.round(value)}px`;
        }
    }
    /**
     * Sanitize a string to be used as a CSS class name
     */
    sanitizeForCSS(name) {
        // First, check if name starts with a number
        const startsWithNumber = /^\d/.test(name);
        // Process the name
        let sanitized = name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
            .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
            || 'element'; // Default if everything was removed
        // If name starts with a number, prefix it
        if (startsWithNumber) {
            const nameType = this.getNameType(name);
            sanitized = nameType + '-' + sanitized;
        }
        return sanitized;
    }
    /**
     * Get semantic type from name for prefixing
     */
    getNameType(name) {
        // Check for price patterns ($X.XX or X.XX)
        if (/\$?\d+\.\d+/.test(name)) {
            return 'price';
        }
        // Check for weight/size patterns (X lb, X kg, etc.)
        if (/\d+(\.\d+)?\s*(lb|kg|g|oz)/.test(name)) {
            return 'quantity';
        }
        // Check for item count patterns (X items)
        if (/\d+\s*items?/.test(name)) {
            return 'count';
        }
        // Default prefix for numbers
        return 'item';
    }
    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    /**
     * Generate a placeholder SVG based on the node type
     */
    generatePlaceholderSvg(node) {
        const width = Math.round(node.width);
        const height = Math.round(node.height);
        const centerX = width / 2;
        const centerY = height / 2;
        // Generate a different shape based on node type
        switch (node.type) {
            case 'VECTOR':
                // Generic path for vector
                return `<path d="M${width * 0.2},${height * 0.2} L${width * 0.8},${height * 0.2} L${width * 0.8},${height * 0.8} L${width * 0.2},${height * 0.8} Z" stroke="currentColor" stroke-width="2"/>`;
            case 'STAR':
                // Simple 5-point star
                const starPoints = [];
                const outerRadius = Math.min(width, height) / 2 * 0.9;
                const innerRadius = outerRadius / 2;
                for (let i = 0; i < 10; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (Math.PI / 5) * i;
                    const x = centerX + radius * Math.sin(angle);
                    const y = centerY - radius * Math.cos(angle);
                    starPoints.push(`${x},${y}`);
                }
                return `<polygon points="${starPoints.join(' ')}" stroke="currentColor" stroke-width="2"/>`;
            case 'ELLIPSE':
                // Circle or ellipse
                const rx = width / 2 * 0.9;
                const ry = height / 2 * 0.9;
                return `<ellipse cx="${centerX}" cy="${centerY}" rx="${rx}" ry="${ry}" stroke="currentColor" stroke-width="2"/>`;
            case 'POLYGON':
                // Hexagon as placeholder for polygon
                const polygonPoints = [];
                const radius = Math.min(width, height) / 2 * 0.9;
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i;
                    const x = centerX + radius * Math.sin(angle);
                    const y = centerY - radius * Math.cos(angle);
                    polygonPoints.push(`${x},${y}`);
                }
                return `<polygon points="${polygonPoints.join(' ')}" stroke="currentColor" stroke-width="2"/>`;
            case 'LINE':
                // Simple line
                return `<line x1="${width * 0.1}" y1="${height * 0.1}" x2="${width * 0.9}" y2="${height * 0.9}" stroke="currentColor" stroke-width="2"/>`;
            default:
                // Default rectangle
                return `<rect x="${width * 0.1}" y="${height * 0.1}" width="${width * 0.8}" height="${height * 0.8}" stroke="currentColor" stroke-width="2"/>`;
        }
    }
}

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFDQTtBQUNBO0FBQ0EsMkJBQTJCLGtCQUFrQjtBQUM3QztBQUNBO0FBQ0E7QUFDQSx1QkFBdUIsUUFBUSxFQUFFLCtDQUErQztBQUNoRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUJBQXlCLFFBQVE7QUFDakM7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCO0FBQ3hCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkJBQTZCO0FBQzdCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlDQUFpQztBQUNqQztBQUNBO0FBQ0Esa0NBQWtDO0FBQ2xDO0FBQ0E7QUFDQSxzQkFBc0I7QUFDdEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQkFBZ0IsYUFBYTtBQUM3QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQkFBMkI7QUFDM0I7QUFDQSw0QkFBNEIsS0FBSyxJQUFJLE9BQU87QUFDNUM7QUFDQSxxQkFBcUI7QUFDckI7QUFDQTtBQUNBLG1CQUFtQiwyQkFBMkIsY0FBYyxlQUFlLEdBQUc7QUFDOUU7QUFDQSw0QkFBNEIsZ0JBQWdCLHNCQUFzQixtQkFBbUIsb0JBQW9CLEdBQUc7QUFDNUc7QUFDQTtBQUNBLDJDQUEyQywwQkFBMEI7QUFDckUsMkNBQTJDLDJCQUEyQjtBQUN0RTtBQUNBO0FBQ0Esc0JBQXNCLFdBQVc7QUFDakM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0NBQWdDLGtCQUFrQixRQUFRLGFBQWEsRUFBRTtBQUN6RTtBQUNBO0FBQ0EsZ0NBQWdDLGtCQUFrQixJQUFJLE9BQU87QUFDN0Q7QUFDQTtBQUNBLHFCQUFxQjtBQUNyQjtBQUNBLGlCQUFpQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBbUMsU0FBUyxHQUFHLE1BQU07QUFDckQsNkRBQTZEO0FBQzdEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDJCQUEyQixpQkFBaUI7QUFDNUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDRCQUE0QixhQUFhO0FBQ3pDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkJBQTZCLFVBQVU7QUFDdkM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDhEQUE4RCxVQUFVO0FBQ3hFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxREFBcUQsNkJBQTZCLFFBQVEsS0FBSztBQUMvRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3QkFBd0Isc0NBQXNDO0FBQzlEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsMEJBQTBCLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsTUFBTTtBQUN4RSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxREFBcUQsaUNBQWlDO0FBQ3RGO0FBQ0E7QUFDQSw4REFBOEQsaUNBQWlDO0FBQy9GO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZCQUE2QixVQUFVO0FBQ3ZDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGdFQUFnRTtBQUNoRSw4REFBOEQsUUFBUTtBQUN0RTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2REFBNkQ7QUFDN0QsMkRBQTJELEtBQUs7QUFDaEU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QiwwQkFBMEI7QUFDbEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQ0FBaUMsVUFBVTtBQUMzQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwyQ0FBMkMsVUFBVTtBQUNyRCwyQ0FBMkMsVUFBVTtBQUNyRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZCQUE2QixVQUFVO0FBQ3ZDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkJBQTZCLFVBQVU7QUFDdkM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4Q0FBOEMscUJBQXFCO0FBQ25FO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaURBQWlELDRCQUE0QjtBQUM3RTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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Q0FBb0MsWUFBWSxHQUFHLGNBQWMsR0FBRyxZQUFZLEdBQUcsY0FBYyxHQUFHLFlBQVksR0FBRyxjQUFjLEdBQUcsWUFBWSxHQUFHLGNBQWM7QUFDaks7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGdDQUFnQyxRQUFRO0FBQ3hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsdUNBQXVDLEVBQUUsR0FBRyxFQUFFO0FBQzlDO0FBQ0EsMkNBQTJDLHFCQUFxQjtBQUNoRTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHVDQUF1QyxRQUFRLFFBQVEsUUFBUSxRQUFRLEdBQUcsUUFBUSxHQUFHO0FBQ3JGO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0NBQWdDLE9BQU87QUFDdkM7QUFDQTtBQUNBO0FBQ0EsMENBQTBDLEVBQUUsR0FBRyxFQUFFO0FBQ2pEO0FBQ0EsMkNBQTJDLHdCQUF3QjtBQUNuRTtBQUNBO0FBQ0Esb0NBQW9DLFlBQVksUUFBUSxhQUFhLFFBQVEsWUFBWSxRQUFRLGFBQWE7QUFDOUc7QUFDQTtBQUNBLG1DQUFtQyxZQUFZLE9BQU8sYUFBYSxXQUFXLFlBQVksWUFBWSxhQUFhO0FBQ25IO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL2ZpZ21hZGV2LWFjY2VsZXJhdG9yLy4vc3JjL2V4dHJhY3RvcnMudHMiLCJ3ZWJwYWNrOi8vZmlnbWFkZXYtYWNjZWxlcmF0b3Ivd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vZmlnbWFkZXYtYWNjZWxlcmF0b3Ivd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL2ZpZ21hZGV2LWFjY2VsZXJhdG9yL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vZmlnbWFkZXYtYWNjZWxlcmF0b3Ivd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9maWdtYWRldi1hY2NlbGVyYXRvci8uL3NyYy9jb2RlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIEZpZ21hRGV2IEFjY2VsZXJhdG9yIC0gRGVzaWduIEluZm9ybWF0aW9uIEV4dHJhY3RvcnNcbi8vIFRoaXMgZmlsZSBjb250YWlucyB0aGUgZXh0cmFjdG9ycyBmb3IgZGVzaWduIHRva2VucywgbGF5b3V0LCBhbmQgY29tcG9uZW50IGluZm9ybWF0aW9uXG4vKipcbiAqIEJhc2UgZXh0cmFjdG9yIGNsYXNzIHdpdGggc2hhcmVkIGZ1bmN0aW9uYWxpdHlcbiAqL1xuY2xhc3MgQmFzZUV4dHJhY3RvciB7XG4gICAgLyoqXG4gICAgICogVHlwZSBndWFyZCB0byBjaGVjayBpZiBhIG5vZGUgaXMgYSBTY2VuZU5vZGVcbiAgICAgKi9cbiAgICBpc1NjZW5lTm9kZShub2RlKSB7XG4gICAgICAgIHJldHVybiBub2RlICYmIHR5cGVvZiBub2RlID09PSAnb2JqZWN0JyAmJiAndHlwZScgaW4gbm9kZTtcbiAgICB9XG59XG4vKipcbiAqIFRva2VuRXh0cmFjdG9yIGNsYXNzIGZvciBleHRyYWN0aW5nIGRlc2lnbiB0b2tlbnMgZnJvbSBGaWdtYSBkb2N1bWVudFxuICovXG5leHBvcnQgY2xhc3MgVG9rZW5FeHRyYWN0b3IgZXh0ZW5kcyBCYXNlRXh0cmFjdG9yIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAgICAgICAgLy8gQ2FjaGUgZm9yIGV4dHJhY3RlZCBjb2xvcnMsIHR5cG9ncmFwaHksIGFuZCBzcGFjaW5nXG4gICAgICAgIHRoaXMuY29sb3JzID0ge307XG4gICAgICAgIHRoaXMudHlwb2dyYXBoeSA9IHt9O1xuICAgICAgICB0aGlzLnNwYWNpbmcgPSB7fTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBkZXNpZ24gdG9rZW5zIGZyb20gYSBub2RlIGFuZCBpdHMgY2hpbGRyZW5cbiAgICAgKi9cbiAgICBleHRyYWN0RGVzaWduVG9rZW5zKG5vZGUpIHtcbiAgICAgICAgLy8gUmVzZXQgdGhlIHRva2VuIGNvbGxlY3Rpb25zXG4gICAgICAgIHRoaXMuY29sb3JzID0ge307XG4gICAgICAgIHRoaXMudHlwb2dyYXBoeSA9IHt9O1xuICAgICAgICB0aGlzLnNwYWNpbmcgPSB7fTtcbiAgICAgICAgLy8gUHJvY2VzcyB0aGUgbm9kZSBoaWVyYXJjaHkgdG8gZXh0cmFjdCB0b2tlbnNcbiAgICAgICAgdGhpcy50cmF2ZXJzZU5vZGVGb3JUb2tlbnMobm9kZSk7XG4gICAgICAgIC8vIE9yZ2FuaXplIHRoZSB0b2tlbnMgaW50byB0aGUgRGVzaWduVG9rZW5zIHN0cnVjdHVyZVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY29sb3JzOiB0aGlzLmNvbG9ycyxcbiAgICAgICAgICAgIHR5cG9ncmFwaHk6IHRoaXMudHlwb2dyYXBoeSxcbiAgICAgICAgICAgIHNwYWNpbmc6IHRoaXMuc3BhY2luZ1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmVseSB0cmF2ZXJzZSBub2RlIHRyZWUgdG8gZmluZCB0b2tlbnNcbiAgICAgKi9cbiAgICB0cmF2ZXJzZU5vZGVGb3JUb2tlbnMobm9kZSkge1xuICAgICAgICAvLyBFeHRyYWN0IHRva2VucyBmcm9tIHRoaXMgbm9kZVxuICAgICAgICB0aGlzLmV4dHJhY3RDb2xvcnNGcm9tTm9kZShub2RlKTtcbiAgICAgICAgdGhpcy5leHRyYWN0VHlwb2dyYXBoeUZyb21Ob2RlKG5vZGUpO1xuICAgICAgICB0aGlzLmV4dHJhY3RTcGFjaW5nRnJvbU5vZGUobm9kZSk7XG4gICAgICAgIC8vIFByb2Nlc3MgY2hpbGRyZW4gaWYgYW55XG4gICAgICAgIGlmICgnY2hpbGRyZW4nIGluIG5vZGUgJiYgQXJyYXkuaXNBcnJheShub2RlLmNoaWxkcmVuKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgLy8gT25seSBwcm9jZXNzIHNjZW5lTm9kZSB0eXBlIGNoaWxkcmVuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNTY2VuZU5vZGUoY2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHJhdmVyc2VOb2RlRm9yVG9rZW5zKGNoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gVXNpbmcgaXNTY2VuZU5vZGUgZnJvbSBCYXNlRXh0cmFjdG9yXG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBjb2xvciB0b2tlbnMgZnJvbSBhIG5vZGVcbiAgICAgKi9cbiAgICBleHRyYWN0Q29sb3JzRnJvbU5vZGUobm9kZSkge1xuICAgICAgICAvLyBDaGVjayBmb3IgZmlsbHNcbiAgICAgICAgaWYgKCdmaWxscycgaW4gbm9kZSAmJiBub2RlLmZpbGxzICYmIEFycmF5LmlzQXJyYXkobm9kZS5maWxscykpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZmlsbCBvZiBub2RlLmZpbGxzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGwudHlwZSA9PT0gJ1NPTElEJyAmJiBmaWxsLnZpc2libGUgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIGEgbmFtZSBmb3IgdGhpcyBjb2xvclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5nZXRDb2xvclRva2VuTmFtZShub2RlLCBmaWxsKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29udmVydCBjb2xvciB0byBoZXggb3IgcmdiYVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzb2xpZEZpbGwgPSBmaWxsO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb2xvclZhbHVlID0gdGhpcy5yZ2JUb0hleChzb2xpZEZpbGwuY29sb3Iuciwgc29saWRGaWxsLmNvbG9yLmcsIHNvbGlkRmlsbC5jb2xvci5iKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHRvIGNvbG9ycyBjb2xsZWN0aW9uIGlmIG5vdCBhbHJlYWR5IHByZXNlbnRcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmNvbG9yc1tuYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xvcnNbbmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNvbG9yVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NvbG9yJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBDaGVjayBmb3Igc3Ryb2tlc1xuICAgICAgICBpZiAoJ3N0cm9rZXMnIGluIG5vZGUgJiYgbm9kZS5zdHJva2VzICYmIEFycmF5LmlzQXJyYXkobm9kZS5zdHJva2VzKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBzdHJva2Ugb2Ygbm9kZS5zdHJva2VzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0cm9rZS50eXBlID09PSAnU09MSUQnICYmIHN0cm9rZS52aXNpYmxlICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBhIG5hbWUgZm9yIHRoaXMgY29sb3JcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IHRoaXMuZ2V0Q29sb3JUb2tlbk5hbWUobm9kZSwgc3Ryb2tlLCAnc3Ryb2tlJyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgY29sb3IgdG8gaGV4IG9yIHJnYmFcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc29saWRTdHJva2UgPSBzdHJva2U7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbG9yVmFsdWUgPSB0aGlzLnJnYlRvSGV4KHNvbGlkU3Ryb2tlLmNvbG9yLnIsIHNvbGlkU3Ryb2tlLmNvbG9yLmcsIHNvbGlkU3Ryb2tlLmNvbG9yLmIpO1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgdG8gY29sb3JzIGNvbGxlY3Rpb24gaWYgbm90IGFscmVhZHkgcHJlc2VudFxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuY29sb3JzW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbG9yc1tuYW1lXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogY29sb3JWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY29sb3InXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEV4dHJhY3QgdHlwb2dyYXBoeSB0b2tlbnMgZnJvbSB0ZXh0IG5vZGVzXG4gICAgICovXG4gICAgZXh0cmFjdFR5cG9ncmFwaHlGcm9tTm9kZShub2RlKSB7XG4gICAgICAgIGlmIChub2RlLnR5cGUgPT09ICdURVhUJykge1xuICAgICAgICAgICAgLy8gU2tpcCBpZiB1c2luZyBtaXhlZCBzdHlsZXNcbiAgICAgICAgICAgIGlmIChub2RlLmZvbnROYW1lID09PSBmaWdtYS5taXhlZCB8fCBub2RlLmZvbnRTaXplID09PSBmaWdtYS5taXhlZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIGEgbmFtZSBmb3IgdGhpcyB0eXBvZ3JhcGh5IHN0eWxlXG4gICAgICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5nZXRUeXBvZ3JhcGh5VG9rZW5OYW1lKG5vZGUpO1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgdHlwb2dyYXBoeSB0b2tlbiB3aXRoIG9wdGlvbmFsIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IGZvbnRUb2tlbiA9IHtcbiAgICAgICAgICAgICAgICBmb250RmFtaWx5OiBub2RlLmZvbnROYW1lLmZhbWlseSxcbiAgICAgICAgICAgICAgICBmb250U2l6ZTogYCR7bm9kZS5mb250U2l6ZX1weGAsXG4gICAgICAgICAgICAgICAgZm9udFdlaWdodDogdGhpcy5nZXRGb250V2VpZ2h0KG5vZGUuZm9udE5hbWUuc3R5bGUpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gQWRkIGxpbmUgaGVpZ2h0IGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKG5vZGUubGluZUhlaWdodCAhPT0gZmlnbWEubWl4ZWQgJiYgbm9kZS5saW5lSGVpZ2h0LnVuaXQgIT09ICdBVVRPJykge1xuICAgICAgICAgICAgICAgIGlmIChub2RlLmxpbmVIZWlnaHQudW5pdCA9PT0gJ1BJWEVMUycpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9udFRva2VuLmxpbmVIZWlnaHQgPSBgJHtub2RlLmxpbmVIZWlnaHQudmFsdWV9cHhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChub2RlLmxpbmVIZWlnaHQudW5pdCA9PT0gJ1BFUkNFTlQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvbnRUb2tlbi5saW5lSGVpZ2h0ID0gKG5vZGUubGluZUhlaWdodC52YWx1ZSAvIDEwMCkudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBZGQgbGV0dGVyIHNwYWNpbmcgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAobm9kZS5sZXR0ZXJTcGFjaW5nICE9PSBmaWdtYS5taXhlZCkge1xuICAgICAgICAgICAgICAgIGZvbnRUb2tlbi5sZXR0ZXJTcGFjaW5nID0gYCR7bm9kZS5sZXR0ZXJTcGFjaW5nLnZhbHVlfXB4YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEFkZCB0byB0eXBvZ3JhcGh5IGNvbGxlY3Rpb24gaWYgbm90IGFscmVhZHkgcHJlc2VudFxuICAgICAgICAgICAgaWYgKCF0aGlzLnR5cG9ncmFwaHlbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnR5cG9ncmFwaHlbbmFtZV0gPSBmb250VG9rZW47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBzcGFjaW5nIHRva2VucyBmcm9tIGxheW91dCBwcm9wZXJ0aWVzXG4gICAgICovXG4gICAgZXh0cmFjdFNwYWNpbmdGcm9tTm9kZShub2RlKSB7XG4gICAgICAgIC8vIEV4dHJhY3Qgc3BhY2luZyBmcm9tIGF1dG8gbGF5b3V0XG4gICAgICAgIGlmICgnbGF5b3V0TW9kZScgaW4gbm9kZSAmJiAobm9kZS5sYXlvdXRNb2RlID09PSAnSE9SSVpPTlRBTCcgfHwgbm9kZS5sYXlvdXRNb2RlID09PSAnVkVSVElDQUwnKSkge1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBpdGVtIHNwYWNpbmdcbiAgICAgICAgICAgIGlmIChub2RlLml0ZW1TcGFjaW5nID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBgZ2FwLSR7bm9kZS5pdGVtU3BhY2luZ31gO1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5zcGFjaW5nW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BhY2luZ1tuYW1lXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBgJHtub2RlLml0ZW1TcGFjaW5nfXB4YCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlSW5SZW06IGAkeyhub2RlLml0ZW1TcGFjaW5nIC8gMTYpLnRvRml4ZWQoMil9cmVtYFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgcGFkZGluZyB2YWx1ZXNcbiAgICAgICAgICAgIGlmIChub2RlLnBhZGRpbmdMZWZ0ID4gMCB8fCBub2RlLnBhZGRpbmdSaWdodCA+IDAgfHwgbm9kZS5wYWRkaW5nVG9wID4gMCB8fCBub2RlLnBhZGRpbmdCb3R0b20gPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGluZGl2aWR1YWwgcGFkZGluZyB2YWx1ZXNcbiAgICAgICAgICAgICAgICBjb25zdCBwYWRkaW5ncyA9IFtcbiAgICAgICAgICAgICAgICAgICAgeyB2YWx1ZTogbm9kZS5wYWRkaW5nTGVmdCwgbmFtZTogJ3BhZGRpbmctbGVmdCcgfSxcbiAgICAgICAgICAgICAgICAgICAgeyB2YWx1ZTogbm9kZS5wYWRkaW5nUmlnaHQsIG5hbWU6ICdwYWRkaW5nLXJpZ2h0JyB9LFxuICAgICAgICAgICAgICAgICAgICB7IHZhbHVlOiBub2RlLnBhZGRpbmdUb3AsIG5hbWU6ICdwYWRkaW5nLXRvcCcgfSxcbiAgICAgICAgICAgICAgICAgICAgeyB2YWx1ZTogbm9kZS5wYWRkaW5nQm90dG9tLCBuYW1lOiAncGFkZGluZy1ib3R0b20nIH1cbiAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcGFkZGluZyBvZiBwYWRkaW5ncykge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFkZGluZy52YWx1ZSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBgJHtwYWRkaW5nLm5hbWV9LSR7cGFkZGluZy52YWx1ZX1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnNwYWNpbmdbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNwYWNpbmdbbmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBgJHtwYWRkaW5nLnZhbHVlfXB4YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVJblJlbTogYCR7KHBhZGRpbmcudmFsdWUgLyAxNikudG9GaXhlZCgyKX1yZW1gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBhIG5hbWUgZm9yIGEgY29sb3IgdG9rZW4gYmFzZWQgb24gbm9kZSBhbmQgZmlsbFxuICAgICAqL1xuICAgIGdldENvbG9yVG9rZW5OYW1lKG5vZGUsIGZpbGwsIHByZWZpeCA9ICcnKSB7XG4gICAgICAgIGxldCBuYW1lID0gJyc7XG4gICAgICAgIC8vIFRyeSB0byB1c2Ugbm9kZSBuYW1lIGFzIGEgYmFzaXNcbiAgICAgICAgaWYgKG5vZGUubmFtZSAmJiBub2RlLm5hbWUudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgbmFtZSA9IG5vZGUubmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16MC05XS9nLCAnLScpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gbm9kZSB0eXBlXG4gICAgICAgICAgICBuYW1lID0gbm9kZS50eXBlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQWRkIHByZWZpeCBpZiBwcm92aWRlZFxuICAgICAgICBpZiAocHJlZml4KSB7XG4gICAgICAgICAgICBuYW1lID0gYCR7cHJlZml4fS0ke25hbWV9YDtcbiAgICAgICAgfVxuICAgICAgICAvLyBXZSBuZWVkIHRvIGNoZWNrIGZpbGwgaXMgYSBTb2xpZFBhaW50IHRvIGFjY2VzcyBjb2xvciBwcm9wZXJ0eVxuICAgICAgICBpZiAoZmlsbC50eXBlID09PSAnU09MSUQnKSB7XG4gICAgICAgICAgICBjb25zdCBzb2xpZEZpbGwgPSBmaWxsO1xuICAgICAgICAgICAgLy8gQWRkIGEgY29sb3IgZGVzY3JpcHRvciBiYXNlZCBvbiBSR0IgdmFsdWVzXG4gICAgICAgICAgICBjb25zdCByID0gTWF0aC5yb3VuZChzb2xpZEZpbGwuY29sb3IuciAqIDI1NSk7XG4gICAgICAgICAgICBjb25zdCBnID0gTWF0aC5yb3VuZChzb2xpZEZpbGwuY29sb3IuZyAqIDI1NSk7XG4gICAgICAgICAgICBjb25zdCBiID0gTWF0aC5yb3VuZChzb2xpZEZpbGwuY29sb3IuYiAqIDI1NSk7XG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIHByaW1hcnkgY29sb3IsIHRleHQsIGJhY2tncm91bmQsIGV0Yy5cbiAgICAgICAgICAgIGlmIChub2RlLnR5cGUgPT09ICdURVhUJykge1xuICAgICAgICAgICAgICAgIG5hbWUgPSAndGV4dC1jb2xvcic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChuYW1lLmluY2x1ZGVzKCdiYWNrZ3JvdW5kJykgfHwgbmFtZS5pbmNsdWRlcygnYmcnKSkge1xuICAgICAgICAgICAgICAgIG5hbWUgPSAnYmFja2dyb3VuZCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChuYW1lLmluY2x1ZGVzKCdidXR0b24nKSB8fCBuYW1lLmluY2x1ZGVzKCdidG4nKSkge1xuICAgICAgICAgICAgICAgIG5hbWUgPSAncHJpbWFyeSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChyID09PSBnICYmIGcgPT09IGIpIHtcbiAgICAgICAgICAgICAgICAvLyBHcmF5c2NhbGUgY29sb3JcbiAgICAgICAgICAgICAgICBpZiAociA8IDMwKVxuICAgICAgICAgICAgICAgICAgICBuYW1lID0gJ2JsYWNrJztcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChyID4gMjQwKVxuICAgICAgICAgICAgICAgICAgICBuYW1lID0gJ3doaXRlJztcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG5hbWUgPSBgZ3JheS0ke3J9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmFtZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBuYW1lIGZvciBhIHR5cG9ncmFwaHkgdG9rZW4gYmFzZWQgb24gdGV4dCBub2RlXG4gICAgICovXG4gICAgZ2V0VHlwb2dyYXBoeVRva2VuTmFtZShub2RlKSB7XG4gICAgICAgIGxldCBuYW1lID0gJyc7XG4gICAgICAgIC8vIFNraXAgaWYgZm9udCBzaXplIGlzIG1peGVkXG4gICAgICAgIGlmIChub2RlLmZvbnRTaXplID09PSBmaWdtYS5taXhlZCkge1xuICAgICAgICAgICAgcmV0dXJuICd0ZXh0LXN0eWxlJztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBmb250U2l6ZSA9IG5vZGUuZm9udFNpemU7XG4gICAgICAgIC8vIFRyeSB0byBkZXJpdmUgc2VtYW50aWMgbmFtZSBmcm9tIG5vZGUgbmFtZVxuICAgICAgICBjb25zdCBub2RlTmFtZSA9IG5vZGUubmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBpZiAobm9kZU5hbWUuaW5jbHVkZXMoJ2hlYWRpbmcnKSB8fCBub2RlTmFtZS5pbmNsdWRlcygndGl0bGUnKSkge1xuICAgICAgICAgICAgaWYgKGZvbnRTaXplID49IDMyKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9ICdoZWFkaW5nLTEnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZm9udFNpemUgPj0gMjQpIHtcbiAgICAgICAgICAgICAgICBuYW1lID0gJ2hlYWRpbmctMic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBuYW1lID0gJ2hlYWRpbmctMyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobm9kZU5hbWUuaW5jbHVkZXMoJ2JvZHknKSB8fCBub2RlTmFtZS5pbmNsdWRlcygncGFyYWdyYXBoJykpIHtcbiAgICAgICAgICAgIG5hbWUgPSAnYm9keSc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobm9kZU5hbWUuaW5jbHVkZXMoJ2xhYmVsJykgfHwgbm9kZU5hbWUuaW5jbHVkZXMoJ2NhcHRpb24nKSkge1xuICAgICAgICAgICAgbmFtZSA9ICdsYWJlbCc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobm9kZU5hbWUuaW5jbHVkZXMoJ2J1dHRvbicpKSB7XG4gICAgICAgICAgICBuYW1lID0gJ2J1dHRvbi10ZXh0JztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIGJhc2VkIG9uIHNpemVcbiAgICAgICAgICAgIGlmIChmb250U2l6ZSA+PSAzMikge1xuICAgICAgICAgICAgICAgIG5hbWUgPSAnaGVhZGluZy0xJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGZvbnRTaXplID49IDI0KSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9ICdoZWFkaW5nLTInO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZm9udFNpemUgPj0gMjApIHtcbiAgICAgICAgICAgICAgICBuYW1lID0gJ2hlYWRpbmctMyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChmb250U2l6ZSA+PSAxNikge1xuICAgICAgICAgICAgICAgIG5hbWUgPSAnYm9keSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBuYW1lID0gJ2NhcHRpb24nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuYW1lO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGZvbnQgc3R5bGUgc3RyaW5nIHRvIG51bWVyaWMgd2VpZ2h0XG4gICAgICovXG4gICAgZ2V0Rm9udFdlaWdodChmb250U3R5bGUpIHtcbiAgICAgICAgY29uc3Qgc3R5bGUgPSBmb250U3R5bGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgaWYgKHN0eWxlLmluY2x1ZGVzKCd0aGluJykpXG4gICAgICAgICAgICByZXR1cm4gMTAwO1xuICAgICAgICBpZiAoc3R5bGUuaW5jbHVkZXMoJ2V4dHJhIGxpZ2h0JykgfHwgc3R5bGUuaW5jbHVkZXMoJ3VsdHJhbGlnaHQnKSlcbiAgICAgICAgICAgIHJldHVybiAyMDA7XG4gICAgICAgIGlmIChzdHlsZS5pbmNsdWRlcygnbGlnaHQnKSlcbiAgICAgICAgICAgIHJldHVybiAzMDA7XG4gICAgICAgIGlmIChzdHlsZS5pbmNsdWRlcygncmVndWxhcicpIHx8IHN0eWxlLmluY2x1ZGVzKCdub3JtYWwnKSlcbiAgICAgICAgICAgIHJldHVybiA0MDA7XG4gICAgICAgIGlmIChzdHlsZS5pbmNsdWRlcygnbWVkaXVtJykpXG4gICAgICAgICAgICByZXR1cm4gNTAwO1xuICAgICAgICBpZiAoc3R5bGUuaW5jbHVkZXMoJ3NlbWkgYm9sZCcpIHx8IHN0eWxlLmluY2x1ZGVzKCdzZW1pYm9sZCcpKVxuICAgICAgICAgICAgcmV0dXJuIDYwMDtcbiAgICAgICAgaWYgKHN0eWxlLmluY2x1ZGVzKCdib2xkJykpXG4gICAgICAgICAgICByZXR1cm4gNzAwO1xuICAgICAgICBpZiAoc3R5bGUuaW5jbHVkZXMoJ2V4dHJhIGJvbGQnKSB8fCBzdHlsZS5pbmNsdWRlcygnZXh0cmFib2xkJykpXG4gICAgICAgICAgICByZXR1cm4gODAwO1xuICAgICAgICBpZiAoc3R5bGUuaW5jbHVkZXMoJ2JsYWNrJykgfHwgc3R5bGUuaW5jbHVkZXMoJ2hlYXZ5JykpXG4gICAgICAgICAgICByZXR1cm4gOTAwO1xuICAgICAgICByZXR1cm4gNDAwOyAvLyBEZWZhdWx0IGlzIHJlZ3VsYXIvbm9ybWFsXG4gICAgfVxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgUkdCIHZhbHVlcyB0byBoZXggY29sb3JcbiAgICAgKi9cbiAgICByZ2JUb0hleChyLCBnLCBiKSB7XG4gICAgICAgIC8vIENvbnZlcnQgMC0xIHJhbmdlIHRvIDAtMjU1IGludGVnZXJzXG4gICAgICAgIGNvbnN0IHJJbnQgPSBNYXRoLnJvdW5kKHIgKiAyNTUpO1xuICAgICAgICBjb25zdCBnSW50ID0gTWF0aC5yb3VuZChnICogMjU1KTtcbiAgICAgICAgY29uc3QgYkludCA9IE1hdGgucm91bmQoYiAqIDI1NSk7XG4gICAgICAgIC8vIENvbnZlcnQgdG8gaGV4IHN0cmluZ1xuICAgICAgICByZXR1cm4gYCMke3JJbnQudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsICcwJyl9JHtnSW50LnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCAnMCcpfSR7YkludC50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKX1gO1xuICAgIH1cbn1cbi8qKlxuICogTGF5b3V0RXh0cmFjdG9yIGNsYXNzIGZvciBleHRyYWN0aW5nIGxheW91dCBzcGVjaWZpY2F0aW9uc1xuICovXG5leHBvcnQgY2xhc3MgTGF5b3V0RXh0cmFjdG9yIGV4dGVuZHMgQmFzZUV4dHJhY3RvciB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgIC8vIENvbGxlY3Rpb24gb2YgbGF5b3V0IHNwZWNzXG4gICAgICAgIHRoaXMuYXV0b0xheW91dHMgPSBbXTtcbiAgICAgICAgdGhpcy5icmVha3BvaW50cyA9IFszNzUsIDc2OCwgMTAyNCwgMTQ0MF07IC8vIERlZmF1bHQgY29tbW9uIGJyZWFrcG9pbnRzXG4gICAgfVxuICAgIC8qKlxuICAgICAqIEV4dHJhY3QgbGF5b3V0IGluZm9ybWF0aW9uIGZyb20gYSBub2RlIGFuZCBpdHMgY2hpbGRyZW5cbiAgICAgKi9cbiAgICBleHRyYWN0TGF5b3V0SW5mbyhub2RlKSB7XG4gICAgICAgIC8vIFJlc2V0IGxheW91dCBjb2xsZWN0aW9uc1xuICAgICAgICB0aGlzLmF1dG9MYXlvdXRzID0gW107XG4gICAgICAgIC8vIFByb2Nlc3MgdGhlIG5vZGUgaGllcmFyY2h5IHRvIGV4dHJhY3QgbGF5b3V0IGluZm9ybWF0aW9uXG4gICAgICAgIHRoaXMudHJhdmVyc2VOb2RlRm9yTGF5b3V0cyhub2RlKTtcbiAgICAgICAgLy8gT3JnYW5pemUgdGhlIGluZm9ybWF0aW9uIGludG8gdGhlIExheW91dFNwZWNpZmljYXRpb25zIHN0cnVjdHVyZVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2l2ZToge1xuICAgICAgICAgICAgICAgIGJyZWFrcG9pbnRzOiB0aGlzLmJyZWFrcG9pbnRzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYXV0b0xheW91dDogdGhpcy5hdXRvTGF5b3V0c1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmVseSB0cmF2ZXJzZSBub2RlIHRyZWUgdG8gZmluZCBsYXlvdXQgc3BlY2lmaWNhdGlvbnNcbiAgICAgKi9cbiAgICB0cmF2ZXJzZU5vZGVGb3JMYXlvdXRzKG5vZGUpIHtcbiAgICAgICAgLy8gRXh0cmFjdCBhdXRvIGxheW91dCBpbmZvcm1hdGlvblxuICAgICAgICBpZiAoJ2xheW91dE1vZGUnIGluIG5vZGUgJiYgKG5vZGUubGF5b3V0TW9kZSA9PT0gJ0hPUklaT05UQUwnIHx8IG5vZGUubGF5b3V0TW9kZSA9PT0gJ1ZFUlRJQ0FMJykpIHtcbiAgICAgICAgICAgIHRoaXMuZXh0cmFjdEF1dG9MYXlvdXRGcm9tTm9kZShub2RlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBQcm9jZXNzIGNoaWxkcmVuIGlmIGFueVxuICAgICAgICBpZiAoJ2NoaWxkcmVuJyBpbiBub2RlICYmIEFycmF5LmlzQXJyYXkobm9kZS5jaGlsZHJlbikpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgcHJvY2VzcyBzY2VuZU5vZGUgdHlwZSBjaGlsZHJlblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzU2NlbmVOb2RlKGNoaWxkKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRyYXZlcnNlTm9kZUZvckxheW91dHMoY2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBVc2luZyBpc1NjZW5lTm9kZSBmcm9tIEJhc2VFeHRyYWN0b3JcbiAgICAvKipcbiAgICAgKiBFeHRyYWN0IGF1dG8gbGF5b3V0IGluZm9ybWF0aW9uIGZyb20gYSBmcmFtZVxuICAgICAqL1xuICAgIGV4dHJhY3RBdXRvTGF5b3V0RnJvbU5vZGUobm9kZSkge1xuICAgICAgICAvLyBDaGVjayBpZiBub2RlIGFjdHVhbGx5IGhhcyBsYXlvdXQgbW9kZSBwcm9wZXJ0eVxuICAgICAgICBpZiAoISgnbGF5b3V0TW9kZScgaW4gbm9kZSkpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIC8vIENhc3QgdG8gYSBub2RlIHR5cGUgdGhhdCBoYXMgbGF5b3V0TW9kZSBwcm9wZXJ0eVxuICAgICAgICBjb25zdCBsYXlvdXROb2RlID0gbm9kZTtcbiAgICAgICAgLy8gT25seSBwcm9jZXNzIGlmIHVzaW5nIGF1dG8gbGF5b3V0XG4gICAgICAgIGlmIChsYXlvdXROb2RlLmxheW91dE1vZGUgPT09ICdOT05FJylcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgLy8gQ3JlYXRlIENTUyBwcm9wZXJ0aWVzIGZvciB0aGlzIGxheW91dFxuICAgICAgICBjb25zdCBjc3NQcm9wZXJ0aWVzID0ge1xuICAgICAgICAgICAgJ2Rpc3BsYXknOiAnZmxleCcsXG4gICAgICAgICAgICAnZmxleC1kaXJlY3Rpb24nOiBsYXlvdXROb2RlLmxheW91dE1vZGUgPT09ICdIT1JJWk9OVEFMJyA/ICdyb3cnIDogJ2NvbHVtbidcbiAgICAgICAgfTtcbiAgICAgICAgLy8gQWRkIGdhcCBpZiBkZWZpbmVkXG4gICAgICAgIGlmIChsYXlvdXROb2RlLml0ZW1TcGFjaW5nID4gMCkge1xuICAgICAgICAgICAgY3NzUHJvcGVydGllc1snZ2FwJ10gPSBgJHtsYXlvdXROb2RlLml0ZW1TcGFjaW5nfXB4YDtcbiAgICAgICAgfVxuICAgICAgICAvLyBBZGQgcGFkZGluZyBpZiBkZWZpbmVkXG4gICAgICAgIGNvbnN0IHBhZGRpbmcgPSBbXTtcbiAgICAgICAgaWYgKGxheW91dE5vZGUucGFkZGluZ1RvcCA+IDApXG4gICAgICAgICAgICBwYWRkaW5nLnB1c2goYCR7bGF5b3V0Tm9kZS5wYWRkaW5nVG9wfXB4YCk7XG4gICAgICAgIGlmIChsYXlvdXROb2RlLnBhZGRpbmdSaWdodCA+IDApXG4gICAgICAgICAgICBwYWRkaW5nLnB1c2goYCR7bGF5b3V0Tm9kZS5wYWRkaW5nUmlnaHR9cHhgKTtcbiAgICAgICAgaWYgKGxheW91dE5vZGUucGFkZGluZ0JvdHRvbSA+IDApXG4gICAgICAgICAgICBwYWRkaW5nLnB1c2goYCR7bGF5b3V0Tm9kZS5wYWRkaW5nQm90dG9tfXB4YCk7XG4gICAgICAgIGlmIChsYXlvdXROb2RlLnBhZGRpbmdMZWZ0ID4gMClcbiAgICAgICAgICAgIHBhZGRpbmcucHVzaChgJHtsYXlvdXROb2RlLnBhZGRpbmdMZWZ0fXB4YCk7XG4gICAgICAgIGlmIChwYWRkaW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNzc1Byb3BlcnRpZXNbJ3BhZGRpbmcnXSA9IHBhZGRpbmcuam9pbignICcpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCBhbGlnbm1lbnQgcHJvcGVydGllc1xuICAgICAgICBpZiAobGF5b3V0Tm9kZS5wcmltYXJ5QXhpc0FsaWduSXRlbXMgPT09ICdDRU5URVInKSB7XG4gICAgICAgICAgICBjc3NQcm9wZXJ0aWVzWydqdXN0aWZ5LWNvbnRlbnQnXSA9ICdjZW50ZXInO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGxheW91dE5vZGUucHJpbWFyeUF4aXNBbGlnbkl0ZW1zID09PSAnTUFYJykge1xuICAgICAgICAgICAgY3NzUHJvcGVydGllc1snanVzdGlmeS1jb250ZW50J10gPSAnZmxleC1lbmQnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGxheW91dE5vZGUucHJpbWFyeUF4aXNBbGlnbkl0ZW1zID09PSAnU1BBQ0VfQkVUV0VFTicpIHtcbiAgICAgICAgICAgIGNzc1Byb3BlcnRpZXNbJ2p1c3RpZnktY29udGVudCddID0gJ3NwYWNlLWJldHdlZW4nO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsYXlvdXROb2RlLmNvdW50ZXJBeGlzQWxpZ25JdGVtcyA9PT0gJ0NFTlRFUicpIHtcbiAgICAgICAgICAgIGNzc1Byb3BlcnRpZXNbJ2FsaWduLWl0ZW1zJ10gPSAnY2VudGVyJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChsYXlvdXROb2RlLmNvdW50ZXJBeGlzQWxpZ25JdGVtcyA9PT0gJ01BWCcpIHtcbiAgICAgICAgICAgIGNzc1Byb3BlcnRpZXNbJ2FsaWduLWl0ZW1zJ10gPSAnZmxleC1lbmQnO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCB0byBsYXlvdXRzIGNvbGxlY3Rpb25cbiAgICAgICAgdGhpcy5hdXRvTGF5b3V0cy5wdXNoKHtcbiAgICAgICAgICAgIGRpcmVjdGlvbjogbGF5b3V0Tm9kZS5sYXlvdXRNb2RlID09PSAnSE9SSVpPTlRBTCcgPyAncm93JyA6ICdjb2x1bW4nLFxuICAgICAgICAgICAgZ2FwOiBsYXlvdXROb2RlLml0ZW1TcGFjaW5nLFxuICAgICAgICAgICAgY3NzUHJvcGVydGllc1xuICAgICAgICB9KTtcbiAgICB9XG59XG4vKipcbiAqIENvbXBvbmVudEV4dHJhY3RvciBjbGFzcyBmb3IgZXh0cmFjdGluZyBjb21wb25lbnQgaW5mb3JtYXRpb25cbiAqL1xuZXhwb3J0IGNsYXNzIENvbXBvbmVudEV4dHJhY3RvciBleHRlbmRzIEJhc2VFeHRyYWN0b3Ige1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlciguLi5hcmd1bWVudHMpO1xuICAgICAgICAvLyBDb2xsZWN0aW9uIG9mIGNvbXBvbmVudCBpbmZvcm1hdGlvblxuICAgICAgICB0aGlzLmNvbXBvbmVudHMgPSBbXTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBjb21wb25lbnQgaW5mb3JtYXRpb24gZnJvbSBhIG5vZGUgYW5kIGl0cyBjaGlsZHJlblxuICAgICAqL1xuICAgIGV4dHJhY3RDb21wb25lbnRJbmZvKG5vZGUpIHtcbiAgICAgICAgLy8gUmVzZXQgY29tcG9uZW50IGNvbGxlY3Rpb25cbiAgICAgICAgdGhpcy5jb21wb25lbnRzID0gW107XG4gICAgICAgIC8vIFByb2Nlc3MgdGhlIG5vZGUgaGllcmFyY2h5IHRvIGV4dHJhY3QgY29tcG9uZW50IGluZm9ybWF0aW9uXG4gICAgICAgIHRoaXMudHJhdmVyc2VOb2RlRm9yQ29tcG9uZW50cyhub2RlKTtcbiAgICAgICAgLy8gT3JnYW5pemUgdGhlIGluZm9ybWF0aW9uIGludG8gdGhlIENvbXBvbmVudFNwZWNpZmljYXRpb25zIHN0cnVjdHVyZVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY29tcG9uZW50czogdGhpcy5jb21wb25lbnRzXG4gICAgICAgIH07XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFJlY3Vyc2l2ZWx5IHRyYXZlcnNlIG5vZGUgdHJlZSB0byBmaW5kIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICB0cmF2ZXJzZU5vZGVGb3JDb21wb25lbnRzKG5vZGUpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGNvbXBvbmVudCBvciBjb21wb25lbnQgc2V0XG4gICAgICAgIGlmIChub2RlLnR5cGUgPT09ICdDT01QT05FTlQnKSB7XG4gICAgICAgICAgICB0aGlzLmV4dHJhY3RDb21wb25lbnRGcm9tTm9kZShub2RlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChub2RlLnR5cGUgPT09ICdDT01QT05FTlRfU0VUJykge1xuICAgICAgICAgICAgdGhpcy5leHRyYWN0Q29tcG9uZW50U2V0RnJvbU5vZGUobm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUHJvY2VzcyBjaGlsZHJlbiBpZiBhbnlcbiAgICAgICAgaWYgKCdjaGlsZHJlbicgaW4gbm9kZSAmJiBBcnJheS5pc0FycmF5KG5vZGUuY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IHByb2Nlc3Mgc2NlbmVOb2RlIHR5cGUgY2hpbGRyZW5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1NjZW5lTm9kZShjaGlsZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cmF2ZXJzZU5vZGVGb3JDb21wb25lbnRzKGNoaWxkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gVXNpbmcgaXNTY2VuZU5vZGUgZnJvbSBCYXNlRXh0cmFjdG9yXG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBpbmZvcm1hdGlvbiBmcm9tIGEgY29tcG9uZW50XG4gICAgICovXG4gICAgZXh0cmFjdENvbXBvbmVudEZyb21Ob2RlKG5vZGUpIHtcbiAgICAgICAgLy8gR2V0IGNvbXBvbmVudCBuYW1lXG4gICAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLmdldENvbXBvbmVudE5hbWUobm9kZSk7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgY29tcG9uZW50IGlzIGFscmVhZHkgaW4gb3VyIGNvbGxlY3Rpb25cbiAgICAgICAgY29uc3QgZXhpc3RpbmdDb21wb25lbnQgPSB0aGlzLmNvbXBvbmVudHMuZmluZChjID0+IGMubmFtZSA9PT0gbmFtZSk7XG4gICAgICAgIGlmIChleGlzdGluZ0NvbXBvbmVudCkge1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBBbHJlYWR5IHByb2Nlc3NlZFxuICAgICAgICB9XG4gICAgICAgIC8vIENyZWF0ZSBhIHNpbXBsZSBjb21wb25lbnQgZW50cnkgKG5vIHZhcmlhbnRzKVxuICAgICAgICB0aGlzLmNvbXBvbmVudHMucHVzaCh7XG4gICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgcHJvcGVydGllczogW11cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEV4dHJhY3QgaW5mb3JtYXRpb24gZnJvbSBhIGNvbXBvbmVudCBzZXQgKHZhcmlhbnRzKVxuICAgICAqL1xuICAgIGV4dHJhY3RDb21wb25lbnRTZXRGcm9tTm9kZShub2RlKSB7XG4gICAgICAgIC8vIEdldCBjb21wb25lbnQgbmFtZSAod2l0aG91dCB2YXJpYW50IGluZm8pXG4gICAgICAgIGNvbnN0IGJhc2VOYW1lID0gdGhpcy5nZXRDb21wb25lbnRCYXNlTmFtZShub2RlKTtcbiAgICAgICAgLy8gRXh0cmFjdCB2YXJpYW50IHByb3BlcnRpZXNcbiAgICAgICAgY29uc3QgdmFyaWFudFByb3BlcnRpZXMgPSB7fTtcbiAgICAgICAgLy8gUHJvY2VzcyBhbGwgY2hpbGRyZW4gKHZhcmlhbnRzKVxuICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGlmIChjaGlsZC50eXBlID09PSAnQ09NUE9ORU5UJykge1xuICAgICAgICAgICAgICAgIC8vIFNraXAgY29tcG9uZW50cyB3aXRoIG5vIHZhcmlhbnQgcHJvcGVydGllc1xuICAgICAgICAgICAgICAgIGlmICghY2hpbGQubmFtZS5pbmNsdWRlcygnPScpKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IHZhcmlhbnQgcHJvcGVydGllcyBmcm9tIG5hbWUgKGZvcm1hdDogXCJOYW1lLCBwcm9wMT12YWx1ZTEsIHByb3AyPXZhbHVlMlwiKVxuICAgICAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gY2hpbGQubmFtZS5zcGxpdCgnLCcpLm1hcChwID0+IHAudHJpbSgpKTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhcmlhbnRQYXJ0ID0gcGFydHNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YXJpYW50UGFydC5pbmNsdWRlcygnPScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBbcHJvcCwgdmFsdWVdID0gdmFyaWFudFBhcnQuc3BsaXQoJz0nKS5tYXAocCA9PiBwLnRyaW0oKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHNldCBmb3IgdGhpcyBwcm9wZXJ0eSBpZiBub3QgZXhpc3RzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXZhcmlhbnRQcm9wZXJ0aWVzW3Byb3BdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFudFByb3BlcnRpZXNbcHJvcF0gPSBuZXcgU2V0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBZGQgdmFsdWUgdG8gdGhlIHNldFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFudFByb3BlcnRpZXNbcHJvcF0uYWRkKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBDcmVhdGUgY29tcG9uZW50IGVudHJ5IHdpdGggdmFyaWFudHNcbiAgICAgICAgY29uc3QgY29tcG9uZW50SW5mbyA9IHtcbiAgICAgICAgICAgIG5hbWU6IGJhc2VOYW1lLFxuICAgICAgICAgICAgcHJvcGVydGllczogT2JqZWN0LmVudHJpZXModmFyaWFudFByb3BlcnRpZXMpLm1hcCgoW25hbWUsIHZhbHVlc10pID0+ICh7XG4gICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICBvcHRpb25zOiBBcnJheS5mcm9tKHZhbHVlcylcbiAgICAgICAgICAgIH0pKVxuICAgICAgICB9O1xuICAgICAgICAvLyBBZGQgdG8gY29tcG9uZW50cyBjb2xsZWN0aW9uXG4gICAgICAgIHRoaXMuY29tcG9uZW50cy5wdXNoKGNvbXBvbmVudEluZm8pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGJhc2UgY29tcG9uZW50IG5hbWUgd2l0aG91dCB2YXJpYW50IGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgZ2V0Q29tcG9uZW50QmFzZU5hbWUobm9kZSkge1xuICAgICAgICAvLyBGb3IgY29tcG9uZW50IHNldHMsIHVzZSB0aGUgc2V0IG5hbWVcbiAgICAgICAgaWYgKG5vZGUudHlwZSA9PT0gJ0NPTVBPTkVOVF9TRVQnKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZS5uYW1lO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZvciBjb21wb25lbnRzIHdpdGggdmFyaWFudCBwcm9wZXJ0aWVzLCBleHRyYWN0IGJhc2UgbmFtZVxuICAgICAgICBpZiAobm9kZS5uYW1lLmluY2x1ZGVzKCcsJykpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlLm5hbWUuc3BsaXQoJywnKVswXS50cmltKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5vZGUubmFtZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IGEgY2xlYW5lZCBjb21wb25lbnQgbmFtZVxuICAgICAqL1xuICAgIGdldENvbXBvbmVudE5hbWUobm9kZSkge1xuICAgICAgICBsZXQgbmFtZSA9ICcnO1xuICAgICAgICAvLyBVc2Ugbm9kZSBuYW1lIGFzIGJhc2lzXG4gICAgICAgIGlmIChub2RlLm5hbWUgJiYgbm9kZS5uYW1lLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgYmFzZSBuYW1lIChiZWZvcmUgYW55IHZhcmlhbnQgaW5mb3JtYXRpb24pXG4gICAgICAgICAgICBpZiAobm9kZS5uYW1lLmluY2x1ZGVzKCcsJykpIHtcbiAgICAgICAgICAgICAgICBuYW1lID0gbm9kZS5uYW1lLnNwbGl0KCcsJylbMF0udHJpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IG5vZGUubmFtZS50cmltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBDb252ZXJ0IHRvIFBhc2NhbENhc2UgZm9yIGNvbXBvbmVudCBuYW1lc1xuICAgICAgICAgICAgbmFtZSA9IG5hbWVcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgvW15hLXpBLVowLTkgXS9nLCAnJylcbiAgICAgICAgICAgICAgICAuc3BsaXQoJyAnKVxuICAgICAgICAgICAgICAgIC5tYXAod29yZCA9PiB3b3JkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgd29yZC5zbGljZSgxKS50b0xvd2VyQ2FzZSgpKVxuICAgICAgICAgICAgICAgIC5qb2luKCcnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGdlbmVyaWMgbmFtZSArIElEXG4gICAgICAgICAgICBuYW1lID0gJ0NvbXBvbmVudCcgKyBub2RlLmlkLnN1YnN0cmluZygwLCA0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmFtZTtcbiAgICB9XG59XG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsIi8vIEZpZ21hRGV2IEFjY2VsZXJhdG9yIC0gTWFpbiBQbHVnaW4gQ29kZVxuLy8gVGhpcyBmaWxlIGNvbnRhaW5zIHRoZSBjb3JlIGxvZ2ljIGZvciB0aGUgcGx1Z2luXG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbmltcG9ydCB7IFRva2VuRXh0cmFjdG9yLCBMYXlvdXRFeHRyYWN0b3IsIENvbXBvbmVudEV4dHJhY3RvciB9IGZyb20gJy4vZXh0cmFjdG9ycyc7XG4vLyBEZWZhdWx0IGNvbmZpZ3VyYXRpb24gc2V0dGluZ3NcbmxldCBjb25maWcgPSB7XG4gICAgY3NzVW5pdHM6ICdweCcsXG4gICAgY2xhc3NOYW1pbmdTdHJhdGVneTogJ2xheWVyLWJhc2VkJyxcbiAgICBhdHRyaWJ1dGVDYXNpbmc6ICdrZWJhYi1jYXNlJyxcbiAgICBsYXlvdXRQcmVmZXJlbmNlOiAnZmxleGJveCcsXG4gICAgc3ZnRXhwb3J0TW9kZTogJ2lubGluZScsXG4gICAgZXh0cmFjdERlc2lnblRva2VuczogdHJ1ZSxcbiAgICBleHRyYWN0TGF5b3V0SW5mbzogdHJ1ZSxcbiAgICBleHRyYWN0Q29tcG9uZW50SW5mbzogdHJ1ZVxufTtcbi8vIFNob3cgdGhlIFVJIGZvciBwbHVnaW4gc2V0dGluZ3NcbmZpZ21hLnVpLm9ubWVzc2FnZSA9IChtZXNzYWdlKSA9PiB7XG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ3VwZGF0ZS1jb25maWcnKSB7XG4gICAgICAgIC8vIFVwZGF0ZSBjb25maWd1cmF0aW9uIHNldHRpbmdzXG4gICAgICAgIGNvbmZpZyA9IE9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSwgY29uZmlnKSwgbWVzc2FnZS5jb25maWcpO1xuICAgICAgICBmaWdtYS5jbGllbnRTdG9yYWdlLnNldEFzeW5jKCdwbHVnaW4tY29uZmlnJywgY29uZmlnKTtcbiAgICB9XG4gICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ2dldC1jb25maWcnKSB7XG4gICAgICAgIC8vIFNlbmQgY3VycmVudCBjb25maWcgdG8gVUlcbiAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgdHlwZTogJ2NvbmZpZycsXG4gICAgICAgICAgICBjb25maWdcbiAgICAgICAgfSk7XG4gICAgfVxufTtcbi8vIExvYWQgc2F2ZWQgY29uZmlndXJhdGlvbiBvbiBzdGFydHVwXG5mdW5jdGlvbiBpbml0aWFsaXplKCkge1xuICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICAgIGNvbnN0IHNhdmVkQ29uZmlnID0geWllbGQgZmlnbWEuY2xpZW50U3RvcmFnZS5nZXRBc3luYygncGx1Z2luLWNvbmZpZycpO1xuICAgICAgICBpZiAoc2F2ZWRDb25maWcpIHtcbiAgICAgICAgICAgIGNvbmZpZyA9IE9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSwgY29uZmlnKSwgc2F2ZWRDb25maWcpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFJlZ2lzdGVyIGZvciBjb2RlZ2VuIGV2ZW50c1xuICAgICAgICBmaWdtYS5jb2RlZ2VuLm9uKCdnZW5lcmF0ZScsIChldmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgeyBsYW5ndWFnZSwgbm9kZSB9ID0gZXZlbnQ7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB2YWxpZCBub2RlIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3sgbGFuZ3VhZ2U6ICdQTEFJTlRFWFQnLCBjb2RlOiBcIi8vIE5vIG5vZGUgc2VsZWN0ZWRcIiwgdGl0bGU6IFwiRXJyb3JcIiB9XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIGNvZGUgYmFzZWQgb24gcmVxdWVzdGVkIGxhbmd1YWdlXG4gICAgICAgICAgICBzd2l0Y2ggKGxhbmd1YWdlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnSFRNTCc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhbmd1YWdlOiAnSFRNTCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogZ2VuZXJhdGVIdG1sQ29kZShub2RlLCBjb25maWcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnSFRNTCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dO1xuICAgICAgICAgICAgICAgIGNhc2UgJ0NTUyc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhbmd1YWdlOiAnQ1NTJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiBnZW5lcmF0ZUNzc0NvZGUobm9kZSwgY29uZmlnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0NTUydcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dO1xuICAgICAgICAgICAgICAgIGNhc2UgJ0RFU0lHTl9UT0tFTlMnOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYW5ndWFnZTogJ0pTT04nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IGdlbmVyYXRlRGVzaWduVG9rZW5zKG5vZGUsIGNvbmZpZyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdEZXNpZ24gVG9rZW5zJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfV07XG4gICAgICAgICAgICAgICAgY2FzZSAnTEFZT1VUX0lORk8nOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYW5ndWFnZTogJ0pTT04nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IGdlbmVyYXRlTGF5b3V0SW5mbyhub2RlLCBjb25maWcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnTGF5b3V0IEluZm9ybWF0aW9uJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfV07XG4gICAgICAgICAgICAgICAgY2FzZSAnQ09NUE9ORU5UX0lORk8nOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYW5ndWFnZTogJ0pTT04nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IGdlbmVyYXRlQ29tcG9uZW50SW5mbyhub2RlLCBjb25maWcpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnQ29tcG9uZW50IEluZm9ybWF0aW9uJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfV07XG4gICAgICAgICAgICAgICAgY2FzZSAnQUlfUEFDS0FHRSc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhbmd1YWdlOiAnSlNPTicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogZ2VuZXJhdGVBSVBhY2thZ2Uobm9kZSwgY29uZmlnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ0FJIERlc2lnbiBQYWNrYWdlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfV07XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFuZ3VhZ2U6ICdQTEFJTlRFWFQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IFwiLy8gTGFuZ3VhZ2Ugbm90IHN1cHBvcnRlZDogXCIgKyBsYW5ndWFnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogXCJVbnN1cHBvcnRlZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG4vLyBJbml0aWFsaXplIHBsdWdpblxuaW5pdGlhbGl6ZSgpO1xuLyoqXG4gKiBFeHRyYWN0cyBkZXNpZ24gdG9rZW5zIChjb2xvcnMsIHR5cG9ncmFwaHksIHNwYWNpbmcpIGZyb20gdGhlIGRvY3VtZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZURlc2lnblRva2Vucyhub2RlLCBjb25maWcpIHtcbiAgICBjb25zdCBwcm9jZXNzb3IgPSBuZXcgVG9rZW5FeHRyYWN0b3IoKTtcbiAgICBjb25zdCBkZXNpZ25Ub2tlbnMgPSBwcm9jZXNzb3IuZXh0cmFjdERlc2lnblRva2Vucyhub2RlKTtcbiAgICAvLyBGb3JtYXQgYXMgbmljZWx5IGluZGVudGVkIEpTT05cbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGVzaWduVG9rZW5zLCBudWxsLCAyKTtcbn1cbi8qKlxuICogRXh0cmFjdHMgbGF5b3V0IGluZm9ybWF0aW9uIGZyb20gdGhlIGRvY3VtZW50XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUxheW91dEluZm8obm9kZSwgY29uZmlnKSB7XG4gICAgY29uc3QgcHJvY2Vzc29yID0gbmV3IExheW91dEV4dHJhY3RvcigpO1xuICAgIGNvbnN0IGxheW91dEluZm8gPSBwcm9jZXNzb3IuZXh0cmFjdExheW91dEluZm8obm9kZSk7XG4gICAgLy8gRm9ybWF0IGFzIG5pY2VseSBpbmRlbnRlZCBKU09OXG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGxheW91dEluZm8sIG51bGwsIDIpO1xufVxuLyoqXG4gKiBFeHRyYWN0cyBjb21wb25lbnQgaW5mb3JtYXRpb24gZnJvbSB0aGUgZG9jdW1lbnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlQ29tcG9uZW50SW5mbyhub2RlLCBjb25maWcpIHtcbiAgICBjb25zdCBwcm9jZXNzb3IgPSBuZXcgQ29tcG9uZW50RXh0cmFjdG9yKCk7XG4gICAgY29uc3QgY29tcG9uZW50SW5mbyA9IHByb2Nlc3Nvci5leHRyYWN0Q29tcG9uZW50SW5mbyhub2RlKTtcbiAgICAvLyBGb3JtYXQgYXMgbmljZWx5IGluZGVudGVkIEpTT05cbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoY29tcG9uZW50SW5mbywgbnVsbCwgMik7XG59XG4vKipcbiAqIEdlbmVyYXRlcyBhIGNvbXBsZXRlIEFJIHBhY2thZ2Ugd2l0aCBhbGwgZGVzaWduIGluZm9ybWF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUFJUGFja2FnZShub2RlLCBjb25maWcpIHtcbiAgICAvLyBDcmVhdGUgYSBjb21wcmVoZW5zaXZlIHBhY2thZ2Ugd2l0aCBhbGwgZXh0cmFjdGVkIGluZm9ybWF0aW9uXG4gICAgY29uc3QgaHRtbFByb2Nlc3NvciA9IG5ldyBOb2RlUHJvY2Vzc29yKGNvbmZpZyk7XG4gICAgY29uc3QgaHRtbFJlc3VsdCA9IGh0bWxQcm9jZXNzb3IucHJvY2Vzc05vZGVGb3JIdG1sKG5vZGUpO1xuICAgIGNvbnN0IGNzc1Jlc3VsdCA9IGh0bWxQcm9jZXNzb3IucHJvY2Vzc05vZGVGb3JDc3Mobm9kZSk7XG4gICAgY29uc3QgdG9rZW5FeHRyYWN0b3IgPSBuZXcgVG9rZW5FeHRyYWN0b3IoKTtcbiAgICBjb25zdCBkZXNpZ25Ub2tlbnMgPSB0b2tlbkV4dHJhY3Rvci5leHRyYWN0RGVzaWduVG9rZW5zKG5vZGUpO1xuICAgIGNvbnN0IGxheW91dEV4dHJhY3RvciA9IG5ldyBMYXlvdXRFeHRyYWN0b3IoKTtcbiAgICBjb25zdCBsYXlvdXRJbmZvID0gbGF5b3V0RXh0cmFjdG9yLmV4dHJhY3RMYXlvdXRJbmZvKG5vZGUpO1xuICAgIGNvbnN0IGNvbXBvbmVudEV4dHJhY3RvciA9IG5ldyBDb21wb25lbnRFeHRyYWN0b3IoKTtcbiAgICBjb25zdCBjb21wb25lbnRJbmZvID0gY29tcG9uZW50RXh0cmFjdG9yLmV4dHJhY3RDb21wb25lbnRJbmZvKG5vZGUpO1xuICAgIC8vIENvbWJpbmUgYWxsIGRhdGFcbiAgICBjb25zdCBhaVBhY2thZ2UgPSB7XG4gICAgICAgIGh0bWw6IGZvcm1hdEh0bWwoaHRtbFJlc3VsdC5odG1sKSxcbiAgICAgICAgY3NzOiBmb3JtYXRDc3MoY3NzUmVzdWx0LmNzcyksXG4gICAgICAgIGRlc2lnblRva2VucyxcbiAgICAgICAgbGF5b3V0U3BlY2lmaWNhdGlvbnM6IGxheW91dEluZm8sXG4gICAgICAgIGNvbXBvbmVudFNwZWNpZmljYXRpb25zOiBjb21wb25lbnRJbmZvXG4gICAgfTtcbiAgICAvLyBGb3JtYXQgYXMgbmljZWx5IGluZGVudGVkIEpTT05cbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYWlQYWNrYWdlLCBudWxsLCAyKTtcbn1cbi8qKlxuICogR2VuZXJhdGVzIEhUTUwgY29kZSBmb3IgdGhlIHNlbGVjdGVkIG5vZGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlSHRtbENvZGUobm9kZSwgY29uZmlnKSB7XG4gICAgLy8gQ3JlYXRlIGEgbm9kZSBwcm9jZXNzb3IgZm9yIEhUTUwgZ2VuZXJhdGlvblxuICAgIGNvbnN0IHByb2Nlc3NvciA9IG5ldyBOb2RlUHJvY2Vzc29yKGNvbmZpZyk7XG4gICAgY29uc3QgcmVzdWx0ID0gcHJvY2Vzc29yLnByb2Nlc3NOb2RlRm9ySHRtbChub2RlKTtcbiAgICAvLyBGb3JtYXQgZmluYWwgSFRNTFxuICAgIHJldHVybiBmb3JtYXRIdG1sKHJlc3VsdC5odG1sKTtcbn1cbi8qKlxuICogR2VuZXJhdGVzIENTUyBjb2RlIGZvciB0aGUgc2VsZWN0ZWQgbm9kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVDc3NDb2RlKG5vZGUsIGNvbmZpZykge1xuICAgIC8vIENyZWF0ZSBhIG5vZGUgcHJvY2Vzc29yIGZvciBDU1MgZ2VuZXJhdGlvblxuICAgIGNvbnN0IHByb2Nlc3NvciA9IG5ldyBOb2RlUHJvY2Vzc29yKGNvbmZpZyk7XG4gICAgY29uc3QgcmVzdWx0ID0gcHJvY2Vzc29yLnByb2Nlc3NOb2RlRm9yQ3NzKG5vZGUpO1xuICAgIC8vIEZvcm1hdCBmaW5hbCBDU1NcbiAgICByZXR1cm4gZm9ybWF0Q3NzKHJlc3VsdC5jc3MpO1xufVxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gZm9ybWF0IEhUTUwgY29kZVxuICovXG5mdW5jdGlvbiBmb3JtYXRIdG1sKGh0bWwpIHtcbiAgICAvLyBTaW1wbGUgaW5kZW50YXRpb24gZm9yIEhUTUxcbiAgICAvLyBGb3IgYSBwcm9kdWN0aW9uIHBsdWdpbiwgdXNlIGEgcHJvcGVyIEhUTUwgZm9ybWF0dGVyXG4gICAgbGV0IGluZGVudExldmVsID0gMDtcbiAgICBsZXQgZm9ybWF0dGVkSHRtbCA9ICcnO1xuICAgIGxldCBpblRhZyA9IGZhbHNlO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaHRtbC5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBjaGFyID0gaHRtbFtpXTtcbiAgICAgICAgaWYgKGNoYXIgPT09ICc8JyAmJiBodG1sW2kgKyAxXSAhPT0gJy8nKSB7XG4gICAgICAgICAgICBpZiAoaSA+IDApXG4gICAgICAgICAgICAgICAgZm9ybWF0dGVkSHRtbCArPSAnXFxuJyArICcgICcucmVwZWF0KGluZGVudExldmVsKTtcbiAgICAgICAgICAgIGluZGVudExldmVsKys7XG4gICAgICAgICAgICBpblRhZyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY2hhciA9PT0gJzwnICYmIGh0bWxbaSArIDFdID09PSAnLycpIHtcbiAgICAgICAgICAgIGluZGVudExldmVsLS07XG4gICAgICAgICAgICBpZiAoaHRtbFtpIC0gMV0gIT09ICc+Jykge1xuICAgICAgICAgICAgICAgIGZvcm1hdHRlZEh0bWwgKz0gJ1xcbicgKyAnICAnLnJlcGVhdChpbmRlbnRMZXZlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpblRhZyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY2hhciA9PT0gJz4nICYmIGluVGFnKSB7XG4gICAgICAgICAgICBpblRhZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGZvcm1hdHRlZEh0bWwgKz0gY2hhcjtcbiAgICB9XG4gICAgcmV0dXJuIGZvcm1hdHRlZEh0bWw7XG59XG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBmb3JtYXQgQ1NTIGNvZGVcbiAqL1xuZnVuY3Rpb24gZm9ybWF0Q3NzKGNzcykge1xuICAgIC8vIFNpbXBsZSBDU1MgZm9ybWF0dGluZ1xuICAgIC8vIEZvciBhIHByb2R1Y3Rpb24gcGx1Z2luLCB1c2UgYSBwcm9wZXIgQ1NTIGZvcm1hdHRlclxuICAgIC8vIEZvcm1hdCBtZWRpYSBxdWVyaWVzIHNwZWNpYWxseVxuICAgIGxldCBmb3JtYXR0ZWRDc3MgPSBjc3M7XG4gICAgLy8gSGFuZGxlIG1lZGlhIHF1ZXJpZXMgd2l0aCBuZXN0ZWQgcnVsZXNcbiAgICBmb3JtYXR0ZWRDc3MgPSBmb3JtYXR0ZWRDc3MucmVwbGFjZSgvQG1lZGlhXFxzKlxcKFteKV0rXFwpXFxzKlxceyhbXn1dKylcXH0vZywgKG1hdGNoLCBjb250ZW50cykgPT4ge1xuICAgICAgICAvLyBGb3JtYXQgdGhlIG1lZGlhIHF1ZXJ5IGNvbnRlbnRzIHdpdGggYWRkaXRpb25hbCBpbmRlbnRhdGlvblxuICAgICAgICBjb25zdCBmb3JtYXR0ZWRDb250ZW50cyA9IGNvbnRlbnRzXG4gICAgICAgICAgICAucmVwbGFjZSgvKFtee10rKVxceyhbXn1dKylcXH0vZywgKGlubmVyTWF0Y2gsIHNlbGVjdG9yLCBwcm9wcykgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHJpbW1lZFNlbGVjdG9yID0gc2VsZWN0b3IudHJpbSgpO1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkUHJvcHMgPSBwcm9wc1xuICAgICAgICAgICAgICAgIC5zcGxpdCgnOycpXG4gICAgICAgICAgICAgICAgLmZpbHRlcigocHJvcCkgPT4gcHJvcC50cmltKCkpXG4gICAgICAgICAgICAgICAgLm1hcCgocHJvcCkgPT4gYCAgICAke3Byb3AudHJpbSgpfTtgKVxuICAgICAgICAgICAgICAgIC5qb2luKCdcXG4nKTtcbiAgICAgICAgICAgIHJldHVybiBgICAke3RyaW1tZWRTZWxlY3Rvcn0ge1xcbiR7Zm9ybWF0dGVkUHJvcHN9XFxuICB9YDtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIFJldHVybiB0aGUgZm9ybWF0dGVkIG1lZGlhIHF1ZXJ5XG4gICAgICAgIHJldHVybiBgQG1lZGlhICgke21hdGNoLnNwbGl0KCcoJylbMV0uc3BsaXQoJyknKVswXX0pIHtcXG4ke2Zvcm1hdHRlZENvbnRlbnRzfVxcbn1gO1xuICAgIH0pO1xuICAgIC8vIEZvcm1hdCByZWd1bGFyIENTUyBydWxlc1xuICAgIGZvcm1hdHRlZENzcyA9IGZvcm1hdHRlZENzc1xuICAgICAgICAucmVwbGFjZSgvKFteQF0uKj8pXFx7L2csICckMSB7XFxuICAnKSAvLyBEb24ndCBtYXRjaCBtZWRpYSBxdWVyaWVzIGhlcmVcbiAgICAgICAgLnJlcGxhY2UoLzsoPyFbXntdKlxcfSkvZywgJztcXG4gICcpIC8vIEFkZCBuZXdsaW5lcyBhZnRlciBzZW1pY29sb25zXG4gICAgICAgIC5yZXBsYWNlKC9cXH0oPyEuKlxcblxccypAbWVkaWEpL2csICdcXG59XFxuJykgLy8gQWRkIG5ld2xpbmVzIGFmdGVyIGNsb3NpbmcgYnJhY2VzXG4gICAgICAgIC5yZXBsYWNlKC9cXG4gIFxcbi9nLCAnXFxuJykgLy8gUmVtb3ZlIGVtcHR5IGxpbmVzIHdpdGggaW5kZW50YXRpb25cbiAgICAgICAgLnJlcGxhY2UoL1xccypcXG5cXHMqXFxuXFxzKlxcbi9nLCAnXFxuXFxuJykgLy8gUmVtb3ZlIGV4Y2Vzc2l2ZSBuZXdsaW5lc1xuICAgICAgICAudHJpbSgpO1xuICAgIHJldHVybiBmb3JtYXR0ZWRDc3M7XG59XG4vKipcbiAqIE5vZGUgcHJvY2Vzc29yIGNsYXNzIHRvIGhhbmRsZSB0aGUgY29yZSBsb2dpYyBvZiB0cmFuc2xhdGluZ1xuICogRmlnbWEgbm9kZXMgdG8gSFRNTC9DU1NcbiAqL1xuY2xhc3MgTm9kZVByb2Nlc3NvciB7XG4gICAgY29uc3RydWN0b3IoY29uZmlnKSB7XG4gICAgICAgIHRoaXMudW5pcXVlSWRDb3VudGVyID0gMDtcbiAgICAgICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgICAgIHRoaXMuY3NzUnVsZXMgPSBuZXcgTWFwKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgYSBub2RlIGZvciBIVE1MIGdlbmVyYXRpb25cbiAgICAgKi9cbiAgICBwcm9jZXNzTm9kZUZvckh0bWwobm9kZSkge1xuICAgICAgICAvLyBTa2lwIGhpZGRlbiBub2Rlc1xuICAgICAgICBpZiAoJ3Zpc2libGUnIGluIG5vZGUgJiYgIW5vZGUudmlzaWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgaHRtbDogJycsIGNsYXNzTmFtZXM6IFtdIH07XG4gICAgICAgIH1cbiAgICAgICAgLy8gQmFzZSBjbGFzcyBuYW1lIGRlcml2ZWQgZnJvbSBub2RlIG5hbWUgb3IgdHlwZVxuICAgICAgICBjb25zdCBiYXNlQ2xhc3NOYW1lID0gdGhpcy5nZW5lcmF0ZUNsYXNzTmFtZShub2RlKTtcbiAgICAgICAgY29uc3QgY2xhc3NOYW1lcyA9IFtiYXNlQ2xhc3NOYW1lXTtcbiAgICAgICAgLy8gVmFyaWFibGVzIHRvIHN0b3JlIEhUTUwgY29udGVudCBhbmQgdGFnIHR5cGVcbiAgICAgICAgbGV0IGh0bWxDb250ZW50ID0gJyc7XG4gICAgICAgIGxldCB0YWdOYW1lID0gJ2Rpdic7IC8vIERlZmF1bHQgdGFnIG5hbWVcbiAgICAgICAgbGV0IGF0dHJpYnV0ZXMgPSB7fTtcbiAgICAgICAgLy8gQWRkIHNlbWFudGljIGNsYXNzIGZvciBhY2Nlc3NpYmlsaXR5IGFuZCBzdHlsaW5nXG4gICAgICAgIGNvbnN0IHNlbWFudGljQ2xhc3MgPSB0aGlzLmdldFNlbWFudGljQ2xhc3Mobm9kZSk7XG4gICAgICAgIGlmIChzZW1hbnRpY0NsYXNzKSB7XG4gICAgICAgICAgICBjbGFzc05hbWVzLnB1c2goc2VtYW50aWNDbGFzcyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSGFuZGxlIGRpZmZlcmVudCBub2RlIHR5cGVzXG4gICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdURVhUJzpcbiAgICAgICAgICAgICAgICAvLyBEZXRlcm1pbmUgYXBwcm9wcmlhdGUgdGV4dCB0YWcgYmFzZWQgb24gY29udGV4dCBhbmQgc3R5bGVcbiAgICAgICAgICAgICAgICB0YWdOYW1lID0gdGhpcy5kZXRlcm1pbmVUZXh0VGFnKG5vZGUpO1xuICAgICAgICAgICAgICAgIGh0bWxDb250ZW50ID0gdGhpcy5lc2NhcGVIdG1sKG5vZGUuY2hhcmFjdGVycyk7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzRm9udFN0eWxlcyhub2RlLCBiYXNlQ2xhc3NOYW1lKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ1ZFQ1RPUic6XG4gICAgICAgICAgICBjYXNlICdTVEFSJzpcbiAgICAgICAgICAgIGNhc2UgJ0VMTElQU0UnOlxuICAgICAgICAgICAgY2FzZSAnUE9MWUdPTic6XG4gICAgICAgICAgICBjYXNlICdMSU5FJzpcbiAgICAgICAgICAgICAgICAvLyBWZWN0b3Igbm9kZXMgY2FuIGJlY29tZSBTVkdzXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLnN2Z0V4cG9ydE1vZGUgPT09ICdpbmxpbmUnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIGlubGluZSBTVkdcbiAgICAgICAgICAgICAgICAgICAgdGFnTmFtZSA9ICdzdmcnO1xuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgU1ZHIGF0dHJpYnV0ZXNcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlc1snd2lkdGgnXSA9IFN0cmluZyhNYXRoLnJvdW5kKG5vZGUud2lkdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlc1snaGVpZ2h0J10gPSBTdHJpbmcoTWF0aC5yb3VuZChub2RlLmhlaWdodCkpO1xuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzWyd2aWV3Qm94J10gPSBgMCAwICR7TWF0aC5yb3VuZChub2RlLndpZHRoKX0gJHtNYXRoLnJvdW5kKG5vZGUuaGVpZ2h0KX1gO1xuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzWydmaWxsJ10gPSAnbm9uZSc7XG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXNbJ3htbG5zJ10gPSAnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnO1xuICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzWydhcmlhLWhpZGRlbiddID0gJ3RydWUnOyAvLyBEZWNvcmF0aXZlIFNWR1xuICAgICAgICAgICAgICAgICAgICAvLyBJbiBhIHByb2R1Y3Rpb24gaW1wbGVtZW50YXRpb24sIHdlIHdvdWxkIHVzZSBleHBvcnRBc3luYyB0byBnZXQgU1ZHIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIG5vdywgY3JlYXRlIGEgcGxhY2Vob2xkZXIgU1ZHIHdpdGggdGhlIGNvcnJlY3QgZGltZW5zaW9uc1xuICAgICAgICAgICAgICAgICAgICBodG1sQ29udGVudCA9IHRoaXMuZ2VuZXJhdGVQbGFjZWhvbGRlclN2Zyhub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4dGVybmFsIFNWRyAtIGNyZWF0ZSBhbiBpbWcgdGFnIHJlZmVyZW5jaW5nIGFuIFNWRyBmaWxlXG4gICAgICAgICAgICAgICAgICAgIHRhZ05hbWUgPSAnaW1nJztcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlc1snc3JjJ10gPSBgJHt0aGlzLnNhbml0aXplRm9yQ1NTKG5vZGUubmFtZSl9LnN2Z2A7XG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXNbJ2FsdCddID0gJyc7IC8vIERlY29yYXRpdmUgaW1hZ2VcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlc1snd2lkdGgnXSA9IFN0cmluZyhNYXRoLnJvdW5kKG5vZGUud2lkdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlc1snaGVpZ2h0J10gPSBTdHJpbmcoTWF0aC5yb3VuZChub2RlLmhlaWdodCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ0ZSQU1FJzpcbiAgICAgICAgICAgIGNhc2UgJ0dST1VQJzpcbiAgICAgICAgICAgIGNhc2UgJ0NPTVBPTkVOVCc6XG4gICAgICAgICAgICBjYXNlICdDT01QT05FTlRfU0VUJzpcbiAgICAgICAgICAgIGNhc2UgJ0lOU1RBTkNFJzpcbiAgICAgICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBzaG91bGQgYmUgYSBzZW1hbnRpYyBzZWN0aW9uXG4gICAgICAgICAgICAgICAgdGFnTmFtZSA9IHRoaXMuZGV0ZXJtaW5lQ29udGFpbmVyVGFnKG5vZGUpO1xuICAgICAgICAgICAgICAgIC8vIFByb2Nlc3MgbGF5b3V0IHN0eWxlcyAoQXV0byBMYXlvdXQgLT4gRmxleGJveC9HcmlkKVxuICAgICAgICAgICAgICAgIGlmICgnbGF5b3V0TW9kZScgaW4gbm9kZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NBdXRvTGF5b3V0KG5vZGUsIGJhc2VDbGFzc05hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIGFic29sdXRlIHBvc2l0aW9uaW5nIGZvciBub24tYXV0by1sYXlvdXQgY29udGFpbmVyc1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NQb3NpdGlvbihub2RlLCBiYXNlQ2xhc3NOYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gUHJvY2VzcyBjaGlsZHJlbiBpZiBhbnlcbiAgICAgICAgICAgICAgICBpZiAoJ2NoaWxkcmVuJyBpbiBub2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkcmVuSHRtbCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAvLyBQcm9jZXNzIGVhY2ggY2hpbGRcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnByb2Nlc3NOb2RlRm9ySHRtbChjaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0Lmh0bWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbkh0bWwucHVzaChyZXN1bHQuaHRtbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaHRtbENvbnRlbnQgPSBjaGlsZHJlbkh0bWwuam9pbignXFxuJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnUkVDVEFOR0xFJzpcbiAgICAgICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIGJ1dHRvbiwgY2FyZCwgb3IgcmVndWxhciBkaXZcbiAgICAgICAgICAgICAgICB0YWdOYW1lID0gdGhpcy5kZXRlcm1pbmVSZWN0YW5nbGVUYWcobm9kZSk7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcmVjdGFuZ2xlIGhhcyBpbWFnZSBmaWxsXG4gICAgICAgICAgICAgICAgaWYgKCdmaWxscycgaW4gbm9kZSAmJiBub2RlLmZpbGxzICYmIEFycmF5LmlzQXJyYXkobm9kZS5maWxscykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW1hZ2VGaWxsID0gbm9kZS5maWxscy5maW5kKGZpbGwgPT4gZmlsbC50eXBlID09PSAnSU1BR0UnICYmIGZpbGwudmlzaWJsZSAhPT0gZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW1hZ2VGaWxsICYmIGltYWdlRmlsbC50eXBlID09PSAnSU1BR0UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbiBhIHJlYWwgcGx1Z2luLCB3ZSB3b3VsZCBoYW5kbGUgaW1hZ2UgZXhwb3J0IHByb3Blcmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYW4gaW1nIHRhZyB3aXRoIHByb3BlciBhdHRyaWJ1dGVzXG4gICAgICAgICAgICAgICAgICAgICAgICB0YWdOYW1lID0gJ2ltZyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBhIGRlc2NyaXB0aXZlIGltYWdlIG5hbWUgYmFzZWQgb24gdGhlIG5vZGUgbmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW1hZ2VOYW1lID0gdGhpcy5zYW5pdGl6ZUZvckNTUyhub2RlLm5hbWUpIHx8ICdpbWFnZSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzWydzcmMnXSA9IGBpbWFnZXMvJHtpbWFnZU5hbWV9LnBuZ2A7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBZGQgYWx0IHRleHQgZm9yIGFjY2Vzc2liaWxpdHlcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXNbJ2FsdCddID0gbm9kZS5uYW1lIHx8ICdJbWFnZSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBZGQgbG9hZGluZz1cImxhenlcIiBmb3IgcGVyZm9ybWFuY2VcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXNbJ2xvYWRpbmcnXSA9ICdsYXp5JztcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkZCBwcm9wZXIgZGltZW5zaW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCd3aWR0aCcgaW4gbm9kZSAmJiAnaGVpZ2h0JyBpbiBub2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlc1snd2lkdGgnXSA9IFN0cmluZyhNYXRoLnJvdW5kKG5vZGUud2lkdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzWydoZWlnaHQnXSA9IFN0cmluZyhNYXRoLnJvdW5kKG5vZGUuaGVpZ2h0KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZGlmZmVyZW50IHNjYWxlIG1vZGVzIChGaWdtYSdzIHNjYWxlTW9kZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbWFnZUZpbGwuc2NhbGVNb2RlID09PSAnRklMTCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb3ZlciB0aGUgY29udGFpbmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xhc3NOYW1lID0gdGhpcy5zYW5pdGl6ZUZvckNTUyhub2RlLm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yID0gYC4ke2NsYXNzTmFtZX1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzdHlsZVByb3BlcnRpZXMgPSB0aGlzLmNzc1J1bGVzLmdldChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzdHlsZVByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGVQcm9wZXJ0aWVzID0gbmV3IE1hcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNzc1J1bGVzLnNldChzZWxlY3Rvciwgc3R5bGVQcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGVQcm9wZXJ0aWVzLnNldCgnb2JqZWN0LWZpdCcsICdjb3ZlcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoaW1hZ2VGaWxsLnNjYWxlTW9kZSA9PT0gJ0ZJVCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb250YWluIHdpdGhpbiB0aGUgY29udGFpbmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xhc3NOYW1lID0gdGhpcy5zYW5pdGl6ZUZvckNTUyhub2RlLm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdG9yID0gYC4ke2NsYXNzTmFtZX1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzdHlsZVByb3BlcnRpZXMgPSB0aGlzLmNzc1J1bGVzLmdldChzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzdHlsZVByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGVQcm9wZXJ0aWVzID0gbmV3IE1hcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNzc1J1bGVzLnNldChzZWxlY3Rvciwgc3R5bGVQcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGVQcm9wZXJ0aWVzLnNldCgnb2JqZWN0LWZpdCcsICdjb250YWluJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChpbWFnZUZpbGwuc2NhbGVNb2RlID09PSAnVElMRScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgdGlsZWQgaW1hZ2VzLCB3ZSdsbCB1c2UgYmFja2dyb3VuZC1pbWFnZSBpbnN0ZWFkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFnTmFtZSA9ICdkaXYnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhdHRyaWJ1dGVzWydzcmMnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgYXR0cmlidXRlc1snYWx0J107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGF0dHJpYnV0ZXNbJ2xvYWRpbmcnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBZGQgYmFja2dyb3VuZCBwcm9wZXJ0aWVzIHRvIHRoZSBDU1NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjbGFzc05hbWUgPSB0aGlzLnNhbml0aXplRm9yQ1NTKG5vZGUubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3IgPSBgLiR7Y2xhc3NOYW1lfWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN0eWxlUHJvcGVydGllcyA9IHRoaXMuY3NzUnVsZXMuZ2V0KHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXN0eWxlUHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZVByb3BlcnRpZXMgPSBuZXcgTWFwKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3NzUnVsZXMuc2V0KHNlbGVjdG9yLCBzdHlsZVByb3BlcnRpZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZVByb3BlcnRpZXMuc2V0KCdiYWNrZ3JvdW5kLWltYWdlJywgYHVybChcImltYWdlcy8ke2ltYWdlTmFtZX0ucG5nXCIpYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGVQcm9wZXJ0aWVzLnNldCgnYmFja2dyb3VuZC1yZXBlYXQnLCAncmVwZWF0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGVQcm9wZXJ0aWVzLnNldCgnd2lkdGgnLCB0aGlzLmNvbnZlcnRUb1VuaXRzKG5vZGUud2lkdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZVByb3BlcnRpZXMuc2V0KCdoZWlnaHQnLCB0aGlzLmNvbnZlcnRUb1VuaXRzKG5vZGUuaGVpZ2h0KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gUHJvY2VzcyBiYXNpYyBzdHlsaW5nXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzQmFzaWNTdHlsZXMobm9kZSwgYmFzZUNsYXNzTmFtZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIERlZmF1bHQgY2FzZSBmb3Igb3RoZXIgbm9kZSB0eXBlc1xuICAgICAgICAgICAgICAgIHRhZ05hbWUgPSAnZGl2JztcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NCYXNpY1N0eWxlcyhub2RlLCBiYXNlQ2xhc3NOYW1lKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBCdWlsZCBIVE1MIHRhZyB3aXRoIHByb3BlciBhdHRyaWJ1dGVzXG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIC8vIEFkZCBjbGFzcyBhdHRyaWJ1dGVcbiAgICAgICAgaWYgKGNsYXNzTmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYXR0cmlidXRlc1snY2xhc3MnXSA9IGNsYXNzTmFtZXMuam9pbignICcpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEdlbmVyYXRlIGF0dHJpYnV0ZXMgc3RyaW5nXG4gICAgICAgIGNvbnN0IGF0dHJpYnV0ZXNTdHJpbmcgPSBPYmplY3QuZW50cmllcyhhdHRyaWJ1dGVzKVxuICAgICAgICAgICAgLm1hcCgoW2tleSwgdmFsdWVdKSA9PiBgJHtrZXl9PVwiJHt2YWx1ZX1cImApXG4gICAgICAgICAgICAuam9pbignICcpO1xuICAgICAgICAvLyBDcmVhdGUgdGhlIGZpbmFsIEhUTUxcbiAgICAgICAgaWYgKHRhZ05hbWUgPT09ICdpbWcnKSB7XG4gICAgICAgICAgICAvLyBTZWxmLWNsb3NpbmcgdGFnIGZvciBpbWFnZXNcbiAgICAgICAgICAgIGh0bWwgPSBgPGltZyAke2F0dHJpYnV0ZXNTdHJpbmd9IC8+YDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIE9wZW5pbmcgdGFnXG4gICAgICAgICAgICBodG1sID0gYDwke3RhZ05hbWV9JHthdHRyaWJ1dGVzU3RyaW5nID8gJyAnICsgYXR0cmlidXRlc1N0cmluZyA6ICcnfT5gO1xuICAgICAgICAgICAgLy8gQ29udGVudCAoaWYgYW55KVxuICAgICAgICAgICAgaWYgKGh0bWxDb250ZW50KSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBodG1sQ29udGVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIENsb3NpbmcgdGFnXG4gICAgICAgICAgICBodG1sICs9IGA8LyR7dGFnTmFtZX0+YDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBodG1sLCBjbGFzc05hbWVzIH07XG4gICAgfVxuICAgIC8qKlxuICAgICAqIERldGVybWluZSB0aGUgYXBwcm9wcmlhdGUgSFRNTCB0YWcgZm9yIGEgdGV4dCBub2RlXG4gICAgICovXG4gICAgZGV0ZXJtaW5lVGV4dFRhZyhub2RlKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgbWlnaHQgYmUgYSBoZWFkaW5nXG4gICAgICAgIGNvbnN0IGlzSGVhZGluZyA9IG5vZGUubmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdoZWFkaW5nJykgfHxcbiAgICAgICAgICAgIG5vZGUubmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCd0aXRsZScpIHx8XG4gICAgICAgICAgICBub2RlLm5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnaDEnKSB8fFxuICAgICAgICAgICAgbm9kZS5uYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2gyJyk7XG4gICAgICAgIC8vIENoZWNrIGZvbnQgc2l6ZSB0byBkZXRlcm1pbmUgaWYgaXQncyBhIGhlYWRpbmdcbiAgICAgICAgY29uc3QgaXNCaWdUZXh0ID0gbm9kZS5mb250U2l6ZSAhPT0gZmlnbWEubWl4ZWQgJiYgbm9kZS5mb250U2l6ZSA+PSAyMDtcbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQncyBib2xkXG4gICAgICAgIGNvbnN0IGlzQm9sZCA9IG5vZGUuZm9udE5hbWUgIT09IGZpZ21hLm1peGVkICYmXG4gICAgICAgICAgICBub2RlLmZvbnROYW1lLnN0eWxlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2JvbGQnKTtcbiAgICAgICAgLy8gQ2hlY2sgdGV4dCBsZW5ndGggLSBzaG9ydCB0ZXh0IG1pZ2h0IGJlIGJldHRlciBhcyBzcGFuXG4gICAgICAgIGNvbnN0IGlzU2hvcnRUZXh0ID0gbm9kZS5jaGFyYWN0ZXJzLmxlbmd0aCA8IDMwO1xuICAgICAgICBpZiAoaXNIZWFkaW5nICYmIGlzQmlnVGV4dCkge1xuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIGhlYWRpbmcgbGV2ZWxcbiAgICAgICAgICAgIGlmIChub2RlLmZvbnRTaXplICE9PSBmaWdtYS5taXhlZCAmJiBub2RlLmZvbnRTaXplID49IDMyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdoMSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChub2RlLmZvbnRTaXplICE9PSBmaWdtYS5taXhlZCAmJiBub2RlLmZvbnRTaXplID49IDI0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdoMic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2gzJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpc1Nob3J0VGV4dCAmJiAhaXNCb2xkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ3NwYW4nO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICdwJzsgLy8gRGVmYXVsdCBmb3IgdGV4dCBub2Rlc1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIERldGVybWluZSB0aGUgYXBwcm9wcmlhdGUgSFRNTCB0YWcgZm9yIGEgY29udGFpbmVyIG5vZGVcbiAgICAgKi9cbiAgICBkZXRlcm1pbmVDb250YWluZXJUYWcobm9kZSkge1xuICAgICAgICBjb25zdCBub2RlTmFtZSA9IG5vZGUubmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAvLyBGaXJzdCBjaGVjayBleGFjdCBzZW1hbnRpYyBtYXRjaGVzIGZvciBiZXR0ZXIgYWNjdXJhY3lcbiAgICAgICAgaWYgKC9eaGVhZGVyJHxec2l0ZS0/aGVhZGVyJC8udGVzdChub2RlTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAnaGVhZGVyJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICgvXmZvb3RlciR8XnNpdGUtP2Zvb3RlciQvLnRlc3Qobm9kZU5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2Zvb3Rlcic7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoL15tYWluJHxebWFpbi0/Y29udGVudCQvLnRlc3Qobm9kZU5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ21haW4nO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKC9ebmF2JHxebmF2aWdhdGlvbiR8Xm5hdmJhciQvLnRlc3Qobm9kZU5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ25hdic7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoL15hc2lkZSR8XnNpZGViYXIkLy50ZXN0KG5vZGVOYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuICdhc2lkZSc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoL15hcnRpY2xlJC8udGVzdChub2RlTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAnYXJ0aWNsZSc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoL15zZWN0aW9uJC8udGVzdChub2RlTmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAnc2VjdGlvbic7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlbiBjaGVjayBmb3IgcGFydGlhbCBtYXRjaGVzXG4gICAgICAgIGlmIChub2RlTmFtZS5pbmNsdWRlcygnaGVhZGVyJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnaGVhZGVyJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChub2RlTmFtZS5pbmNsdWRlcygnZm9vdGVyJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnZm9vdGVyJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChub2RlTmFtZS5pbmNsdWRlcygnbWFpbicpIHx8IG5vZGVOYW1lLmluY2x1ZGVzKCdjb250ZW50JykpIHtcbiAgICAgICAgICAgIHJldHVybiAnbWFpbic7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobm9kZU5hbWUuaW5jbHVkZXMoJ3NlY3Rpb24nKSB8fCBub2RlTmFtZS5pbmNsdWRlcygnY29udGFpbmVyJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnc2VjdGlvbic7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobm9kZU5hbWUuaW5jbHVkZXMoJ2FydGljbGUnKSB8fCBub2RlTmFtZS5pbmNsdWRlcygnY2FyZCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2FydGljbGUnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG5vZGVOYW1lLmluY2x1ZGVzKCdhc2lkZScpIHx8IG5vZGVOYW1lLmluY2x1ZGVzKCdzaWRlYmFyJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnYXNpZGUnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG5vZGVOYW1lLmluY2x1ZGVzKCduYXYnKSB8fCBub2RlTmFtZS5pbmNsdWRlcygnbWVudScpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ25hdic7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobm9kZU5hbWUuaW5jbHVkZXMoJ2xpc3QnKSAmJiAnY2hpbGRyZW4nIGluIG5vZGUgJiYgbm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBpdCBtaWdodCBiZSBhbiB1bm9yZGVyZWQgbGlzdFxuICAgICAgICAgICAgY29uc3QgaGFzTGlzdEl0ZW1zID0gbm9kZS5jaGlsZHJlbi5zb21lKGNoaWxkID0+IHRoaXMuaXNTY2VuZU5vZGUoY2hpbGQpICYmIGNoaWxkLm5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnaXRlbScpKTtcbiAgICAgICAgICAgIGlmIChoYXNMaXN0SXRlbXMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3VsJzsgLy8gdW5vcmRlcmVkIGxpc3RcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChub2RlTmFtZS5pbmNsdWRlcygnZm9ybScpIHx8IG5vZGVOYW1lLmluY2x1ZGVzKCdjb250YWN0JykpIHtcbiAgICAgICAgICAgIHJldHVybiAnZm9ybSc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRGVmYXVsdCBjb250YWluZXJcbiAgICAgICAgcmV0dXJuICdkaXYnO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEZXRlcm1pbmUgdGhlIGFwcHJvcHJpYXRlIEhUTUwgdGFnIGZvciBhIHJlY3RhbmdsZVxuICAgICAqL1xuICAgIGRldGVybWluZVJlY3RhbmdsZVRhZyhub2RlKSB7XG4gICAgICAgIGNvbnN0IG5vZGVOYW1lID0gbm9kZS5uYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIC8vIENoZWNrIGZvciBpbnRlcmFjdGl2ZSBlbGVtZW50c1xuICAgICAgICBpZiAoL15idXR0b24kfF5idG4kfF5idG4tLy50ZXN0KG5vZGVOYW1lKSkge1xuICAgICAgICAgICAgLy8gRXhhY3QgYnV0dG9uIG1hdGNoXG4gICAgICAgICAgICByZXR1cm4gJ2J1dHRvbic7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoL15pbnB1dC0vLnRlc3Qobm9kZU5hbWUpKSB7XG4gICAgICAgICAgICAvLyBJbnB1dCBmaWVsZFxuICAgICAgICAgICAgcmV0dXJuICdpbnB1dCc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoL15pbWckfF5pbWFnZSR8XmltZy0vLnRlc3Qobm9kZU5hbWUpKSB7XG4gICAgICAgICAgICAvLyBJbWFnZSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgcmV0dXJuICdpbWcnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKC9eY2FyZCR8XmNhcmQtLy50ZXN0KG5vZGVOYW1lKSkge1xuICAgICAgICAgICAgLy8gQ2FyZCBjb21wb25lbnRcbiAgICAgICAgICAgIHJldHVybiAnYXJ0aWNsZSc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoL15saW5rJHxeY3RhJC8udGVzdChub2RlTmFtZSkpIHtcbiAgICAgICAgICAgIC8vIExpbmsgb3IgY2FsbC10by1hY3Rpb25cbiAgICAgICAgICAgIHJldHVybiAnYSc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUGFydGlhbCBtYXRjaGVzXG4gICAgICAgIGlmIChub2RlTmFtZS5pbmNsdWRlcygnYnV0dG9uJykgfHwgbm9kZU5hbWUuaW5jbHVkZXMoJ2J0bicpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2J1dHRvbic7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobm9kZU5hbWUuaW5jbHVkZXMoJ2NhcmQnKSB8fCBub2RlTmFtZS5pbmNsdWRlcygnaXRlbScpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2FydGljbGUnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG5vZGVOYW1lLmluY2x1ZGVzKCdpbnB1dCcpIHx8IG5vZGVOYW1lLmluY2x1ZGVzKCdmaWVsZCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2lucHV0JztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChub2RlTmFtZS5pbmNsdWRlcygnbGluaycpIHx8IG5vZGVOYW1lLmluY2x1ZGVzKCdhbmNob3InKSkge1xuICAgICAgICAgICAgcmV0dXJuICdhJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChub2RlTmFtZS5pbmNsdWRlcygnaW1hZ2UnKSB8fCBub2RlTmFtZS5pbmNsdWRlcygncGljJykgfHwgbm9kZU5hbWUuaW5jbHVkZXMoJ3Bob3RvJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnaW1nJztcbiAgICAgICAgfVxuICAgICAgICAvLyBTcGVjaWFsIGNhc2VzXG4gICAgICAgIGlmICgnY29ybmVyUmFkaXVzJyBpbiBub2RlICYmIG5vZGUuY29ybmVyUmFkaXVzICE9PSBmaWdtYS5taXhlZCAmJiBub2RlLmNvcm5lclJhZGl1cyA+IDgpIHtcbiAgICAgICAgICAgIC8vIEVsZW1lbnRzIHdpdGggc2lnbmlmaWNhbnQgY29ybmVyIHJhZGl1cyBhcmUgb2Z0ZW4gYnV0dG9ucyBvciBjYXJkc1xuICAgICAgICAgICAgaWYgKCgnd2lkdGgnIGluIG5vZGUgJiYgbm9kZS53aWR0aCA8IDIwMCkgJiYgKCdoZWlnaHQnIGluIG5vZGUgJiYgbm9kZS5oZWlnaHQgPCA4MCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2J1dHRvbic7IC8vIFNtYWxsIHJvdW5kZWQgcmVjdGFuZ2xlIGlzIGxpa2VseSBhIGJ1dHRvblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdhcnRpY2xlJzsgLy8gTGFyZ2VyIHJvdW5kZWQgcmVjdGFuZ2xlIG1pZ2h0IGJlIGEgY2FyZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnZGl2JzsgLy8gRGVmYXVsdCByZWN0YW5nbGVcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IGEgc2VtYW50aWMgY2xhc3MgYmFzZWQgb24gbm9kZSBjaGFyYWN0ZXJpc3RpY3NcbiAgICAgKi9cbiAgICBnZXRTZW1hbnRpY0NsYXNzKG5vZGUpIHtcbiAgICAgICAgY29uc3Qgbm9kZU5hbWUgPSBub2RlLm5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgLy8gSWRlbnRpZnkgY29tbW9uIFVJIGVsZW1lbnRzXG4gICAgICAgIGlmIChub2RlTmFtZS5pbmNsdWRlcygnYnV0dG9uJykgfHwgbm9kZU5hbWUuaW5jbHVkZXMoJ2J0bicpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2J1dHRvbic7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobm9kZU5hbWUuaW5jbHVkZXMoJ2NhcmQnKSkge1xuICAgICAgICAgICAgcmV0dXJuICdjYXJkJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChub2RlTmFtZS5pbmNsdWRlcygnaWNvbicpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2ljb24nO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG5vZGVOYW1lLmluY2x1ZGVzKCdpbnB1dCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2lucHV0JztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChub2RlTmFtZS5pbmNsdWRlcygnaGVhZGVyJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnaGVhZGVyJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChub2RlTmFtZS5pbmNsdWRlcygnZm9vdGVyJykpIHtcbiAgICAgICAgICAgIHJldHVybiAnZm9vdGVyJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChub2RlTmFtZS5pbmNsdWRlcygnbmF2JykpIHtcbiAgICAgICAgICAgIHJldHVybiAnbmF2JztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgYSBub2RlIGZvciBDU1MgZ2VuZXJhdGlvblxuICAgICAqL1xuICAgIHByb2Nlc3NOb2RlRm9yQ3NzKG5vZGUpIHtcbiAgICAgICAgLy8gRmlyc3QgcHJvY2VzcyB0aGUgbm9kZSB0byBnZW5lcmF0ZSBIVE1MIGFuZCBwb3B1bGF0ZSBDU1MgcnVsZXNcbiAgICAgICAgY29uc3QgeyBjbGFzc05hbWVzIH0gPSB0aGlzLnByb2Nlc3NOb2RlRm9ySHRtbChub2RlKTtcbiAgICAgICAgLy8gRXh0cmFjdCBjb21tb24gdmFsdWVzIGZvciBDU1MgdmFyaWFibGVzXG4gICAgICAgIGNvbnN0IGNzc1ZhcmlhYmxlcyA9IHRoaXMuZXh0cmFjdENzc1ZhcmlhYmxlcygpO1xuICAgICAgICAvLyBUaGVuIGJ1aWxkIENTUyBmcm9tIHRoZSBjb2xsZWN0ZWQgcnVsZXNcbiAgICAgICAgbGV0IGNzcyA9ICcnO1xuICAgICAgICAvLyBBZGQgQ1NTIHZhcmlhYmxlcyBpZiBmb3VuZFxuICAgICAgICBpZiAoY3NzVmFyaWFibGVzLnNpemUgPiAwKSB7XG4gICAgICAgICAgICBjc3MgKz0gYDpyb290IHtcXG5gO1xuICAgICAgICAgICAgZm9yIChjb25zdCBbbmFtZSwgdmFsdWVdIG9mIGNzc1ZhcmlhYmxlcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICBjc3MgKz0gYCAgJHtuYW1lfTogJHt2YWx1ZX07XFxuYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNzcyArPSBgfVxcblxcbmA7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQWRkIGJhc2ljIHJlc2V0IHN0eWxlc1xuICAgICAgICBjc3MgKz0gYCoge1xcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcXG4gIG1hcmdpbjogMDtcXG4gIHBhZGRpbmc6IDA7XFxufVxcblxcbmA7XG4gICAgICAgIC8vIEFkZCByZXNwb25zaXZlIGNvbnRhaW5lciBmb3IgYmV0dGVyIGxheW91dFxuICAgICAgICBjc3MgKz0gYC5jb250YWluZXIge1xcbiAgd2lkdGg6IDEwMCU7XFxuICBtYXgtd2lkdGg6IDEyMDBweDtcXG4gIG1hcmdpbjogMCBhdXRvO1xcbiAgcGFkZGluZzogMCAxNXB4O1xcbn1cXG5cXG5gO1xuICAgICAgICAvLyBNZWRpYSBxdWVyeSBtaXhpbiBmb3IgcmVzcG9uc2l2ZSBkZXNpZ25cbiAgICAgICAgY3NzICs9IGAvKiBNb2JpbGUgRmlyc3QgTWVkaWEgUXVlcmllcyAqL1xcbmA7XG4gICAgICAgIGNzcyArPSBgQG1lZGlhIChtaW4td2lkdGg6IDc2OHB4KSB7XFxuICAvKiBUYWJsZXQgc3R5bGVzICovXFxufVxcblxcbmA7XG4gICAgICAgIGNzcyArPSBgQG1lZGlhIChtaW4td2lkdGg6IDk5MnB4KSB7XFxuICAvKiBEZXNrdG9wIHN0eWxlcyAqL1xcbn1cXG5cXG5gO1xuICAgICAgICAvLyBHZW5lcmF0ZSB0aGUgQ1NTIHJ1bGVzXG4gICAgICAgIGZvciAoY29uc3QgW3NlbGVjdG9yLCBwcm9wZXJ0aWVzXSBvZiB0aGlzLmNzc1J1bGVzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgY3NzICs9IGAke3NlbGVjdG9yfSB7XFxuYDtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW3Byb3BlcnR5LCB2YWx1ZV0gb2YgcHJvcGVydGllcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3JtYXQgcHJvcGVydHkgbmFtZSBiYXNlZCBvbiBjb25maWcgKGNhbWVsQ2FzZSB2cyBrZWJhYi1jYXNlKVxuICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZFByb3BlcnR5ID0gdGhpcy5mb3JtYXRQcm9wZXJ0eU5hbWUocHJvcGVydHkpO1xuICAgICAgICAgICAgICAgIC8vIFVzZSBDU1MgdmFyaWFibGVzIHdoZXJlIGFwcGxpY2FibGVcbiAgICAgICAgICAgICAgICBjb25zdCB2YXJpYWJsZU5hbWUgPSB0aGlzLmdldFZhcmlhYmxlTmFtZUZvclZhbHVlKHByb3BlcnR5LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHZhcmlhYmxlTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBjc3MgKz0gYCAgJHtmb3JtYXR0ZWRQcm9wZXJ0eX06IHZhcigke3ZhcmlhYmxlTmFtZX0pO1xcbmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjc3MgKz0gYCAgJHtmb3JtYXR0ZWRQcm9wZXJ0eX06ICR7dmFsdWV9O1xcbmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3NzICs9IGB9XFxuXFxuYDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBjc3MsIGNsYXNzTmFtZXMgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBjb21tb24gQ1NTIHZhbHVlcyB0byBjcmVhdGUgdmFyaWFibGVzXG4gICAgICovXG4gICAgZXh0cmFjdENzc1ZhcmlhYmxlcygpIHtcbiAgICAgICAgY29uc3QgdmFyaWFibGVzID0gbmV3IE1hcCgpO1xuICAgICAgICBjb25zdCB2YWx1ZUNvdW50ID0gbmV3IE1hcCgpO1xuICAgICAgICAvLyBDb3VudCBvY2N1cnJlbmNlcyBvZiB2YWx1ZXNcbiAgICAgICAgZm9yIChjb25zdCBbLCBwcm9wZXJ0aWVzXSBvZiB0aGlzLmNzc1J1bGVzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBbcHJvcGVydHksIHZhbHVlXSBvZiBwcm9wZXJ0aWVzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgY29uc2lkZXIgY2VydGFpbiBwcm9wZXJ0aWVzIGZvciB2YXJpYWJsZXNcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1ZhcmlhYmxlQ2FuZGlkYXRlUHJvcGVydHkocHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke3Byb3BlcnR5fToke3ZhbHVlfWA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSB2YWx1ZUNvdW50LmdldChrZXkpIHx8IHsgY291bnQ6IDAsIHByb3BlcnR5IH07XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQuY291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVDb3VudC5zZXQoa2V5LCBjdXJyZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ3JlYXRlIHZhcmlhYmxlcyBmb3IgdmFsdWVzIHVzZWQgbXVsdGlwbGUgdGltZXNcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCB7IGNvdW50LCBwcm9wZXJ0eSB9XSBvZiB2YWx1ZUNvdW50LmVudHJpZXMoKSkge1xuICAgICAgICAgICAgaWYgKGNvdW50ID49IDIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGtleS5zcGxpdCgnOicpWzFdO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhck5hbWUgPSB0aGlzLmNyZWF0ZVZhcmlhYmxlTmFtZShwcm9wZXJ0eSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIHZhcmlhYmxlcy5zZXQodmFyTmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCBmdW5kYW1lbnRhbCB2YXJpYWJsZXNcbiAgICAgICAgaWYgKCF2YXJpYWJsZXMuaGFzKCctLWNvbG9yLXRleHQnKSkge1xuICAgICAgICAgICAgdmFyaWFibGVzLnNldCgnLS1jb2xvci10ZXh0JywgJyMzMzMnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXZhcmlhYmxlcy5oYXMoJy0tY29sb3ItYmcnKSkge1xuICAgICAgICAgICAgdmFyaWFibGVzLnNldCgnLS1jb2xvci1iZycsICcjZmZmJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF2YXJpYWJsZXMuaGFzKCctLWZvbnQtbWFpbicpKSB7XG4gICAgICAgICAgICB2YXJpYWJsZXMuc2V0KCctLWZvbnQtbWFpbicsIFwiJ0ludGVyJywgLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCBzYW5zLXNlcmlmXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YXJpYWJsZXM7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHByb3BlcnR5IGlzIGEgZ29vZCBjYW5kaWRhdGUgZm9yIGEgQ1NTIHZhcmlhYmxlXG4gICAgICovXG4gICAgaXNWYXJpYWJsZUNhbmRpZGF0ZVByb3BlcnR5KHByb3BlcnR5KSB7XG4gICAgICAgIHJldHVybiBwcm9wZXJ0eS5zdGFydHNXaXRoKCdjb2xvcicpIHx8XG4gICAgICAgICAgICBwcm9wZXJ0eS5zdGFydHNXaXRoKCdiYWNrZ3JvdW5kLWNvbG9yJykgfHxcbiAgICAgICAgICAgIHByb3BlcnR5LnN0YXJ0c1dpdGgoJ2ZvbnQtJykgfHxcbiAgICAgICAgICAgIHByb3BlcnR5ID09PSAnYm9yZGVyLXJhZGl1cycgfHxcbiAgICAgICAgICAgIHByb3BlcnR5LmluY2x1ZGVzKCdzaGFkb3cnKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgdmFyaWFibGUgbmFtZSBmb3IgYSBDU1MgcHJvcGVydHlcbiAgICAgKi9cbiAgICBjcmVhdGVWYXJpYWJsZU5hbWUocHJvcGVydHksIHZhbHVlKSB7XG4gICAgICAgIGxldCBuYW1lID0gJy0tJztcbiAgICAgICAgaWYgKHByb3BlcnR5ID09PSAnY29sb3InIHx8IHByb3BlcnR5ID09PSAnYmFja2dyb3VuZC1jb2xvcicpIHtcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgY29sb3IgdHlwZVxuICAgICAgICAgICAgaWYgKHZhbHVlLmluY2x1ZGVzKCdyZ2IoMCwgMCwgMCknKSB8fCB2YWx1ZS5pbmNsdWRlcygnIzAwMCcpKSB7XG4gICAgICAgICAgICAgICAgbmFtZSArPSAnY29sb3ItYmxhY2snO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodmFsdWUuaW5jbHVkZXMoJ3JnYigyNTUsIDI1NSwgMjU1KScpIHx8IHZhbHVlLmluY2x1ZGVzKCcjZmZmJykpIHtcbiAgICAgICAgICAgICAgICBuYW1lICs9ICdjb2xvci13aGl0ZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChwcm9wZXJ0eSA9PT0gJ2NvbG9yJykge1xuICAgICAgICAgICAgICAgIG5hbWUgKz0gJ2NvbG9yLXRleHQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbmFtZSArPSAnY29sb3ItcHJpbWFyeSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocHJvcGVydHkuc3RhcnRzV2l0aCgnZm9udC0nKSkge1xuICAgICAgICAgICAgY29uc3QgZm9udFByb3BlcnR5ID0gcHJvcGVydHkuc3BsaXQoJy0nKVsxXTtcbiAgICAgICAgICAgIG5hbWUgKz0gYGZvbnQtJHtmb250UHJvcGVydHl9YDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChwcm9wZXJ0eSA9PT0gJ2JvcmRlci1yYWRpdXMnKSB7XG4gICAgICAgICAgICBuYW1lICs9ICdyYWRpdXMnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHByb3BlcnR5LmluY2x1ZGVzKCdzaGFkb3cnKSkge1xuICAgICAgICAgICAgbmFtZSArPSAnc2hhZG93JztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIC0gY29udmVydCBwcm9wZXJ0eSBuYW1lIHRvIHZhcmlhYmxlIG5hbWVcbiAgICAgICAgICAgIG5hbWUgKz0gcHJvcGVydHkucmVwbGFjZSgvKFtBLVpdKS9nLCAnLSQxJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmFtZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2V0IGEgdmFyaWFibGUgbmFtZSBmb3IgYSBzcGVjaWZpYyBwcm9wZXJ0eSB2YWx1ZSBpZiBhdmFpbGFibGVcbiAgICAgKi9cbiAgICBnZXRWYXJpYWJsZU5hbWVGb3JWYWx1ZShwcm9wZXJ0eSwgdmFsdWUpIHtcbiAgICAgICAgLy8gTG9vayB1cCBzdGFuZGFyZCBwcm9wZXJ0aWVzIHRoYXQgc2hvdWxkIHVzZSB2YXJpYWJsZXNcbiAgICAgICAgaWYgKHByb3BlcnR5ID09PSAnY29sb3InICYmIHZhbHVlLmluY2x1ZGVzKCdyZ2IoMCwgMCwgMCknKSkge1xuICAgICAgICAgICAgcmV0dXJuICctLWNvbG9yLXRleHQnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHByb3BlcnR5ID09PSAnYmFja2dyb3VuZC1jb2xvcicgJiYgdmFsdWUuaW5jbHVkZXMoJ3JnYigyNTUsIDI1NSwgMjU1KScpKSB7XG4gICAgICAgICAgICByZXR1cm4gJy0tY29sb3ItYmcnO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHByb3BlcnR5ID09PSAnZm9udC1mYW1pbHknKSB7XG4gICAgICAgICAgICByZXR1cm4gJy0tZm9udC1tYWluJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRm9ybWF0IENTUyBwcm9wZXJ0eSBuYW1lIGJhc2VkIG9uIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBmb3JtYXRQcm9wZXJ0eU5hbWUocHJvcGVydHkpIHtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLmF0dHJpYnV0ZUNhc2luZyA9PT0gJ2NhbWVsQ2FzZScpIHtcbiAgICAgICAgICAgIC8vIENvbnZlcnQga2ViYWItY2FzZSB0byBjYW1lbENhc2VcbiAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eS5yZXBsYWNlKC8tKFthLXpdKS9nLCAoXywgbGV0dGVyKSA9PiBsZXR0ZXIudG9VcHBlckNhc2UoKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBLZWVwIGtlYmFiLWNhc2UgKGRlZmF1bHQpXG4gICAgICAgICAgICByZXR1cm4gcHJvcGVydHk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBiYXNpYyB2aXN1YWwgc3R5bGVzIChmaWxscywgc3Ryb2tlcywgZWZmZWN0cywgZXRjLilcbiAgICAgKi9cbiAgICBwcm9jZXNzQmFzaWNTdHlsZXMobm9kZSwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGNvbnN0IHNlbGVjdG9yID0gYC4ke2NsYXNzTmFtZX1gO1xuICAgICAgICBjb25zdCBwcm9wZXJ0aWVzID0gbmV3IE1hcCgpO1xuICAgICAgICAvLyBJbml0aWFsaXplIENTUyBydWxlcyBmb3IgdGhpcyBzZWxlY3RvciBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgIGlmICghdGhpcy5jc3NSdWxlcy5oYXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICB0aGlzLmNzc1J1bGVzLnNldChzZWxlY3RvciwgcHJvcGVydGllcyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBHZXQgZXhpc3RpbmcgcHJvcGVydGllc1xuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdQcm9wZXJ0aWVzID0gdGhpcy5jc3NSdWxlcy5nZXQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nUHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgIC8vIE1lcmdlIHdpdGggbmV3IHByb3BlcnRpZXNcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBleGlzdGluZ1Byb3BlcnRpZXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBXaWR0aCBhbmQgaGVpZ2h0XG4gICAgICAgIGlmICgnd2lkdGgnIGluIG5vZGUgJiYgJ2hlaWdodCcgaW4gbm9kZSkge1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ3dpZHRoJywgdGhpcy5jb252ZXJ0VG9Vbml0cyhub2RlLndpZHRoKSk7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnaGVpZ2h0JywgdGhpcy5jb252ZXJ0VG9Vbml0cyhub2RlLmhlaWdodCkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEJvcmRlciByYWRpdXNcbiAgICAgICAgaWYgKCdjb3JuZXJSYWRpdXMnIGluIG5vZGUgJiYgbm9kZS5jb3JuZXJSYWRpdXMgIT09IDAgJiYgbm9kZS5jb3JuZXJSYWRpdXMgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgICAgICAvLyBXZSBrbm93IGNvcm5lclJhZGl1cyBpcyBhIG51bWJlciBhdCB0aGlzIHBvaW50XG4gICAgICAgICAgICBjb25zdCByYWRpdXMgPSBub2RlLmNvcm5lclJhZGl1cztcbiAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdib3JkZXItcmFkaXVzJywgdGhpcy5jb252ZXJ0VG9Vbml0cyhyYWRpdXMpKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBGaWxscyAoYmFja2dyb3VuZCBjb2xvcnMsIGdyYWRpZW50cylcbiAgICAgICAgaWYgKCdmaWxscycgaW4gbm9kZSAmJiBub2RlLmZpbGxzICYmIEFycmF5LmlzQXJyYXkobm9kZS5maWxscykpIHtcbiAgICAgICAgICAgIGNvbnN0IGlzVGV4dE5vZGUgPSBub2RlLnR5cGUgPT09ICdURVhUJztcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc0ZpbGxzKG5vZGUuZmlsbHMsIHByb3BlcnRpZXMsIGlzVGV4dE5vZGUsIG5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFN0cm9rZXMgKGJvcmRlcnMpXG4gICAgICAgIGlmICgnc3Ryb2tlcycgaW4gbm9kZSAmJiBub2RlLnN0cm9rZXMgJiYgQXJyYXkuaXNBcnJheShub2RlLnN0cm9rZXMpKSB7XG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NTdHJva2VzKG5vZGUsIHByb3BlcnRpZXMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEVmZmVjdHMgKHNoYWRvd3MsIGJsdXJzKVxuICAgICAgICBpZiAoJ2VmZmVjdHMnIGluIG5vZGUgJiYgbm9kZS5lZmZlY3RzICYmIEFycmF5LmlzQXJyYXkobm9kZS5lZmZlY3RzKSkge1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzRWZmZWN0cyhub2RlLmVmZmVjdHMsIHByb3BlcnRpZXMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgQ1NTIHJ1bGVzIG1hcFxuICAgICAgICB0aGlzLmNzc1J1bGVzLnNldChzZWxlY3RvciwgcHJvcGVydGllcyk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgZmlsbHMgKGJhY2tncm91bmRzKVxuICAgICAqL1xuICAgIHByb2Nlc3NGaWxscyhmaWxscywgcHJvcGVydGllcywgaXNUZXh0Tm9kZSA9IGZhbHNlLCBub2RlKSB7XG4gICAgICAgIC8vIEZpbHRlciB0byBvbmx5IHZpc2libGUgZmlsbHNcbiAgICAgICAgY29uc3QgdmlzaWJsZUZpbGxzID0gZmlsbHMuZmlsdGVyKGZpbGwgPT4gZmlsbC52aXNpYmxlICE9PSBmYWxzZSk7XG4gICAgICAgIGlmICh2aXNpYmxlRmlsbHMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAvLyBGb3Igc2luZ2xlIHNvbGlkIGZpbGxcbiAgICAgICAgaWYgKHZpc2libGVGaWxscy5sZW5ndGggPT09IDEgJiYgdmlzaWJsZUZpbGxzWzBdLnR5cGUgPT09ICdTT0xJRCcpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGwgPSB2aXNpYmxlRmlsbHNbMF07XG4gICAgICAgICAgICBjb25zdCByZ2JhID0gdGhpcy5yZ2JhVG9DU1MoZmlsbC5jb2xvci5yLCBmaWxsLmNvbG9yLmcsIGZpbGwuY29sb3IuYiwgZmlsbC5vcGFjaXR5IHx8IDEpO1xuICAgICAgICAgICAgLy8gRm9yIHRleHQgbm9kZXMsIHNldCBjb2xvciBwcm9wZXJ0eSBpbnN0ZWFkIG9mIGJhY2tncm91bmQtY29sb3JcbiAgICAgICAgICAgIGlmIChpc1RleHROb2RlKSB7XG4gICAgICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2NvbG9yJywgcmdiYSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnYmFja2dyb3VuZC1jb2xvcicsIHJnYmEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZvciBpbWFnZSBmaWxsc1xuICAgICAgICBjb25zdCBpbWFnZUZpbGxzID0gdmlzaWJsZUZpbGxzLmZpbHRlcihmaWxsID0+IGZpbGwudHlwZSA9PT0gJ0lNQUdFJyk7XG4gICAgICAgIGlmIChpbWFnZUZpbGxzLmxlbmd0aCA+IDAgJiYgIWlzVGV4dE5vZGUpIHtcbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIGEgZGVzY3JpcHRpdmUgaW1hZ2UgbmFtZSBiYXNlZCBvbiB0aGUgbm9kZSBuYW1lIChpZiBhdmFpbGFibGUpXG4gICAgICAgICAgICBjb25zdCBpbWFnZU5hbWUgPSBub2RlICYmICduYW1lJyBpbiBub2RlID9cbiAgICAgICAgICAgICAgICB0aGlzLnNhbml0aXplRm9yQ1NTKG5vZGUubmFtZSkgfHwgJ2JhY2tncm91bmQnIDpcbiAgICAgICAgICAgICAgICAnYmFja2dyb3VuZCc7XG4gICAgICAgICAgICAvLyBBZGQgYmFja2dyb3VuZCBpbWFnZSBwcm9wZXJ0aWVzXG4gICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnYmFja2dyb3VuZC1pbWFnZScsIGB1cmwoXCJpbWFnZXMvJHtpbWFnZU5hbWV9LnBuZ1wiKWApO1xuICAgICAgICAgICAgLy8gSGFuZGxlIHNjYWxpbmcgbW9kZXNcbiAgICAgICAgICAgIGNvbnN0IGltYWdlRmlsbCA9IGltYWdlRmlsbHNbMF07XG4gICAgICAgICAgICBpZiAoaW1hZ2VGaWxsLnNjYWxlTW9kZSA9PT0gJ0ZJTEwnKSB7XG4gICAgICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2JhY2tncm91bmQtc2l6ZScsICdjb3ZlcicpO1xuICAgICAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdiYWNrZ3JvdW5kLXBvc2l0aW9uJywgJ2NlbnRlcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaW1hZ2VGaWxsLnNjYWxlTW9kZSA9PT0gJ0ZJVCcpIHtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnYmFja2dyb3VuZC1zaXplJywgJ2NvbnRhaW4nKTtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnYmFja2dyb3VuZC1wb3NpdGlvbicsICdjZW50ZXInKTtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnYmFja2dyb3VuZC1yZXBlYXQnLCAnbm8tcmVwZWF0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChpbWFnZUZpbGwuc2NhbGVNb2RlID09PSAnVElMRScpIHtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnYmFja2dyb3VuZC1zaXplJywgJ2F1dG8nKTtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnYmFja2dyb3VuZC1yZXBlYXQnLCAncmVwZWF0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChpbWFnZUZpbGwuc2NhbGVNb2RlID09PSAnQ1JPUCcpIHtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnYmFja2dyb3VuZC1zaXplJywgJ2NvdmVyJyk7XG4gICAgICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2JhY2tncm91bmQtcG9zaXRpb24nLCAnY2VudGVyJyk7XG4gICAgICAgICAgICAgICAgLy8gTm90ZTogQ1JPUCB0eXBpY2FsbHkgcmVxdWlyZXMgcHJlY2lzZSBiYWNrZ3JvdW5kLXBvc2l0aW9uXG4gICAgICAgICAgICAgICAgLy8gRm9yIHJlYWwgaW1wbGVtZW50YXRpb24sIHdvdWxkIGNvbXB1dGUgdGhlIHBvc2l0aW9uIGJhc2VkIG9uXG4gICAgICAgICAgICAgICAgLy8gaW1hZ2VGaWxsLmltYWdlVHJhbnNmb3JtIG1hdHJpeFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZvciBncmFkaWVudHMgKG9ubHkgYXBwbHkgdG8gYmFja2dyb3VuZHMsIG5vdCB0ZXh0KVxuICAgICAgICBpZiAoIWlzVGV4dE5vZGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGdyYWRpZW50RmlsbHMgPSB2aXNpYmxlRmlsbHMuZmlsdGVyKGZpbGwgPT4gZmlsbC50eXBlID09PSAnR1JBRElFTlRfTElORUFSJyB8fFxuICAgICAgICAgICAgICAgIGZpbGwudHlwZSA9PT0gJ0dSQURJRU5UX1JBRElBTCcgfHxcbiAgICAgICAgICAgICAgICBmaWxsLnR5cGUgPT09ICdHUkFESUVOVF9BTkdVTEFSJyk7XG4gICAgICAgICAgICBpZiAoZ3JhZGllbnRGaWxscy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGZpcnN0IGdyYWRpZW50IG9ubHkgZm9yIHNpbXBsaWNpdHlcbiAgICAgICAgICAgICAgICBjb25zdCBncmFkaWVudEZpbGwgPSBncmFkaWVudEZpbGxzWzBdO1xuICAgICAgICAgICAgICAgIGlmIChncmFkaWVudEZpbGwudHlwZSA9PT0gJ0dSQURJRU5UX0xJTkVBUicpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZ3JhZGllbnRDU1MgPSB0aGlzLmxpbmVhckdyYWRpZW50VG9DU1MoZ3JhZGllbnRGaWxsKTtcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2JhY2tncm91bmQtaW1hZ2UnLCBncmFkaWVudENTUyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGdyYWRpZW50RmlsbC50eXBlID09PSAnR1JBRElFTlRfUkFESUFMJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBncmFkaWVudENTUyA9IHRoaXMucmFkaWFsR3JhZGllbnRUb0NTUyhncmFkaWVudEZpbGwpO1xuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnYmFja2dyb3VuZC1pbWFnZScsIGdyYWRpZW50Q1NTKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBzdHJva2VzIChib3JkZXJzKVxuICAgICAqL1xuICAgIHByb2Nlc3NTdHJva2VzKG5vZGUsIHByb3BlcnRpZXMpIHtcbiAgICAgICAgdmFyIF9hO1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobm9kZS5zdHJva2VzKSB8fCAhbm9kZS5zdHJva2VzLmxlbmd0aClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgLy8gRmlsdGVyIHRvIG9ubHkgdmlzaWJsZSBzdHJva2VzXG4gICAgICAgIGNvbnN0IHZpc2libGVTdHJva2VzID0gbm9kZS5zdHJva2VzLmZpbHRlcihzdHJva2UgPT4gc3Ryb2tlLnZpc2libGUgIT09IGZhbHNlKTtcbiAgICAgICAgaWYgKHZpc2libGVTdHJva2VzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgLy8gRm9yIHNpbXBsaWNpdHksIHdlJ2xsIGhhbmRsZSBvbmx5IHRoZSBmaXJzdCBzdHJva2VcbiAgICAgICAgY29uc3Qgc3Ryb2tlID0gdmlzaWJsZVN0cm9rZXNbMF07XG4gICAgICAgIGlmIChzdHJva2UudHlwZSA9PT0gJ1NPTElEJykge1xuICAgICAgICAgICAgLy8gR2V0IHN0cm9rZSBjb2xvclxuICAgICAgICAgICAgY29uc3QgcmdiYSA9IHRoaXMucmdiYVRvQ1NTKHN0cm9rZS5jb2xvci5yLCBzdHJva2UuY29sb3IuZywgc3Ryb2tlLmNvbG9yLmIsIHN0cm9rZS5vcGFjaXR5IHx8IDEpO1xuICAgICAgICAgICAgLy8gR2V0IHN0cm9rZSB3ZWlnaHQgd2l0aCBhIGZhbGxiYWNrXG4gICAgICAgICAgICBjb25zdCB3ZWlnaHQgPSBub2RlLnN0cm9rZVdlaWdodCAhPT0gZmlnbWEubWl4ZWQgPyAoKF9hID0gbm9kZS5zdHJva2VXZWlnaHQpICE9PSBudWxsICYmIF9hICE9PSB2b2lkIDAgPyBfYSA6IDEpIDogMTtcbiAgICAgICAgICAgIC8vIFNldCBib3JkZXIgc3R5bGVcbiAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdib3JkZXItc3R5bGUnLCAnc29saWQnKTtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdib3JkZXItd2lkdGgnLCB0aGlzLmNvbnZlcnRUb1VuaXRzKHdlaWdodCkpO1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2JvcmRlci1jb2xvcicsIHJnYmEpO1xuICAgICAgICAgICAgLy8gSGFuZGxlIHN0cm9rZSBhbGlnbm1lbnRcbiAgICAgICAgICAgIGlmIChub2RlLnN0cm9rZUFsaWduICE9PSBmaWdtYS5taXhlZCkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAobm9kZS5zdHJva2VBbGlnbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdJTlNJREUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2JveC1zaXppbmcnLCAnYm9yZGVyLWJveCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ09VVFNJREUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ1NTIGRvZXNuJ3QgaGF2ZSBhIGRpcmVjdCBlcXVpdmFsZW50IGZvciBvdXRzaWRlIHN0cm9rZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdlIHdvdWxkIG5lZWQgdG8gdXNlIG91dGxpbmUgb3IgYWRkaXRpb25hbCBlbGVtZW50cyBpbiBhIHJlYWwgaW1wbGVtZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdvdXRsaW5lJywgYCR7dGhpcy5jb252ZXJ0VG9Vbml0cyh3ZWlnaHQpfSBzb2xpZCAke3JnYmF9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnb3V0bGluZS1vZmZzZXQnLCB0aGlzLmNvbnZlcnRUb1VuaXRzKHdlaWdodCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgZWZmZWN0cyAoc2hhZG93cywgYmx1cnMpXG4gICAgICovXG4gICAgcHJvY2Vzc0VmZmVjdHMoZWZmZWN0cywgcHJvcGVydGllcykge1xuICAgICAgICAvLyBGaWx0ZXIgdG8gb25seSB2aXNpYmxlIGVmZmVjdHNcbiAgICAgICAgY29uc3QgdmlzaWJsZUVmZmVjdHMgPSBlZmZlY3RzLmZpbHRlcihlZmZlY3QgPT4gZWZmZWN0LnZpc2libGUgIT09IGZhbHNlKTtcbiAgICAgICAgaWYgKHZpc2libGVFZmZlY3RzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgLy8gUHJvY2VzcyBkcm9wIHNoYWRvd3NcbiAgICAgICAgY29uc3QgZHJvcFNoYWRvd3MgPSB2aXNpYmxlRWZmZWN0cy5maWx0ZXIoZWZmZWN0ID0+IGVmZmVjdC50eXBlID09PSAnRFJPUF9TSEFET1cnIHx8IGVmZmVjdC50eXBlID09PSAnSU5ORVJfU0hBRE9XJyk7XG4gICAgICAgIGlmIChkcm9wU2hhZG93cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzaGFkb3dWYWx1ZXMgPSBkcm9wU2hhZG93cy5tYXAoc2hhZG93ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IGNvbG9yLCBvZmZzZXQsIHJhZGl1cywgc3ByZWFkLCB0eXBlIH0gPSBzaGFkb3c7XG4gICAgICAgICAgICAgICAgY29uc3QgcmdiYSA9IHRoaXMucmdiYVRvQ1NTKGNvbG9yLnIsIGNvbG9yLmcsIGNvbG9yLmIsIGNvbG9yLmEpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHggPSB0aGlzLmNvbnZlcnRUb1VuaXRzKG9mZnNldC54KTtcbiAgICAgICAgICAgICAgICBjb25zdCB5ID0gdGhpcy5jb252ZXJ0VG9Vbml0cyhvZmZzZXQueSk7XG4gICAgICAgICAgICAgICAgY29uc3QgYmx1ciA9IHRoaXMuY29udmVydFRvVW5pdHMocmFkaXVzKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzcHJlYWRWYWx1ZSA9IHRoaXMuY29udmVydFRvVW5pdHMoc3ByZWFkICE9PSBudWxsICYmIHNwcmVhZCAhPT0gdm9pZCAwID8gc3ByZWFkIDogMCk7XG4gICAgICAgICAgICAgICAgLy8gSW5uZXIgc2hhZG93cyBpbiBDU1MgaGF2ZSB0aGUgXCJpbnNldFwiIGtleXdvcmRcbiAgICAgICAgICAgICAgICBjb25zdCBpbnNldCA9IHR5cGUgPT09ICdJTk5FUl9TSEFET1cnID8gJyBpbnNldCcgOiAnJztcbiAgICAgICAgICAgICAgICByZXR1cm4gYCR7eH0gJHt5fSAke2JsdXJ9ICR7c3ByZWFkVmFsdWV9ICR7cmdiYX0ke2luc2V0fWA7XG4gICAgICAgICAgICB9KS5qb2luKCcsICcpO1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2JveC1zaGFkb3cnLCBzaGFkb3dWYWx1ZXMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFByb2Nlc3MgYmx1ciBlZmZlY3RzXG4gICAgICAgIGNvbnN0IGJsdXJzID0gdmlzaWJsZUVmZmVjdHMuZmlsdGVyKGVmZmVjdCA9PiBlZmZlY3QudHlwZSA9PT0gJ0xBWUVSX0JMVVInIHx8IGVmZmVjdC50eXBlID09PSAnQkFDS0dST1VORF9CTFVSJyk7XG4gICAgICAgIGlmIChibHVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBibHVycy5mb3JFYWNoKGJsdXIgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChibHVyLnR5cGUgPT09ICdMQVlFUl9CTFVSJykge1xuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnZmlsdGVyJywgYGJsdXIoJHt0aGlzLmNvbnZlcnRUb1VuaXRzKGJsdXIucmFkaXVzKX0pYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGJsdXIudHlwZSA9PT0gJ0JBQ0tHUk9VTkRfQkxVUicpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2JhY2tkcm9wLWZpbHRlcicsIGBibHVyKCR7dGhpcy5jb252ZXJ0VG9Vbml0cyhibHVyLnJhZGl1cyl9KWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgQXV0byBMYXlvdXQgcHJvcGVydGllcyAodHJhbnNsYXRlcyB0byBGbGV4Ym94L0dyaWQpXG4gICAgICovXG4gICAgcHJvY2Vzc0F1dG9MYXlvdXQobm9kZSwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGNvbnN0IHNlbGVjdG9yID0gYC4ke2NsYXNzTmFtZX1gO1xuICAgICAgICBsZXQgcHJvcGVydGllcyA9IHRoaXMuY3NzUnVsZXMuZ2V0KHNlbGVjdG9yKTtcbiAgICAgICAgaWYgKCFwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzID0gbmV3IE1hcCgpO1xuICAgICAgICAgICAgdGhpcy5jc3NSdWxlcy5zZXQoc2VsZWN0b3IsIHByb3BlcnRpZXMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIERldGVybWluZSBpZiB3ZSBzaG91bGQgdXNlIGdyaWQgb3IgZmxleGJveCBiYXNlZCBvbiBjb25maWd1cmF0aW9uIGFuZCBsYXlvdXQgY29tcGxleGl0eVxuICAgICAgICBjb25zdCBzaG91bGRVc2VHcmlkID0gdGhpcy5jb25maWcubGF5b3V0UHJlZmVyZW5jZSA9PT0gJ2dyaWQnICYmIHRoaXMuaXNHcmlkU3VpdGFibGUobm9kZSk7XG4gICAgICAgIGlmIChzaG91bGRVc2VHcmlkKSB7XG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NHcmlkTGF5b3V0KG5vZGUsIHByb3BlcnRpZXMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzRmxleGJveExheW91dChub2RlLCBwcm9wZXJ0aWVzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBNYXAgcGFkZGluZyAoY29tbW9uIHRvIGJvdGggZmxleGJveCBhbmQgZ3JpZClcbiAgICAgICAgaWYgKG5vZGUucGFkZGluZ0xlZnQgIT09IDApIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdwYWRkaW5nLWxlZnQnLCB0aGlzLmNvbnZlcnRUb1VuaXRzKG5vZGUucGFkZGluZ0xlZnQpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm9kZS5wYWRkaW5nUmlnaHQgIT09IDApIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdwYWRkaW5nLXJpZ2h0JywgdGhpcy5jb252ZXJ0VG9Vbml0cyhub2RlLnBhZGRpbmdSaWdodCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChub2RlLnBhZGRpbmdUb3AgIT09IDApIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdwYWRkaW5nLXRvcCcsIHRoaXMuY29udmVydFRvVW5pdHMobm9kZS5wYWRkaW5nVG9wKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGUucGFkZGluZ0JvdHRvbSAhPT0gMCkge1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ3BhZGRpbmctYm90dG9tJywgdGhpcy5jb252ZXJ0VG9Vbml0cyhub2RlLnBhZGRpbmdCb3R0b20pKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGxheW91dCBhcyBGbGV4Ym94XG4gICAgICovXG4gICAgcHJvY2Vzc0ZsZXhib3hMYXlvdXQobm9kZSwgcHJvcGVydGllcykge1xuICAgICAgICAvLyBTZXQgZGlzcGxheSB0eXBlIHRvIGZsZXhcbiAgICAgICAgcHJvcGVydGllcy5zZXQoJ2Rpc3BsYXknLCAnZmxleCcpO1xuICAgICAgICAvLyBNYXAgZGlyZWN0aW9uXG4gICAgICAgIGlmIChub2RlLmxheW91dE1vZGUgPT09ICdIT1JJWk9OVEFMJykge1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2ZsZXgtZGlyZWN0aW9uJywgJ3JvdycpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG5vZGUubGF5b3V0TW9kZSA9PT0gJ1ZFUlRJQ0FMJykge1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2ZsZXgtZGlyZWN0aW9uJywgJ2NvbHVtbicpO1xuICAgICAgICB9XG4gICAgICAgIC8vIE1hcCBhbGlnbm1lbnRcbiAgICAgICAgaWYgKG5vZGUucHJpbWFyeUF4aXNBbGlnbkl0ZW1zID09PSAnTUlOJykge1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2p1c3RpZnktY29udGVudCcsICdmbGV4LXN0YXJ0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobm9kZS5wcmltYXJ5QXhpc0FsaWduSXRlbXMgPT09ICdDRU5URVInKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnanVzdGlmeS1jb250ZW50JywgJ2NlbnRlcicpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG5vZGUucHJpbWFyeUF4aXNBbGlnbkl0ZW1zID09PSAnTUFYJykge1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2p1c3RpZnktY29udGVudCcsICdmbGV4LWVuZCcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG5vZGUucHJpbWFyeUF4aXNBbGlnbkl0ZW1zID09PSAnU1BBQ0VfQkVUV0VFTicpIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdqdXN0aWZ5LWNvbnRlbnQnLCAnc3BhY2UtYmV0d2VlbicpO1xuICAgICAgICB9XG4gICAgICAgIC8vIE1hcCBjb3VudGVyIGFsaWdubWVudFxuICAgICAgICBpZiAobm9kZS5jb3VudGVyQXhpc0FsaWduSXRlbXMgPT09ICdNSU4nKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnYWxpZ24taXRlbXMnLCAnZmxleC1zdGFydCcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG5vZGUuY291bnRlckF4aXNBbGlnbkl0ZW1zID09PSAnQ0VOVEVSJykge1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2FsaWduLWl0ZW1zJywgJ2NlbnRlcicpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKG5vZGUuY291bnRlckF4aXNBbGlnbkl0ZW1zID09PSAnTUFYJykge1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2FsaWduLWl0ZW1zJywgJ2ZsZXgtZW5kJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTWFwIGdhcFxuICAgICAgICBpZiAobm9kZS5pdGVtU3BhY2luZyAhPT0gMCkge1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2dhcCcsIHRoaXMuY29udmVydFRvVW5pdHMobm9kZS5pdGVtU3BhY2luZykpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEhhbmRsZSBhdXRvLWxheW91dCB3cmFwcGluZ1xuICAgICAgICBpZiAobm9kZS5sYXlvdXRXcmFwID09PSAnV1JBUCcpIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdmbGV4LXdyYXAnLCAnd3JhcCcpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCByZXNwb25zaXZlIGJyZWFrcG9pbnRzIGZvciBmbGV4IGl0ZW1zXG4gICAgICAgIGlmICgnY2hpbGRyZW4nIGluIG5vZGUgJiYgbm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwICYmIG5vZGUubGF5b3V0V3JhcCA9PT0gJ1dSQVAnKSB7XG4gICAgICAgICAgICAvLyBQcm9jZXNzIGNoaWxkIGNvbnN0cmFpbnRzIGZvciBmbGV4IGl0ZW1zXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NGbGV4Q2hpbGRyZW4obm9kZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBsYXlvdXQgYXMgQ1NTIEdyaWRcbiAgICAgKi9cbiAgICBwcm9jZXNzR3JpZExheW91dChub2RlLCBwcm9wZXJ0aWVzKSB7XG4gICAgICAgIC8vIFNldCBkaXNwbGF5IHR5cGUgdG8gZ3JpZFxuICAgICAgICBwcm9wZXJ0aWVzLnNldCgnZGlzcGxheScsICdncmlkJyk7XG4gICAgICAgIC8vIENhbGN1bGF0ZSBncmlkIHRlbXBsYXRlIGNvbHVtbnMvcm93cyBiYXNlZCBvbiBjaGlsZHJlblxuICAgICAgICBpZiAoJ2NoaWxkcmVuJyBpbiBub2RlICYmIG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKG5vZGUubGF5b3V0TW9kZSA9PT0gJ0hPUklaT05UQUwnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVHcmlkVGVtcGxhdGVDb2x1bW5zKG5vZGUsIHByb3BlcnRpZXMpO1xuICAgICAgICAgICAgICAgIC8vIFNldCBhbGlnbm1lbnQgaW4gdGhlIHJvdyBkaXJlY3Rpb25cbiAgICAgICAgICAgICAgICBpZiAobm9kZS5wcmltYXJ5QXhpc0FsaWduSXRlbXMgPT09ICdTUEFDRV9CRVRXRUVOJykge1xuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnanVzdGlmeS1jb250ZW50JywgJ3NwYWNlLWJldHdlZW4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobm9kZS5wcmltYXJ5QXhpc0FsaWduSXRlbXMgPT09ICdDRU5URVInKSB7XG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdqdXN0aWZ5LWNvbnRlbnQnLCAnY2VudGVyJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5vZGUucHJpbWFyeUF4aXNBbGlnbkl0ZW1zID09PSAnTUFYJykge1xuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnanVzdGlmeS1jb250ZW50JywgJ2VuZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlR3JpZFRlbXBsYXRlUm93cyhub2RlLCBwcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgICAgICAvLyBTZXQgYWxpZ25tZW50IGluIHRoZSBjb2x1bW4gZGlyZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUucHJpbWFyeUF4aXNBbGlnbkl0ZW1zID09PSAnU1BBQ0VfQkVUV0VFTicpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2FsaWduLWNvbnRlbnQnLCAnc3BhY2UtYmV0d2VlbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChub2RlLnByaW1hcnlBeGlzQWxpZ25JdGVtcyA9PT0gJ0NFTlRFUicpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2FsaWduLWNvbnRlbnQnLCAnY2VudGVyJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5vZGUucHJpbWFyeUF4aXNBbGlnbkl0ZW1zID09PSAnTUFYJykge1xuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnYWxpZ24tY29udGVudCcsICdlbmQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IGdhcCBmb3IgZ3JpZFxuICAgICAgICBpZiAobm9kZS5pdGVtU3BhY2luZyAhPT0gMCkge1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2dhcCcsIHRoaXMuY29udmVydFRvVW5pdHMobm9kZS5pdGVtU3BhY2luZykpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEF1dG8tZmxvdyBiYXNlZCBvbiB3cmFwIG1vZGVcbiAgICAgICAgaWYgKG5vZGUubGF5b3V0V3JhcCA9PT0gJ1dSQVAnKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnZ3JpZC1hdXRvLWZsb3cnLCBub2RlLmxheW91dE1vZGUgPT09ICdIT1JJWk9OVEFMJyA/ICdyb3cnIDogJ2NvbHVtbicpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBncmlkIHRlbXBsYXRlIGNvbHVtbnMgYmFzZWQgb24gY2hpbGRyZW5cbiAgICAgKi9cbiAgICBjYWxjdWxhdGVHcmlkVGVtcGxhdGVDb2x1bW5zKG5vZGUsIHByb3BlcnRpZXMpIHtcbiAgICAgICAgaWYgKCEoJ2NoaWxkcmVuJyBpbiBub2RlKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgLy8gRm9yIHNpbXBsZSBncmlkcywgd2UgY2FuIHVzZSByZXBlYXQgd2l0aCBmaXhlZCB3aWR0aHNcbiAgICAgICAgaWYgKHRoaXMuYXJlQ2hpbGRyZW5TYW1lU2l6ZShub2RlLmNoaWxkcmVuKSkge1xuICAgICAgICAgICAgY29uc3QgY29sdW1ucyA9IE1hdGgubWluKG5vZGUuY2hpbGRyZW4ubGVuZ3RoLCAxMik7IC8vIE1heCAxMiBjb2x1bW5zIGZvciBzdGFuZGFyZCBncmlkXG4gICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zJywgYHJlcGVhdCgke2NvbHVtbnN9LCAxZnIpYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gRm9yIGNvbXBsZXggZ3JpZHMsIGNhbGN1bGF0ZSBlYWNoIGNvbHVtbiB3aWR0aFxuICAgICAgICBjb25zdCBjb2x1bW5XaWR0aHMgPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpZiAoJ3dpZHRoJyBpbiBjaGlsZCkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGZvciBjb25zdHJhaW50c1xuICAgICAgICAgICAgICAgIGlmICgnbGF5b3V0QWxpZ24nIGluIGNoaWxkICYmIGNoaWxkLmxheW91dEFsaWduID09PSAnU1RSRVRDSCcpIHtcbiAgICAgICAgICAgICAgICAgICAgY29sdW1uV2lkdGhzLnB1c2goJzFmcicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29sdW1uV2lkdGhzLnB1c2godGhpcy5jb252ZXJ0VG9Vbml0cyhjaGlsZC53aWR0aCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY29sdW1uV2lkdGhzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdncmlkLXRlbXBsYXRlLWNvbHVtbnMnLCBjb2x1bW5XaWR0aHMuam9pbignICcpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgZ3JpZCB0ZW1wbGF0ZSByb3dzIGJhc2VkIG9uIGNoaWxkcmVuXG4gICAgICovXG4gICAgY2FsY3VsYXRlR3JpZFRlbXBsYXRlUm93cyhub2RlLCBwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGlmICghKCdjaGlsZHJlbicgaW4gbm9kZSkpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIC8vIEZvciBzaW1wbGUgZ3JpZHMsIHdlIGNhbiB1c2UgcmVwZWF0IHdpdGggZml4ZWQgaGVpZ2h0c1xuICAgICAgICBpZiAodGhpcy5hcmVDaGlsZHJlblNhbWVTaXplKG5vZGUuY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICBjb25zdCByb3dzID0gTWF0aC5taW4obm9kZS5jaGlsZHJlbi5sZW5ndGgsIDEyKTsgLy8gTWF4IDEyIHJvd3MgZm9yIHN0YW5kYXJkIGdyaWRcbiAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdncmlkLXRlbXBsYXRlLXJvd3MnLCBgcmVwZWF0KCR7cm93c30sIDFmcilgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBGb3IgY29tcGxleCBncmlkcywgY2FsY3VsYXRlIGVhY2ggcm93IGhlaWdodFxuICAgICAgICBjb25zdCByb3dIZWlnaHRzID0gW107XG4gICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgaWYgKCdoZWlnaHQnIGluIGNoaWxkKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGNvbnN0cmFpbnRzXG4gICAgICAgICAgICAgICAgaWYgKCdsYXlvdXRBbGlnbicgaW4gY2hpbGQgJiYgY2hpbGQubGF5b3V0QWxpZ24gPT09ICdTVFJFVENIJykge1xuICAgICAgICAgICAgICAgICAgICByb3dIZWlnaHRzLnB1c2goJzFmcicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcm93SGVpZ2h0cy5wdXNoKHRoaXMuY29udmVydFRvVW5pdHMoY2hpbGQuaGVpZ2h0KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChyb3dIZWlnaHRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdncmlkLXRlbXBsYXRlLXJvd3MnLCByb3dIZWlnaHRzLmpvaW4oJyAnKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBmbGV4IGNoaWxkcmVuIHRvIHNldCB0aGVpciBmbGV4IHByb3BlcnRpZXMgYmFzZWQgb24gY29uc3RyYWludHNcbiAgICAgKi9cbiAgICBwcm9jZXNzRmxleENoaWxkcmVuKG5vZGUpIHtcbiAgICAgICAgaWYgKCEoJ2NoaWxkcmVuJyBpbiBub2RlKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGNoaWxkXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgY2hpbGQgPSBub2RlLmNoaWxkcmVuW2ldO1xuICAgICAgICAgICAgLy8gT25seSBwcm9jZXNzIHZpc2libGUgc2NlbmUgbm9kZXNcbiAgICAgICAgICAgIGlmICghdGhpcy5pc1NjZW5lTm9kZShjaGlsZCkgfHwgKCd2aXNpYmxlJyBpbiBjaGlsZCAmJiAhY2hpbGQudmlzaWJsZSkpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEdldCBjaGlsZCBjbGFzcyBuYW1lc1xuICAgICAgICAgICAgY29uc3QgY2xhc3NOYW1lID0gdGhpcy5nZW5lcmF0ZUNsYXNzTmFtZShjaGlsZCk7XG4gICAgICAgICAgICBjb25zdCBzZWxlY3RvciA9IGAuJHtjbGFzc05hbWV9YDtcbiAgICAgICAgICAgIGxldCBwcm9wZXJ0aWVzID0gdGhpcy5jc3NSdWxlcy5nZXQoc2VsZWN0b3IpO1xuICAgICAgICAgICAgaWYgKCFwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgcHJvcGVydGllcyA9IG5ldyBNYXAoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNzc1J1bGVzLnNldChzZWxlY3RvciwgcHJvcGVydGllcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBDaGVjayBjaGlsZCBjb25zdHJhaW50c1xuICAgICAgICAgICAgaWYgKCdsYXlvdXRHcm93JyBpbiBjaGlsZCkge1xuICAgICAgICAgICAgICAgIGlmIChjaGlsZC5sYXlvdXRHcm93ID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEVxdWl2YWxlbnQgdG8gXCJGaWxsIGNvbnRhaW5lclwiIGluIEZpZ21hXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdmbGV4LWdyb3cnLCAnMScpO1xuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnZmxleC1zaHJpbmsnLCAnMScpO1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiBob3Jpem9udGFsIGxheW91dCwgYWRqdXN0IHdpZHRoXG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmxheW91dE1vZGUgPT09ICdIT1JJWk9OVEFMJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdoZWlnaHQnLCAnMTAwJScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBcIkh1ZyBjb250ZW50c1wiIGluIEZpZ21hXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdmbGV4LWdyb3cnLCAnMCcpO1xuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnZmxleC1zaHJpbmsnLCAnMCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEFkZCByZXNwb25zaXZlIGJlaGF2aW9yIGZvciB3cmFwcGluZyBsYXlvdXRzXG4gICAgICAgICAgICBpZiAobm9kZS5sYXlvdXRXcmFwID09PSAnV1JBUCcpIHtcbiAgICAgICAgICAgICAgICAvLyBNYWtlIGl0ZW1zIGZ1bGwgd2lkdGggb24gc21hbGwgc2NyZWVucyBpZiBpbiB3cmFwcGluZyBtb2RlXG4gICAgICAgICAgICAgICAgY29uc3QgbWVkaWFRdWVyeSA9IGBAbWVkaWEgKG1heC13aWR0aDogNzY4cHgpYDtcbiAgICAgICAgICAgICAgICBsZXQgbWVkaWFQcm9wZXJ0aWVzID0gdGhpcy5jc3NSdWxlcy5nZXQobWVkaWFRdWVyeSk7XG4gICAgICAgICAgICAgICAgaWYgKCFtZWRpYVByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgbWVkaWFQcm9wZXJ0aWVzID0gbmV3IE1hcCgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNzc1J1bGVzLnNldChtZWRpYVF1ZXJ5LCBtZWRpYVByb3BlcnRpZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBBZGQgcnVsZSBmb3IgdGhpcyBjaGlsZCBpbiB0aGUgbWVkaWEgcXVlcnlcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5sYXlvdXRNb2RlID09PSAnSE9SSVpPTlRBTCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbWVkaWFQcm9wZXJ0aWVzLnNldChgJHtzZWxlY3Rvcn0gd2lkdGhgLCAnMTAwJScpO1xuICAgICAgICAgICAgICAgICAgICBtZWRpYVByb3BlcnRpZXMuc2V0KGAke3NlbGVjdG9yfSBmbGV4LWJhc2lzYCwgJzEwMCUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYSBub2RlIGlzIGEgc2NlbmUgbm9kZSAoaGVscGVyKVxuICAgICAqL1xuICAgIGlzU2NlbmVOb2RlKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUgJiYgJ3R5cGUnIGluIG5vZGU7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGEgbGF5b3V0IGlzIHN1aXRhYmxlIGZvciBDU1MgR3JpZFxuICAgICAqL1xuICAgIGlzR3JpZFN1aXRhYmxlKG5vZGUpIHtcbiAgICAgICAgLy8gR3JpZCBpcyBzdWl0YWJsZSBmb3IgY29tcGxleCBsYXlvdXRzIHdpdGggbXVsdGlwbGUgcm93cyBhbmQgY29sdW1uc1xuICAgICAgICAvLyBvciB3aGVuIGl0ZW1zIG5lZWQgcHJlY2lzZSBhbGlnbm1lbnQgaW4gdHdvIGRpbWVuc2lvbnNcbiAgICAgICAgaWYgKCEoJ2NoaWxkcmVuJyBpbiBub2RlKSB8fCBub2RlLmNoaWxkcmVuLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIGl0J3MgYSB3cmFwcGluZyBsYXlvdXQsIGdyaWQgaXMgb2Z0ZW4gYmV0dGVyXG4gICAgICAgIGlmIChub2RlLmxheW91dFdyYXAgPT09ICdXUkFQJykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG1hbnkgY2hpbGRyZW4sIGdyaWQgbWlnaHQgYmUgYmV0dGVyXG4gICAgICAgIGlmIChub2RlLmNoaWxkcmVuLmxlbmd0aCA+PSA0KSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiBjaGlsZHJlbiBoYXZlIGNvbXBsZXggYWxpZ25tZW50IG5lZWRzLCBncmlkIG1pZ2h0IGJlIGJldHRlclxuICAgICAgICBsZXQgaGFzQ29tcGxleEFsaWdubWVudCA9IGZhbHNlO1xuICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGlmICgnbGF5b3V0QWxpZ24nIGluIGNoaWxkICYmIGNoaWxkLmxheW91dEFsaWduID09PSAnU1RSRVRDSCcpIHtcbiAgICAgICAgICAgICAgICBoYXNDb21wbGV4QWxpZ25tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaGFzQ29tcGxleEFsaWdubWVudDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYWxsIGNoaWxkcmVuIGFyZSByb3VnaGx5IHRoZSBzYW1lIHNpemVcbiAgICAgKi9cbiAgICBhcmVDaGlsZHJlblNhbWVTaXplKGNoaWxkcmVuKSB7XG4gICAgICAgIGlmIChjaGlsZHJlbi5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGZpcnN0V2lkdGggPSAwO1xuICAgICAgICBsZXQgZmlyc3RIZWlnaHQgPSAwO1xuICAgICAgICAvLyBGaW5kIGZpcnN0IHZhbGlkIGNoaWxkIHdpdGggZGltZW5zaW9uc1xuICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpZiAoJ3dpZHRoJyBpbiBjaGlsZCAmJiAnaGVpZ2h0JyBpbiBjaGlsZCkge1xuICAgICAgICAgICAgICAgIGZpcnN0V2lkdGggPSBjaGlsZC53aWR0aDtcbiAgICAgICAgICAgICAgICBmaXJzdEhlaWdodCA9IGNoaWxkLmhlaWdodDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBDaGVjayBpZiBhbGwgY2hpbGRyZW4gaGF2ZSBzaW1pbGFyIGRpbWVuc2lvbnNcbiAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBjaGlsZHJlbikge1xuICAgICAgICAgICAgaWYgKCd3aWR0aCcgaW4gY2hpbGQgJiYgJ2hlaWdodCcgaW4gY2hpbGQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB3aWR0aERpZmYgPSBNYXRoLmFicyhjaGlsZC53aWR0aCAtIGZpcnN0V2lkdGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodERpZmYgPSBNYXRoLmFicyhjaGlsZC5oZWlnaHQgLSBmaXJzdEhlaWdodCk7XG4gICAgICAgICAgICAgICAgLy8gQWxsb3cgZm9yIHNtYWxsIHZhcmlhdGlvbnMgKHdpdGhpbiA1JSlcbiAgICAgICAgICAgICAgICBpZiAod2lkdGhEaWZmID4gZmlyc3RXaWR0aCAqIDAuMDUgfHwgaGVpZ2h0RGlmZiA+IGZpcnN0SGVpZ2h0ICogMC4wNSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIHBvc2l0aW9uIGZvciBub24tQXV0byBMYXlvdXQgbm9kZXNcbiAgICAgKi9cbiAgICBwcm9jZXNzUG9zaXRpb24obm9kZSwgY2xhc3NOYW1lKSB7XG4gICAgICAgIGlmICghKCd4JyBpbiBub2RlKSB8fCAhKCd5JyBpbiBub2RlKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3Qgc2VsZWN0b3IgPSBgLiR7Y2xhc3NOYW1lfWA7XG4gICAgICAgIGxldCBwcm9wZXJ0aWVzID0gdGhpcy5jc3NSdWxlcy5nZXQoc2VsZWN0b3IpO1xuICAgICAgICBpZiAoIXByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMgPSBuZXcgTWFwKCk7XG4gICAgICAgICAgICB0aGlzLmNzc1J1bGVzLnNldChzZWxlY3RvciwgcHJvcGVydGllcyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gT25seSBhcHBseSBhYnNvbHV0ZSBwb3NpdGlvbmluZyBpZiBjb25maWcgYWxsb3dzIGl0XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZy5sYXlvdXRQcmVmZXJlbmNlID09PSAnYWxsb3ctYWJzb2x1dGUnKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgncG9zaXRpb24nLCAnYWJzb2x1dGUnKTtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdsZWZ0JywgdGhpcy5jb252ZXJ0VG9Vbml0cyhub2RlLngpKTtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCd0b3AnLCB0aGlzLmNvbnZlcnRUb1VuaXRzKG5vZGUueSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgZm9udCBzdHlsZXMgZm9yIHRleHQgbm9kZXNcbiAgICAgKi9cbiAgICBwcm9jZXNzRm9udFN0eWxlcyhub2RlLCBjbGFzc05hbWUpIHtcbiAgICAgICAgY29uc3Qgc2VsZWN0b3IgPSBgLiR7Y2xhc3NOYW1lfWA7XG4gICAgICAgIGxldCBwcm9wZXJ0aWVzID0gdGhpcy5jc3NSdWxlcy5nZXQoc2VsZWN0b3IpO1xuICAgICAgICBpZiAoIXByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMgPSBuZXcgTWFwKCk7XG4gICAgICAgICAgICB0aGlzLmNzc1J1bGVzLnNldChzZWxlY3RvciwgcHJvcGVydGllcyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSGFuZGxlIGZvbnQgZmFtaWx5XG4gICAgICAgIGlmIChub2RlLmZvbnROYW1lICE9PSBmaWdtYS5taXhlZCkge1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2ZvbnQtZmFtaWx5JywgYCcke25vZGUuZm9udE5hbWUuZmFtaWx5fScsIHNhbnMtc2VyaWZgKTtcbiAgICAgICAgICAgIC8vIEhhbmRsZSBmb250IHdlaWdodFxuICAgICAgICAgICAgaWYgKG5vZGUuZm9udE5hbWUuc3R5bGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnYm9sZCcpKSB7XG4gICAgICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2ZvbnQtd2VpZ2h0JywgJ2JvbGQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG5vZGUuZm9udE5hbWUuc3R5bGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbGlnaHQnKSkge1xuICAgICAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdmb250LXdlaWdodCcsICczMDAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKG5vZGUuZm9udE5hbWUuc3R5bGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbWVkaXVtJykpIHtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnZm9udC13ZWlnaHQnLCAnNTAwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBIYW5kbGUgZm9udCBzdHlsZVxuICAgICAgICAgICAgaWYgKG5vZGUuZm9udE5hbWUuc3R5bGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnaXRhbGljJykpIHtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnZm9udC1zdHlsZScsICdpdGFsaWMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBGb250IHNpemVcbiAgICAgICAgaWYgKG5vZGUuZm9udFNpemUgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnZm9udC1zaXplJywgdGhpcy5jb252ZXJ0VG9Vbml0cyhub2RlLmZvbnRTaXplKSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTGluZSBoZWlnaHRcbiAgICAgICAgaWYgKG5vZGUubGluZUhlaWdodCAhPT0gZmlnbWEubWl4ZWQgJiYgbm9kZS5saW5lSGVpZ2h0LnVuaXQgIT09ICdBVVRPJykge1xuICAgICAgICAgICAgaWYgKG5vZGUubGluZUhlaWdodC51bml0ID09PSAnUElYRUxTJykge1xuICAgICAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCdsaW5lLWhlaWdodCcsIHRoaXMuY29udmVydFRvVW5pdHMobm9kZS5saW5lSGVpZ2h0LnZhbHVlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChub2RlLmxpbmVIZWlnaHQudW5pdCA9PT0gJ1BFUkNFTlQnKSB7XG4gICAgICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ2xpbmUtaGVpZ2h0JywgYCR7bm9kZS5saW5lSGVpZ2h0LnZhbHVlIC8gMTAwfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIExldHRlciBzcGFjaW5nXG4gICAgICAgIGlmIChub2RlLmxldHRlclNwYWNpbmcgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnbGV0dGVyLXNwYWNpbmcnLCB0aGlzLmNvbnZlcnRUb1VuaXRzKG5vZGUubGV0dGVyU3BhY2luZy52YWx1ZSkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRleHQgYWxpZ25tZW50XG4gICAgICAgIC8vIFdlIG5lZWQgdG8gY2hlY2sgaWYgaXQncyBleGFjdGx5IGVxdWFsIHRvIG9uZSBvZiB0aGUgdmFsdWVzIHdlJ3JlIGV4cGVjdGluZ1xuICAgICAgICBjb25zdCB0ZXh0QWxpZ24gPSBub2RlLnRleHRBbGlnbkhvcml6b250YWw7XG4gICAgICAgIGlmICh0ZXh0QWxpZ24gPT09ICdMRUZUJykge1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ3RleHQtYWxpZ24nLCAnbGVmdCcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRleHRBbGlnbiA9PT0gJ0NFTlRFUicpIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCd0ZXh0LWFsaWduJywgJ2NlbnRlcicpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRleHRBbGlnbiA9PT0gJ1JJR0hUJykge1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ3RleHQtYWxpZ24nLCAncmlnaHQnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0ZXh0QWxpZ24gPT09ICdKVVNUSUZJRUQnKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgndGV4dC1hbGlnbicsICdqdXN0aWZ5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGV4dCBkZWNvcmF0aW9uXG4gICAgICAgIGNvbnN0IHRleHREZWNvcmF0aW9uID0gbm9kZS50ZXh0RGVjb3JhdGlvbjtcbiAgICAgICAgaWYgKHRleHREZWNvcmF0aW9uID09PSAnVU5ERVJMSU5FJykge1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ3RleHQtZGVjb3JhdGlvbicsICd1bmRlcmxpbmUnKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0ZXh0RGVjb3JhdGlvbiA9PT0gJ1NUUklLRVRIUk9VR0gnKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgndGV4dC1kZWNvcmF0aW9uJywgJ2xpbmUtdGhyb3VnaCcpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRleHQgY2FzZVxuICAgICAgICBjb25zdCB0ZXh0Q2FzZSA9IG5vZGUudGV4dENhc2U7XG4gICAgICAgIGlmICh0ZXh0Q2FzZSA9PT0gJ1VQUEVSJykge1xuICAgICAgICAgICAgcHJvcGVydGllcy5zZXQoJ3RleHQtdHJhbnNmb3JtJywgJ3VwcGVyY2FzZScpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRleHRDYXNlID09PSAnTE9XRVInKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgndGV4dC10cmFuc2Zvcm0nLCAnbG93ZXJjYXNlJyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodGV4dENhc2UgPT09ICdUSVRMRScpIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuc2V0KCd0ZXh0LXRyYW5zZm9ybScsICdjYXBpdGFsaXplJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGV4dCBjb2xvciAtIEV4dHJhY3QgZnJvbSBmaWxsc1xuICAgICAgICBpZiAobm9kZS5maWxscyAmJiBBcnJheS5pc0FycmF5KG5vZGUuZmlsbHMpICYmIG5vZGUuZmlsbHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBmaXJzdCB2aXNpYmxlIHNvbGlkIGZpbGwgZm9yIHRleHQgY29sb3JcbiAgICAgICAgICAgIGNvbnN0IHRleHRGaWxsID0gbm9kZS5maWxscy5maW5kKGZpbGwgPT4gZmlsbC50eXBlID09PSAnU09MSUQnICYmIGZpbGwudmlzaWJsZSAhPT0gZmFsc2UpO1xuICAgICAgICAgICAgaWYgKHRleHRGaWxsICYmIHRleHRGaWxsLnR5cGUgPT09ICdTT0xJRCcpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgdGhlIGZpbGwgY29sb3IgYXMgdGV4dCBjb2xvciwgbm90IGJhY2tncm91bmRcbiAgICAgICAgICAgICAgICBjb25zdCByZ2JhID0gdGhpcy5yZ2JhVG9DU1ModGV4dEZpbGwuY29sb3IuciwgdGV4dEZpbGwuY29sb3IuZywgdGV4dEZpbGwuY29sb3IuYiwgdGV4dEZpbGwub3BhY2l0eSB8fCAxKTtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLnNldCgnY29sb3InLCByZ2JhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBhIENTUyBjbGFzcyBuYW1lIGZyb20gYSBub2RlXG4gICAgICovXG4gICAgZ2VuZXJhdGVDbGFzc05hbWUobm9kZSkge1xuICAgICAgICBpZiAodGhpcy5jb25maWcuY2xhc3NOYW1pbmdTdHJhdGVneSA9PT0gJ2xheWVyLWJhc2VkJykge1xuICAgICAgICAgICAgLy8gR2VuZXJhdGUgYSBjbGFzcyBuYW1lIGJhc2VkIG9uIHRoZSBub2RlIG5hbWVcbiAgICAgICAgICAgIGlmIChub2RlLm5hbWUgJiYgbm9kZS5uYW1lLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBTYW5pdGl6ZSB0aGUgbmFtZSB0byBiZSBDU1MtZnJpZW5kbHlcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zYW5pdGl6ZUZvckNTUyhub2RlLm5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuY29uZmlnLmNsYXNzTmFtaW5nU3RyYXRlZ3kgPT09ICdiZW0nKSB7XG4gICAgICAgICAgICAvLyBVc2UgQmxvY2stRWxlbWVudC1Nb2RpZmllciBuYW1pbmcgc3RyYXRlZ3lcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdlbmVyYXRlQmVtQ2xhc3NOYW1lKG5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuY29uZmlnLmNsYXNzTmFtaW5nU3RyYXRlZ3kgPT09ICd1bmlxdWUtaWQnKSB7XG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBhIHVuaXF1ZSBJRC1iYXNlZCBjbGFzcyBuYW1lXG4gICAgICAgICAgICBjb25zdCBub2RlVHlwZSA9IG5vZGUudHlwZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgLy8gR2V0IGZpcnN0IDggY2hhcnMgb2Ygbm9kZSBJRFxuICAgICAgICAgICAgY29uc3QgaWRGcmFnbWVudCA9ICgnaWQnIGluIG5vZGUgJiYgdHlwZW9mIG5vZGUuaWQgPT09ICdzdHJpbmcnKSA/XG4gICAgICAgICAgICAgICAgbm9kZS5pZC5zdWJzdHJpbmcoMCwgOCkgOlxuICAgICAgICAgICAgICAgIHRoaXMudW5pcXVlSWRDb3VudGVyLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICByZXR1cm4gYCR7bm9kZVR5cGV9LSR7aWRGcmFnbWVudH1gO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZhbGxiYWNrIHRvIGEgc2ltcGxlIHR5cGUtYmFzZWQgbmFtZSB3aXRoIGNvdW50ZXJcbiAgICAgICAgcmV0dXJuIGAke25vZGUudHlwZS50b0xvd2VyQ2FzZSgpfS0keysrdGhpcy51bmlxdWVJZENvdW50ZXJ9YDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBCRU0tc3R5bGUgY2xhc3MgbmFtZVxuICAgICAqL1xuICAgIGdlbmVyYXRlQmVtQ2xhc3NOYW1lKG5vZGUpIHtcbiAgICAgICAgLy8gQkVNIGZvcm1hdDogYmxvY2tfX2VsZW1lbnQtLW1vZGlmaWVyXG4gICAgICAgIC8vIFRyeSB0byBkZXRlcm1pbmUgaWYgdGhpcyBpcyBhIGNvbXBvbmVudFxuICAgICAgICBjb25zdCBpc0NvbXBvbmVudCA9IG5vZGUudHlwZSA9PT0gJ0NPTVBPTkVOVCcgfHwgbm9kZS50eXBlID09PSAnSU5TVEFOQ0UnO1xuICAgICAgICAvLyBHZXQgcGFyZW50IHBhdGggdG8gdW5kZXJzdGFuZCBuZXN0aW5nXG4gICAgICAgIGNvbnN0IHBhcmVudE5vZGUgPSB0aGlzLmZpbmRQYXJlbnROb2RlKG5vZGUpO1xuICAgICAgICBsZXQgYmxvY2tOYW1lID0gJyc7XG4gICAgICAgIGxldCBlbGVtZW50TmFtZSA9ICcnO1xuICAgICAgICBsZXQgbW9kaWZpZXJzID0gW107XG4gICAgICAgIC8vIFByb2Nlc3MgZGlmZmVyZW50IG5vZGUgdHlwZXNcbiAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ0NPTVBPTkVOVCc6XG4gICAgICAgICAgICBjYXNlICdDT01QT05FTlRfU0VUJzpcbiAgICAgICAgICAgICAgICAvLyBDb21wb25lbnRzIGFyZSBhbHdheXMgYmxvY2tzXG4gICAgICAgICAgICAgICAgYmxvY2tOYW1lID0gdGhpcy5zYW5pdGl6ZUZvckNTUyhub2RlLm5hbWUuc3BsaXQoJywnKVswXS50cmltKCkpO1xuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgbW9kaWZpZXJzIGZyb20gdmFyaWFudCBwcm9wZXJ0aWVzIGlmIGFueVxuICAgICAgICAgICAgICAgIGlmIChub2RlLm5hbWUuaW5jbHVkZXMoJywnKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IG5vZGUubmFtZS5zcGxpdCgnLCcpLnNsaWNlKDEpO1xuICAgICAgICAgICAgICAgICAgICBwYXJ0cy5mb3JFYWNoKHBhcnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnQuaW5jbHVkZXMoJz0nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IFtwcm9wLCB2YWx1ZV0gPSBwYXJ0LnNwbGl0KCc9JykubWFwKHAgPT4gcC50cmltKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGlmaWVycy5wdXNoKGAke3RoaXMuc2FuaXRpemVGb3JDU1MocHJvcCl9LSR7dGhpcy5zYW5pdGl6ZUZvckNTUyh2YWx1ZSl9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ0lOU1RBTkNFJzpcbiAgICAgICAgICAgICAgICAvLyBJbnN0YW5jZXMgdXNlIHRoZSBtYXN0ZXIgY29tcG9uZW50IG5hbWUgYXMgYmxvY2tcbiAgICAgICAgICAgICAgICAvLyBJbiBhIHJlYWwgcGx1Z2luLCB3ZSB3b3VsZCBhY2Nlc3MgbWFpbkNvbXBvbmVudC5uYW1lXG4gICAgICAgICAgICAgICAgYmxvY2tOYW1lID0gdGhpcy5zYW5pdGl6ZUZvckNTUyhub2RlLm5hbWUuc3BsaXQoJywnKVswXS50cmltKCkpO1xuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgdmFyaWFudCBwcm9wZXJ0aWVzIGFzIG1vZGlmaWVyc1xuICAgICAgICAgICAgICAgIGlmIChub2RlLm5hbWUuaW5jbHVkZXMoJywnKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IG5vZGUubmFtZS5zcGxpdCgnLCcpLnNsaWNlKDEpO1xuICAgICAgICAgICAgICAgICAgICBwYXJ0cy5mb3JFYWNoKHBhcnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnQuaW5jbHVkZXMoJz0nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IFtwcm9wLCB2YWx1ZV0gPSBwYXJ0LnNwbGl0KCc9JykubWFwKHAgPT4gcC50cmltKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZGlmaWVycy5wdXNoKGAke3RoaXMuc2FuaXRpemVGb3JDU1MocHJvcCl9LSR7dGhpcy5zYW5pdGl6ZUZvckNTUyh2YWx1ZSl9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gRm9yIGNoaWxkIG5vZGVzLCB0cnkgdG8gZGV0ZXJtaW5lIGlmIGl0J3MgYW4gZWxlbWVudCBvZiBhIGJsb2NrXG4gICAgICAgICAgICAgICAgaWYgKHBhcmVudE5vZGUgJiYgKHBhcmVudE5vZGUudHlwZSA9PT0gJ0NPTVBPTkVOVCcgfHwgcGFyZW50Tm9kZS50eXBlID09PSAnSU5TVEFOQ0UnIHx8IHBhcmVudE5vZGUudHlwZSA9PT0gJ0NPTVBPTkVOVF9TRVQnKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGFuIGVsZW1lbnQgd2l0aGluIGEgY29tcG9uZW50XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrTmFtZSA9IHRoaXMuc2FuaXRpemVGb3JDU1MocGFyZW50Tm9kZS5uYW1lLnNwbGl0KCcsJylbMF0udHJpbSgpKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudE5hbWUgPSB0aGlzLnNhbml0aXplRm9yQ1NTKG5vZGUubmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHBhcmVudE5vZGUgJiYgJ3BhcmVudCcgaW4gcGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgbmVzdGVkIGVsZW1lbnQsIHVzZSB0aGUgbmVhcmVzdCBjb21wb25lbnQgYW5jZXN0b3IgYXMgYmxvY2tcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYW5jZXN0b3JDb21wb25lbnQgPSB0aGlzLmZpbmRBbmNlc3RvckNvbXBvbmVudChub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFuY2VzdG9yQ29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBibG9ja05hbWUgPSB0aGlzLnNhbml0aXplRm9yQ1NTKGFuY2VzdG9yQ29tcG9uZW50Lm5hbWUuc3BsaXQoJywnKVswXS50cmltKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudE5hbWUgPSB0aGlzLnNhbml0aXplRm9yQ1NTKG5vZGUubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBObyBjb21wb25lbnQgYW5jZXN0b3IgZm91bmQsIHRyZWF0IGFzIGEgYmxvY2tcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrTmFtZSA9IHRoaXMuc2FuaXRpemVGb3JDU1Mobm9kZS5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RhbmRhbG9uZSBub2RlLCB0cmVhdCBhcyBhIGJsb2NrXG4gICAgICAgICAgICAgICAgICAgIGJsb2NrTmFtZSA9IHRoaXMuc2FuaXRpemVGb3JDU1Mobm9kZS5uYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gQmFzaWMgdmFsaWRhdGlvblxuICAgICAgICBpZiAoIWJsb2NrTmFtZSkge1xuICAgICAgICAgICAgYmxvY2tOYW1lID0gYGJsb2NrLSR7Kyt0aGlzLnVuaXF1ZUlkQ291bnRlcn1gO1xuICAgICAgICB9XG4gICAgICAgIC8vIENvbnN0cnVjdCBCRU0gY2xhc3NcbiAgICAgICAgbGV0IGJlbUNsYXNzID0gYmxvY2tOYW1lO1xuICAgICAgICAvLyBBZGQgZWxlbWVudCBwYXJ0IGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoZWxlbWVudE5hbWUpIHtcbiAgICAgICAgICAgIGJlbUNsYXNzICs9IGBfXyR7ZWxlbWVudE5hbWV9YDtcbiAgICAgICAgfVxuICAgICAgICAvLyBBZGQgbW9kaWZpZXJzIGlmIGFueVxuICAgICAgICBpZiAobW9kaWZpZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIFJldHVybiBiYXNlIGNsYXNzIHBsdXMgaW5kaXZpZHVhbCBtb2RpZmllciBjbGFzc2VzXG4gICAgICAgICAgICByZXR1cm4gYmVtQ2xhc3M7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJlbUNsYXNzO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBGaW5kIHRoZSBwYXJlbnQgbm9kZSBvZiBhIHNjZW5lIG5vZGUgKHNpbXBsaWZpZWQgZm9yIGRlbW8pXG4gICAgICogSW4gYSByZWFsIHBsdWdpbiwgd2Ugd291bGQgdXNlIHRoZSBGaWdtYSBBUEkncyBub2RlLnBhcmVudCBwcm9wZXJ0eVxuICAgICAqL1xuICAgIGZpbmRQYXJlbnROb2RlKG5vZGUpIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhIHNpbXBsaWZpZWQgbW9jayBpbXBsZW1lbnRhdGlvblxuICAgICAgICAvLyBJbiBhIHJlYWwgcGx1Z2luLCB3ZSB3b3VsZCBhY2Nlc3Mgbm9kZS5wYXJlbnRcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEZpbmQgdGhlIG5lYXJlc3QgYW5jZXN0b3IgY29tcG9uZW50XG4gICAgICogSW4gYSByZWFsIHBsdWdpbiwgd2Ugd291bGQgdHJhdmVyc2UgdGhlIG5vZGUucGFyZW50IGNoYWluXG4gICAgICovXG4gICAgZmluZEFuY2VzdG9yQ29tcG9uZW50KG5vZGUpIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhIHNpbXBsaWZpZWQgbW9jayBpbXBsZW1lbnRhdGlvblxuICAgICAgICAvLyBJbiBhIHJlYWwgcGx1Z2luLCB3ZSB3b3VsZCB0cmF2ZXJzZSB1cCB0aGUgcGFyZW50IGNoYWluXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGEgRmlnbWEgY29sb3IgdG8gQ1NTIHJnYmFcbiAgICAgKi9cbiAgICByZ2JhVG9DU1MociwgZywgYiwgYSkge1xuICAgICAgICAvLyBDb252ZXJ0IDAtMSByYW5nZSB0byAwLTI1NVxuICAgICAgICBjb25zdCBySW50ID0gTWF0aC5yb3VuZChyICogMjU1KTtcbiAgICAgICAgY29uc3QgZ0ludCA9IE1hdGgucm91bmQoZyAqIDI1NSk7XG4gICAgICAgIGNvbnN0IGJJbnQgPSBNYXRoLnJvdW5kKGIgKiAyNTUpO1xuICAgICAgICBpZiAoYSA8IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBgcmdiYSgke3JJbnR9LCAke2dJbnR9LCAke2JJbnR9LCAke2EudG9GaXhlZCgyKX0pYDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBgcmdiKCR7ckludH0sICR7Z0ludH0sICR7YkludH0pYDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGxpbmVhciBncmFkaWVudCB0byBDU1NcbiAgICAgKi9cbiAgICBsaW5lYXJHcmFkaWVudFRvQ1NTKGZpbGwpIHtcbiAgICAgICAgLy8gRXh0cmFjdCBncmFkaWVudCBzdG9wc1xuICAgICAgICBjb25zdCBzdG9wcyA9IGZpbGwuZ3JhZGllbnRTdG9wcy5tYXAoc3RvcCA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb2xvciA9IHRoaXMucmdiYVRvQ1NTKHN0b3AuY29sb3Iuciwgc3RvcC5jb2xvci5nLCBzdG9wLmNvbG9yLmIsIHN0b3AuY29sb3IuYSk7XG4gICAgICAgICAgICByZXR1cm4gYCR7Y29sb3J9ICR7TWF0aC5yb3VuZChzdG9wLnBvc2l0aW9uICogMTAwKX0lYDtcbiAgICAgICAgfSkuam9pbignLCAnKTtcbiAgICAgICAgLy8gSW4gYSByZWFsIHBsdWdpbiwgd2Ugd291bGQgY2FsY3VsYXRlIHRoZSBjb3JyZWN0IGFuZ2xlIGZyb20gdGhlIGdyYWRpZW50IGhhbmRsZXNcbiAgICAgICAgLy8gRm9yIHRoaXMgZXhhbXBsZSwgd2UnbGwgdXNlIGEgZGVmYXVsdCBhbmdsZVxuICAgICAgICByZXR1cm4gYGxpbmVhci1ncmFkaWVudCg5MGRlZywgJHtzdG9wc30pYDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29udmVydCByYWRpYWwgZ3JhZGllbnQgdG8gQ1NTXG4gICAgICovXG4gICAgcmFkaWFsR3JhZGllbnRUb0NTUyhmaWxsKSB7XG4gICAgICAgIC8vIEV4dHJhY3QgZ3JhZGllbnQgc3RvcHNcbiAgICAgICAgY29uc3Qgc3RvcHMgPSBmaWxsLmdyYWRpZW50U3RvcHMubWFwKHN0b3AgPT4ge1xuICAgICAgICAgICAgY29uc3QgY29sb3IgPSB0aGlzLnJnYmFUb0NTUyhzdG9wLmNvbG9yLnIsIHN0b3AuY29sb3IuZywgc3RvcC5jb2xvci5iLCBzdG9wLmNvbG9yLmEpO1xuICAgICAgICAgICAgcmV0dXJuIGAke2NvbG9yfSAke01hdGgucm91bmQoc3RvcC5wb3NpdGlvbiAqIDEwMCl9JWA7XG4gICAgICAgIH0pLmpvaW4oJywgJyk7XG4gICAgICAgIC8vIEluIGEgcmVhbCBwbHVnaW4sIHdlIHdvdWxkIGNhbGN1bGF0ZSB0aGUgY29ycmVjdCBjZW50ZXIgYW5kIHNoYXBlIGZyb20gdGhlIGdyYWRpZW50IGhhbmRsZXNcbiAgICAgICAgLy8gRm9yIHRoaXMgZXhhbXBsZSwgd2UnbGwgdXNlIGRlZmF1bHQgdmFsdWVzXG4gICAgICAgIHJldHVybiBgcmFkaWFsLWdyYWRpZW50KGNpcmNsZSwgJHtzdG9wc30pYDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29udmVydCBhIEZpZ21hIHZhbHVlIHRvIENTUyB1bml0cyBiYXNlZCBvbiBjb25maWdcbiAgICAgKi9cbiAgICBjb252ZXJ0VG9Vbml0cyh2YWx1ZSkge1xuICAgICAgICBzd2l0Y2ggKHRoaXMuY29uZmlnLmNzc1VuaXRzKSB7XG4gICAgICAgICAgICBjYXNlICdyZW0nOlxuICAgICAgICAgICAgICAgIHJldHVybiBgJHsodmFsdWUgLyAxNikudG9GaXhlZCgyKX1yZW1gO1xuICAgICAgICAgICAgY2FzZSAnZW0nOlxuICAgICAgICAgICAgICAgIHJldHVybiBgJHsodmFsdWUgLyAxNikudG9GaXhlZCgyKX1lbWA7XG4gICAgICAgICAgICBjYXNlICdweCc6XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiBgJHtNYXRoLnJvdW5kKHZhbHVlKX1weGA7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogU2FuaXRpemUgYSBzdHJpbmcgdG8gYmUgdXNlZCBhcyBhIENTUyBjbGFzcyBuYW1lXG4gICAgICovXG4gICAgc2FuaXRpemVGb3JDU1MobmFtZSkge1xuICAgICAgICAvLyBGaXJzdCwgY2hlY2sgaWYgbmFtZSBzdGFydHMgd2l0aCBhIG51bWJlclxuICAgICAgICBjb25zdCBzdGFydHNXaXRoTnVtYmVyID0gL15cXGQvLnRlc3QobmFtZSk7XG4gICAgICAgIC8vIFByb2Nlc3MgdGhlIG5hbWVcbiAgICAgICAgbGV0IHNhbml0aXplZCA9IG5hbWVcbiAgICAgICAgICAgIC50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICAucmVwbGFjZSgvW15hLXowLTldL2csICctJylcbiAgICAgICAgICAgIC5yZXBsYWNlKC8tKy9nLCAnLScpIC8vIFJlcGxhY2UgbXVsdGlwbGUgaHlwaGVucyB3aXRoIHNpbmdsZSBoeXBoZW5cbiAgICAgICAgICAgIC5yZXBsYWNlKC9eLXwtJC9nLCAnJykgLy8gUmVtb3ZlIGxlYWRpbmcvdHJhaWxpbmcgaHlwaGVuc1xuICAgICAgICAgICAgfHwgJ2VsZW1lbnQnOyAvLyBEZWZhdWx0IGlmIGV2ZXJ5dGhpbmcgd2FzIHJlbW92ZWRcbiAgICAgICAgLy8gSWYgbmFtZSBzdGFydHMgd2l0aCBhIG51bWJlciwgcHJlZml4IGl0XG4gICAgICAgIGlmIChzdGFydHNXaXRoTnVtYmVyKSB7XG4gICAgICAgICAgICBjb25zdCBuYW1lVHlwZSA9IHRoaXMuZ2V0TmFtZVR5cGUobmFtZSk7XG4gICAgICAgICAgICBzYW5pdGl6ZWQgPSBuYW1lVHlwZSArICctJyArIHNhbml0aXplZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2FuaXRpemVkO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHZXQgc2VtYW50aWMgdHlwZSBmcm9tIG5hbWUgZm9yIHByZWZpeGluZ1xuICAgICAqL1xuICAgIGdldE5hbWVUeXBlKG5hbWUpIHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHByaWNlIHBhdHRlcm5zICgkWC5YWCBvciBYLlhYKVxuICAgICAgICBpZiAoL1xcJD9cXGQrXFwuXFxkKy8udGVzdChuYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuICdwcmljZSc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2hlY2sgZm9yIHdlaWdodC9zaXplIHBhdHRlcm5zIChYIGxiLCBYIGtnLCBldGMuKVxuICAgICAgICBpZiAoL1xcZCsoXFwuXFxkKyk/XFxzKihsYnxrZ3xnfG96KS8udGVzdChuYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuICdxdWFudGl0eSc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGl0ZW0gY291bnQgcGF0dGVybnMgKFggaXRlbXMpXG4gICAgICAgIGlmICgvXFxkK1xccyppdGVtcz8vLnRlc3QobmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAnY291bnQnO1xuICAgICAgICB9XG4gICAgICAgIC8vIERlZmF1bHQgcHJlZml4IGZvciBudW1iZXJzXG4gICAgICAgIHJldHVybiAnaXRlbSc7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEVzY2FwZSBIVE1MIHNwZWNpYWwgY2hhcmFjdGVyc1xuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICByZXR1cm4gdGV4dFxuICAgICAgICAgICAgLnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICcmIzAzOTsnKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBwbGFjZWhvbGRlciBTVkcgYmFzZWQgb24gdGhlIG5vZGUgdHlwZVxuICAgICAqL1xuICAgIGdlbmVyYXRlUGxhY2Vob2xkZXJTdmcobm9kZSkge1xuICAgICAgICBjb25zdCB3aWR0aCA9IE1hdGgucm91bmQobm9kZS53aWR0aCk7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IE1hdGgucm91bmQobm9kZS5oZWlnaHQpO1xuICAgICAgICBjb25zdCBjZW50ZXJYID0gd2lkdGggLyAyO1xuICAgICAgICBjb25zdCBjZW50ZXJZID0gaGVpZ2h0IC8gMjtcbiAgICAgICAgLy8gR2VuZXJhdGUgYSBkaWZmZXJlbnQgc2hhcGUgYmFzZWQgb24gbm9kZSB0eXBlXG4gICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdWRUNUT1InOlxuICAgICAgICAgICAgICAgIC8vIEdlbmVyaWMgcGF0aCBmb3IgdmVjdG9yXG4gICAgICAgICAgICAgICAgcmV0dXJuIGA8cGF0aCBkPVwiTSR7d2lkdGggKiAwLjJ9LCR7aGVpZ2h0ICogMC4yfSBMJHt3aWR0aCAqIDAuOH0sJHtoZWlnaHQgKiAwLjJ9IEwke3dpZHRoICogMC44fSwke2hlaWdodCAqIDAuOH0gTCR7d2lkdGggKiAwLjJ9LCR7aGVpZ2h0ICogMC44fSBaXCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMlwiLz5gO1xuICAgICAgICAgICAgY2FzZSAnU1RBUic6XG4gICAgICAgICAgICAgICAgLy8gU2ltcGxlIDUtcG9pbnQgc3RhclxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJQb2ludHMgPSBbXTtcbiAgICAgICAgICAgICAgICBjb25zdCBvdXRlclJhZGl1cyA9IE1hdGgubWluKHdpZHRoLCBoZWlnaHQpIC8gMiAqIDAuOTtcbiAgICAgICAgICAgICAgICBjb25zdCBpbm5lclJhZGl1cyA9IG91dGVyUmFkaXVzIC8gMjtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDEwOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmFkaXVzID0gaSAlIDIgPT09IDAgPyBvdXRlclJhZGl1cyA6IGlubmVyUmFkaXVzO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhbmdsZSA9IChNYXRoLlBJIC8gNSkgKiBpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB4ID0gY2VudGVyWCArIHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeSA9IGNlbnRlclkgLSByYWRpdXMgKiBNYXRoLmNvcyhhbmdsZSk7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJQb2ludHMucHVzaChgJHt4fSwke3l9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBgPHBvbHlnb24gcG9pbnRzPVwiJHtzdGFyUG9pbnRzLmpvaW4oJyAnKX1cIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyXCIvPmA7XG4gICAgICAgICAgICBjYXNlICdFTExJUFNFJzpcbiAgICAgICAgICAgICAgICAvLyBDaXJjbGUgb3IgZWxsaXBzZVxuICAgICAgICAgICAgICAgIGNvbnN0IHJ4ID0gd2lkdGggLyAyICogMC45O1xuICAgICAgICAgICAgICAgIGNvbnN0IHJ5ID0gaGVpZ2h0IC8gMiAqIDAuOTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYDxlbGxpcHNlIGN4PVwiJHtjZW50ZXJYfVwiIGN5PVwiJHtjZW50ZXJZfVwiIHJ4PVwiJHtyeH1cIiByeT1cIiR7cnl9XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMlwiLz5gO1xuICAgICAgICAgICAgY2FzZSAnUE9MWUdPTic6XG4gICAgICAgICAgICAgICAgLy8gSGV4YWdvbiBhcyBwbGFjZWhvbGRlciBmb3IgcG9seWdvblxuICAgICAgICAgICAgICAgIGNvbnN0IHBvbHlnb25Qb2ludHMgPSBbXTtcbiAgICAgICAgICAgICAgICBjb25zdCByYWRpdXMgPSBNYXRoLm1pbih3aWR0aCwgaGVpZ2h0KSAvIDIgKiAwLjk7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA2OyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYW5nbGUgPSAoTWF0aC5QSSAvIDMpICogaTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeCA9IGNlbnRlclggKyByYWRpdXMgKiBNYXRoLnNpbihhbmdsZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHkgPSBjZW50ZXJZIC0gcmFkaXVzICogTWF0aC5jb3MoYW5nbGUpO1xuICAgICAgICAgICAgICAgICAgICBwb2x5Z29uUG9pbnRzLnB1c2goYCR7eH0sJHt5fWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYDxwb2x5Z29uIHBvaW50cz1cIiR7cG9seWdvblBvaW50cy5qb2luKCcgJyl9XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMlwiLz5gO1xuICAgICAgICAgICAgY2FzZSAnTElORSc6XG4gICAgICAgICAgICAgICAgLy8gU2ltcGxlIGxpbmVcbiAgICAgICAgICAgICAgICByZXR1cm4gYDxsaW5lIHgxPVwiJHt3aWR0aCAqIDAuMX1cIiB5MT1cIiR7aGVpZ2h0ICogMC4xfVwiIHgyPVwiJHt3aWR0aCAqIDAuOX1cIiB5Mj1cIiR7aGVpZ2h0ICogMC45fVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjJcIi8+YDtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gRGVmYXVsdCByZWN0YW5nbGVcbiAgICAgICAgICAgICAgICByZXR1cm4gYDxyZWN0IHg9XCIke3dpZHRoICogMC4xfVwiIHk9XCIke2hlaWdodCAqIDAuMX1cIiB3aWR0aD1cIiR7d2lkdGggKiAwLjh9XCIgaGVpZ2h0PVwiJHtoZWlnaHQgKiAwLjh9XCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiMlwiLz5gO1xuICAgICAgICB9XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9