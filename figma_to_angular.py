import os
import re
import json
import zipfile
import io
from typing import Dict, List, Any, Optional, Tuple
from IPython.display import Markdown, display, HTML
from google.colab import files

# For Gemini API integration
# import google.generativeai as genai

# For OpenAI integration (alternative)
# import openai

# ========== Configuration Functions ==========

def configure_genai_api(api_key: str):
    """Configure the Gemini API with the provided key."""
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    print("Gemini API configured successfully!")
    return genai

def configure_openai_api(api_key: str):
    """Configure the OpenAI API with the provided key."""
    import openai
    openai.api_key = api_key
    print("OpenAI API configured successfully!")
    return openai

def create_gemini_model(genai, model_name="gemini-1.5-pro"):
    """Create and return the Gemini model."""
    model = genai.GenerativeModel(
        model_name=model_name,
        generation_config={
            "temperature": 0.2,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
        }
    )
    return model

# ========== Stage 1: Component Parser ==========

def parse_figma_json(figma_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse Figma JSON to extract component hierarchy and properties.
    
    Args:
        figma_json: The Figma design JSON
    
    Returns:
        Dictionary containing component tree
    """
    component_tree = {}
    
    # Extract document structure
    if "document" in figma_json:
        document = figma_json["document"]
        
        # Process the document to extract components
        component_tree = process_node(document)
    
    return component_tree

def process_node(node: Dict[str, Any], parent_path: str = "") -> Dict[str, Any]:
    """
    Recursively process a Figma node and its children.
    
    Args:
        node: The Figma node to process
        parent_path: Path to the parent node
    
    Returns:
        Processed node information
    """
    result = {
        "id": node.get("id", ""),
        "name": node.get("name", ""),
        "type": node.get("type", ""),
        "children": [],
        "properties": {}
    }
    
    # Extract relevant properties based on node type
    if "style" in node:
        result["properties"]["style"] = node["style"]
    
    if "fills" in node:
        result["properties"]["fills"] = node["fills"]
    
    if "strokes" in node:
        result["properties"]["strokes"] = node["strokes"]
    
    if "effects" in node:
        result["properties"]["effects"] = node["effects"]
    
    # For text nodes, extract text content
    if node.get("type") == "TEXT" and "characters" in node:
        result["properties"]["text"] = node["characters"]
        result["properties"]["fontSize"] = node.get("style", {}).get("fontSize", 14)
        result["properties"]["fontWeight"] = node.get("style", {}).get("fontWeight", 400)
    
    # For frames, extract layout information
    if node.get("type") in ["FRAME", "GROUP", "COMPONENT"]:
        result["properties"]["width"] = node.get("size", {}).get("width", 0)
        result["properties"]["height"] = node.get("size", {}).get("height", 0)
        result["properties"]["layoutMode"] = node.get("layoutMode", "NONE")
        result["properties"]["primaryAxisAlignItems"] = node.get("primaryAxisAlignItems", "MIN")
        result["properties"]["counterAxisAlignItems"] = node.get("counterAxisAlignItems", "MIN")
    
    # Process children recursively
    if "children" in node:
        for child in node["children"]:
            child_path = f"{parent_path}/{node.get('name', '')}" if parent_path else node.get("name", "")
            result["children"].append(process_node(child, child_path))
    
    return result

# ========== Stage 2: GenAI Analysis ==========

def analyze_component_tree(component_tree: Dict[str, Any], model, model_type: str = "gemini") -> Dict[str, Any]:
    """
    Analyze the component tree using a generative AI model to identify design patterns and intentions.
    
    Args:
        component_tree: The extracted component tree
        model: The GenAI model (Gemini or OpenAI)
        model_type: Type of model being used ("gemini" or "openai")
    
    Returns:
        Dictionary containing semantic component analysis
    """
    # Convert component tree to a string for the prompt
    component_tree_str = json.dumps(component_tree, indent=2)
    
    prompt = f"""
    You are an expert UI/UX engineer specializing in converting design systems to Angular components.
    
    Analyze the following component tree extracted from a Figma design:
    
    ```json
    {component_tree_str}
    ```
    
    Provide a semantic analysis of this design system that includes:
    
    1. Component Identification: Identify which elements should be Angular components
    2. Component Hierarchy: Determine parent-child relationships
    3. UI Element Classification: Classify elements as:
       - Layout components (container, grid, flex)
       - Navigation elements (menu, tabs, breadcrumbs)
       - Form controls (inputs, buttons, selectors)
       - Content displays (cards, lists, tables)
       - Feedback elements (alerts, modals, notifications)
    4. Style System: Identify repeated styles that should be variables
    5. Interaction Patterns: Identify clickable elements and probable behavior
    6. Data Binding Opportunities: Where dynamic data would likely be bound
    7. Reusable Components: Which elements appear multiple times and should be componentized
    
    Format your response as JSON with these categories as keys, providing detailed analysis under each.
    Return JSON data only with no preamble or explanation.
    """
    
    if model_type == "gemini":
        response = model.generate_content(prompt)
        result = response.text
    else:  # openai
        response = model.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert UI/UX engineer specializing in converting design systems to Angular code."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        result = response.choices[0].message.content
    
    # Clean up response to ensure it's valid JSON
    json_str = result.strip()
    if json_str.startswith("```json"):
        json_str = json_str.replace("```json", "", 1)
    if json_str.endswith("```"):
        json_str = json_str.replace("```", "", 1)
    
    try:
        semantic_analysis = json.loads(json_str.strip())
        return semantic_analysis
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON response: {e}")
        # Simplified response when parsing fails
        return {
            "error": "Failed to parse AI response",
            "raw_content": json_str[:1000] + "... (truncated)"
        }

# ========== Stage 3: RAG System and Prompt Generation ==========

def get_angular_patterns() -> Dict[str, Any]:
    """
    Load Angular design patterns and best practices from knowledge base.
    
    Returns:
        Dictionary containing Angular patterns and conventions
    """
    # This is a simplified version of what would be a more comprehensive RAG system
    # In a production system, this would fetch from a vector database
    
    angular_patterns = {
        "componentNaming": {
            "pattern": "${name}.component.ts",
            "examples": ["header.component.ts", "user-profile.component.ts"]
        },
        "folderStructure": {
            "pattern": "src/app/${feature}/${component}",
            "examples": ["src/app/shared/button", "src/app/user/profile"]
        },
        "styleSystems": {
            "options": ["SCSS", "CSS Variables", "Angular Material Theming"],
            "recommendation": "Use Angular Material's theme system for standard components and SCSS variables for custom elements"
        },
        "dataBindingSyntax": {
            "property": "[property]=\"value\"",
            "event": "(event)=\"handler($event)\"",
            "twoWay": "[(ngModel)]=\"value\""
        },
        "structuralDirectives": {
            "conditional": "*ngIf=\"condition\"",
            "loop": "*ngFor=\"let item of items\"",
            "switch": "[ngSwitch]=\"value\""
        },
        "componentCommunication": {
            "parentToChild": "@Input() propertyName: type;",
            "childToParent": "@Output() eventName = new EventEmitter<type>();",
            "service": "Use a shared service with observables"
        },
        "formPatterns": {
            "reactive": "FormGroup with FormControl instances",
            "template": "ngModel with #reference variables"
        },
        "stateManagement": {
            "local": "Component properties",
            "shared": "Services with BehaviorSubject/Observable",
            "global": "NgRx store"
        }
    }
    
    return angular_patterns

def generate_optimized_prompt(semantic_analysis: Dict[str, Any], angular_patterns: Dict[str, Any]) -> str:
    """
    Generate an optimized prompt for the LLM to create Angular code based on the semantic analysis.
    
    Args:
        semantic_analysis: The semantic component analysis
        angular_patterns: Angular patterns and best practices
    
    Returns:
        Optimized prompt for code generation
    """
    # Convert semantic analysis and Angular patterns to strings for the prompt
    semantic_analysis_str = json.dumps(semantic_analysis, indent=2)
    angular_patterns_str = json.dumps(angular_patterns, indent=2)
    
    # Create a prompt that provides detailed instructions for code generation
    prompt = f"""
    You're a senior Angular developer tasked with creating production-ready Angular components from a Figma design.
    
    Use this semantic analysis of the design:
    ```json
    {semantic_analysis_str}
    ```
    
    Follow these Angular best practices and patterns:
    ```json
    {angular_patterns_str}
    ```
    
    Create complete Angular components that implement this design with the following requirements:
    
    1. File Structure:
       - Generate complete file structure with all necessary files
       - Include module, component, and style files
       - Use proper naming conventions and file organization
    
    2. Component Implementation:
       - Create well-structured TypeScript component classes
       - Implement component lifecycle hooks appropriately
       - Add proper Angular decorators (@Component, @Input, @Output, etc.)
       - Include comments for complex logic
    
    3. Templates:
       - Create semantic HTML templates for each component
       - Use structural directives (ngIf, ngFor) where appropriate
       - Implement proper data binding
       - Use Angular Material components where appropriate
    
    4. Styling:
       - Create SCSS files with variables for reusable styles
       - Implement responsive design principles
       - Use Angular Material theming system for consistency
    
    5. Module Setup:
       - Create feature modules and shared modules
       - Add proper imports and exports
       - Set up component declarations
    
    6. Parent-Child Communication:
       - Implement @Input and @Output where needed
       - Add EventEmitter for child-to-parent communication
    
    7. Data Structure:
       - Create TypeScript interfaces for data models
       - Use proper typing throughout components
    
    8. Services (if needed):
       - Include service implementations for data handling
       - Use dependency injection properly
    
    Return a JSON object where each key is a file path (relative to project root) and the value is the file content. 
    Include all necessary files to make the components work together properly. 
    Ensure that the generated code follows Angular best practices and modern TypeScript standards.
    """
    
    return prompt

# ========== Stage 4: LLM Code Generation ==========

def generate_angular_code(prompt: str, model, model_type: str = "gemini") -> Dict[str, str]:
    """
    Generate Angular component files based on the optimized prompt.
    
    Args:
        prompt: The optimized prompt for code generation
        model: The GenAI model (Gemini or OpenAI)
        model_type: Type of model being used ("gemini" or "openai")
    
    Returns:
        Dictionary of file paths and their contents for the Angular project
    """
    if model_type == "gemini":
        response = model.generate_content(prompt)
        result = response.text
    else:  # openai
        response = model.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert Angular developer converting design to code."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
        )
        result = response.choices[0].message.content
    
    # Clean up response to ensure it's valid JSON
    json_str = result.strip()
    if json_str.startswith("```json"):
        json_str = json_str.replace("```json", "", 1)
    if json_str.endswith("```"):
        json_str = json_str.replace("```", "", 1)
    
    try:
        project_files = json.loads(json_str.strip())
        return project_files
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON response: {e}")
        print("Response:")
        print(json_str)
        # Try to salvage the response by extracting file content between code blocks
        file_pattern = r'```(?:typescript|html|scss|json)?\s+([\s\S]+?)```'
        file_matches = re.findall(file_pattern, result)
        
        if file_matches:
            # Extract filenames from content or use generic names
            project_files = {}
            for i, content in enumerate(file_matches):
                # Try to determine file type and name
                filename = f"extracted_file_{i}.txt"
                if "export class" in content and ".component" in content.lower():
                    component_name = re.search(r'export class (\w+)Component', content)
                    if component_name:
                        name = component_name.group(1).lower()
                        filename = f"src/app/{name}/{name}.component.ts"
                elif "<div" in content or "<app-" in content:
                    filename = f"src/app/component_{i}.html"
                elif "$" in content and "{" in content and ":" in content:
                    filename = f"src/app/styles_{i}.scss"
                elif "interface" in content or "type" in content:
                    filename = f"src/app/models/model_{i}.ts"
                
                project_files[filename] = content
                
            return project_files
        else:
            return {"error.txt": "Failed to generate valid Angular code. Please check the model response."}

# ========== Utility Functions ==========

def save_component_analysis(component_tree: Dict[str, Any], semantic_analysis: Dict[str, Any], format: str = "json"):
    """
    Save the component tree and semantic analysis to files.
    
    Args:
        component_tree: The extracted component tree
        semantic_analysis: The semantic component analysis
        format: Output format ('json' or 'markdown')
    
    Returns:
        Dictionary with file paths to saved files
    """
    output_files = {}
    
    if format == "json":
        # Save component tree as JSON
        component_tree_str = json.dumps(component_tree, indent=2)
        output_files["component_tree.json"] = component_tree_str
        
        # Save semantic analysis as JSON
        semantic_analysis_str = json.dumps(semantic_analysis, indent=2)
        output_files["semantic_analysis.json"] = semantic_analysis_str
    else:  # markdown
        # Convert component tree to markdown
        component_tree_md = "# Component Tree Analysis\n\n"
        component_tree_md += "```json\n" + json.dumps(component_tree, indent=2) + "\n```\n"
        output_files["component_tree.md"] = component_tree_md
        
        # Convert semantic analysis to markdown
        semantic_analysis_md = "# Semantic Analysis\n\n"
        for category, analysis in semantic_analysis.items():
            semantic_analysis_md += f"## {category}\n\n"
            if isinstance(analysis, dict):
                for key, value in analysis.items():
                    semantic_analysis_md += f"### {key}\n\n"
                    if isinstance(value, list):
                        for item in value:
                            semantic_analysis_md += f"- {item}\n"
                    elif isinstance(value, dict):
                        semantic_analysis_md += "```json\n" + json.dumps(value, indent=2) + "\n```\n"
                    else:
                        semantic_analysis_md += f"{value}\n\n"
            elif isinstance(analysis, list):
                for item in analysis:
                    if isinstance(item, dict):
                        semantic_analysis_md += "```json\n" + json.dumps(item, indent=2) + "\n```\n"
                    else:
                        semantic_analysis_md += f"- {item}\n"
            else:
                semantic_analysis_md += f"{analysis}\n\n"
        
        output_files["semantic_analysis.md"] = semantic_analysis_md
    
    return output_files

def create_angular_project_zip(project_files: Dict[str, str]) -> io.BytesIO:
    """
    Create a ZIP file containing the Angular project files.
    
    Args:
        project_files: Dictionary of file paths and their contents
    
    Returns:
        BytesIO object containing the ZIP file
    """
    # Create in-memory file
    zip_buffer = io.BytesIO()
    
    # Create ZIP file
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file_path, content in project_files.items():
            zip_file.writestr(file_path, content)
        
        # Add a README file
        readme_content = """# Generated Angular Project

This Angular project was automatically generated from a Figma design.

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Run the development server:
   ```
   ng serve
   ```

3. Navigate to `http://localhost:4200/` in your browser.

## Project Structure

The project follows standard Angular architecture:

- `src/app/`: Contains the components generated from the Figma design
- `src/assets/`: Contains static assets
- `src/styles.scss`: Global styles

## Dependencies

This project requires:

- Angular 17+
- Angular Material
- TypeScript 5+
"""
        zip_file.writestr("README.md", readme_content)
        
        # Add package.json if not already included
        if "package.json" not in project_files:
            package_json = """{
  "name": "figma-to-angular",
  "version": "0.0.1",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  },
  "private": true,
  "dependencies": {
    "@angular/animations": "^17.0.0",
    "@angular/cdk": "^17.0.0",
    "@angular/common": "^17.0.0",
    "@angular/compiler": "^17.0.0",
    "@angular/core": "^17.0.0",
    "@angular/forms": "^17.0.0",
    "@angular/material": "^17.0.0",
    "@angular/platform-browser": "^17.0.0",
    "@angular/platform-browser-dynamic": "^17.0.0",
    "@angular/router": "^17.0.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.14.2"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^17.0.0",
    "@angular/cli": "^17.0.0",
    "@angular/compiler-cli": "^17.0.0",
    "@types/jasmine": "~4.3.0",
    "jasmine-core": "~4.6.0",
    "karma": "~6.4.0",
    "karma-chrome-launcher": "~3.2.0",
    "karma-coverage": "~2.2.0",
    "karma-jasmine": "~5.1.0",
    "karma-jasmine-html-reporter": "~2.1.0",
    "typescript": "~5.2.2"
  }
}"""
            zip_file.writestr("package.json", package_json)
        
        # Add angular.json if not already included
        if "angular.json" not in project_files:
            angular_json = """{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "figma-to-angular": {
      "projectType": "application",
      "schematics": {
        "@schematics/angular:component": {
          "style": "scss"
        }
      },
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:browser",
          "options": {
            "outputPath": "dist/figma-to-angular",
            "index": "src/index.html",
            "main": "src/main.ts",
            "polyfills": [
              "zone.js"
            ],
            "tsConfig": "tsconfig.app.json",
            "inlineStyleLanguage": "scss",
            "assets": [
              "src/favicon.ico",
              "src/assets"
            ],
            "styles": [
              "src/styles.scss"
            ],
            "scripts": []
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kb",
                  "maximumError": "1mb"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "2kb",
                  "maximumError": "4kb"
                }
              ],
              "outputHashing": "all"
            },
            "development": {
              "buildOptimizer": false,
              "optimization": false,
              "vendorChunk": true,
              "extractLicenses": false,
              "sourceMap": true,
              "namedChunks": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "configurations": {
            "production": {
              "browserTarget": "figma-to-angular:build:production"
            },
            "development": {
              "browserTarget": "figma-to-angular:build:development"
            }
          },
          "defaultConfiguration": "development"
        },
        "extract-i18n": {
          "builder": "@angular-devkit/build-angular:extract-i18n",
          "options": {
            "browserTarget": "figma-to-angular:build"
          }
        },
        "test": {
          "builder": "@angular-devkit/build-angular:karma",
          "options": {
            "polyfills": [
              "zone.js",
              "zone.js/testing"
            ],
            "tsConfig": "tsconfig.spec.json",
            "inlineStyleLanguage": "scss",
            "assets": [
              "src/favicon.ico",
              "src/assets"
            ],
            "styles": [
              "src/styles.scss"
            ],
            "scripts": []
          }
        }
      }
    }
  }
}"""
            zip_file.writestr("angular.json", angular_json)
        
        # Add tsconfig.json if not already included
        if "tsconfig.json" not in project_files:
            tsconfig_json = """{
  "compileOnSave": false,
  "compilerOptions": {
    "baseUrl": "./",
    "outDir": "./dist/out-tsc",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "sourceMap": true,
    "declaration": false,
    "downlevelIteration": true,
    "experimentalDecorators": true,
    "moduleResolution": "node",
    "importHelpers": true,
    "target": "ES2022",
    "module": "ES2022",
    "useDefineForClassFields": false,
    "lib": [
      "ES2022",
      "dom"
    ]
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}"""
            zip_file.writestr("tsconfig.json", tsconfig_json)
            
        # Add main.ts if not already included
        if "src/main.ts" not in project_files:
            main_ts = """import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
"""
            zip_file.writestr("src/main.ts", main_ts)
            
        # Add index.html if not already included
        if "src/index.html" not in project_files:
            index_html = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Figma to Angular</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</head>
<body>
  <app-root></app-root>
</body>
</html>
"""
            zip_file.writestr("src/index.html", index_html)
            
        # Add styles.scss if not already included
        if "src/styles.scss" not in project_files:
            styles_scss = """/* You can add global styles to this file, and also import other style files */
@import '@angular/material/prebuilt-themes/indigo-pink.css';

html, body { 
  height: 100%; 
  margin: 0;
  font-family: 'Inter', sans-serif;
}

body { 
  background-color: #f8f8f8;
  color: #333333;
}

/* Common utility classes */
.container {
  padding: 16px;
  max-width: 1440px;
  margin: 0 auto;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 16px;
  margin-bottom: 16px;
}

/* Common text styles */
h1, h2, h3, h4, h5, h6 {
  margin-top: 0;
  font-weight: 600;
}

/* Form controls styling */
.form-control {
  margin-bottom: 16px;
}

/* Button styling */
.btn {
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-primary {
  background-color: #1976d2;
  color: white;
}

.btn-primary:hover {
  background-color: #1565c0;
}

/* Responsive breakpoints */
@media (max-width: 768px) {
  .container {
    padding: 12px;
  }
}
"""
            zip_file.writestr("src/styles.scss", styles_scss)
            
        # Add app module if not already included
        if "src/app/app.module.ts" not in project_files:
            app_module = """import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

// Angular Material modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';

import { AppComponent } from './app.component';

// Import all components generated from Figma design
// This will be updated by the LLM with all the generated components

@NgModule({
  declarations: [
    AppComponent
    // Add all components here
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule.forRoot([]),
    
    // Angular Material
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule, 
    MatChipsModule,
    MatMenuModule,
    MatBadgeModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
"""
            zip_file.writestr("src/app/app.module.ts", app_module)
            
        # Add app.component.ts if not already included
        if "src/app/app.component.ts" not in project_files:
            app_component_ts = """import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Figma to Angular';
}
"""
            zip_file.writestr("src/app/app.component.ts", app_component_ts)
            
        # Add app.component.html if not already included
        if "src/app/app.component.html" not in project_files:
            app_component_html = """<!-- This is the main app template which will contain all the components generated from Figma -->
<div class="app-container">
  <!-- Components will be included here -->
  <router-outlet></router-outlet>
</div>
"""
            zip_file.writestr("src/app/app.component.html", app_component_html)
            
        # Add app.component.scss if not already included
        if "src/app/app.component.scss" not in project_files:
            app_component_scss = """.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
"""
            zip_file.writestr("src/app/app.component.scss", app_component_scss)
    
    # Reset buffer position
    zip_buffer.seek(0)
    return zip_buffer

def display_project_summary(project_files: Dict[str, str]):
    """Display a summary of the generated Angular project files."""
    display(Markdown("## Generated Angular Project"))
    
    # Organize files by category
    components = []
    templates = []
    styles = []
    models = []
    services = []
    modules = []
    config = []
    
    for file_path in project_files.keys():
        if file_path.endswith(".component.ts"):
            components.append(file_path)
        elif file_path.endswith(".html"):
            templates.append(file_path)
        elif file_path.endswith(".scss") or file_path.endswith(".css"):
            styles.append(file_path)
        elif file_path.endswith(".model.ts") or file_path.endswith("interface.ts"):
            models.append(file_path)
        elif file_path.endswith(".service.ts"):
            services.append(file_path)
        elif file_path.endswith(".module.ts"):
            modules.append(file_path)
        else:
            config.append(file_path)
    
    display(Markdown(f"### Summary\n\n- Total Files: {len(project_files)}\n- Components: {len(components)}\n- Templates: {len(templates)}\n- Style Files: {len(styles)}\n- Models/Interfaces: {len(models)}\n- Services: {len(services)}\n- Modules: {len(modules)}\n- Configuration Files: {len(config)}"))
    
    # Display file tree
    display(Markdown("### File Structure"))
    
    # Build tree structure
    tree = {}
    for file_path in sorted(project_files.keys()):
        parts = file_path.split("/")
        current = tree
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        if "files" not in current:
            current["files"] = []
        current["files"].append(parts[-1])
    
    # Format tree as markdown
    tree_md = format_tree(tree)
    display(Markdown(tree_md))

def format_tree(tree, prefix=""):
    """Format a tree structure as markdown."""
    result = ""
    for key in sorted(tree.keys()):
        if key == "files":
            for file in sorted(tree[key]):
                result += f"{prefix}- {file}\n"
        else:
            result += f"{prefix}- {key}/\n"
            result += format_tree(tree[key], prefix + "  ")
    return result

# ========== Main Conversion Process ==========

def convert_figma_to_angular(figma_json: Dict[str, Any], model, model_type: str = "gemini") -> Dict[str, Any]:
    """
    Convert Figma JSON to Angular code.
    
    Args:
        figma_json: The Figma design JSON
        model: The GenAI model (Gemini or OpenAI)
        model_type: Type of model being used ("gemini" or "openai")
    
    Returns:
        Dictionary containing all generated artifacts
    """
    result = {
        "stage1_component_tree": None,
        "stage2_semantic_analysis": None,
        "stage3_angular_patterns": None,
        "stage3_prompt": None,
        "stage4_angular_code": None,
        "analysis_files": None,
        "project_zip": None
    }
    
    # Stage 1: Component Parser
    print("Stage 1: Parsing Figma JSON...")
    component_tree = parse_figma_json(figma_json)
    result["stage1_component_tree"] = component_tree
    
    # Stage 2: GenAI Analysis
    print("Stage 2: Analyzing component structure...")
    semantic_analysis = analyze_component_tree(component_tree, model, model_type)
    result["stage2_semantic_analysis"] = semantic_analysis
    
    # Stage 3: RAG System and Prompt Generation
    print("Stage 3: Generating optimized prompt...")
    angular_patterns = get_angular_patterns()
    result["stage3_angular_patterns"] = angular_patterns
    
    prompt = generate_optimized_prompt(semantic_analysis, angular_patterns)
    result["stage3_prompt"] = prompt
    
    # Stage 4: LLM Code Generation
    print("Stage 4: Generating Angular code...")
    angular_code = generate_angular_code(prompt, model, model_type)
    result["stage4_angular_code"] = angular_code
    
    # Create intermediate analysis files
    print("Creating analysis files...")
    analysis_files = save_component_analysis(component_tree, semantic_analysis, format="markdown")
    result["analysis_files"] = analysis_files
    
    # Create final ZIP package
    print("Creating Angular project ZIP package...")
    project_zip = create_angular_project_zip(angular_code)
    result["project_zip"] = project_zip
    
    return result

def display_conversion_results(result: Dict[str, Any]):
    """Display the results of the conversion process."""
    # Display component tree and semantic analysis
    display(Markdown("# Figma to Angular Conversion Results"))
    display(Markdown(result["analysis_files"]["component_tree.md"]))
    display(Markdown(result["analysis_files"]["semantic_analysis.md"]))
    
    # Display project summary
    display_project_summary(result["stage4_angular_code"])
    
    # Provide download link for ZIP file
    display(Markdown("## Download Angular Project"))
    display(HTML('<a href="./download_project_zip" target="_blank">Download Angular Project (ZIP)</a>'))
    
    # The actual download would be handled by a Colab-specific code in the notebook
    # We would use files.download() for this in a Colab cell

# Example usage in a Colab notebook:
"""
# Cell 1: Setup API and upload Figma JSON
import figma_to_angular as f2a
from google.colab import files

# Choose your preferred API
api_choice = input("Select AI provider (1 for Gemini, 2 for OpenAI): ")
if api_choice == "1":
    api_key = input("Enter your Google API Key: ")
    genai = f2a.configure_genai_api(api_key)
    model = f2a.create_gemini_model(genai)
    model_type = "gemini"
else:
    api_key = input("Enter your OpenAI API Key: ")
    openai = f2a.configure_openai_api(api_key)
    model = openai
    model_type = "openai"

# Upload Figma JSON
print("Upload your Figma JSON file:")
uploaded = files.upload()
figma_json_filename = list(uploaded.keys())[0]
figma_json_content = uploaded[figma_json_filename].decode('utf-8')
figma_json = json.loads(figma_json_content)

# Cell 2: Run conversion process
result = f2a.convert_figma_to_angular(figma_json, model, model_type)
f2a.display_conversion_results(result)

# Cell 3: Download ZIP
from google.colab import files
zip_data = result["project_zip"].getvalue()
with open('angular_project.zip', 'wb') as f:
    f.write(zip_data)
files.download('angular_project.zip')
"""