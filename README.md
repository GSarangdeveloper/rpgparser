# RPGLE to Java Spring Boot Converter

This project provides a comprehensive toolset to convert IBM i RPGLE programs to Spring Boot Java applications using Large Language Models (LLMs). It includes both a Jupyter notebook implementation and a Streamlit web application.

## Features

- **Upload and analyze** single or multiple RPGLE files
- **Detect formats** and classify RPGLE code structures
- **Extract program metadata** including procedures, databases, and business rules
- **Build relationship graphs** to visualize program dependencies
- **Generate comprehensive business documentation** with Mermaid diagrams
- **Convert RPGLE code to Java** with Spring Boot structure
- **Export results** as downloadable files (MD, PDF, JSON, ZIP)

## Components

### 1. Jupyter Notebook (RPGLE_to_Java_Converter.ipynb)

A comprehensive notebook that walks through the RPGLE to Java conversion process with these steps:
- Setup and configuration for LLM APIs (OpenAI and Google Gemini)
- File upload and initial analysis
- Dependency mapping between programs
- Format detection and classification
- Metadata extraction
- Relationship visualization
- Business logic documentation generation with Mermaid diagrams
- Spring Boot project structure generation
- Java code generation

### 2. Streamlit Web Application (app.py)

A full-featured web application with:
- User authentication
- Intuitive UI with tabs for different operations
- File upload and processing
- Results visualization
- Download capabilities for all generated files
- PDF generation with Mermaid diagram rendering
- Settings configuration for different LLM providers

## Getting Started

### Prerequisites

- Python 3.8+
- Streamlit
- OpenAI API key or Google Gemini API key
- WeasyPrint or PDFKit (for PDF generation)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/RPGLE_to_Java_POC.git
cd RPGLE_to_Java_POC
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the Streamlit app:
```bash
streamlit run app.py
```

4. Open the Jupyter notebook (optional):
```bash
jupyter notebook RPGLE_to_Java_Converter.ipynb
```

## Usage

### Web Application

1. Login with the credentials (user@example.com/password)
2. Configure your LLM API key (OpenAI or Google Gemini) in the Settings page
3. Upload your RPGLE files in the "Upload & Process" tab
4. Process the files to generate all analysis and conversion outputs
5. View the results in the "View Results" tab
6. Download the generated files (business documentation, Java code, etc.) in the "Download Files" tab

### Jupyter Notebook

1. Configure your LLM API key in the notebook
2. Run the cells in sequence
3. Upload your RPGLE files when prompted
4. Analyze and generate outputs for each step
5. Download the results as needed

## Output Files

- **Business Documentation (.md)**: Comprehensive business logic documentation with Mermaid diagrams
- **Combined Documentation (PDF)**: Business logic, parsed structure, and original code
- **Application Business Logic (PDF)**: System-level business logic analysis
- **Conversion Plans (.md)**: Detailed plans for converting each RPGLE file to Java
- **Service Boundary Recommendations (.md)**: Suggestions for service organization
- **Analysis Results (.json)**: Structured data from the analysis
- **Architecture Recommendations (.md)**: Spring Boot architecture recommendations
- **Domain Package Recommendations (.md)**: Domain-driven design suggestions
- **Spring Boot Structure (.md)**: Complete Spring Boot project structure
- **Java Project (.zip)**: Generated Spring Boot Java code

## LLM Providers

The tool supports two LLM providers:
- **OpenAI GPT** (gpt-4o, gpt-4-turbo, gpt-3.5-turbo)
- **Google Gemini** (gemini-1.5-pro, gemini-1.5-flash, gemini-pro)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.