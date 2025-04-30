/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
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
/*!*******************!*\
  !*** ./src/ui.ts ***!
  \*******************/
__webpack_require__.r(__webpack_exports__);
// Get form elements
const cssUnitsSelect = document.getElementById('cssUnits');
const classNamingStrategySelect = document.getElementById('classNamingStrategy');
const attributeCasingSelect = document.getElementById('attributeCasing');
const layoutPreferenceSelect = document.getElementById('layoutPreference');
const svgExportModeSelect = document.getElementById('svgExportMode');
const extractDesignTokensCheckbox = document.getElementById('extractDesignTokens');
const extractLayoutInfoCheckbox = document.getElementById('extractLayoutInfo');
const extractComponentInfoCheckbox = document.getElementById('extractComponentInfo');
const saveButton = document.getElementById('saveButton');
// Current configuration
let currentConfig = {
    cssUnits: 'px',
    classNamingStrategy: 'layer-based',
    attributeCasing: 'kebab-case',
    layoutPreference: 'flexbox',
    svgExportMode: 'inline',
    extractDesignTokens: true,
    extractLayoutInfo: true,
    extractComponentInfo: true
};
// Initialize UI
function initializeUI() {
    // Request current config from the plugin
    parent.postMessage({ pluginMessage: { type: 'get-config' } }, '*');
    // Set up event listeners
    saveButton.addEventListener('click', saveSettings);
}
// Update UI from config
function updateUI(config) {
    cssUnitsSelect.value = config.cssUnits;
    classNamingStrategySelect.value = config.classNamingStrategy;
    attributeCasingSelect.value = config.attributeCasing;
    layoutPreferenceSelect.value = config.layoutPreference;
    svgExportModeSelect.value = config.svgExportMode;
    extractDesignTokensCheckbox.checked = config.extractDesignTokens;
    extractLayoutInfoCheckbox.checked = config.extractLayoutInfo;
    extractComponentInfoCheckbox.checked = config.extractComponentInfo;
}
// Save settings back to the plugin
function saveSettings() {
    const updatedConfig = {
        cssUnits: cssUnitsSelect.value,
        classNamingStrategy: classNamingStrategySelect.value,
        attributeCasing: attributeCasingSelect.value,
        layoutPreference: layoutPreferenceSelect.value,
        svgExportMode: svgExportModeSelect.value,
        extractDesignTokens: extractDesignTokensCheckbox.checked,
        extractLayoutInfo: extractLayoutInfoCheckbox.checked,
        extractComponentInfo: extractComponentInfoCheckbox.checked
    };
    // Send updated config to the plugin
    parent.postMessage({
        pluginMessage: {
            type: 'update-config',
            config: updatedConfig
        }
    }, '*');
    // Provide visual feedback
    saveButton.textContent = 'Saved!';
    setTimeout(() => {
        saveButton.textContent = 'Save Settings';
    }, 2000);
}
// Listen for messages from the plugin
window.onmessage = (event) => {
    const message = event.data.pluginMessage;
    if (!message)
        return;
    if (message.type === 'config') {
        // Update current config and UI
        currentConfig = message.config;
        updateUI(currentConfig);
    }
};
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUI);


/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkuanMiLCJtYXBwaW5ncyI6Ijs7VUFBQTtVQUNBOzs7OztXQ0RBO1dBQ0E7V0FDQTtXQUNBLHVEQUF1RCxpQkFBaUI7V0FDeEU7V0FDQSxnREFBZ0QsYUFBYTtXQUM3RDs7Ozs7Ozs7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUJBQXlCLGlCQUFpQixzQkFBc0I7QUFDaEU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ1UiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9maWdtYWRldi1hY2NlbGVyYXRvci93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9maWdtYWRldi1hY2NlbGVyYXRvci93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL2ZpZ21hZGV2LWFjY2VsZXJhdG9yLy4vc3JjL3VpLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIFRoZSByZXF1aXJlIHNjb3BlXG52YXIgX193ZWJwYWNrX3JlcXVpcmVfXyA9IHt9O1xuXG4iLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCIvLyBHZXQgZm9ybSBlbGVtZW50c1xuY29uc3QgY3NzVW5pdHNTZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3NzVW5pdHMnKTtcbmNvbnN0IGNsYXNzTmFtaW5nU3RyYXRlZ3lTZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2xhc3NOYW1pbmdTdHJhdGVneScpO1xuY29uc3QgYXR0cmlidXRlQ2FzaW5nU2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2F0dHJpYnV0ZUNhc2luZycpO1xuY29uc3QgbGF5b3V0UHJlZmVyZW5jZVNlbGVjdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsYXlvdXRQcmVmZXJlbmNlJyk7XG5jb25zdCBzdmdFeHBvcnRNb2RlU2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N2Z0V4cG9ydE1vZGUnKTtcbmNvbnN0IGV4dHJhY3REZXNpZ25Ub2tlbnNDaGVja2JveCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdleHRyYWN0RGVzaWduVG9rZW5zJyk7XG5jb25zdCBleHRyYWN0TGF5b3V0SW5mb0NoZWNrYm94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2V4dHJhY3RMYXlvdXRJbmZvJyk7XG5jb25zdCBleHRyYWN0Q29tcG9uZW50SW5mb0NoZWNrYm94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2V4dHJhY3RDb21wb25lbnRJbmZvJyk7XG5jb25zdCBzYXZlQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmVCdXR0b24nKTtcbi8vIEN1cnJlbnQgY29uZmlndXJhdGlvblxubGV0IGN1cnJlbnRDb25maWcgPSB7XG4gICAgY3NzVW5pdHM6ICdweCcsXG4gICAgY2xhc3NOYW1pbmdTdHJhdGVneTogJ2xheWVyLWJhc2VkJyxcbiAgICBhdHRyaWJ1dGVDYXNpbmc6ICdrZWJhYi1jYXNlJyxcbiAgICBsYXlvdXRQcmVmZXJlbmNlOiAnZmxleGJveCcsXG4gICAgc3ZnRXhwb3J0TW9kZTogJ2lubGluZScsXG4gICAgZXh0cmFjdERlc2lnblRva2VuczogdHJ1ZSxcbiAgICBleHRyYWN0TGF5b3V0SW5mbzogdHJ1ZSxcbiAgICBleHRyYWN0Q29tcG9uZW50SW5mbzogdHJ1ZVxufTtcbi8vIEluaXRpYWxpemUgVUlcbmZ1bmN0aW9uIGluaXRpYWxpemVVSSgpIHtcbiAgICAvLyBSZXF1ZXN0IGN1cnJlbnQgY29uZmlnIGZyb20gdGhlIHBsdWdpblxuICAgIHBhcmVudC5wb3N0TWVzc2FnZSh7IHBsdWdpbk1lc3NhZ2U6IHsgdHlwZTogJ2dldC1jb25maWcnIH0gfSwgJyonKTtcbiAgICAvLyBTZXQgdXAgZXZlbnQgbGlzdGVuZXJzXG4gICAgc2F2ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHNhdmVTZXR0aW5ncyk7XG59XG4vLyBVcGRhdGUgVUkgZnJvbSBjb25maWdcbmZ1bmN0aW9uIHVwZGF0ZVVJKGNvbmZpZykge1xuICAgIGNzc1VuaXRzU2VsZWN0LnZhbHVlID0gY29uZmlnLmNzc1VuaXRzO1xuICAgIGNsYXNzTmFtaW5nU3RyYXRlZ3lTZWxlY3QudmFsdWUgPSBjb25maWcuY2xhc3NOYW1pbmdTdHJhdGVneTtcbiAgICBhdHRyaWJ1dGVDYXNpbmdTZWxlY3QudmFsdWUgPSBjb25maWcuYXR0cmlidXRlQ2FzaW5nO1xuICAgIGxheW91dFByZWZlcmVuY2VTZWxlY3QudmFsdWUgPSBjb25maWcubGF5b3V0UHJlZmVyZW5jZTtcbiAgICBzdmdFeHBvcnRNb2RlU2VsZWN0LnZhbHVlID0gY29uZmlnLnN2Z0V4cG9ydE1vZGU7XG4gICAgZXh0cmFjdERlc2lnblRva2Vuc0NoZWNrYm94LmNoZWNrZWQgPSBjb25maWcuZXh0cmFjdERlc2lnblRva2VucztcbiAgICBleHRyYWN0TGF5b3V0SW5mb0NoZWNrYm94LmNoZWNrZWQgPSBjb25maWcuZXh0cmFjdExheW91dEluZm87XG4gICAgZXh0cmFjdENvbXBvbmVudEluZm9DaGVja2JveC5jaGVja2VkID0gY29uZmlnLmV4dHJhY3RDb21wb25lbnRJbmZvO1xufVxuLy8gU2F2ZSBzZXR0aW5ncyBiYWNrIHRvIHRoZSBwbHVnaW5cbmZ1bmN0aW9uIHNhdmVTZXR0aW5ncygpIHtcbiAgICBjb25zdCB1cGRhdGVkQ29uZmlnID0ge1xuICAgICAgICBjc3NVbml0czogY3NzVW5pdHNTZWxlY3QudmFsdWUsXG4gICAgICAgIGNsYXNzTmFtaW5nU3RyYXRlZ3k6IGNsYXNzTmFtaW5nU3RyYXRlZ3lTZWxlY3QudmFsdWUsXG4gICAgICAgIGF0dHJpYnV0ZUNhc2luZzogYXR0cmlidXRlQ2FzaW5nU2VsZWN0LnZhbHVlLFxuICAgICAgICBsYXlvdXRQcmVmZXJlbmNlOiBsYXlvdXRQcmVmZXJlbmNlU2VsZWN0LnZhbHVlLFxuICAgICAgICBzdmdFeHBvcnRNb2RlOiBzdmdFeHBvcnRNb2RlU2VsZWN0LnZhbHVlLFxuICAgICAgICBleHRyYWN0RGVzaWduVG9rZW5zOiBleHRyYWN0RGVzaWduVG9rZW5zQ2hlY2tib3guY2hlY2tlZCxcbiAgICAgICAgZXh0cmFjdExheW91dEluZm86IGV4dHJhY3RMYXlvdXRJbmZvQ2hlY2tib3guY2hlY2tlZCxcbiAgICAgICAgZXh0cmFjdENvbXBvbmVudEluZm86IGV4dHJhY3RDb21wb25lbnRJbmZvQ2hlY2tib3guY2hlY2tlZFxuICAgIH07XG4gICAgLy8gU2VuZCB1cGRhdGVkIGNvbmZpZyB0byB0aGUgcGx1Z2luXG4gICAgcGFyZW50LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgcGx1Z2luTWVzc2FnZToge1xuICAgICAgICAgICAgdHlwZTogJ3VwZGF0ZS1jb25maWcnLFxuICAgICAgICAgICAgY29uZmlnOiB1cGRhdGVkQ29uZmlnXG4gICAgICAgIH1cbiAgICB9LCAnKicpO1xuICAgIC8vIFByb3ZpZGUgdmlzdWFsIGZlZWRiYWNrXG4gICAgc2F2ZUJ1dHRvbi50ZXh0Q29udGVudCA9ICdTYXZlZCEnO1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBzYXZlQnV0dG9uLnRleHRDb250ZW50ID0gJ1NhdmUgU2V0dGluZ3MnO1xuICAgIH0sIDIwMDApO1xufVxuLy8gTGlzdGVuIGZvciBtZXNzYWdlcyBmcm9tIHRoZSBwbHVnaW5cbndpbmRvdy5vbm1lc3NhZ2UgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXZlbnQuZGF0YS5wbHVnaW5NZXNzYWdlO1xuICAgIGlmICghbWVzc2FnZSlcbiAgICAgICAgcmV0dXJuO1xuICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdjb25maWcnKSB7XG4gICAgICAgIC8vIFVwZGF0ZSBjdXJyZW50IGNvbmZpZyBhbmQgVUlcbiAgICAgICAgY3VycmVudENvbmZpZyA9IG1lc3NhZ2UuY29uZmlnO1xuICAgICAgICB1cGRhdGVVSShjdXJyZW50Q29uZmlnKTtcbiAgICB9XG59O1xuLy8gSW5pdGlhbGl6ZSB3aGVuIERPTSBpcyBsb2FkZWRcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBpbml0aWFsaXplVUkpO1xuZXhwb3J0IHt9O1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9