import streamlit as st
import os
import re
import json
import pandas as pd
import networkx as nx
import matplotlib.pyplot as plt
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import base64
import requests
import time
import zipfile
import shutil
import tempfile
import subprocess
import sys
from io import StringIO

# Install required packages
try:
    import openai
    import google.generativeai as genai
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "openai", "google-generativeai"])
    import openai
    import google.generativeai as genai

# PDF generation might not be available
# We'll use a simple fallback mechanism
PDF_GENERATION_AVAILABLE = False

try:
    import pdfkit
    # Check if wkhtmltopdf is installed
    try:
        config = pdfkit.configuration()
        PDF_GENERATION_AVAILABLE = True
        print("PDF generation is available.")
    except Exception as e:
        print(f"pdfkit is installed but wkhtmltopdf executable not found: {e}")
        print("PDF export will save as HTML instead.")
except ImportError:
    print("PDF generation libraries not available. PDF export will not be available.")

# Page configuration
st.set_page_config(
    page_title="RPGLE to Java Converter",
    page_icon="🔄",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Session state initialization
if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
if 'current_page' not in st.session_state:
    st.session_state.current_page = "login"
if 'api_configured' not in st.session_state:
    st.session_state.api_configured = False
if 'llm_provider' not in st.session_state:
    st.session_state.llm_provider = "OpenAI"
if 'file_contents' not in st.session_state:
    st.session_state.file_contents = {}
if 'parsed_results' not in st.session_state:
    st.session_state.parsed_results = {}
if 'dependencies_result' not in st.session_state:
    st.session_state.dependencies_result = {}
if 'file_summaries' not in st.session_state:
    st.session_state.file_summaries = {}
if 'format_results' not in st.session_state:
    st.session_state.format_results = {}
if 'metadata_results' not in st.session_state:
    st.session_state.metadata_results = {}
if 'business_logic_docs' not in st.session_state:
    st.session_state.business_logic_docs = {}
if 'download_files' not in st.session_state:
    st.session_state.download_files = {}

# LLM query function
def query_llm(prompt, max_tokens=4000):
    """Query the selected LLM with a prompt."""
    if st.session_state.llm_provider == "OpenAI":
        api_key = st.session_state.openai_api_key
        model = st.session_state.openai_model

        try:
            import requests
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": "You are an expert RPGLE and Java developer assistant."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,
                "max_tokens": max_tokens
            }

            with st.spinner("Calling OpenAI API..."):
                response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)

                if response.status_code == 200:
                    json_response = response.json()
                    if 'choices' in json_response and len(json_response['choices']) > 0:
                        return json_response["choices"][0]["message"]["content"]
                    else:
                        st.error(f"Unexpected API response structure: {json_response}")
                        return None
                else:
                    st.error(f"API request failed with status code {response.status_code}: {response.text}")
                    return None
        except Exception as e:
            st.error(f"Error querying OpenAI: {e}")
            return None
    else:  # Google Gemini
        api_key = st.session_state.gemini_api_key
        model = st.session_state.gemini_model

        try:
            genai.configure(api_key=api_key)
            gemini_model = genai.GenerativeModel(model)

            with st.spinner("Calling Gemini API..."):
                response = gemini_model.generate_content(prompt)
                return response.text
        except Exception as e:
            st.error(f"Error querying Gemini: {e}")
            return None

# Function to create download link
def create_download_link(file_path, link_text):
    with open(file_path, "rb") as f:
        bytes_data = f.read()
    b64 = base64.b64encode(bytes_data).decode()
    href = f'<a href="data:file/octet-stream;base64,{b64}" download="{os.path.basename(file_path)}">{link_text}</a>'
    return href

# Function to render Mermaid diagrams
def render_mermaid_diagrams(markdown_text):
    """Parse markdown text and replace Mermaid code blocks with rendered diagrams."""
    # Find all Mermaid code blocks
    mermaid_blocks = re.findall(r'```(?:mermaid)?\s*\n([\s\S]*?)\n```', markdown_text)

    if not mermaid_blocks:
        return markdown_text  # No Mermaid blocks found, return original

    # Function to render Mermaid diagram
    def render_mermaid(mermaid_code):
        # Try to use Mermaid Live Editor API to render the diagram
        try:
            # First attempt: Use Mermaid Live Editor via img src
            mermaid_base64 = base64.b64encode(mermaid_code.encode('utf-8')).decode('utf-8')
            img_url = f"https://mermaid.ink/img/{mermaid_base64}"
            return f'<img src="{img_url}" alt="Mermaid Diagram">'
        except Exception as e:
            # If that fails, fall back to a simplified rendering approach
            st.warning(f"Could not render Mermaid diagram: {e}")
            # Return the Mermaid code in a styled pre block
            return f'<pre class="mermaid">{mermaid_code}</pre>'

    # Replace each Mermaid code block with a rendered diagram
    for i, block in enumerate(mermaid_blocks):
        placeholder = f"MERMAID_DIAGRAM_{i}"
        markdown_text = markdown_text.replace(f"```mermaid\n{block}\n```", placeholder)
        markdown_text = markdown_text.replace(f"```\n{block}\n```", placeholder)
        markdown_text = markdown_text.replace(placeholder, render_mermaid(block))

    # Add Mermaid initialization script
    markdown_text = f'''
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>mermaid.initialize({{startOnLoad:true}});</script>
    {markdown_text}
    '''

    return markdown_text

def create_pdf_from_html(html_content, output_path):
    """Create a PDF file from HTML content if PDF generation is available."""
    global PDF_GENERATION_AVAILABLE

    # Add necessary CSS for proper rendering
    css = '''
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #2c3e50; }
        h2 { color: #3498db; margin-top: 20px; }
        h3 { color: #2980b9; }
        pre { background-color: #f8f9fa; padding: 10px; border-radius: 5px; }
        table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        img { max-width: 100%; height: auto; }
    </style>
    '''
    full_html = f'<html><head>{css}</head><body>{html_content}</body></html>'

    # Always save as HTML first (as a fallback)
    html_path = output_path.replace('.pdf', '.html')
    try:
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(full_html)
    except Exception as e:
        st.warning(f"Error saving HTML file: {e}")
        return False

    # Try to generate PDF if available
    if PDF_GENERATION_AVAILABLE:
        try:
            import pdfkit
            pdfkit.from_string(html_content, output_path)
            return True
        except Exception as e:
            st.warning(f"Could not create PDF: {e}. Using HTML version instead.")
            return False
    else:
        st.info(f"PDF generation is not available. Saved as HTML instead: {os.path.basename(html_path)}")
        return False

# Sidebar navigation
def sidebar():
    with st.sidebar:
        st.image("https://img.icons8.com/color/96/000000/source-code--v1.png", width=100)
        st.title("RPGLE to Java")

        if st.session_state.logged_in:
            # If logged in, show navigation options
            page = st.radio("Navigation", ["Tool", "Settings", "About"])

            if page == "Tool":
                st.session_state.current_page = "tool"
            elif page == "Settings":
                st.session_state.current_page = "settings"
            elif page == "About":
                st.session_state.current_page = "about"

            # Logout button
            if st.button("Logout"):
                st.session_state.logged_in = False
                st.session_state.current_page = "login"
                st.rerun()
        else:
            st.info("Please login to continue")

# Login page
def login_page():
    st.title("Login")

    col1, col2 = st.columns([1, 1])

    with col1:
        email = st.text_input("Email", value="user@example.com")
        password = st.text_input("Password", type="password", value="password")

        if st.button("Login"):
            # Check credentials (hardcoded for demo)
            if email == "user@example.com" and password == "password":
                st.session_state.logged_in = True
                st.session_state.current_page = "tool"
                st.success("Login successful!")
                st.rerun()
            else:
                st.error("Invalid credentials. Please try again.")

    with col2:
        st.image("https://img.icons8.com/color/240/000000/user-credentials.png", width=200)

# Tool page
def tool_page():
    st.title("RPGLE to Java Converter")

    # Check if LLM API is configured
    if not st.session_state.get('api_configured', False):
        st.warning("Please configure your LLM API key in the Settings page first.")
        if st.button("Go to Settings"):
            st.session_state.current_page = "settings"
            st.rerun()
        return

    # Main tab selection
    tab1, tab2, tab3 = st.tabs(["Upload & Process", "View Results", "Download Files"])

    with tab1:
        st.header("Upload RPGLE Files")
        uploaded_files = st.file_uploader("Upload one or more RPGLE files", accept_multiple_files=True, type=["txt", "rpgle"])

        if uploaded_files:
            for uploaded_file in uploaded_files:
                if uploaded_file.name not in st.session_state.file_contents:
                    # Store the file content in session state
                    content = uploaded_file.read().decode("utf-8")
                    st.session_state.file_contents[uploaded_file.name] = content

            st.success(f"Successfully uploaded {len(st.session_state.file_contents)} files.")
            st.write("Uploaded files:")
            for filename in st.session_state.file_contents.keys():
                st.write(f"- {filename}")

        st.markdown("---")
        st.header("Process Files")

        if not st.session_state.file_contents:
            st.warning("Please upload at least one RPGLE file to process.")
        else:
            if st.button("Process RPGLE Files", key="process_button"):
                with st.spinner("Processing RPGLE files... This may take a few minutes."):
                    # Run all analysis steps
                    process_files()
                st.success("Processing complete! Go to the 'View Results' tab to see the results.")

    with tab2:
        if not st.session_state.parsed_results:
            st.info("No processed files yet. Please upload and process RPGLE files first.")
        else:
            st.header("Analysis Results")

            # Create tabs for different types of results
            result_tabs = st.tabs(["Program Overview", "Dependencies", "Formats", "Metadata", "Business Logic"])

            with result_tabs[0]:  # Program Overview
                st.subheader("Program Overview")
                for filename, data in st.session_state.parsed_results.items():
                    st.markdown(f"### {filename}")
                    st.write(f"**Program Name:** {data.get('programName', 'Unknown')}")
                    st.write(f"**Program Type:** {data.get('programType', 'Unknown')}")
                    st.write(f"**Purpose:** {data.get('programPurpose', 'Unknown')}")

            with result_tabs[1]:  # Dependencies
                st.subheader("Program Dependencies")
                for filename, deps in st.session_state.dependencies_result.items():
                    st.markdown(f"### {filename}")
                    st.write(f"**Program Calls:** {', '.join(deps.get('program_calls', ['None']))}")
                    st.write(f"**File Accesses:** {', '.join(deps.get('file_accesses', ['None']))}")
                    st.write(f"**Copybooks:** {', '.join(deps.get('copybooks', ['None']))}")
                    st.write(f"**Imports:** {', '.join(deps.get('imports', ['None']))}")

            with result_tabs[2]:  # Formats
                st.subheader("Format Classification")
                for filename, fmt in st.session_state.format_results.items():
                    st.markdown(f"### {filename}")
                    st.write(f"**Format Type:** {fmt.get('format_type', 'Unknown')}")
                    if 'spec_counts' in fmt:
                        st.write("**Specification Counts:**")
                        st.json(fmt['spec_counts'])

                    # Complex formats
                    if 'complex_formats' in fmt:
                        if isinstance(fmt['complex_formats'], list):
                            st.write(f"**Complex Formats:** {', '.join([str(cf) for cf in fmt.get('complex_formats', ['None'])])}")
                        else:
                            st.write(f"**Complex Formats:** {fmt['complex_formats']}")

                    # Data structures
                    if 'data_structures' in fmt and fmt['data_structures']:
                        st.write("**Data Structures:**")
                        for ds in fmt['data_structures']:
                            if isinstance(ds, dict) and 'name' in ds:
                                st.write(f"- {ds['name']}: {ds.get('purpose', '')}")
                            elif isinstance(ds, str):
                                st.write(f"- {ds}")
                            else:
                                st.write(f"- {str(ds)}")

            with result_tabs[3]:  # Metadata
                st.subheader("Program Metadata")
                for filename, meta in st.session_state.metadata_results.items():
                    st.markdown(f"### {filename}")
                    st.write(f"**Program Name:** {meta.get('program_name', 'Unknown')}")
                    st.write(f"**Purpose:** {meta.get('purpose', 'Unknown')}")
                    st.write(f"**Author:** {meta.get('author', 'Unknown')}")
                    st.write(f"**Creation Date:** {meta.get('creation_date', 'Unknown')}")

                    # Parameters
                    if 'parameters' in meta and meta['parameters']:
                        st.write("**Parameters:**")
                        for param in meta['parameters']:
                            st.write(f"- {param}")

                    # Procedures
                    if 'procedures' in meta and meta['procedures']:
                        st.write("**Procedures:**")
                        for proc in meta['procedures']:
                            if isinstance(proc, dict) and 'name' in proc:
                                st.write(f"- {proc['name']}: {proc.get('purpose', '')}")
                            elif isinstance(proc, str):
                                st.write(f"- {proc}")
                            else:
                                st.write(f"- {str(proc)}")

            with result_tabs[4]:  # Business Logic
                st.subheader("Business Logic Documentation")

                if st.session_state.business_logic_docs:
                    for filename, doc in st.session_state.business_logic_docs.items():
                        st.markdown(f"### {filename}")
                        # Show a preview of the business logic documentation
                        preview = doc[:500] + "..." if len(doc) > 500 else doc
                        st.markdown(preview)
                        st.markdown(f"[View full documentation in the 'Download Files' tab](#)")
                else:
                    st.info("No business logic documentation generated yet.")

    with tab3:
        st.header("Download Files")

        if not st.session_state.download_files:
            st.info("No files available for download. Please process RPGLE files first.")
        else:
            st.subheader("Generated Files")

            for file_type, file_paths in st.session_state.download_files.items():
                st.markdown(f"### {file_type}")
                for file_path in file_paths:
                    if os.path.exists(file_path):
                        st.markdown(create_download_link(file_path, f"Download {os.path.basename(file_path)}"), unsafe_allow_html=True)
                    else:
                        st.error(f"File {file_path} not found.")

# Settings page
def settings_page():
    st.title("Settings")

    # LLM provider selection
    st.header("LLM Provider Configuration")
    provider = st.radio("Select LLM Provider", ["OpenAI", "Google Gemini"], index=0 if st.session_state.llm_provider == "OpenAI" else 1)
    st.session_state.llm_provider = provider

    if provider == "OpenAI":
        # OpenAI settings
        st.subheader("OpenAI Settings")
        api_key = st.text_input("OpenAI API Key", type="password", value=st.session_state.get("openai_api_key", ""))
        model = st.selectbox("Model", ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"], index=0)

        if st.button("Save OpenAI Settings"):
            st.session_state.openai_api_key = api_key
            st.session_state.openai_model = model

            # Test the API
            if api_key:
                test_prompt = "Say hello. Keep it very brief."
                result = query_llm(test_prompt, max_tokens=20)

                if result:
                    st.session_state.api_configured = True
                    st.success("API key configured successfully!")
                else:
                    st.session_state.api_configured = False
                    st.error("Failed to connect to OpenAI API. Please check your API key.")
            else:
                st.warning("Please enter an API key.")
    else:
        # Google Gemini settings
        st.subheader("Google Gemini Settings")
        api_key = st.text_input("Google API Key", type="password", value=st.session_state.get("gemini_api_key", ""))
        model = st.selectbox("Model", ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"], index=0)

        if st.button("Save Gemini Settings"):
            st.session_state.gemini_api_key = api_key
            st.session_state.gemini_model = model

            # Test the API
            if api_key:
                try:
                    genai.configure(api_key=api_key)
                    test_prompt = "Say hello. Keep it very brief."
                    result = query_llm(test_prompt, max_tokens=20)

                    if result:
                        st.session_state.api_configured = True
                        st.success("API key configured successfully!")
                    else:
                        st.session_state.api_configured = False
                        st.error("Failed to connect to Gemini API. Please check your API key.")
                except Exception as e:
                    st.session_state.api_configured = False
                    st.error(f"Error configuring Gemini API: {e}")
            else:
                st.warning("Please enter an API key.")

    # Reset buttons
    st.markdown("---")
    st.header("Reset Data")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("Clear Uploaded Files"):
            st.session_state.file_contents = {}
            st.session_state.parsed_results = {}
            st.session_state.dependencies_result = {}
            st.session_state.file_summaries = {}
            st.session_state.format_results = {}
            st.session_state.metadata_results = {}
            st.session_state.business_logic_docs = {}
            st.session_state.download_files = {}
            st.success("All uploaded files and results have been cleared.")

    with col2:
        if st.button("Reset All Settings"):
            for key in list(st.session_state.keys()):
                del st.session_state[key]
            st.session_state.logged_in = True  # Keep the user logged in
            st.session_state.current_page = "settings"
            st.rerun()

# About page
def about_page():
    st.title("About RPGLE to Java Converter")

    st.markdown("""
    ## Overview

    The RPGLE to Java Converter is a powerful tool that uses Large Language Models (LLMs) to analyze and convert IBM i RPGLE programs to modern Java Spring Boot applications.

    ## Features

    - **Upload and analyze** single or multiple RPGLE files
    - **Detect formats** and classify RPGLE code structures
    - **Extract program metadata** including procedures, databases, and business rules
    - **Build relationship graphs** to visualize program dependencies
    - **Generate comprehensive business documentation** with Mermaid diagrams
    - **Convert RPGLE code to Java** with Spring Boot structure
    - **Export results** as downloadable files

    ## How It Works

    1. Upload your RPGLE source files
    2. Configure your preferred LLM provider (OpenAI or Google Gemini)
    3. Process the files to analyze and extract information
    4. Generate business logic documentation and Java code
    5. Download the results

    ## Technology Stack

    - Streamlit for the web interface
    - LLMs (OpenAI GPT or Google Gemini) for code analysis and conversion
    - Python for backend processing
    - Mermaid for diagram generation
    """)

# Processing functions
def process_files():
    """Process the uploaded RPGLE files through all steps."""
    # Create an output directory if it doesn't exist
    os.makedirs("output", exist_ok=True)

    # Dictionary to store download files
    download_files = {
        "Business Documentation": [],
        "Combined Documentation": [],
        "Application Business Logic": [],
        "Conversion Plans": [],
        "Service Boundary Recommendations": [],
        "Analysis Results": [],
        "Architecture Recommendations": [],
        "Domain Package Recommendations": [],
        "Spring Boot Structure": [],
        "Java Project": []
    }

    # Step 1: Parse RPGLE Programs
    with st.spinner("Step 1/9: Parsing RPGLE programs..."):
        parse_rpgle_programs()

    # Step 2: Analyze Dependencies
    with st.spinner("Step 2/9: Analyzing dependencies..."):
        analyze_dependencies()

    # Step 3: Detect Formats
    with st.spinner("Step 3/9: Detecting formats..."):
        detect_formats()

    # Step 4: Extract Metadata
    with st.spinner("Step 4/9: Extracting metadata..."):
        extract_metadata()

    # Step 5: Generate Business Logic Documentation
    with st.spinner("Step 5/9: Generating business logic documentation..."):
        generate_business_logic()

        # Save individual business docs
        for filename, doc in st.session_state.business_logic_docs.items():
            doc_path = os.path.join("output", f"{filename}_business_doc.md")
            with open(doc_path, "w", encoding="utf-8") as f:
                f.write(doc)
            download_files["Business Documentation"].append(doc_path)

    # Step 6: Create Combined Documentation
    with st.spinner("Step 6/9: Creating combined documentation..."):
        create_combined_docs()

        # Add combined docs to download files
        for filename in st.session_state.parsed_results.keys():
            combined_path = os.path.join("output", f"{filename}_combined_doc.md")
            if os.path.exists(combined_path):
                download_files["Combined Documentation"].append(combined_path)

    # Step 7: Generate Application Business Logic
    with st.spinner("Step 7/9: Generating application business logic..."):
        app_logic_path = generate_application_logic()
        if app_logic_path:
            download_files["Application Business Logic"].append(app_logic_path)

    # Step 8: Save Additional Documentation Files
    with st.spinner("Step 8/9: Generating additional documentation..."):
        # Save architecture recommendations
        arch_path = generate_architecture_recommendations()
        if arch_path:
            download_files["Architecture Recommendations"].append(arch_path)

        # Save domain package recommendations
        domain_path = generate_domain_recommendations()
        if domain_path:
            download_files["Domain Package Recommendations"].append(domain_path)

        # Save service boundary recommendations
        service_path = generate_service_recommendations()
        if service_path:
            download_files["Service Boundary Recommendations"].append(service_path)

        # Save Spring Boot structure
        structure_path = generate_spring_boot_structure()
        if structure_path:
            download_files["Spring Boot Structure"].append(structure_path)

        # Generate conversion plans
        for filename in st.session_state.parsed_results.keys():
            plan_path = generate_conversion_plan(filename)
            if plan_path:
                download_files["Conversion Plans"].append(plan_path)

        # Save analysis results as JSON
        analysis_path = os.path.join("output", "rpgle_analysis_results.json")
        with open(analysis_path, "w", encoding="utf-8") as f:
            analysis_data = {
                "parsed_results": st.session_state.parsed_results,
                "dependencies": st.session_state.dependencies_result,
                "formats": st.session_state.format_results,
                "metadata": st.session_state.metadata_results
            }
            json.dump(analysis_data, f, indent=2, ensure_ascii=False)
        download_files["Analysis Results"].append(analysis_path)

    # Step 9: Generate Java Code
    with st.spinner("Step 9/9: Generating Java code..."):
        java_zip_path = generate_java_code()
        if java_zip_path:
            download_files["Java Project"].append(java_zip_path)

    # Store download files in session state
    st.session_state.download_files = download_files

    return True

def parse_rpgle_programs():
    """Parse RPGLE programs to extract detailed structured information."""
    for filename, content in st.session_state.file_contents.items():
        prompt = """# Enhanced Prompt for Parsing Modern RPGLE Code

You are a specialized RPGLE code parser tasked with extracting structured information from modern RPGLE source code. Your output MUST strictly adhere to the requested JSON format and include ALL required lists.

## Primary Task

Analyze the provided RPGLE code and produce a comprehensive JSON representation that captures all structural elements, focusing especially on the 11 MANDATORY lists specified below.

## CRITICAL INSTRUCTIONS

1. **YOU MUST return the EXACT JSON structure specified.** Do not use alternative key names or structures.
2. **STRUCTURE IS MORE IMPORTANT THAN COMPLETENESS**: If you cannot analyze all details, prioritize providing all 11 required lists in the correct structure with whatever information you can extract.
3. **The top-level structure MUST include "programName", "programType", "programPurpose", and "requiredLists" with all 11 mandatory sublists.**
4. **If any list would be empty, include it with an empty array**: `"bindingDirectories": []`

## IMPORTANT: Required Lists

THE FOLLOWING 11 LISTS ARE MANDATORY AND MUST BE INCLUDED UNDER "requiredLists":

1. **Subprocedures List**
2. **Databases List**
3. **Database Keys List**
4. **Modules List**
5. **Binding Directories List**
6. **Copy Books List**
7. **Indexes and Key Sets List**
8. **Input Parameters List**
9. **Core Logic Sections List**
10. **External Programs List**
11. **File Operations List**

## RPGLE Code to Parse:

```rpgle
{content}
```

REMEMBER:
- You MUST include ALL 11 required lists in your output exactly as specified
- The JSON structure MUST be followed precisely
- All cross-references must be accurate
- If you can't find information for a list, include it with an empty array
- Prioritize structure compliance over comprehensive analysis
"""

        prompt = prompt.replace("{content}", content)

        with st.spinner(f"Parsing {filename}..."):
            result = query_llm(prompt, max_tokens=8000)

            if result:
                try:
                    # Extract the JSON part from the response
                    json_match = re.search(r'\{[\s\S]*\}', result)
                    if json_match:
                        json_str = json_match.group(0)
                        parsed_data = json.loads(json_str)
                        st.session_state.parsed_results[filename] = parsed_data
                    else:
                        st.error(f"Could not extract JSON from LLM response for {filename}")
                except Exception as e:
                    st.error(f"Error processing {filename}: {e}")
            else:
                st.error(f"No response from LLM for {filename}")

def analyze_dependencies():
    """Analyze dependencies between RPGLE files."""
    for filename, content in st.session_state.file_contents.items():
        prompt = f"""Analyze this RPGLE code and identify all dependencies:
        1. External program calls (CALL, CALLP)
        2. File/database accesses
        3. Data structure includes or copybooks
        4. Other module imports

        Return the results in JSON format with these keys:
        - program_calls: [list of called programs]
        - file_accesses: [list of files/tables accessed]
        - copybooks: [list of included copybooks/data structures]
        - imports: [list of imported modules]
        - brief_summary: short description of what this program does

        Here's the RPGLE code:
        ```
        {content[:15000]}
        ```
        """

        with st.spinner(f"Analyzing dependencies for {filename}..."):
            result = query_llm(prompt)

            if result:
                try:
                    # Extract the JSON part from the response
                    json_match = re.search(r'\{[\s\S]*\}', result)
                    if json_match:
                        json_str = json_match.group(0)
                        deps = json.loads(json_str)
                        st.session_state.dependencies_result[filename] = deps
                        st.session_state.file_summaries[filename] = deps.get('brief_summary', 'No summary available')
                    else:
                        st.error(f"Could not extract JSON from LLM response for {filename}")
                except Exception as e:
                    st.error(f"Error processing dependencies for {filename}: {e}")
            else:
                st.error(f"No response from LLM for {filename}")

def detect_formats():
    """Detect and classify formats in RPGLE files."""
    for filename, content in st.session_state.file_contents.items():
        prompt = f"""Analyze this RPGLE code and identify all format specifications and their usage:
        1. F-spec (file specifications)
        2. D-spec (definition specifications)
        3. P-spec (procedure specifications)
        4. C-spec (calculation specifications)
        5. Modern free-format statements

        Return the results in JSON format with these keys:
        - format_type: "fixed" or "free" or "mixed"
        - spec_counts: {{"F": 0, "D": 0, "P": 0, "C": 0, "free": 0}}
        - complex_formats: [list of complex format types found]
        - data_structures: [list of data structure names and their purpose]
        - file_formats: [list of file formats used]

        Here's the RPGLE code:
        ```
        {content[:15000]}
        ```
        """

        with st.spinner(f"Detecting formats in {filename}..."):
            result = query_llm(prompt)

            if result:
                try:
                    # Extract the JSON part from the response
                    json_match = re.search(r'\{[\s\S]*\}', result)
                    if json_match:
                        json_str = json_match.group(0)
                        formats = json.loads(json_str)
                        st.session_state.format_results[filename] = formats
                    else:
                        st.error(f"Could not extract JSON from LLM response for {filename}")
                except Exception as e:
                    st.error(f"Error processing formats for {filename}: {e}")
            else:
                st.error(f"No response from LLM for {filename}")

def extract_metadata():
    """Extract program metadata from RPGLE files."""
    for filename, content in st.session_state.file_contents.items():
        prompt = f"""Extract detailed metadata from this RPGLE program:
        1. Program name and purpose
        2. Author information (if available)
        3. Creation date and modification history (if available)
        4. Input parameters and return values
        5. Global variables and constants
        6. Main procedures/subroutines and their purpose
        7. Business rules implemented

        Return the results in JSON format with these keys:
        - program_name: name of the program
        - purpose: main purpose of the program
        - author: author information
        - creation_date: creation date
        - parameters: [list of input parameters]
        - return_values: [list of return values]
        - globals: [list of global variables]
        - procedures: [list of procedures and their purpose]
        - business_rules: [list of business rules implemented]

        Here's the RPGLE code:
        ```
        {content[:15000]}
        ```
        """

        with st.spinner(f"Extracting metadata from {filename}..."):
            result = query_llm(prompt)

            if result:
                try:
                    # Extract the JSON part from the response
                    json_match = re.search(r'\{[\s\S]*\}', result)
                    if json_match:
                        json_str = json_match.group(0)
                        metadata = json.loads(json_str)
                        st.session_state.metadata_results[filename] = metadata
                    else:
                        st.error(f"Could not extract JSON from LLM response for {filename}")
                except Exception as e:
                    st.error(f"Error processing metadata for {filename}: {e}")
            else:
                st.error(f"No response from LLM for {filename}")

def generate_business_logic():
    """Generate business logic documentation for each RPGLE program."""
    for filename, parsed_data in st.session_state.parsed_results.items():
        if filename not in st.session_state.file_contents:
            continue

        rpgle_code = st.session_state.file_contents[filename]

        prompt = """# RPGLE Program Business Documentation Generation Prompt

## Task Overview

Generate a comprehensive business documentation for an RPGLE program that explains its purpose, functionality, and business rules in a format accessible to both technical and non-technical stakeholders. The documentation should present the program's business logic with clear explanations, leveraging both code analysis and embedded comments, and include visual diagrams to enhance understanding.

## Document Structure Requirements

Your documentation must include the following sections in this order:

### 1. Program Overview
   - **Program Name and Type**: Identify the program name, type (service program, module, etc.)
   - **Business Purpose**: Summarize the primary business function in 1-2 paragraphs
   - **System Context**: Explain where this program fits in the broader application landscape
   - **Key Business Functions**: Bullet list of main business capabilities

### 2. Business Process Flow
   - **Mermaid Process Diagram**: Create a Mermaid flowchart showing the main business process steps
   - **Process Triggers**: What business events initiate this program
   - **Process Outcomes**: Expected business results after successful execution
   - **Integration Points**: Other systems or programs this interacts with

### 3. Business Rules Inventory
   - Categorize all business rules by functional area
   - For each rule include:
     - Rule ID and descriptive name
     - Plain English description
     - Business purpose/justification
     - Conditions when the rule applies
     - Exceptions to the rule
     - Implementation notes (which procedures/subroutines implement this rule)
   - **Decision Tree Diagram**: Include a Mermaid diagram for complex rule hierarchies

### 4. Data Structures and Business Entities
   - Document the key business entities represented
   - Explain the purpose of major data structures from a business perspective
   - Define important fields and their business significance
   - Note any business validation rules applied to fields
   - **Entity Relationship Diagram**: Mermaid diagram showing relationships between key data structures

### 5. Calculation Logic
   - Document all business calculations with:
     - Purpose of the calculation
     - Business formula in plain English
     - Variables used and their business meaning
     - Sample calculation examples where possible
   - **Algorithm Flowchart**: Mermaid diagram for complex calculation workflows

### 6. Error Handling and Business Exceptions
   - List all business error scenarios
   - Explain the business impact of each error
   - Document recovery paths and alternative flows
   - Explain rejection codes in business terms
   - **Error Flow Diagram**: Mermaid diagram showing error paths and recovery options

### 7. Integration Dependencies
   - Document all external systems this program connects with
   - Explain what business data is exchanged
   - Note any special business handling for integration failures
   - **Integration Map**: Mermaid diagram showing system integration points

### 8. Program Architecture
   - **Procedures Map**: Mermaid diagram showing relationships between procedures
   - **Data Flow Diagram**: Visual representation of how data moves through the program
   - **Component Diagram**: Show relationships between program components

### 9. Required Program Elements
   - **Subprocedures**: List all subprocedures with their business function, complexity, and error handling
   - **Databases**: Document all databases with their business purpose and access patterns
   - **Database Keys**: Explain key fields and their business significance
   - **Modules**: List all modules with their business purpose and dependencies
   - **Binding Directories**: Document binding directories and their business context
   - **Copy Books**: Explain copy books and their business significance
   - **Indexes and Key Sets**: Document their business purpose and usage
   - **Input Parameters**: Explain from a business perspective
   - **Core Logic Sections**: Identify critical business logic areas
   - **External Programs**: Document business integration points
   - **File Operations**: Explain business purpose of file operations

### 10. Business Glossary
   - Define all business-specific terms used in the program
   - Explain technical terms in business language
   - Map technical field names to business concepts

### 11. Change History
   - Document significant business functionality changes
   - Note the business reasons for major modifications
   - Track evolution of business rules

## Mermaid Diagram Specifications

Include the following Mermaid diagrams in your documentation:

1. **Business Process Flowchart**:
   ```
   flowchart TD
     Start[Business Trigger] --> Process1[First Process Step]
     Process1 --> Decision{Decision Point}
     Decision --> |Condition A| Process2[Process A]
     Decision --> |Condition B| Process3[Process B]
     Process2 --> End[Business Outcome]
     Process3 --> End
   ```

2. **Decision Tree for Business Rules**:
   ```
   flowchart TD
     Start[Rule Evaluation] --> Condition1{Condition 1}
     Condition1 --> |True| Action1[Execute Action 1]
     Condition1 --> |False| Condition2{Condition 2}
     Condition2 --> |True| Action2[Execute Action 2]
     Condition2 --> |False| Action3[Execute Action 3]
   ```

3. **Data Flow Diagram**:
   ```
   flowchart LR
     InputData[Input Data] --> Process1[Process 1]
     Process1 --> DataStore[(Data Store)]
     DataStore --> Process2[Process 2]
     Process2 --> OutputData[Output Data]
   ```

4. **System Integration Map**:
   ```
   flowchart TD
     ThisProgram[This Program] --> |Data Exchange 1| ExternalSystem1[External System 1]
     ThisProgram --> |Data Exchange 2| ExternalSystem2[External System 2]
     ExternalSystem1 --> |Response Data| ThisProgram
   ```

5. **Component Relationship Diagram**:
   ```
   classDiagram
     class MainProgram
     class Subprocedure1
     class Subprocedure2
     class ExternalProgram

     MainProgram --> Subprocedure1 : calls
     MainProgram --> Subprocedure2 : calls
     Subprocedure2 --> ExternalProgram : integrates with
   ```

## Program Analysis Input

Here is the parsed JSON representation of the RPGLE program to analyze:

```json
{program_json}
```

And here is the original RPGLE code:

```rpgle
{rpgle_code}
```

Please generate the business documentation based on both the parsed representation and the original source code.
"""

        # Prepare the JSON string with proper indentation
        program_json = json.dumps(parsed_data, indent=2)

        with st.spinner(f"Generating business logic documentation for {filename}..."):
            doc_result = query_llm(prompt
                                .replace("{program_json}", program_json)
                                .replace("{rpgle_code}", rpgle_code),
                                max_tokens=8000)

            if doc_result:
                st.session_state.business_logic_docs[filename] = doc_result

                # Render Mermaid diagrams if present for PDF export
                html_content = render_mermaid_diagrams(doc_result)

                # Save to PDF if possible
                pdf_path = os.path.join("output", f"{filename}_business_doc.pdf")
                if create_pdf_from_html(html_content, pdf_path):
                    if "Application Business Logic" not in st.session_state.download_files:
                        st.session_state.download_files["Application Business Logic"] = []

                    if pdf_path not in st.session_state.download_files["Application Business Logic"]:
                        st.session_state.download_files["Application Business Logic"].append(pdf_path)
            else:
                st.error(f"Failed to generate business logic documentation for {filename}")

def create_combined_docs():
    """Create combined documentation with parsed code and business logic."""
    for filename, parsed_data in st.session_state.parsed_results.items():
        if filename not in st.session_state.business_logic_docs or filename not in st.session_state.file_contents:
            continue

        business_doc = st.session_state.business_logic_docs[filename]
        rpgle_code = st.session_state.file_contents[filename]

        # Create a combined document
        combined_doc = f"""# Combined Documentation for {filename}

## Part 1: Business Logic Documentation

{business_doc}

## Part 2: Parsed RPGLE Program Structure

```json
{json.dumps(parsed_data, indent=2)}
```

## Part 3: Original RPGLE Code

```rpgle
{rpgle_code}
```
"""

        # Save the combined document
        combined_filename = os.path.join("output", f"{filename}_combined_doc.md")
        with open(combined_filename, "w", encoding="utf-8") as f:
            f.write(combined_doc)

        # Add to download files list
        if "Combined Documentation" not in st.session_state.download_files:
            st.session_state.download_files["Combined Documentation"] = []

        if combined_filename not in st.session_state.download_files["Combined Documentation"]:
            st.session_state.download_files["Combined Documentation"].append(combined_filename)

        # Try to convert to PDF
        html_content = render_mermaid_diagrams(combined_doc)
        pdf_path = os.path.join("output", f"{filename}_combined_doc.pdf")

        if create_pdf_from_html(html_content, pdf_path):
            # Add PDF to download files
            if pdf_path not in st.session_state.download_files["Combined Documentation"]:
                st.session_state.download_files["Combined Documentation"].append(pdf_path)
        else:
            st.warning(f"Could not create PDF for {filename}. Markdown file saved instead.")

def generate_application_logic():
    """Generate application-level business logic."""
    if len(st.session_state.parsed_results) < 1:
        return None

    # Extract relationships from parsed results
    relationships = {}
    programs_info = {}

    for filename, data in st.session_state.parsed_results.items():
        # Basic program info
        program_name = data.get('programName', filename)
        programs_info[program_name] = {
            'filename': filename,
            'type': data.get('programType', 'Unknown'),
            'purpose': data.get('programPurpose', 'Unknown')
        }

        # Extract calls to external programs
        external_calls = []
        if 'requiredLists' in data and 'externalPrograms' in data['requiredLists']:
            external_calls = [(ep.get('name', ''), ep.get('calledFrom', ''), ep.get('purpose', ''))
                             for ep in data['requiredLists']['externalPrograms']]

        # Store relationships
        relationships[program_name] = {
            'calls': external_calls,
            'databases': [db.get('name', '') for db in data.get('requiredLists', {}).get('databases', [])],
            'copyBooks': [cb.get('name', '') for cb in data.get('requiredLists', {}).get('copyBooks', [])]
        }

    # Compile information for the application logic analysis
    app_info = {
        'programs': programs_info,
        'relationships': relationships,
        'parsed_details': st.session_state.parsed_results,
        'business_docs': st.session_state.business_logic_docs
    }

    # Create prompt for application business logic generation
    prompt = """# Application Business Logic Analysis

## Task Overview

Create a comprehensive application-level business logic document by analyzing the relationships between multiple RPGLE programs. This document should describe the overall business functionality of the application, how different programs interact, and provide a holistic view of the business processes implemented by the set of programs.

## Input Data

I have analyzed multiple RPGLE programs and identified the following relationships and business logic:

```json
{app_info_json}
```

## Required Document Sections

Please create a comprehensive application business logic document with the following sections:

### 1. Application Overview
- Application name (infer from program names/purposes)
- Overall business purpose
- Key business capabilities
- Primary business processes supported

### 2. System Architecture
- High-level architecture diagram (Mermaid format)
- Program interactions and dependencies
- Data flow between components
- External system integrations

### 3. Business Domain Model
- Core business entities and their relationships
- Key business concepts
- Domain terminology

### 4. Primary Business Workflows
- Main business processes from start to finish
- Process flow diagrams (Mermaid format)
- Decision points and business rules
- Exception handling paths

### 5. Data Management
- Database usage patterns
- Key data entities and their business purpose
- Data validation and business rules
- Data transformation processes

### 6. Integration Points
- External system dependencies
- Data exchange patterns
- Integration challenges and solutions

### 7. Business Rules Catalog
- Consolidated list of business rules across programs
- Rule categorization by business area
- Rule implementation details

### 8. Modernization Considerations
- Legacy design patterns identified
- Suggested improvements for modern architecture
- Business function to microservice mapping
- Suggested Java/Spring Boot implementation approach

## Mermaid Diagram Requirements

Include at least these Mermaid diagrams:

1. **Application Component Diagram**:
```
flowchart TD
  subgraph "Application Components"
    Program1[Program 1] --> Program2[Program 2]
    Program1 --> Program3[Program 3]
    Program2 --> Database[(Database)]
  end
  subgraph "External Systems"
    Program3 --> ExternalSystem[External System]
  end
```

2. **Business Process Workflow**:
```
flowchart TD
  Start[Business Trigger] --> Process1[Process 1]
  Process1 --> Decision{Decision Point}
  Decision -->|Condition A| Process2[Process 2]
  Decision -->|Condition B| Process3[Process 3]
  Process2 --> End[Business Outcome]
  Process3 --> End
```

3. **Domain Entity Relationship Diagram**:
```
classDiagram
  class Entity1 {
    +attribute1
    +attribute2
  }
  class Entity2 {
    +attribute1
    +attribute2
  }
  Entity1 "1" --> "many" Entity2: contains
```

## Output Format

The document should be formatted in Markdown with proper headings, lists, tables, and Mermaid diagrams.
"""

    # Convert app_info to JSON
    app_info_json = json.dumps(app_info, indent=2)

    with st.spinner("Generating application business logic..."):
        app_logic_doc = query_llm(prompt.replace("{app_info_json}", app_info_json), max_tokens=8000)

        if app_logic_doc:
            # Save the application logic document
            app_logic_filename = os.path.join("output", "application_business_logic.md")
            with open(app_logic_filename, "w", encoding="utf-8") as f:
                f.write(app_logic_doc)

            # Add to download files
            if "Application Business Logic" not in st.session_state.download_files:
                st.session_state.download_files["Application Business Logic"] = []

            if app_logic_filename not in st.session_state.download_files["Application Business Logic"]:
                st.session_state.download_files["Application Business Logic"].append(app_logic_filename)

            # Generate PDF with rendered Mermaid diagrams
            html_content = render_mermaid_diagrams(app_logic_doc)
            pdf_path = os.path.join("output", "application_business_logic.pdf")

            if create_pdf_from_html(html_content, pdf_path):
                # Add PDF to download files
                if pdf_path not in st.session_state.download_files["Application Business Logic"]:
                    st.session_state.download_files["Application Business Logic"].append(pdf_path)
            else:
                st.warning("Could not create PDF for application business logic. Markdown file saved instead.")

            return app_logic_filename
        else:
            st.error("Failed to generate application business logic")
            return None

def generate_architecture_recommendations():
    """Generate architecture recommendations."""
    # Prepare a summary of all files for the LLM
    program_summary = []
    for filename, meta in st.session_state.metadata_results.items():
        deps = st.session_state.dependencies_result.get(filename, {})
        program_info = {
            'filename': filename,
            'program_name': meta.get('program_name', 'Unknown'),
            'purpose': meta.get('purpose', 'Unknown'),
            'procedures': meta.get('procedures', []),
            'program_calls': deps.get('program_calls', []),
            'file_accesses': deps.get('file_accesses', [])
        }
        program_summary.append(program_info)

    # Format the summary for the prompt
    programs_txt = json.dumps(program_summary, indent=2)

    prompt = f"""Based on the analysis of these RPGLE programs, generate comprehensive Java architecture recommendations for a Spring Boot conversion.

    Program details:
    ```
    {programs_txt}
    ```

    Generate detailed architectural recommendations including:
    1. Overall architecture pattern (e.g., layered, hexagonal, microservices, etc.)
    2. Component structure
    3. Dependency management approach
    4. Data access strategy
    5. Service organization
    6. Error handling strategy
    7. Cross-cutting concerns (logging, security, etc.)
    8. Testing strategy

    Return the recommendations in markdown format with clear headings and explanations.
    """

    with st.spinner("Generating architecture recommendations..."):
        recommendations = query_llm(prompt, max_tokens=5000)

        if recommendations:
            # Save to file
            arch_path = os.path.join("output", "architecture_recommendations.md")
            with open(arch_path, "w", encoding="utf-8") as f:
                f.write(recommendations)
            return arch_path
        else:
            st.error("Failed to generate architecture recommendations")
            return None

def generate_domain_recommendations():
    """Generate domain package recommendations."""
    # Extract business concepts and data structures
    business_concepts = []
    data_structures = []

    for filename, meta in st.session_state.metadata_results.items():
        # Extract business rules
        if 'business_rules' in meta and meta['business_rules']:
            business_concepts.extend(meta['business_rules'])

        # Get data structures from format results
        if filename in st.session_state.format_results and 'data_structures' in st.session_state.format_results[filename]:
            data_structures.extend(st.session_state.format_results[filename]['data_structures'])

    # Prepare input for the LLM
    prompt = f"""Based on the RPGLE analysis, recommend domain package organization for a Spring Boot application.

    Business concepts identified:
    ```
    {json.dumps(business_concepts, indent=2)}
    ```

    Data structures identified:
    ```
    {json.dumps(data_structures, indent=2)}
    ```

    Please provide:
    1. Main domain entities that should be created
    2. Package structure organization (e.g., by business function, by entity, etc.)
    3. Entity relationships and recommendations
    4. Java class diagrams (in text format) for key domain objects
    5. Recommendations for using Spring Data JPA entities

    Return the recommendations in markdown format with clear headings and explanations.
    """

    with st.spinner("Generating domain package recommendations..."):
        recommendations = query_llm(prompt, max_tokens=5000)

        if recommendations:
            # Save to file
            domain_path = os.path.join("output", "domain_package_recommendations.md")
            with open(domain_path, "w", encoding="utf-8") as f:
                f.write(recommendations)
            return domain_path
        else:
            st.error("Failed to generate domain package recommendations")
            return None

def generate_service_recommendations():
    """Generate service boundary recommendations."""
    # Group procedures by related functionality
    all_procedures = []
    for filename, meta in st.session_state.metadata_results.items():
        if 'procedures' in meta and meta['procedures']:
            file_procedures = [
                {'filename': filename, 'procedure': proc}
                for proc in meta['procedures']
            ]
            all_procedures.extend(file_procedures)

    # Extract program call dependencies
    call_deps = {}
    for filename, deps in st.session_state.dependencies_result.items():
        if 'program_calls' in deps and deps['program_calls']:
            call_deps[filename] = deps['program_calls']

    # Prepare input for the LLM
    prompt = f"""Based on the RPGLE analysis, recommend service boundaries for a Spring Boot application.

    Procedures identified across all programs:
    ```
    {json.dumps(all_procedures, indent=2)}
    ```

    Program call dependencies:
    ```
    {json.dumps(call_deps, indent=2)}
    ```

    Please provide:
    1. Recommended service boundaries and their justification
    2. Service interface definitions (in Java format)
    3. Service implementation recommendations
    4. Communication patterns between services
    5. Recommendations for API design
    6. Transaction boundary considerations

    Focus on creating cohesive services with clear responsibilities and minimal coupling.
    Return the recommendations in markdown format with clear headings and explanations.
    """

    with st.spinner("Generating service boundary recommendations..."):
        recommendations = query_llm(prompt, max_tokens=5000)

        if recommendations:
            # Save to file
            service_path = os.path.join("output", "service_boundary_recommendations.md")
            with open(service_path, "w", encoding="utf-8") as f:
                f.write(recommendations)
            return service_path
        else:
            st.error("Failed to generate service boundary recommendations")
            return None

def generate_spring_boot_structure():
    """Generate Spring Boot project structure."""
    # Extract program names for base package recommendation
    program_names = []
    program_purposes = []
    for filename, meta in st.session_state.metadata_results.items():
        if 'program_name' in meta and meta['program_name'] != 'Unknown':
            program_names.append(meta['program_name'])
        if 'purpose' in meta and meta['purpose'] != 'Unknown':
            program_purposes.append(meta['purpose'])

    # Get unique file accesses for determining database entities
    all_file_accesses = set()
    for filename, deps in st.session_state.dependencies_result.items():
        if 'file_accesses' in deps:
            all_file_accesses.update(deps['file_accesses'])

    # Prepare input for the LLM
    prompt = f"""Based on the RPGLE analysis, generate a complete Spring Boot project structure.

    Program names: {', '.join(program_names)}
    Program purposes: {', '.join(program_purposes)}
    Database files accessed: {', '.join(all_file_accesses)}

    Please provide:
    1. Project configuration (build.gradle or pom.xml)
    2. Complete package structure with explanations
    3. Main application class
    4. Configuration classes
    5. Controller, Service, and Repository layer organization
    6. Sample implementations for key components
    7. Database configuration
    8. Testing structure

    Return the recommendations as a complete project structure with file paths and code examples.
    Use markdown format with clear headings, and include code blocks for each file.
    """

    with st.spinner("Generating Spring Boot project structure..."):
        result = query_llm(prompt, max_tokens=6000)

        if result:
            # Save to file
            structure_path = os.path.join("output", "spring_boot_structure.md")
            with open(structure_path, "w", encoding="utf-8") as f:
                f.write(result)
            return structure_path
        else:
            st.error("Failed to generate Spring Boot project structure")
            return None

def generate_conversion_plan(filename):
    """Generate conversion plan for a specific file."""
    if filename not in st.session_state.dependencies_result or filename not in st.session_state.format_results or filename not in st.session_state.metadata_results:
        return None

    # Get the metadata for this file
    meta = st.session_state.metadata_results[filename]
    deps = st.session_state.dependencies_result[filename]

    # Generate Spring Boot conversion plan using LLM
    prompt = f"""Based on the RPGLE analysis, generate a detailed Spring Boot conversion plan for this program. Consider:

    1. Program metadata:
    - Program name: {meta.get('program_name', 'Unknown')}
    - Purpose: {meta.get('purpose', 'Unknown')}
    - Procedures: {', '.join([str(p) for p in meta.get('procedures', [])])}

    2. Dependencies:
    - Program calls: {', '.join([str(p) for p in deps.get('program_calls', [])])}
    - File accesses: {', '.join([str(f) for f in deps.get('file_accesses', [])])}

    3. Business rules: {', '.join([str(r) for r in meta.get('business_rules', [])])}

    Create a detailed conversion plan that includes:
    - Spring Boot project structure (packages, classes)
    - How to map RPGLE procedures to Java methods
    - How to handle database access
    - How to implement business rules
    - Sample Java code for 1-2 key procedures

    Return the results in markdown format suitable for display.
    """

    with st.spinner(f"Generating conversion plan for {filename}..."):
        result = query_llm(prompt)

        if result:
            # Save the conversion plan to a file
            conversion_path = os.path.join("output", f"{filename}_conversion_plan.md")
            with open(conversion_path, "w", encoding="utf-8") as f:
                f.write(f"# Conversion Plan for {filename}\n\n")
                f.write(result)
            return conversion_path
        else:
            st.error(f"Failed to generate conversion plan for {filename}")
            return None

def generate_java_code():
    """Generate Spring Boot Java code from RPGLE programs."""
    if not st.session_state.parsed_results and not st.session_state.file_contents:
        return None

    # Create directory structure for Java files
    java_project_dir = os.path.join("output", "java_project")
    os.makedirs(java_project_dir, exist_ok=True)

    # Track generated files
    generated_files = {}
    rpgle_files = st.session_state.parsed_results if st.session_state.parsed_results else {filename: {} for filename in st.session_state.file_contents.keys()}

    # For each RPGLE file, generate Java code
    for filename, parsed_data in rpgle_files.items():
        if filename not in st.session_state.file_contents:
            continue

        rpgle_code = st.session_state.file_contents[filename]

        # Extract program info from parsed data (if available) or filename
        program_name = parsed_data.get('programName', os.path.splitext(filename)[0]) if parsed_data else os.path.splitext(filename)[0]

        # Create Java class names
        base_name = ''.join(word.title() for word in program_name.split('_') if word)
        if not base_name:
            base_name = ''.join(word.title() for word in filename.split('.')[0].split('_') if word)
        if not base_name or not base_name[0].isalpha():
            base_name = 'R' + base_name if base_name else 'RpgProgram'

        # Get business logic analysis if available
        business_logic = ""
        if st.session_state.business_logic_docs and filename in st.session_state.business_logic_docs:
            business_logic = st.session_state.business_logic_docs[filename]

        # RPGLE to Java conversion prompt
        prompt = f"""# RPGLE to Spring Boot Java Conversion

## Task
Convert this RPGLE program to Spring Boot Java code. Generate ALL necessary Java files for a complete working application.

## RPGLE Program Details
Program Name: {program_name}
Filename: {filename}

## Business Logic Summary
{business_logic[:2000] if business_logic else "No business logic analysis available."}

## RPGLE Code to Convert
```rpgle
{rpgle_code[:10000]}
```

## Required Output:
Generate ALL of the following Java files:

1. Entity Classes: Convert all RPGLE data structures to Java entity classes
2. Service Class: Convert main program and procedures to a service class
3. Repository Interface: Create interface for database operations
4. Controller Class: Create a REST controller for API access
5. Configuration: Any needed configuration classes

Use these naming conventions:
- Entity: {base_name}Entity and other entity names based on data structures
- Service: {base_name}Service
- Repository: {base_name}Repository
- Controller: {base_name}Controller

For each file:
1. Provide the full file path (e.g., src/main/java/com/example/controller/MyController.java)
2. Provide the COMPLETE Java code for that file including ALL package declarations, imports, and code

IMPORTANT GUIDELINES:
- Include Spring Boot annotations (@Service, @Repository, @RestController, etc.)
- Convert ALL RPGLE business logic to equivalent Java code
- Map ALL RPGLE data structures to Java classes
- Map ALL RPGLE procedures to Java methods
- Convert ALL RPGLE database operations to Spring Data JPA
- Include ALL Javadoc comments
- Follow Spring Boot best practices
- Make sure to properly handle types, enums, constants, etc.
- Include error handling
- Code must be COMPLETE and READY TO USE - no placeholder comments
"""

        with st.spinner(f"Generating Java code for {filename}..."):
            result = query_llm(prompt, max_tokens=10000)

            if not result:
                st.error(f"No response from LLM for {filename}")
                continue

            # Process the response to extract Java files
            java_file_pattern = r'```(?:java)?\s*\n([\s\S]*?)```'
            file_path_pattern = r'(?:^|\n)(?:src|java|com)/[^\n]+\.java'

            all_paths = re.findall(file_path_pattern, result)
            all_code_blocks = re.findall(java_file_pattern, result)

            # If we have matching numbers of paths and code blocks, use them directly
            if len(all_paths) == len(all_code_blocks):
                for i, (path, code) in enumerate(zip(all_paths, all_code_blocks)):
                    path = path.strip()

                    # Clean up the path
                    if not path.startswith('src/'):
                        path = 'src/main/java/' + path

                    # Full path within project directory
                    full_path = os.path.join(java_project_dir, path)

                    # Create directory if it doesn't exist
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)

                    # Write the file
                    with open(full_path, 'w', encoding="utf-8") as f:
                        f.write(code)

                    generated_files[path] = code
            else:
                # If the numbers don't match, try to extract using file markers in the text
                st.warning(f"Mismatched file paths and code blocks for {filename}. Using alternative extraction method...")

                lines = result.split('\n')
                current_file = None
                current_code = []
                in_code_block = False

                for line in lines:
                    # Check for file path marker
                    if re.match(r'(?:src|java|com)/[^/\s]+\.java', line.strip()) and not in_code_block:
                        # Save previous file if any
                        if current_file and current_code:
                            # Clean up the path
                            if not current_file.startswith('src/'):
                                current_file = 'src/main/java/' + current_file

                            # Full path within project directory
                            full_path = os.path.join(java_project_dir, current_file)

                            # Create directory if it doesn't exist
                            os.makedirs(os.path.dirname(full_path), exist_ok=True)

                            # Write the file
                            with open(full_path, 'w', encoding="utf-8") as f:
                                f.write('\n'.join(current_code))

                            generated_files[current_file] = '\n'.join(current_code)

                        # Start new file
                        current_file = line.strip()
                        current_code = []
                        in_code_block = False
                    # Check for code block markers
                    elif line.strip() == '```java' or line.strip() == '```':
                        if in_code_block:
                            in_code_block = False
                        else:
                            in_code_block = True
                    # Collect code
                    elif in_code_block and current_file:
                        current_code.append(line)

                # Save the last file if any
                if current_file and current_code:
                    # Clean up the path
                    if not current_file.startswith('src/'):
                        current_file = 'src/main/java/' + current_file

                    # Full path within project directory
                    full_path = os.path.join(java_project_dir, current_file)

                    # Create directory if it doesn't exist
                    os.makedirs(os.path.dirname(full_path), exist_ok=True)

                    # Write the file
                    with open(full_path, 'w') as f:
                        f.write('\n'.join(current_code))

                    generated_files[current_file] = '\n'.join(current_code)

    # Create default application files if necessary
    # Main application class
    app_path = "src/main/java/com/example/Application.java"
    app_full_path = os.path.join(java_project_dir, app_path)

    if not os.path.exists(app_full_path):
        app_code = """package com.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main Spring Boot Application class
 * Generated from RPGLE conversion
 */
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
"""
        os.makedirs(os.path.dirname(app_full_path), exist_ok=True)
        with open(app_full_path, 'w') as f:
            f.write(app_code)
        generated_files[app_path] = app_code

    # Create application.properties
    props_path = "src/main/resources/application.properties"
    props_full_path = os.path.join(java_project_dir, props_path)

    if not os.path.exists(props_full_path):
        props_content = """# Spring Boot application properties
# Generated from RPGLE conversion

# Server configuration
server.port=8080

# Database configuration
spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=password
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect

# JPA/Hibernate configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# H2 Console configuration
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console
"""
        os.makedirs(os.path.dirname(props_full_path), exist_ok=True)
        with open(props_full_path, 'w') as f:
            f.write(props_content)
        generated_files[props_path] = props_content

    # Create pom.xml
    pom_path = "pom.xml"
    pom_full_path = os.path.join(java_project_dir, pom_path)

    if not os.path.exists(pom_full_path):
        pom_content = """<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.7.17</version>
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>rpgle-converted-app</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>RPGLE Converted Application</name>
    <description>Spring Boot application converted from RPGLE code</description>

    <properties>
        <java.version>11</java.version>
    </properties>

    <dependencies>
        <!-- Spring Boot Starters -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- Database -->
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Lombok for boilerplate reduction -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Testing -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
"""
        with open(pom_full_path, 'w') as f:
            f.write(pom_content)
        generated_files[pom_path] = pom_content

    # Create README.md
    readme_path = "README.md"
    readme_full_path = os.path.join(java_project_dir, readme_path)

    readme_content = """# RPGLE to Spring Boot Converted Application

This Spring Boot application was automatically generated from RPGLE source code using an LLM-based conversion tool.

## Project Structure

The project follows a standard Spring Boot architecture:

- `src/main/java/com/example/domain/` - Entity classes converted from RPGLE data structures
- `src/main/java/com/example/repository/` - Data access interfaces for database operations
- `src/main/java/com/example/service/` - Business logic services converted from RPGLE programs
- `src/main/java/com/example/controller/` - REST API controllers for accessing the services

## Converted RPGLE Programs

The following RPGLE programs were converted:

"""

    for filename in st.session_state.file_contents.keys():
        readme_content += f"- `{filename}` - Converted to Java classes\n"

    readme_content += """
## How to Run

1. Make sure you have Java 11+ and Maven installed
2. Clone this repository
3. Run `mvn spring-boot:run` to start the application
4. Access the H2 console at http://localhost:8080/h2-console (JDBC URL: jdbc:h2:mem:testdb, Username: sa, Password: password)
5. Access the REST API at http://localhost:8080/api/...

## Notes on Conversion

- The conversion process attempted to maintain the business logic from the original RPGLE code
- Data structures were converted to JPA entities
- File operations were converted to Spring Data repository methods
- Business logic in procedures was converted to service methods
- REST API endpoints were added for accessing the functionality
"""

    with open(readme_full_path, 'w') as f:
        f.write(readme_content)
    generated_files[readme_path] = readme_content

    # Create a ZIP file of the Java project
    zip_path = os.path.join("output", "java_project.zip")

    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for root, dirs, files in os.walk(java_project_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, os.path.dirname(java_project_dir))
                zipf.write(file_path, arcname)

    return zip_path

# Main app
def main():
    sidebar()

    if st.session_state.current_page == "login":
        login_page()
    elif st.session_state.current_page == "tool":
        tool_page()
    elif st.session_state.current_page == "settings":
        settings_page()
    elif st.session_state.current_page == "about":
        about_page()

if __name__ == "__main__":
    main()