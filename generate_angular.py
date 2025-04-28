#!/usr/bin/env python3

import argparse
import json
import os
import re
import sys
import shutil
from dotenv import load_dotenv
import time
import subprocess

# Load environment variables from .env file
load_dotenv()

# Default AI provider - can be 'openai' or 'gemini'
AI_PROVIDER = os.getenv("AI_PROVIDER", "openai").lower()

# Set up API clients based on environment
if AI_PROVIDER == "openai":
    try:
        from openai import OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("Error: OPENAI_API_KEY environment variable not found.")
            print("Please create a .env file with your OpenAI API key.")
            sys.exit(1)
        client = OpenAI(api_key=api_key)
        ai_model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        print(f"Using OpenAI with model: {ai_model_name}")
    except ImportError:
        print("Error: OpenAI package not installed. Please run: pip install openai")
        sys.exit(1)
elif AI_PROVIDER == "gemini":
    try:
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("Error: GEMINI_API_KEY environment variable not found.")
            print("Please create a .env file with your Google Gemini API key.")
            sys.exit(1)
        genai.configure(api_key=api_key)
        ai_model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        model = genai.GenerativeModel(ai_model_name)
        print(f"Using Google Gemini with model: {ai_model_name}")
    except ImportError:
        print("Error: Google Generative AI package not installed. Please run: pip install google-generativeai")
        sys.exit(1)
else:
    print(f"Error: Unsupported AI_PROVIDER: {AI_PROVIDER}. Please use 'openai' or 'gemini'.")
    sys.exit(1)


def parse_arguments():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Generate Angular component files from a JSON description using Gen AI.")
    parser.add_argument("json_file", help="Path to the input JSON file describing the component.")
    parser.add_argument("-o", "--output-dir", default="output", help="Directory to save the generated files (default: ./output).")
    parser.add_argument("--css-type", default="scss", choices=["scss", "css"], help="Type of stylesheet to generate (scss or css, default: scss).")
    parser.add_argument("--create-project", action="store_true", help="Create a complete Angular project that can be run.")
    parser.add_argument("--skip-install", action="store_true", help="Skip npm install when creating a project.")
    return parser.parse_args()


def load_json_data(file_path):
    """Load and parse JSON data from a file."""
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        print(f"Successfully loaded JSON data from: {file_path}")
        return data
    except FileNotFoundError:
        print(f"Error: Input JSON file not found at {file_path}")
        exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Could not decode JSON from {file_path}. Details: {e}")
        exit(1)
    except Exception as e:
        print(f"An unexpected error occurred while reading the JSON file: {e}")
        exit(1)


def to_kebab_case(name):
    """Convert PascalCase or camelCase to kebab-case."""
    name = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', name)
    name = re.sub('__([A-Z])', r'-\1', name)
    name = re.sub('([a-z0-9])([A-Z])', r'\1-\2', name)
    return name.lower()


def create_html_prompt(component_name, root_element_json_str):
    """Create prompt for generating HTML template."""
    return f"""
    Generate the HTML template (`.html` file content) for an Angular component named '{component_name}'.

    **Component Description (from JSON):**
    ```json
    {root_element_json_str}
    ```

    **Instructions:**
    1.  Translate the JSON structure into a valid HTML template.
    2.  Use the 'tag' property from the JSON for HTML elements (default to 'div' or infer semantically if 'tag' is missing).
    3.  Use the 'name' property from the JSON as the primary CSS class for the corresponding element (e.g., "userName" becomes `class="user-name"` - use kebab-case). Add the main component name as a prefix or use BEM if preferred (e.g., `class="{to_kebab_case(component_name)}__user-name"`), but be consistent. Let's prefer simple kebab-case names derived from the 'name' field for now: `class="user-name"`.
    4.  Include the 'content' property directly within text elements.
    5.  Use the 'attributes' property to add HTML attributes (e.g., `src`, `alt`, `href`). For now, assume static values provided in the JSON.
    6.  Correctly handle nested elements defined in the 'children' arrays.
    7.  If an element object in the input JSON contains an svgData field, you should directly embed the string value of svgData into the HTML template at that element's position. In this case (when svgData is present), ignore the tag field for creating the main element (as the SVG string provides the <svg> tag itself). You can still apply styles from the styles object to the <svg> tag itself (like width, height) or potentially wrap the SVG in a div and apply layout styles (like margin) to the wrapper, if appropriate. Do not process the children array for elements that have svgData.
    8.  Keep the component simple - DO NOT add complex form validation, reactive forms, or other features not explicitly defined in the JSON.
    9.  DO NOT use ng-model, formGroup, formControlName, or other form directives unless they're explicitly in the JSON.
    10. Use simple property bindings and event bindings (e.g., [property]="value", (click)="method()") only if they make sense for the component.
    11. Do NOT include any surrounding explanations, just the raw HTML code for the template file.
    """


def create_styling_prompt(component_name, root_element_json_str, style_type="scss"):
    """Create prompt for generating CSS/SCSS stylesheet."""
    kebab_name = to_kebab_case(component_name)
    return f"""
    Generate the {style_type.upper()} stylesheet (`.{style_type}` file content) for an Angular component named '{component_name}'.
    The component's base selector might be 'app-{kebab_name}' or just use classes derived from element names.
    Let's target elements using CSS classes derived from the 'name' property in the JSON (converted to kebab-case, e.g., "userName" becomes `.user-name`).

    **Component Description (from JSON, focus on 'name' and 'styles'):**
    ```json
    {root_element_json_str}
    ```

    **Instructions:**
    1.  Create {style_type.upper()} rules targeting the elements described in the JSON using their kebab-cased 'name' as class selectors (e.g., `.avatar`, `.user-name`, `.follow-button`).
    2.  Apply the CSS properties defined in the 'styles' object for each corresponding element.
    3.  Ensure CSS values (units, colors, etc.) are valid.
    { "4. Use SCSS nesting to reflect the element hierarchy if generating SCSS (e.g., `.user-profile-card { .avatar { ... } }`). Let the root element's styles apply to a top-level class like `.{kebab_name}-wrapper` or similar." if style_type == 'scss' else "4. Write standard CSS rules."}
    5.  Do NOT include any surrounding explanations or markdown formatting like ```css, just the raw {style_type.upper()} code for the stylesheet file.
    """


def create_typescript_prompt(component_name, css_type="scss"):
    """Create prompt for generating TypeScript component class."""
    kebab_name = to_kebab_case(component_name)
    pascal_name = component_name  # Assuming input is PascalCase

    return f"""
    Generate the basic TypeScript class definition (`.ts` file content) for an Angular component named '{pascal_name}'.

    **Instructions:**
    1.  Create a standard Angular component class named `{pascal_name}Component`.
    2.  Include the `@Component` decorator.
    3.  Set the `selector` property to `'app-{kebab_name}'`.
    4.  Set the `templateUrl` property to `'./{kebab_name}.component.html'`.
    5.  Set the `styleUrls` property to `['./{kebab_name}.component.{css_type}']`.
    6.  Include a basic class structure: `export class {pascal_name}Component {{ constructor() {{}} }}`.
    7.  DO NOT include any reactive forms, form validation, FormGroup, FormControl, Validators, or other form-related imports/logic.
    8.  DO NOT add any properties or methods that would require complex form handling.
    9.  DO NOT use any imports other than '@angular/core' unless absolutely necessary.
    10. Keep the TypeScript very simple - only basic properties and simple methods if needed.
    11. Ensure strict TypeScript compliance (all properties must be initialized or marked with '!').
    12. Make all properties have specific types (string, number, boolean, etc.) not 'any'.
    13. The component should be extremely simple, just a display component based on the JSON.
    14. Ensure necessary imports (e.g., `Component` from `@angular/core`).
    15. Do NOT include any surrounding explanations, just the raw TypeScript code for the `.ts` file.
    """


def create_module_prompt(component_name):
    """Create prompt for generating Angular module file."""
    kebab_name = to_kebab_case(component_name)
    pascal_name = component_name  # Assuming input is PascalCase

    return f"""
    Generate the TypeScript module file (`.module.ts` file content) for an Angular component named '{pascal_name}'.

    **Instructions:**
    1.  Create a standard Angular module class named `{pascal_name}Module`.
    2.  Include the `@NgModule` decorator.
    3.  Include declarations array with `{pascal_name}Component`.
    4.  Include imports array with `CommonModule`.
    5.  Include exports array with `{pascal_name}Component`.
    6.  Ensure necessary imports (e.g., `NgModule` from `@angular/core`, `CommonModule` from `@angular/common`, and `{pascal_name}Component` from `./{kebab_name}.component`).
    7.  Do NOT include any surrounding explanations, just the raw TypeScript code for the module file.
    """


def create_app_module_prompt(component_name):
    """Create prompt for generating Angular app module that includes the component."""
    pascal_name = component_name  # Assuming input is PascalCase

    return f"""
    Generate the TypeScript app module file (`app.module.ts` file content) for an Angular application that includes the '{pascal_name}Component'.

    **Instructions:**
    1.  Create a standard Angular module class named `AppModule`.
    2.  Include the `@NgModule` decorator.
    3.  Include declarations array with `AppComponent` and `{pascal_name}Component`.
    4.  Include imports array with `BrowserModule` ONLY.
    5.  DO NOT include ReactiveFormsModule, FormsModule, or other complex modules.
    6.  Include providers array (empty for now).
    7.  Include bootstrap array with `AppComponent`.
    8.  Make imports ONLY from '@angular/core', '@angular/platform-browser', './app.component', and './{to_kebab_case(component_name)}/{to_kebab_case(component_name)}.component'.
    9.  Keep the module extremely simple - it should only bootstrap the basic component.
    10. Do NOT include any surrounding explanations, just the raw TypeScript code for the app module file.
    """


def create_app_component_prompt(component_name):
    """Create prompt for generating Angular app component that includes our component."""
    kebab_name = to_kebab_case(component_name)

    return f"""
    Generate the basic app component files (HTML and TS) for an Angular application that showcases the 'app-{kebab_name}' component.

    **Instructions:**
    1. First, generate the app.component.ts file:
       - Create the `@Component` decorator with selector 'app-root'
       - Set templateUrl to './app.component.html'
       - Set styleUrls to ['./app.component.css']
       - Create an AppComponent class with a title property initialized to 'Angular Component Demo'
       - Make it extremely simple - just a display component
       - Ensure strict TypeScript compliance
       - DO NOT use any reactive forms or other complex features

    2. Second, generate the app.component.html file:
       - Create a simple layout with a header showing the title
       - Include the app-{kebab_name} component tag
       - DO NOT use any form directives like formGroup, formControlName, etc.
       - DO NOT include any complex validation logic
       - Keep it simple - just a container for the {kebab_name} component

    3. Format your response with clear separators between the two files, like this:
       --- app.component.ts ---
       [code for app.component.ts]

       --- app.component.html ---
       [code for app.component.html]
    """


def generate_code_with_ai(prompt):
    """Generate code using the configured AI model."""
    print(f"\n--- Sending Prompt to AI ({ai_model_name}) ---")
    # print(prompt)  # Uncomment to debug the prompt being sent
    print("--- Waiting for AI response... ---")

    try:
        if AI_PROVIDER == "gemini":
            response = model.generate_content(prompt)
            generated_text = response.text
        else:  # OpenAI
            response = client.chat.completions.create(
                model=ai_model_name,
                messages=[
                    {"role": "system", "content": "You are an expert Angular code generator. Output only raw code as requested."},
                    {"role": "user", "content": prompt}
                ]
            )
            generated_text = response.choices[0].message.content

        print("--- AI Response Received ---")
        # print(generated_text)  # Uncomment to see raw output
        return generated_text.strip()  # Basic cleaning

    except Exception as e:
        print(f"Error during AI generation: {e}")
        return None  # Indicate failure


def clean_code(raw_code, file_type):
    """Clean AI-generated code to remove markdown code fences if present."""
    # Remove potential markdown fences
    pattern = rf"^\s*```(?:{file_type})?\s*\n(.*?)\n?\s*```\s*$"
    match = re.search(pattern, raw_code, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()

    # Try other patterns if specific pattern didn't match
    pattern = r"^\s*```(?:[a-z]*)?\s*\n(.*?)\n?\s*```\s*$"
    match = re.search(pattern, raw_code, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Simple strip as fallback
    return raw_code.strip()


def parse_app_component_response(response):
    """Parse the response containing both app component files."""
    ts_pattern = r"---\s*app\.component\.ts\s*---(.*?)(?:---|$)"
    html_pattern = r"---\s*app\.component\.html\s*---(.*?)(?:---|$)"

    ts_match = re.search(ts_pattern, response, re.DOTALL)
    html_match = re.search(html_pattern, response, re.DOTALL)

    ts_code = ts_match.group(1).strip() if ts_match else ""
    html_code = html_match.group(1).strip() if html_match else ""

    # Remove markdown code fences if present
    ts_code = re.sub(r'^\s*```(?:typescript|ts)?\s*\n(.*?)\n?\s*```\s*$', r'\1', ts_code, flags=re.DOTALL)
    html_code = re.sub(r'^\s*```(?:html)?\s*\n(.*?)\n?\s*```\s*$', r'\1', html_code, flags=re.DOTALL)

    return ts_code, html_code


def save_file(directory, filename, content):
    """Save content to a file."""
    file_path = os.path.join(directory, filename)
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Successfully saved: {file_path}")
        return True
    except Exception as e:
        print(f"Error saving file {file_path}: {e}")
        return False


def verify_required_files(project_dir):
    """Verify that all required files exist before proceeding."""
    required_files = [
        os.path.join(project_dir, "src", "app", "app.module.ts"),
        os.path.join(project_dir, "src", "app", "app.component.ts"),
        os.path.join(project_dir, "src", "app", "app.component.html"),
        os.path.join(project_dir, "src", "app", "app.component.css"),
        os.path.join(project_dir, "src", "main.ts"),
        os.path.join(project_dir, "src", "index.html")
    ]

    missing_files = [f for f in required_files if not os.path.exists(f)]

    if missing_files:
        print("Warning: The following required files are missing:")
        for f in missing_files:
            print(f"  - {f}")
        return False

    return True

def create_angular_project(project_dir, component_name, component_output_dir, skip_install=False):
    """Create a complete Angular project structure."""
    kebab_name = to_kebab_case(component_name)

    # Create the basic project structure
    os.makedirs(os.path.join(project_dir, "src", "app"), exist_ok=True)
    os.makedirs(os.path.join(project_dir, "src", "assets"), exist_ok=True)
    os.makedirs(os.path.join(project_dir, "src", "app", kebab_name), exist_ok=True)

    # Copy the component files to the project
    component_files = os.listdir(component_output_dir)
    for file in component_files:
        src_path = os.path.join(component_output_dir, file)
        dst_path = os.path.join(project_dir, "src", "app", kebab_name, file)
        shutil.copy2(src_path, dst_path)

    # Generate package.json
    package_json = {
        "name": f"angular-{kebab_name}-demo",
        "version": "0.0.0",
        "scripts": {
            "ng": "ng",
            "start": "ng serve",
            "build": "ng build",
            "watch": "ng build --watch --configuration development",
            "test": "ng test"
        },
        "private": True,
        "dependencies": {
            "@angular/animations": "^17.1.0",
            "@angular/common": "^17.1.0",
            "@angular/compiler": "^17.1.0",
            "@angular/core": "^17.1.0",
            "@angular/forms": "^17.1.0",
            "@angular/platform-browser": "^17.1.0",
            "@angular/platform-browser-dynamic": "^17.1.0",
            "@angular/router": "^17.1.0",
            "rxjs": "~7.8.0",
            "tslib": "^2.3.0",
            "zone.js": "~0.14.3"
        },
        "devDependencies": {
            "@angular-devkit/build-angular": "^17.1.1",
            "@angular/cli": "^17.1.1",
            "@angular/compiler-cli": "^17.1.0",
            "@types/jasmine": "~5.1.0",
            "jasmine-core": "~5.1.0",
            "karma": "~6.4.0",
            "karma-chrome-launcher": "~3.2.0",
            "karma-coverage": "~2.2.0",
            "karma-jasmine": "~5.1.0",
            "karma-jasmine-html-reporter": "~2.1.0",
            "typescript": "~5.3.2"
        }
    }
    save_file(project_dir, "package.json", json.dumps(package_json, indent=2))

    # Generate angular.json
    angular_json = {
        "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
        "version": 1,
        "newProjectRoot": "projects",
        "projects": {
            f"angular-{kebab_name}-demo": {
                "projectType": "application",
                "schematics": {},
                "root": "",
                "sourceRoot": "src",
                "prefix": "app",
                "architect": {
                    "build": {
                        "builder": "@angular-devkit/build-angular:browser",
                        "options": {
                            "outputPath": "dist/angular-demo",
                            "index": "src/index.html",
                            "main": "src/main.ts",
                            "polyfills": ["zone.js"],
                            "tsConfig": "tsconfig.app.json",
                            "assets": ["src/favicon.ico", "src/assets"],
                            "styles": ["src/styles.css"],
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
                                "buildOptimizer": False,
                                "optimization": False,
                                "vendorChunk": True,
                                "extractLicenses": False,
                                "sourceMap": True,
                                "namedChunks": True
                            }
                        },
                        "defaultConfiguration": "production"
                    },
                    "serve": {
                        "builder": "@angular-devkit/build-angular:dev-server",
                        "configurations": {
                            "production": {
                                "browserTarget": f"angular-{kebab_name}-demo:build:production"
                            },
                            "development": {
                                "browserTarget": f"angular-{kebab_name}-demo:build:development"
                            }
                        },
                        "defaultConfiguration": "development"
                    },
                    "extract-i18n": {
                        "builder": "@angular-devkit/build-angular:extract-i18n",
                        "options": {
                            "browserTarget": f"angular-{kebab_name}-demo:build"
                        }
                    }
                }
            }
        }
    }
    save_file(project_dir, "angular.json", json.dumps(angular_json, indent=2))

    # Generate tsconfig.json
    tsconfig_json = {
        "compileOnSave": False,
        "compilerOptions": {
            "baseUrl": "./",
            "outDir": "./dist/out-tsc",
            "forceConsistentCasingInFileNames": True,
            "strict": True,
            "noImplicitOverride": True,
            "noPropertyAccessFromIndexSignature": True,
            "noImplicitReturns": True,
            "noFallthroughCasesInSwitch": True,
            "sourceMap": True,
            "declaration": False,
            "downlevelIteration": True,
            "experimentalDecorators": True,
            "moduleResolution": "node",
            "importHelpers": True,
            "target": "ES2022",
            "module": "ES2022",
            "useDefineForClassFields": False,
            "lib": ["ES2022", "dom"]
        },
        "angularCompilerOptions": {
            "enableI18nLegacyMessageIdFormat": False,
            "strictInjectionParameters": True,
            "strictInputAccessModifiers": True,
            "strictTemplates": True
        }
    }
    save_file(project_dir, "tsconfig.json", json.dumps(tsconfig_json, indent=2))

    # Generate tsconfig.app.json
    tsconfig_app_json = {
        "extends": "./tsconfig.json",
        "compilerOptions": {
            "outDir": "./out-tsc/app",
            "types": []
        },
        "files": ["src/main.ts"],
        "include": ["src/**/*.d.ts"]
    }
    save_file(project_dir, "tsconfig.app.json", json.dumps(tsconfig_app_json, indent=2))

    # Generate index.html
    index_html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Angular {component_name} Demo</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <app-root></app-root>
</body>
</html>
"""
    save_file(os.path.join(project_dir, "src"), "index.html", index_html)

    # Generate styles.css
    styles_css = """/* You can add global styles to this file, and also import other style files */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background-color: #f5f5f5;
}
"""
    save_file(os.path.join(project_dir, "src"), "styles.css", styles_css)

    # Generate main.ts
    main_ts = """import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
"""
    save_file(os.path.join(project_dir, "src"), "main.ts", main_ts)

    # Generate app module
    app_module_prompt = create_app_module_prompt(component_name)
    raw_app_module = generate_code_with_ai(app_module_prompt)
    if raw_app_module:
        clean_app_module = clean_code(raw_app_module, 'typescript')
        app_module_path = os.path.join(project_dir, "src", "app", "app.module.ts")
        save_file(os.path.join(project_dir, "src", "app"), "app.module.ts", clean_app_module)

        # Verify app.module.ts was created properly and create a fallback if needed
        if not os.path.exists(app_module_path) or os.path.getsize(app_module_path) == 0:
            print("Creating fallback app.module.ts...")
            fallback_module = f'''import {{ NgModule }} from '@angular/core';
import {{ BrowserModule }} from '@angular/platform-browser';
import {{ AppComponent }} from './app.component';
import {{ {component_name}Component }} from './{to_kebab_case(component_name)}/{to_kebab_case(component_name)}.component';

@NgModule({{
  declarations: [
    AppComponent,
    {component_name}Component
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
}})
export class AppModule {{ }}'''
            save_file(os.path.join(project_dir, "src", "app"), "app.module.ts", fallback_module)

    # Generate app component
    app_component_prompt = create_app_component_prompt(component_name)
    raw_app_component = generate_code_with_ai(app_component_prompt)

    # Default fallback app component files
    ts_code = f'''import {{ Component }} from '@angular/core';

@Component({{
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
}})
export class AppComponent {{
  title: string = 'Angular {component_name} Demo';
}}
'''

    html_code = f'''<div class="app-container">
  <header class="app-header">
    <h1>{{{{title}}}}</h1>
  </header>

  <main class="component-container">
    <app-{to_kebab_case(component_name)}></app-{to_kebab_case(component_name)}>
  </main>
</div>
'''

    # If we got AI-generated code, try to use it
    if raw_app_component:
        ai_ts_code, ai_html_code = parse_app_component_response(raw_app_component)

        # Only use AI-generated code if it's substantial and doesn't have code fences
        if ai_ts_code and len(ai_ts_code.strip()) > 10 and '```' not in ai_ts_code:
            ts_code = ai_ts_code
        else:
            print("Using fallback app.component.ts...")

        if ai_html_code and len(ai_html_code.strip()) > 10 and '```' not in ai_html_code:
            html_code = ai_html_code
        else:
            print("Using fallback app.component.html...")
    else:
        print("Using fallback app component files...")

    # Save the app component files
    print(f"Saving app.component.ts to {os.path.join(project_dir, 'src', 'app')}")
    save_file(os.path.join(project_dir, "src", "app"), "app.component.ts", ts_code)

    print(f"Saving app.component.html to {os.path.join(project_dir, 'src', 'app')}")
    save_file(os.path.join(project_dir, "src", "app"), "app.component.html", html_code)

    # Generate app.component.css
    app_component_css = """
.app-header {
  background-color: #3498db;
  color: white;
  padding: 20px;
  text-align: center;
  border-radius: 5px;
  margin-bottom: 20px;
}

.component-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}
"""
    save_file(os.path.join(project_dir, "src", "app"), "app.component.css", app_component_css)

    # Create assets directory for images
    os.makedirs(os.path.join(project_dir, "src", "assets", "images"), exist_ok=True)

    # Generate README.md
    readme_md = f"""# Angular {component_name} Demo

This project was generated with the AI Angular Code Generator.

## Development server

Run `npm start` to start a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Build

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.
"""
    save_file(project_dir, "README.md", readme_md)

    # Verify all required files exist
    print("\n--- Verifying Angular project files ---")
    if not verify_required_files(project_dir):
        print("Attempting to fix missing files...")

        # Create missing app component files if needed
        app_component_path = os.path.join(project_dir, "src", "app", "app.component.ts")
        if not os.path.exists(app_component_path):
            print("Creating missing app.component.ts...")
            app_component_ts = f'''import {{ Component }} from '@angular/core';

@Component({{
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
}})
export class AppComponent {{
  title: string = 'Angular {component_name} Demo';
}}
'''
            save_file(os.path.join(project_dir, "src", "app"), "app.component.ts", app_component_ts)

        app_html_path = os.path.join(project_dir, "src", "app", "app.component.html")
        if not os.path.exists(app_html_path):
            print("Creating missing app.component.html...")
            app_component_html = f'''<div class="app-container">
  <header class="app-header">
    <h1>{{{{title}}}}</h1>
  </header>

  <main class="component-container">
    <app-{kebab_name}></app-{kebab_name}>
  </main>
</div>
'''
            save_file(os.path.join(project_dir, "src", "app"), "app.component.html", app_component_html)

        app_css_path = os.path.join(project_dir, "src", "app", "app.component.css")
        if not os.path.exists(app_css_path):
            print("Creating missing app.component.css...")
            app_component_css = '''.app-header {
  background-color: #3498db;
  color: white;
  padding: 20px;
  text-align: center;
  border-radius: 5px;
  margin-bottom: 20px;
}

.component-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}
'''
            save_file(os.path.join(project_dir, "src", "app"), "app.component.css", app_component_css)

        app_module_path = os.path.join(project_dir, "src", "app", "app.module.ts")
        if not os.path.exists(app_module_path):
            print("Creating missing app.module.ts...")
            app_module_ts = f'''import {{ NgModule }} from '@angular/core';
import {{ BrowserModule }} from '@angular/platform-browser';
import {{ AppComponent }} from './app.component';
import {{ {component_name}Component }} from './{kebab_name}/{kebab_name}.component';

@NgModule({{
  declarations: [
    AppComponent,
    {component_name}Component
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
}})
export class AppModule {{ }}
'''
            save_file(os.path.join(project_dir, "src", "app"), "app.module.ts", app_module_ts)

    # Install dependencies
    if not skip_install:
        print(f"\n--- Installing Angular dependencies ---")
        try:
            subprocess.run(["npm", "install"], cwd=project_dir, check=True)
            print("Dependencies installed successfully")
        except subprocess.CalledProcessError as e:
            print(f"Warning: npm install failed with error: {e}")
            print("You may need to run 'npm install' manually in the project directory.")
        except FileNotFoundError:
            print("Warning: npm not found. Please install Node.js and npm.")
            print("You will need to run 'npm install' manually in the project directory.")


if __name__ == "__main__":
    start_time = time.time()

    # Parse command-line arguments
    args = parse_arguments()
    json_file_path = args.json_file
    output_base_dir = args.output_dir
    css_type = args.css_type
    create_project = args.create_project
    skip_install = args.skip_install

    # Load Data
    component_data = load_json_data(json_file_path)
    if not component_data:
        exit(1)  # Exit if loading failed

    component_name_pascal = component_data.get("componentName", "MyExampleComponent")
    component_description = component_data.get("description", "")
    root_element_data = component_data.get("rootElement", {})
    print(f"Processing component: {component_name_pascal}")

    component_name_kebab = to_kebab_case(component_name_pascal)

    # Prepare Output Dir
    component_output_dir = os.path.join(output_base_dir, component_name_kebab)
    os.makedirs(component_output_dir, exist_ok=True)
    print(f"Output directory: {component_output_dir}")

    # Prepare JSON string for prompts (can be large)
    root_element_str = json.dumps(root_element_data, indent=2)

    # Generate and Save HTML
    print("\n--- Generating HTML ---")
    html_prompt = create_html_prompt(component_name_pascal, root_element_str)
    raw_html_code = generate_code_with_ai(html_prompt)
    if raw_html_code:
        clean_html = clean_code(raw_html_code, 'html')
        html_filename = f"{component_name_kebab}.component.html"
        save_file(component_output_dir, html_filename, clean_html)
    else:
        print("HTML generation failed.")

    # Generate and Save Styling
    print(f"\n--- Generating {css_type.upper()} ---")
    styling_prompt = create_styling_prompt(component_name_pascal, root_element_str, css_type)
    raw_style_code = generate_code_with_ai(styling_prompt)
    if raw_style_code:
        clean_style = clean_code(raw_style_code, css_type)
        style_filename = f"{component_name_kebab}.component.{css_type}"
        save_file(component_output_dir, style_filename, clean_style)
    else:
        print(f"{css_type.upper()} generation failed.")

    # Generate and Save TypeScript
    print("\n--- Generating TypeScript ---")
    ts_prompt = create_typescript_prompt(component_name_pascal, css_type)
    raw_ts_code = generate_code_with_ai(ts_prompt)
    if raw_ts_code:
        clean_ts = clean_code(raw_ts_code, 'typescript')
        ts_filename = f"{component_name_kebab}.component.ts"
        save_file(component_output_dir, ts_filename, clean_ts)
    else:
        print("TypeScript generation failed.")

    # Create complete Angular project if requested
    if create_project or not args.create_project:  # Default to creating a project
        project_dir = os.path.join(output_base_dir, f"angular-{component_name_kebab}-project")
        print(f"\n--- Creating Angular project in {project_dir} ---")
        create_angular_project(project_dir, component_name_pascal, component_output_dir, skip_install)
        print(f"Angular project created. You can run it with:")
        print(f"  cd {project_dir}")
        print(f"  npm start")
        print(f"Then visit http://localhost:4200 in your browser.")

    elapsed_time = time.time() - start_time
    print(f"\n--- Code generation process completed in {elapsed_time:.2f} seconds. ---")
    print(f"Generated component files in: {component_output_dir}")