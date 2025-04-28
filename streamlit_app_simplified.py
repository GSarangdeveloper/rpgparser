import streamlit as st
import os
import json
import tempfile
import subprocess
import base64
from pathlib import Path
import time
import re
import zipfile
import shutil
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import the RPG modernization assistant
from rpg_modernization_assistant import RPGModernizationAssistant

# Set page config only once and prevent browser auto-open
if 'page_config_set' not in st.session_state:
    st.set_page_config(
        page_title="AI Code Generator",
        page_icon="🤖",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    st.session_state.page_config_set = True

# Function to create download link for a file
def get_download_link(file_path, link_text):
    with open(file_path, "rb") as f:
        data = f.read()
    b64 = base64.b64encode(data).decode()
    href = f'<a href="data:file/txt;base64,{b64}" download="{os.path.basename(file_path)}">{link_text}</a>'
    return href

# Create persistent session state variables
if 'authenticated' not in st.session_state:
    st.session_state.authenticated = False
if 'username' not in st.session_state:
    st.session_state.username = ""
if 'tool_selected' not in st.session_state:
    st.session_state.tool_selected = None

# Define default credentials
DEFAULT_USERNAME = "user"
DEFAULT_PASSWORD = "password"

# Login page
def show_login_page():
    st.title("🤖 AI Code Generator - Login")
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.write("### Login")
        username = st.text_input("Username", value="")
        password = st.text_input("Password", type="password", value="")
        
        if st.button("Login"):
            if username == DEFAULT_USERNAME and password == DEFAULT_PASSWORD:
                st.session_state.authenticated = True
                st.session_state.username = username
                st.rerun()
            else:
                st.error("Invalid username or password")
    
    with col2:
        st.write("### Default Credentials")
        st.info(f"""
        For demonstration purposes, use:
        - Username: **{DEFAULT_USERNAME}**
        - Password: **{DEFAULT_PASSWORD}**
        """)

# Main app screen after login
def show_main_app():
    st.sidebar.title(f"Welcome, {st.session_state.username}")
    
    # Add a logout button to the sidebar
    if st.sidebar.button("Logout"):
        st.session_state.authenticated = False
        st.session_state.username = ""
        st.session_state.tool_selected = None
        st.rerun()
    
    # Tool selection in the sidebar
    st.sidebar.title("Select Tool")
    
    if st.sidebar.button("1. RPG Modernization"):
        st.session_state.tool_selected = "rpg"
        st.rerun()
    
    if st.sidebar.button("2. Figma JSON to Angular"):
        st.session_state.tool_selected = "figma"
        st.rerun()
    
    # Main content area based on selected tool
    if st.session_state.tool_selected == "rpg":
        show_rpg_modernization()
    elif st.session_state.tool_selected == "figma":
        show_figma_to_angular()
    else:
        show_home_screen()

# Home screen
def show_home_screen():
    st.title("🤖 AI Code Generator")
    
    st.write("""
    ## Welcome to AI Code Generator
    
    This application provides two powerful AI-driven code generation tools:
    
    1. **RPG Modernization Assistant**: Convert legacy RPG code to modern Java (Spring Boot) or Python applications.
    
    2. **Figma JSON to Angular**: Transform Figma design exports into Angular components.
    
    Select a tool from the sidebar to get started.
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.info("""
        ### 1. RPG Modernization Assistant
        
        - Upload RPG source code files
        - Select RPG type (Synon/Modern)
        - Choose target language (Java/Python)
        - Get structured pseudocode, flow diagrams, and business documentation
        - Download generated code
        """)
    
    with col2:
        st.info("""
        ### 2. Figma JSON to Angular
        
        - Upload Figma JSON export files
        - Generate Angular components
        - Customize stylesheet format
        - Create a complete Angular project
        - Download generated code ready to use
        """)

# RPG Modernization tool interface
def show_rpg_modernization():
    st.title("RPG Modernization Assistant")
    
    st.write("""
    This tool helps convert legacy RPG code to modern Java (Spring Boot) or Python applications
    using AI to extract business logic and generate code.
    """)
    
    # Create form for inputs
    with st.form("rpg_form"):
        # File upload
        uploaded_file = st.file_uploader("Upload RPG source code (.txt file)", type="txt")
        
        # RPG type selection
        rpg_type = st.selectbox(
            "Select RPG Type",
            options=["synon", "modern"],
            format_func=lambda x: "Synon-generated" if x == "synon" else "Modern RPGLE"
        )
        
        # Target language selection
        target_language = st.selectbox(
            "Select Target Language",
            options=["java", "python"],
            format_func=lambda x: "Java (Spring Boot)" if x == "java" else "Python"
        )
        
        # LLM provider selection
        llm_provider = st.selectbox(
            "Select AI Model Provider",
            options=["openai", "anthropic", "google"],
            format_func=lambda x: {
                "openai": "OpenAI (GPT-4)",
                "anthropic": "Anthropic (Claude)",
                "google": "Google (Gemini)"
            }.get(x)
        )
        
        # Optional API key input (if not set in environment)
        api_key = st.text_input(
            f"Enter {llm_provider.title()} API Key (optional, leave blank if set as environment variable)",
            type="password"
        )
        
        # Submit button
        submit_button = st.form_submit_button("Process RPG Code")
    
    # Process form submission
    if submit_button and uploaded_file is not None:
        # Create a temporary file for the uploaded content
        with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as tmp_file:
            tmp_file.write(uploaded_file.getvalue())
            input_file_path = tmp_file.name
        
        # Set API key as environment variable if provided
        if api_key:
            if llm_provider == "google":
                # For Google/Gemini provider, set both possible keys
                os.environ["GOOGLE_API_KEY"] = api_key
                os.environ["GEMINI_API_KEY"] = api_key
            else:
                env_var_name = f"{llm_provider.upper()}_API_KEY"
                os.environ[env_var_name] = api_key
        
        # Create progress bar and status message
        progress_bar = st.progress(0)
        status_text = st.empty()
        
        try:
            # Create output directory
            output_dir = tempfile.mkdtemp(prefix="rpg_mod_")
            
            # Copy the Gemini API key to Google API key if needed
            if 'GEMINI_API_KEY' in os.environ and not 'GOOGLE_API_KEY' in os.environ:
                os.environ['GOOGLE_API_KEY'] = os.environ['GEMINI_API_KEY']
            
            # Set up status updates
            status_text.text("Initializing RPG Modernization Assistant...")
            progress_bar.progress(10)
            
            # Initialize the assistant
            try:
                assistant = RPGModernizationAssistant(
                    input_file=input_file_path,
                    rpg_type=rpg_type,
                    target_language=target_language,
                    output_dir=output_dir,
                    llm_provider=llm_provider,
                    verbose=True
                )
            except Exception as e:
                st.error(f"Error initializing RPG Modernization Assistant: {str(e)}")
                return
            
            # Create a wrapper to display status updates
            def process_with_status_updates():
                # Load RPG source
                status_text.text("Loading RPG source code...")
                progress_bar.progress(20)
                rpg_source = assistant.load_rpg_source()
                
                # Generate pseudocode
                status_text.text("Generating pseudocode (this may take a few minutes)...")
                progress_bar.progress(30)
                pseudocode = assistant.generate_pseudocode(rpg_source)
                pseudocode_path = os.path.join(output_dir, "pseudocode.txt")
                assistant.save_file(pseudocode_path, pseudocode)
                
                # Generate flow diagram
                status_text.text("Generating flow diagram...")
                progress_bar.progress(50)
                flow_diagram = assistant.generate_flow_diagram(rpg_source, pseudocode)
                flow_diagram_path = os.path.join(output_dir, "flow_diagram.md")
                assistant.save_file(flow_diagram_path, flow_diagram)
                
                # Generate business document
                status_text.text("Generating business document...")
                progress_bar.progress(60)
                business_document = assistant.generate_business_document(rpg_source, pseudocode)
                business_document_path = os.path.join(output_dir, "business_document.md")
                assistant.save_file(business_document_path, business_document)
                
                # Generate target structure
                status_text.text(f"Generating {target_language} structure...")
                progress_bar.progress(70)
                structure_files = assistant.generate_target_structure(pseudocode)
                for file_path, content in structure_files.items():
                    assistant.save_file(file_path, content)
                
                # Generate target logic
                status_text.text(f"Generating {target_language} logic (this may take several minutes)...")
                progress_bar.progress(70)
                
                # Add intermediate progress steps for the logic generation
                placeholder = st.empty()
                placeholder.info("Analyzing pseudocode and translating to target language...")
                
                updated_files = assistant.generate_target_logic(pseudocode, structure_files)
                
                placeholder.success("Code logic generated successfully!")
                progress_bar.progress(90)
                
                status_text.text("Saving generated files...")
                for file_path, content in updated_files.items():
                    if file_path in structure_files and content != structure_files[file_path]:
                        assistant.save_file(file_path, content)
                
                # Complete
                status_text.text("Processing complete!")
                progress_bar.progress(100)
                
                return {
                    "pseudocode_path": pseudocode_path,
                    "flow_diagram_path": flow_diagram_path,
                    "business_document_path": business_document_path,
                    "output_dir": output_dir
                }
            
            # Execute the processing
            result = process_with_status_updates()
            
            # Display success message and download link for ZIP file
            st.success("RPG code processing complete! You can download all the generated files below.")
            
            # Create a simple output summary
            st.write("### Generated Output Summary")
            st.write(f"Target language: **{target_language.upper()}**")
            st.write(f"RPG type: **{rpg_type}**")
            
            # List files that were generated (debug info)
            if st.checkbox("Show generated files", value=False):
                st.write("### Generated Files:")
                for root, dirs, files in os.walk(result["output_dir"]):
                    rel_path = os.path.relpath(root, result["output_dir"])
                    if rel_path == ".":
                        st.write("- Root directory:")
                    else:
                        st.write(f"- {rel_path}/")
                    for file in files:
                        st.write(f"  - {os.path.join(rel_path, file)}")
            
            # Create a zip file of the entire output directory
            try:
                # Create a more straightforward path for the zip file
                zip_path = os.path.join(tempfile.gettempdir(), f"rpg_modernization_output.zip")
                
                # Debug info to check files before zipping
                print(f"Output directory contents before zipping: {result['output_dir']}")
                file_count = 0
                for root, dirs, files in os.walk(result["output_dir"]):
                    if files:
                        print(f"Directory: {root}")
                        for file in files:
                            print(f"  File: {file}")
                            file_count += 1
                
                st.write(f"Found {file_count} files to include in the ZIP archive.")
                
                # Use zipfile directly with improved error handling
                with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    # Print debug info
                    st.write(f"Creating ZIP from directory: {result['output_dir']}")
                    
                    # Check if no files were found
                    found_files = False
                    
                    for root, dirs, files in os.walk(result["output_dir"]):
                        for file in files:
                            found_files = True
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, result["output_dir"])
                            try:
                                zipf.write(file_path, arcname)
                                # Debug successful file addition
                                print(f"Added to ZIP: {arcname}")
                            except Exception as e:
                                print(f"Error adding file {file_path} to ZIP: {str(e)}")
                    
                    # If no files were found, add a README explaining the issue
                    if not found_files:
                        readme_content = """
# RPG Modernization Output

No files were found in the output directory. This may indicate an issue with the file generation process.

Please try the following:
1. Check if your RPG input file has valid content
2. Try selecting a different target language or RPG type
3. Contact support if the issue persists
"""
                        temp_readme = os.path.join(tempfile.gettempdir(), "README.md")
                        with open(temp_readme, 'w') as f:
                            f.write(readme_content)
                        zipf.write(temp_readme, "README.md")
                        os.unlink(temp_readme)
                
                # Download button for the entire output
                st.markdown(
                    get_download_link(zip_path, "📥 Download All Generated Files (ZIP)"),
                    unsafe_allow_html=True
                )
                
                # Show a summary of what's included in the ZIP
                st.write("### 📦 ZIP Contents")
                st.write("The downloaded ZIP file includes:")
                st.write("- Pseudocode representation of the RPG logic")
                st.write("- Flow diagram in Mermaid format")
                st.write("- Comprehensive business document")
                if target_language == "java":
                    st.write("- Spring Boot Java application structure")
                    st.write("- Java implementation of the converted RPG logic")
                    st.write("- Maven project configuration (pom.xml)")
                else:  # python
                    st.write("- Python modules implementing the RPG logic")
                    st.write("- Python data models and utility functions")
                
            except Exception as e:
                st.error(f"Error creating zip file: {str(e)}")

            # Cleanup temporary files
            os.unlink(input_file_path)
        
        except Exception as e:
            st.error(f"An error occurred during processing: {str(e)}")
            if os.path.exists(input_file_path):
                os.unlink(input_file_path)

# Figma to Angular tool interface
def show_figma_to_angular():
    st.title("Figma JSON to Angular Converter")
    
    st.write("""
    This tool converts Figma JSON exports to Angular components using AI to generate HTML, 
    CSS/SCSS, and TypeScript code.
    """)
    
    # Create form for inputs
    with st.form("figma_form"):
        # File upload
        uploaded_file = st.file_uploader("Upload Figma JSON file", type="json")
        
        # Component name input
        component_name = st.text_input(
            "Component Name (PascalCase)",
            value="UserProfile",
            help="Enter a component name in PascalCase (e.g., UserProfile, ProductCard)"
        )
        
        # CSS Type selection
        css_type = st.selectbox(
            "Select CSS Type",
            options=["scss", "css"],
            format_func=lambda x: "SCSS" if x == "scss" else "CSS"
        )
        
        # Create project option
        create_project = st.checkbox(
            "Create complete Angular project",
            value=True,
            help="Generate a complete Angular project structure that can be run"
        )
        
        # Skip npm install option
        skip_install = st.checkbox(
            "Skip npm install",
            value=True,
            help="Skip npm install when creating a project (faster but requires manual installation)"
        )
        
        # LLM provider selection
        ai_provider = st.selectbox(
            "Select AI Model Provider",
            options=["openai", "gemini"],
            format_func=lambda x: "OpenAI (GPT-4)" if x == "openai" else "Google (Gemini)"
        )
        
        # Optional API key input (if not set in environment)
        api_key = st.text_input(
            f"Enter {ai_provider.title()} API Key (optional, leave blank if set as environment variable)",
            type="password"
        )
        
        # Submit button
        submit_button = st.form_submit_button("Generate Angular Component")
    
    # Process form submission
    if submit_button and uploaded_file is not None:
        # Create a temporary file for the uploaded content
        with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as tmp_file:
            tmp_file.write(uploaded_file.getvalue())
            input_file_path = tmp_file.name
        
        # Set API key as environment variable if provided
        if api_key:
            if ai_provider == "openai":
                os.environ["OPENAI_API_KEY"] = api_key
            else:  # gemini
                os.environ["GEMINI_API_KEY"] = api_key
        
        # Set AI provider as environment variable
        os.environ["AI_PROVIDER"] = ai_provider
        
        # Create output directory
        output_dir = tempfile.mkdtemp(prefix="figma_angular_")
        
        # Create progress bar and status message
        progress_bar = st.progress(0)
        status_text = st.empty()
        
        try:
            # Get absolute path to generate_angular.py
            script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "generate_angular.py"))
            
            # Prepare command
            cmd = [
                "python", 
                script_path,
                input_file_path,
                "--output-dir", output_dir,
                f"--css-type={css_type}"
            ]
            
            if create_project:
                cmd.append("--create-project")
            
            if skip_install:
                cmd.append("--skip-install")
            
            status_text.text("Generating Angular component...")
            progress_bar.progress(10)
            
            # Execute the command
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            # Update status while command is running
            progress_value = 10
            for line in iter(process.stdout.readline, ''):
                if "Generating HTML" in line:
                    status_text.text("Generating HTML template...")
                    progress_value = 30
                elif "Generating SCSS" in line or "Generating CSS" in line:
                    status_text.text(f"Generating {css_type.upper()} styles...")
                    progress_value = 50
                elif "Generating TypeScript" in line:
                    status_text.text("Generating TypeScript component...")
                    progress_value = 70
                elif "Creating Angular project" in line:
                    status_text.text("Creating complete Angular project...")
                    progress_value = 80
                elif "Installing Angular dependencies" in line:
                    status_text.text("Installing npm dependencies...")
                    progress_value = 90
                elif "Code generation process completed" in line:
                    status_text.text("Generation complete!")
                    progress_value = 100
                
                progress_bar.progress(progress_value)
            
            # Wait for process to complete
            process.wait()
            
            if process.returncode != 0:
                error_output = process.stderr.read()
                st.error(f"Error generating Angular component: {error_output}")
            else:
                progress_bar.progress(100)
                status_text.text("Angular component generation complete!")
                
                # Display success message and download links
                st.success("Angular component generated successfully! You can download the files below.")
                
                # Create download links for the entire output
                try:
                    # Create a more straightforward path for the zip file
                    output_zip_path = os.path.join(tempfile.gettempdir(), f"complete_angular_output.zip")
                    with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                        for root, dirs, files in os.walk(output_dir):
                            for file in files:
                                file_path = os.path.join(root, file)
                                arcname = os.path.relpath(file_path, output_dir)
                                zipf.write(file_path, arcname)
                    
                    st.markdown(
                        get_download_link(output_zip_path, "📥 Download All Generated Files (Complete Output)"),
                        unsafe_allow_html=True
                    )
                except Exception as e:
                    st.error(f"Error creating complete output zip: {str(e)}")
                
                # Add additional information for the Angular project
                st.write("### 📦 Angular Project")
                st.write("The downloaded ZIP file contains a complete Angular project with:")
                st.write("- Angular component files (.html, .ts, .scss/.css)")
                st.write("- Project configuration files (package.json, angular.json)")
                st.write("- Ready-to-run application structure")
                
                st.info("""
                ### Running the Angular Project
                
                1. Unzip the downloaded project
                2. Navigate to the project directory
                3. Run `npm install` (if skipped during generation)
                4. Run `npm start`
                5. Open your browser at http://localhost:4200
                """)
        
        except Exception as e:
            st.error(f"An error occurred: {str(e)}")
        
        finally:
            # Cleanup temporary file
            if os.path.exists(input_file_path):
                os.unlink(input_file_path)

# Main app entry point
def main():
    # Apply custom CSS
    st.markdown("""
    <style>
    .stApp {
        max-width: 1200px;
        margin: 0 auto;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Show login or main app based on authentication state
    if not st.session_state.authenticated:
        show_login_page()
    else:
        show_main_app()

if __name__ == "__main__":
    main()