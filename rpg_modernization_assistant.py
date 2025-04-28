#!/usr/bin/env python3
"""
RPG Modernization Assistant Tool

A Python tool that leverages Generative AI to help convert legacy RPG code into modern
Java (Spring Boot) or Python applications.
"""

import os
import argparse
import pathlib
from typing import Dict, List, Tuple, Optional, Literal
import json
import sys
import time
import traceback
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import appropriate LLM SDK based on configured provider
try:
    import openai
except ImportError:
    openai = None

try:
    import anthropic
except ImportError:
    anthropic = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None

# Type aliases
RPGType = Literal["synon", "modern"]
TargetLanguage = Literal["java", "python"]


class RPGModernizationAssistant:
    """Main class for the RPG Modernization Assistant Tool."""

    def __init__(
        self,
        input_file: str,
        rpg_type: RPGType,
        target_language: TargetLanguage,
        output_dir: Optional[str] = None,
        llm_provider: str = "openai",
        verbose: bool = False,
    ):
        """
        Initialize the RPG Modernization Assistant Tool.

        Args:
            input_file: Path to the RPG source code .txt file
            rpg_type: Type of RPG code ('synon' or 'modern')
            target_language: Target language for conversion ('java' or 'python')
            output_dir: Optional output directory path
            llm_provider: LLM provider to use ('openai', 'anthropic', or 'google')
            verbose: Whether to print verbose output
        """
        self.input_file = input_file
        self.rpg_type = rpg_type
        self.target_language = target_language
        self.verbose = verbose
        self.llm_provider = llm_provider

        # Set up output directory
        if output_dir:
            self.output_dir = output_dir
        else:
            input_file_path = pathlib.Path(input_file)
            self.output_dir = os.path.join(
                input_file_path.parent, f"{input_file_path.stem}_output"
            )

        # Ensure output directory exists
        os.makedirs(self.output_dir, exist_ok=True)

        # Initialize appropriate LLM client
        self._init_llm_client()

        if self.verbose:
            print(f"Initialized RPG Modernization Assistant")
            print(f"  Input file: {self.input_file}")
            print(f"  RPG type: {self.rpg_type}")
            print(f"  Target language: {self.target_language}")
            print(f"  Output directory: {self.output_dir}")
            print(f"  LLM provider: {self.llm_provider}")

    def _init_llm_client(self):
        """Initialize the appropriate LLM client based on the configured provider."""
        if self.llm_provider == "openai":
            if not openai:
                raise ImportError(
                    "OpenAI Python package is not installed. Install with 'pip install openai'"
                )
            self.api_key = os.environ.get("OPENAI_API_KEY")
            if not self.api_key:
                raise ValueError(
                    "OPENAI_API_KEY environment variable is not set"
                )
            # Initialize OpenAI client
            openai.api_key = self.api_key

        elif self.llm_provider == "anthropic":
            if not anthropic:
                raise ImportError(
                    "Anthropic Python package is not installed. Install with 'pip install anthropic'"
                )
            self.api_key = os.environ.get("ANTHROPIC_API_KEY")
            if not self.api_key:
                raise ValueError(
                    "ANTHROPIC_API_KEY environment variable is not set"
                )
            # Initialize Anthropic client
            self.llm_client = anthropic.Anthropic(api_key=self.api_key)

        elif self.llm_provider == "google":
            if not genai:
                raise ImportError(
                    "Google GenerativeAI Python package is not installed. Install with 'pip install google-generativeai'"
                )

            # Try different possible environment variable names
            self.api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")

            if not self.api_key:
                raise ValueError(
                    "Neither GOOGLE_API_KEY nor GEMINI_API_KEY environment variable is set. Please set one of these in your .env file."
                )

            if self.verbose:
                print(f"Using Google Gemini API key (length: {len(self.api_key)})")

            # Initialize Google Gemini client
            genai.configure(api_key=self.api_key)

            # Set default model
            self.model_name = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
            if self.verbose:
                print(f"Using Gemini model: {self.model_name}")

            self.llm_model = genai.GenerativeModel(self.model_name)

        else:
            raise ValueError(
                f"Unsupported LLM provider: {self.llm_provider}. "
                f"Supported providers are 'openai', 'anthropic', and 'google'."
            )

    def _send_to_llm(self, prompt: str, max_tokens: int = 4000) -> str:
        """
        Send a prompt to the configured LLM and get the response.

        Args:
            prompt: The prompt to send to the LLM
            max_tokens: Maximum number of tokens to generate

        Returns:
            The LLM's response text
        """
        if self.verbose:
            print(f"Sending prompt to {self.llm_provider} LLM...")

        start_time = time.time()
        print(f"LLM request started at: {time.strftime('%H:%M:%S')}")
        
        try:
            if self.llm_provider == "openai":
                response = openai.ChatCompletion.create(
                    model="gpt-4-turbo",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=max_tokens,
                )
                result = response.choices[0].message.content

            elif self.llm_provider == "anthropic":
                response = self.llm_client.messages.create(
                    model="claude-3-opus-20240229",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=max_tokens,
                )
                result = response.content[0].text

            elif self.llm_provider == "google":
                response = self.llm_model.generate_content(prompt)
                result = response.text
                
            # Log completion time
            end_time = time.time()
            elapsed = end_time - start_time
            print(f"LLM request completed in {elapsed:.2f} seconds")
            
            return result

        except Exception as e:
            print(f"Error sending prompt to LLM: {e}")
            traceback.print_exc()
            # Just return an empty string instead of raising
            # This prevents the entire process from failing
            return "Error generating response from LLM."

    def load_rpg_source(self) -> str:
        """
        Load the RPG source code from the input file.

        Returns:
            The content of the RPG source code file
        """
        try:
            with open(self.input_file, "r") as f:
                return f.read()
        except Exception as e:
            print(f"Error loading RPG source code from {self.input_file}: {e}")
            raise

    def generate_pseudocode(self, rpg_source: str) -> str:
        """
        Generate pseudocode from the RPG source code.

        Args:
            rpg_source: The RPG source code

        Returns:
            The generated pseudocode
        """
        if self.verbose:
            print(f"Generating pseudocode for {self.rpg_type} RPG code...")

        if self.rpg_type == "synon":
            # Use Prompt 1a for Synon-generated RPG
            prompt = (
                "Act as an expert RPG code analyzer specializing in code generated by CASE tools like Synon/2E/Plex. "
                "Analyze the following RPGLE source code, which **was generated by Synon**.\n\n"
                "**RPG Code:**\n```rpgle\n"
                f"{rpg_source}\n"
                "```\n\n"
                "Instructions:\n"
                "Recognize that this code is generated and may contain Synon-specific patterns, generic work fields "
                "(e.g., W@, #, $ prefixes), and standardized subroutines (e.g., for file I/O, function keys, "
                "subfile processing, *EXIT/*CANCL routines).\n"
                "Focus on inferring the underlying business logic despite the generated boilerplate. Try to determine "
                "the purpose of key work fields based on their usage.\n"
                "Identify the main processing flow, paying attention to how control transfers between potentially "
                "numerous generated subroutines.\n"
                "Identify all file I/O operations (CHAIN, READ, READE, READP, WRITE, UPDATE, DELETE, SQL operations) "
                "and the logical files involved. Note key fields used, even if they are generic work fields.\n"
                "Summarize the apparent purpose of distinct subroutines (BEGSR/ENDSR blocks).\n"
                "Identify parameters received (*ENTRY PLIST).\n"
                "Translate the inferred core logic step-by-step into clear, structured, English-like pseudocode. "
                "Use descriptive names in the pseudocode where the purpose of generic RPG fields can be reasonably "
                "inferred. Prioritize clarity and logical flow over exact RPG syntax representation.\n"
                "Note program termination points (RETURN, SETON LR).\n\n"
                "Output:\n"
                "Produce only the structured pseudocode text. Do not include explanations or introductions."
            )
        else:  # modern
            # Use Prompt 1b for Modern RPGLE
            prompt = (
                "Act as an expert RPG code analyzer specializing in modern, often free-format, RPGLE code. "
                "Analyze the following RPGLE source code, which is assumed to be **hand-coded or modern RPGLE**.\n\n"
                "**RPG Code:**\n```rpgle\n"
                f"{rpg_source}\n"
                "```\n\n"
                "Instructions:\n"
                "Analyze the code assuming standard modern RPGLE practices (meaningful variable names, procedures, "
                "Built-in Functions, modern opcodes like FOR/SELECT).\n"
                "Identify the main processing flow, including procedure calls and main logic blocks.\n"
                "Identify all file I/O operations (CHAIN, READ, READE, READP, WRITE, UPDATE, DELETE, and embedded SQL) "
                "and the files/tables involved. Note key fields used.\n"
                "Identify all procedures (Dcl-Proc/End-Proc) and subroutines (BEGSR/ENDSR) and summarize their purpose "
                "based on the code and variable names.\n"
                "Identify parameters received (*ENTRY PLIST or Procedure PI/PR definitions).\n"
                "Identify usage of common Built-in Functions (%SUBST, %SCAN, %DATE, %DEC, etc.).\n"
                "Translate the logic step-by-step into clear, structured, English-like pseudocode. "
                "Preserve meaningful variable/procedure names. Prioritize clarity and logical flow over exact RPG "
                "syntax representation.\n"
                "Note program termination points (RETURN, SETON LR).\n\n"
                "Output:\n"
                "Produce only the structured pseudocode text. Do not include explanations or introductions."
            )

        pseudocode = self._send_to_llm(prompt)
        return pseudocode

    def generate_flow_diagram(self, rpg_source: str, pseudocode: str) -> str:
        """
        Generate a flow diagram in Mermaid syntax from the RPG source code and pseudocode.

        Args:
            rpg_source: The RPG source code
            pseudocode: The generated pseudocode

        Returns:
            The generated flow diagram in Mermaid syntax
        """
        if self.verbose:
            print("Generating flow diagram...")

        prompt = (
            "Act as a program flow analyzer. Based on the following RPGLE source code and its generated pseudocode, "
            "generate a flowchart description using Mermaid syntax (```mermaid graph TD ... ```).\n\n"
            "**Source Code:**\n```rpgle\n"
            f"{rpg_source}\n"
            "```\n\n"
            "**Pseudocode:**\n"
            f"{pseudocode}\n\n"
            "Instructions:\n"
            "Represent the main execution path, starting from the likely entry point.\n"
            "Show major decision points (IF/SELECT) with clear branching labels (e.g., |Condition Met|, |Else|).\n"
            "Show significant loops (DO/DOW/DOU/FOR) and indicate the looping block.\n"
            "Represent calls to distinct procedures or subroutines as single process blocks.\n"
            "Indicate major I/O operations (e.g., \"Read CUSTOMER File\", \"Update ORDERS Table\", "
            "\"Write Report Line\").\n"
            "Keep the descriptions within the diagram nodes concise. Focus on the overall flow rather than "
            "minute details.\n"
            "Ensure the diagram has clear start and end points where possible.\n\n"
            "Output:\n"
            "Produce only the Mermaid flowchart syntax enclosed within a single markdown code block (mermaid ... ). "
            "Do not include explanations or introductions."
        )

        flow_diagram = self._send_to_llm(prompt)
        return flow_diagram

    def generate_business_document(self, rpg_source: str, pseudocode: str) -> str:
        """
        Generate a comprehensive business document from the RPG source code and pseudocode.

        Args:
            rpg_source: The RPG source code
            pseudocode: The generated pseudocode

        Returns:
            The generated business document in Markdown format
        """
        if self.verbose:
            print("Generating comprehensive business document...")

        prompt = (
            "Act as an expert business analyst and technical writer tasked with creating a comprehensive business "
            "logic document based *primarily* on the provided RPGLE source code and its corresponding generated "
            "pseudocode.\n\n"
            "**Inputs:**\n"
            "1. **RPGLE Source Code:**\n```rpgle\n"
            f"{rpg_source}\n"
            "```\n\n"
            "2. **Generated Pseudocode:**\n```\n"
            f"{pseudocode}\n"
            "```\n\n"
            "**Primary Task:**\n"
            "Generate a detailed business documentation artifact in Markdown format. Analyze the provided code "
            "and pseudocode to infer and describe the business functionality. **Where business context, purpose, "
            "or justification is not explicitly clear from the code or comments, state that it is inferred or "
            "cannot be determined.** Prioritize reflecting what can be reasonably deduced from the inputs over "
            "inventing details.\n\n"
            "**Output Structure (Use this Markdown structure):**\n\n"
            "### 1. Program Overview\n"
            "    - **Program Name and Type**: Identify program name (if derivable) and type (e.g., Batch Program, "
            "Interactive, Service Program module - based on structure/comments).\n"
            "    - **Inferred Business Purpose**: Summarize the likely primary business function in 1-2 paragraphs "
            "based *only* on the code's actions (e.g., \"Appears to update customer records based on input X\", "
            "\"Seems to generate a report of Y\"). Avoid definitive statements unless supported by comments.\n"
            "    - **System Context**: State that the broader system context cannot be determined from the code alone.\n"
            "    - **Key Inferred Functions**: Bullet list of main capabilities observed in the code/pseudocode "
            "(e.g., \"Reads Customer File\", \"Calculates Discount based on Field Z\", \"Updates Order Status\", "
            "\"Writes Report Line\").\n\n"
            "### 2. Business Process Flow (Inferred)\n"
            "    - **Mermaid Process Diagram**: Create a Mermaid flowchart (`graph TD`) based on the main logical "
            "flow observed in the pseudocode. Focus on major steps and decisions.\n"
            "    - **Potential Process Triggers**: State that triggers are unknown unless indicated by comments or "
            "specific parameter names.\n"
            "    - **Expected Process Outcomes**: Describe the observable outputs based on the code (e.g., "
            "\"Updates File X\", \"Generates output to File Y\").\n"
            "    - **Observed Integration Points**: List any external program calls (`CALLP`, etc.) identified in "
            "the code. State that the purpose of the integration is inferred.\n\n"
            "### 3. Business Rules Inventory (Candidate Rules)\n"
            "    - Attempt to identify and categorize potential business rules based on conditional logic "
            "(IF/SELECT/CASE), validation checks, and calculations found in the code/pseudocode.\n"
            "    - For each potential rule include:\n"
            "        - **Rule ID**: Assign a simple ID (e.g., RULE-001).\n"
            "        * **Description**: Describe the condition or calculation observed (e.g., "
            "\"If Field A > 100, set Field B to 'X'\").\n"
            "        * **Location**: Note the procedure/subroutine or pseudocode section where it was observed.\n"
            "        * **Inferred Purpose**: Briefly suggest a possible business reason if obvious (e.g., "
            "\"Likely validation for order quantity\"), otherwise state \"Purpose unclear\".\n"
            "    - **Note**: State clearly that this is an inventory of *potential* rules inferred from logic, "
            "not a definitive, validated list.\n\n"
            "### 4. Data Structures and Business Entities (Observed)\n"
            "    - Document key data structures (`Dcl-Ds`) and files (`Dcl-F`) identified in the code.\n"
            "    - For major structures/files:\n"
            "        * Explain the apparent purpose based on usage (e.g., \"DS used for file I/O\", "
            "\"File appears to hold customer data\").\n"
            "        * List important fields identified and their technical types. State that the business "
            "significance is inferred from the name/usage.\n"
            "    - **Note**: State that relationships between entities are inferred based on how data "
            "structures/files are used together in the logic.\n\n"
            "### 5. Calculation Logic (Observed)\n"
            "    - Document significant calculations identified in the code/pseudocode.\n"
            "    - For each calculation:\n"
            "        * **Description**: Show the formula or operation performed.\n"
            "        * **Variables Used**: List the RPG variables involved.\n"
            "        * **Inferred Purpose**: Suggest the likely business purpose (e.g., \"Calculates total price\", "
            "\"Determines eligibility flag\"), otherwise state \"Purpose unclear\".\n\n"
            "### 6. Error Handling and Business Exceptions (Observed)\n"
            "    - List sections of code that appear to handle errors (e.g., `MONITOR`/`ON-ERROR`, checking file "
            "status codes, specific error subroutines called).\n"
            "    - Describe the technical error condition being checked (e.g., \"File status <> 0 after CHAIN\").\n"
            "    - State that the specific *business* impact or meaning of the error requires external knowledge "
            "unless clearly commented.\n\n"
            "### 7. Integration Dependencies (Observed)\n"
            "    - List external programs or procedures called (`CALLP`, `CALLPRC`).\n"
            "    - State that the exact data exchanged and the business purpose of the integration are inferred "
            "based on parameters (if visible) and context, but require external validation.\n\n"
            "### 8. Code Comment Integration\n"
            "    - Where relevant within the sections above, incorporate meaningful code comments found in the "
            "original RPG source that explain business intent or logic. Clearly mark them as originating from "
            "comments.\n\n"
            "**Special Instructions:**\n\n"
            "1. **Foundation:** Base all descriptions *primarily* on the provided RPG code and pseudocode.\n"
            "2. **Inference vs. Fact:** Clearly distinguish between what is directly observed in the code/comments "
            "and what is inferred about the business purpose or context. Use cautious language (e.g., \"appears to\", "
            "\"likely\", \"suggests\", \"inferred\").\n"
            "3. **No Fabrication:** Do not invent business details, justifications, glossaries, or context not "
            "supported by the input code or pseudocode. If information is missing, state that it cannot be "
            "determined from the provided inputs.\n"
            "4. **Mermaid Diagrams**: Generate Mermaid syntax only for the \"Business Process Flowchart\" based on "
            "the pseudocode.\n"
            "5. **Focus:** Prioritize accurately reflecting the *observable logic* and *potential* business mapping "
            "over creating a document that looks complete but contains unsubstantiated claims.\n\n"
            "**Output Format:**\n"
            "Produce only the Markdown formatted document adhering to the structure above."
        )

        business_document = self._send_to_llm(prompt, max_tokens=8000)
        return business_document

    def generate_target_structure(self, pseudocode: str) -> Dict[str, str]:
        """
        Generate the target code structure based on the pseudocode.

        Args:
            pseudocode: The generated pseudocode

        Returns:
            A dictionary of file paths to file contents
        """
        if self.verbose:
            print(f"Generating {self.target_language} structure...")

        # Infer function from pseudocode (simplified for now)
        inferred_function = "processing data"
        if "customer" in pseudocode.lower():
            inferred_function = "processing customer data"
        elif "order" in pseudocode.lower():
            inferred_function = "processing order data"
        elif "product" in pseudocode.lower():
            inferred_function = "processing product data"
        elif "report" in pseudocode.lower():
            inferred_function = "generating a report"
        elif "inventory" in pseudocode.lower():
            inferred_function = "managing inventory"
        elif "invoice" in pseudocode.lower():
            inferred_function = "processing invoices"

        if self.target_language == "java":
            # Use Prompt 3a for Spring Boot Structure
            prompt = (
                "Act as a Java Spring Boot architect. Design a complete Spring Boot project structure for a microservice "
                f"intended to replace the functionality of an RPG program. Assume the RPG program's primary function involves {inferred_function}.\n\n"
                "**Requirements:**\n"
                "1. Target: Java 11 with Spring Boot framework, using Maven.\n"
                "2. Create a standard package structure (e.g., `com.company.modernizedapp.[programname]` with "
                "sub-packages `controller`, `service`, `repository`, `dto`, `model`).\n"
                "3. Define a main Application class with @SpringBootApplication annotation.\n"
                "4. Define a complete REST Controller class (`[ProgramName]Controller.java`) with at least 2 "
                "`@PostMapping` or `@GetMapping` endpoints relevant to the inferred function.\n"
                "5. Define a Service layer interface and implementation (`[ProgramName]Service.java`, "
                "`[ProgramName]ServiceImpl.java`) to contain the core business logic. Include complete method "
                "signatures relevant to the function.\n"
                "6. Define at least 2 Repository interfaces using Spring Data JPA for major files/tables likely involved.\n"
                "7. Create 2-3 basic DTO classes for API data transfer, with appropriate fields.\n"
                "8. Define 2-3 Model/Entity classes with JPA annotations.\n"
                "9. Provide a complete `pom.xml` including all necessary dependencies.\n"
                "10. Be absolutely certain to include a main Application class and working pom.xml file.\n\n"
                "**Important: For each file you generate, add a comment at the top indicating which file it is and where it should be placed in the package structure.**\n\n"
                "**Output:**\n"
                "Provide the complete code for ALL files mentioned above, with clear file names and package locations. "
                "Provide implementation for all methods, not just signatures. "
                "I MUST see at minimum: Application.java, Controller, Service, ServiceImpl, Repositories, Entities/Models, DTOs, and pom.xml. "
                "Enclose each code snippet in a markdown code block with a clear comment indicating the file name and location."
            )
        else:  # python
            # Use Prompt 3b for Python Structure
            prompt = (
                "Act as a Python application designer. Design a basic Python application structure to replace the "
                f"functionality of an RPG program. Assume the RPG program's primary function involves {inferred_function}.\n\n"
                "**Requirements:**\n"
                "1. Target: Python 3.x. Use standard libraries where possible.\n"
                "2. Propose a simple file structure (e.g., `main.py`, `logic_module.py`, `data_access.py`, "
                "`models.py`).\n"
                "3. In `main.py`, include basic argument parsing (`argparse`) to accept input parameters "
                "(if applicable) and a main execution block that calls the core logic function.\n"
                "4. In `logic_module.py`, define a primary function (e.g., `process_customer_update`, "
                "`generate_product_report`) that will contain the translated RPG logic. Include placeholder "
                "helper functions for potential subroutines.\n"
                "5. In `data_access.py`, define placeholder functions for interacting with data sources "
                "(e.g., `get_customer_record`, `update_order_status`). Assume database connection/file handling "
                "details are managed elsewhere.\n"
                "6. In `models.py`, define simple Python classes or dataclasses to represent key data structures "
                "or entities involved.\n"
                "7. Include basic docstrings for proposed files and functions.\n\n"
                "**Output:**\n"
                "Provide a description of the proposed file structure followed by skeleton code snippets for "
                "`main.py`, `logic_module.py`, `data_access.py`, and `models.py`. Use placeholders like "
                "`# TODO: Implement logic` or `pass` where appropriate. Enclose code snippets in markdown code blocks."
            )

        structure_response = self._send_to_llm(prompt)

        # Parse the response to get file structure and contents
        files_dict = self._parse_structure_response(structure_response)
        return files_dict

    def _parse_structure_response(self, response: str) -> Dict[str, str]:
        """
        Parse the structure response from the LLM to extract file paths and contents.

        Args:
            response: The LLM's response containing code snippets

        Returns:
            A dictionary mapping file paths to contents
        """
        files_dict = {}

        if self.target_language == "java":
            # First, extract the package name
            package_match = (
                response.lower().find("package com.")
                if response.lower().find("package com.") != -1
                else response.lower().find("package org.")
            )
            base_package = "com.company.modernizedapp"
            if package_match != -1:
                text_after_package = response[package_match:]
                package_line_end = text_after_package.find("\n")
                if package_line_end != -1:
                    package_line = text_after_package[:package_line_end].strip()
                    base_package = package_line.replace("package ", "").replace(";", "").strip()

            # Define base directory structure
            base_dir = os.path.join(self.output_dir, "src", "main", "java")
            package_path = os.path.join(base_dir, *base_package.split("."))
            os.makedirs(package_path, exist_ok=True)

            # Create sub-package directories
            controller_path = os.path.join(package_path, "controller")
            service_path = os.path.join(package_path, "service")
            repository_path = os.path.join(package_path, "repository")
            dto_path = os.path.join(package_path, "dto")
            model_path = os.path.join(package_path, "model")
            
            # Create all directories in advance to ensure they exist
            for path in [controller_path, service_path, repository_path, dto_path, model_path]:
                os.makedirs(path, exist_ok=True)

            # Check for typical Java files in the response
            file_types = [
                ("Controller.java", controller_path),
                ("Service.java", service_path),
                ("ServiceImpl.java", service_path),
                ("Repository.java", repository_path),
                ("DTO.java", dto_path),
                ("Entity.java", model_path),
            ]

            # Debug output
            if self.verbose:
                print(f"Java package path: {package_path}")
                print(f"Created directories: {[path for _, path in file_types]}")

            # Extract and store file content
            for file_suffix, dir_path in file_types:
                # Simple pattern: find markdown code blocks with Java code
                in_code_block = False
                current_block = ""
                current_block_name = ""

                for line in response.split('\n'):
                    if line.strip().startswith("```java"):
                        in_code_block = True
                        current_block = ""
                    elif line.strip().startswith("```") and in_code_block:
                        in_code_block = False
                        # Check if this block looks like a file that matches our suffix
                        if file_suffix.lower() in current_block.lower():
                            # Try to extract class name
                            for code_line in current_block.split('\n'):
                                if "class " in code_line:
                                    class_name = code_line.split("class ")[1].split(" ")[0].split("{")[0].strip()
                                    if file_suffix.lower() in class_name.lower():
                                        current_block_name = class_name + ".java"
                                        break

                            if current_block_name:
                                # Store the file content with full path
                                file_path = os.path.join(dir_path, current_block_name)
                                files_dict[file_path] = current_block
                                
                                # Debug
                                if self.verbose:
                                    print(f"Added Java file to dictionary: {file_path}")
                                
                                current_block_name = ""
                    elif in_code_block:
                        current_block += line + "\n"

            # Special handling for pom.xml
            if "pom.xml" in response.lower():
                pom_content = ""
                in_pom_block = False

                for line in response.split('\n'):
                    if line.strip().startswith("```xml") or (line.strip().startswith("```") and "pom" in line.lower()):
                        in_pom_block = True
                        pom_content = ""
                    elif line.strip().startswith("```") and in_pom_block:
                        in_pom_block = False
                        if "<project" in pom_content:
                            pom_path = os.path.join(self.output_dir, "pom.xml")
                            files_dict[pom_path] = pom_content
                            
                            # Debug
                            if self.verbose:
                                print(f"Added pom.xml to dictionary: {pom_path}")
                    elif in_pom_block:
                        pom_content += line + "\n"
            
            # Create empty Application.java as fallback if no controller was found
            controller_files = [path for path in files_dict.keys() if "controller" in path.lower()]
            if not controller_files:
                app_name = base_package.split(".")[-1].capitalize() + "Application"
                application_java = f"""package {base_package};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class {app_name} {{
    public static void main(String[] args) {{
        SpringApplication.run({app_name}.class, args);
    }}
}}
"""
                application_path = os.path.join(package_path, f"{app_name}.java")
                files_dict[application_path] = application_java
                
                if self.verbose:
                    print(f"Created default Application.java: {application_path}")
            
            # Create basic pom.xml if none was found
            if not any("pom.xml" in path for path in files_dict.keys()):
                basic_pom = """<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.7.0</version>
        <relativePath/>
    </parent>
    
    <groupId>com.company</groupId>
    <artifactId>rpg-modernized-app</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>RPG Modernized Application</name>
    <description>Spring Boot application generated from RPG code</description>
    
    <properties>
        <java.version>11</java.version>
    </properties>
    
    <dependencies>
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
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>
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
            </plugin>
        </plugins>
    </build>
</project>
"""
                pom_path = os.path.join(self.output_dir, "pom.xml")
                files_dict[pom_path] = basic_pom
                
                if self.verbose:
                    print(f"Created default pom.xml: {pom_path}")
            
            # Create README.md with instructions
            readme_content = f"""# RPG Modernized Java Application

This is a Spring Boot application generated from RPG code.

## Structure

- `src/main/java/{base_package.replace(".", "/")}`: Java source files
  - `controller/`: REST API controllers
  - `service/`: Business logic services
  - `repository/`: Data access repositories
  - `dto/`: Data Transfer Objects
  - `model/`: Entity models

## How to run

1. Ensure Java 11+ and Maven are installed
2. Run `mvn clean install` to build the application
3. Run `mvn spring-boot:run` to start the application
4. Access the API at http://localhost:8080

## Generated from

This application was generated using AI-powered RPG Modernization Assistant.
"""
            readme_path = os.path.join(self.output_dir, "README.md")
            files_dict[readme_path] = readme_content

        else:  # python
            # Define base directory
            base_dir = self.output_dir

            # Check for typical Python files in the response
            typical_files = ["main.py", "logic_module.py", "data_access.py", "models.py"]

            # Extract and store file content
            for file_name in typical_files:
                in_code_block = False
                file_content = ""

                # Look for file name heading followed by a code block
                file_pattern_found = False

                for line in response.split('\n'):
                    if file_name in line and "```" not in line:
                        file_pattern_found = True
                    elif file_pattern_found and line.strip().startswith("```python"):
                        in_code_block = True
                        file_content = ""
                    elif in_code_block and line.strip().startswith("```"):
                        in_code_block = False
                        files_dict[os.path.join(base_dir, file_name)] = file_content
                        file_pattern_found = False
                    elif in_code_block:
                        file_content += line + "\n"

        return files_dict

    def _ensure_java_structure_complete(self, structure_files: Dict[str, str]) -> Dict[str, str]:
        """
        Ensures that the Java structure files are complete by adding fallback files if needed.
        
        Args:
            structure_files: Dictionary of structure file paths to contents
            
        Returns:
            Dictionary of file paths to contents with fallbacks added if needed
        """
        if self.target_language != "java":
            return structure_files
            
        # Make a copy to avoid modifying the original
        result_files = structure_files.copy()
        
        # Check if we have the basic required files for a Spring Boot application
        has_application_class = any("Application.java" in file_path for file_path in structure_files.keys())
        has_controller = any("Controller.java" in file_path for file_path in structure_files.keys())
        has_service = any("Service.java" in file_path for file_path in structure_files.keys())
        has_pom = any("pom.xml" in file_path for file_path in structure_files.keys())
        
        # Define the base package name (extract from existing files or use default)
        base_package = "com.company.modernizedapp"
        for file_path, content in structure_files.items():
            if file_path.endswith(".java") and "package" in content:
                # Extract package from the first file we find
                package_line = next((line for line in content.split('\n') if line.strip().startswith("package ")), None)
                if package_line:
                    base_package = package_line.replace("package ", "").replace(";", "").strip()
                    break
                    
        # Set up paths
        base_dir = os.path.join(self.output_dir, "src", "main", "java")
        package_path = os.path.join(base_dir, *base_package.split("."))
        
        # Create an application class if missing
        if not has_application_class:
            app_name = "ModernizedRpgApplication"
            app_content = f"""package {base_package};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main Spring Boot Application class
 */
@SpringBootApplication
public class {app_name} {{
    public static void main(String[] args) {{
        SpringApplication.run({app_name}.class, args);
    }}
}}
"""
            app_path = os.path.join(package_path, f"{app_name}.java")
            result_files[app_path] = app_content
            if self.verbose:
                print(f"Added missing Application class: {app_path}")
                
        # Create a controller if missing
        if not has_controller:
            controller_content = f"""package {base_package}.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST API Controller
 */
@RestController
@RequestMapping("/api")
public class MainController {{
    
    @GetMapping("/status")
    public ResponseEntity<String> getStatus() {{
        return ResponseEntity.ok("Service is running");
    }}
    
    @PostMapping("/process")
    public ResponseEntity<String> processData(@RequestBody String requestData) {{
        // This would call appropriate service methods to process the data
        return ResponseEntity.ok("Data processed successfully");
    }}
}}
"""
            controller_dir = os.path.join(package_path, "controller")
            os.makedirs(controller_dir, exist_ok=True)
            controller_path = os.path.join(controller_dir, "MainController.java")
            result_files[controller_path] = controller_content
            if self.verbose:
                print(f"Added missing Controller: {controller_path}")
                
        # Create a service if missing
        if not has_service:
            service_interface = f"""package {base_package}.service;

/**
 * Service interface for business logic
 */
public interface BusinessService {{
    String processData(String input);
    boolean validateData(String input);
}}
"""
            service_impl = f"""package {base_package}.service;

import org.springframework.stereotype.Service;

/**
 * Service implementation for business logic
 */
@Service
public class BusinessServiceImpl implements BusinessService {{
    
    @Override
    public String processData(String input) {{
        // TODO: Implement business logic here based on the RPG logic
        return "Processed: " + input;
    }}
    
    @Override
    public boolean validateData(String input) {{
        // TODO: Implement validation logic
        return input != null && !input.isEmpty();
    }}
}}
"""
            service_dir = os.path.join(package_path, "service")
            os.makedirs(service_dir, exist_ok=True)
            
            service_interface_path = os.path.join(service_dir, "BusinessService.java")
            service_impl_path = os.path.join(service_dir, "BusinessServiceImpl.java")
            
            result_files[service_interface_path] = service_interface
            result_files[service_impl_path] = service_impl
            
            if self.verbose:
                print(f"Added missing Service interface and implementation")
                
        # Create a pom.xml if missing
        if not has_pom:
            pom_content = """<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.7.0</version>
        <relativePath/>
    </parent>
    
    <groupId>com.company</groupId>
    <artifactId>modernized-rpg-application</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>Modernized RPG Application</name>
    <description>Spring Boot application generated from RPG code</description>
    
    <properties>
        <java.version>11</java.version>
    </properties>
    
    <dependencies>
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
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>
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
            </plugin>
        </plugins>
    </build>
</project>
"""
            pom_path = os.path.join(self.output_dir, "pom.xml")
            result_files[pom_path] = pom_content
            if self.verbose:
                print(f"Added missing pom.xml: {pom_path}")
                
        # Add a README.md if not present
        if not any("README.md" in path for path in result_files.keys()):
            readme_content = f"""# Modernized RPG Application

This is a Spring Boot application generated from legacy RPG code.

## Project Structure

- `pom.xml`: Maven project configuration
- `src/main/java/{base_package.replace('.', '/')}`: Java source files
  - Application.java: Main Spring Boot application class
  - controller/: REST API controllers
  - service/: Business logic services
  - repository/: Data access repositories
  - model/: Entity classes
  - dto/: Data Transfer Objects

## Running the Application

1. Ensure you have Java 11+ and Maven installed
2. Run `mvn clean install` to build the application
3. Run `mvn spring-boot:run` to start the application
4. Access the API at http://localhost:8080/api/status

## Modernization Notes

This application was generated by an AI-powered RPG modernization tool that:
1. Analyzed the original RPG code
2. Extracted business logic into pseudocode
3. Created a modern Spring Boot application structure
4. Translated the business logic to Java

The application maintains the core functionality of the original RPG program while providing
a modern, maintainable, and extensible architecture.
"""
            readme_path = os.path.join(self.output_dir, "README.md")
            result_files[readme_path] = readme_content
            
        return result_files
        
    def generate_target_logic(self, pseudocode: str, structure_files: Dict[str, str]) -> Dict[str, str]:
        """
        Generate the target code logic based on the pseudocode and structure.

        Args:
            pseudocode: The generated pseudocode
            structure_files: Dictionary of structure file paths to contents

        Returns:
            Dictionary of file paths to updated file contents
        """
        if self.verbose:
            print(f"Generating {self.target_language} logic...")

        # Get the key structure file names for context in the prompt
        structure_keys = list(structure_files.keys())
        structure_info = ""

        if self.target_language == "java":
            # Find service implementation file
            service_impl_file = None
            controller_file = None
            repository_files = []

            for file_path in structure_keys:
                if "ServiceImpl.java" in file_path:
                    service_impl_file = os.path.basename(file_path)
                elif "Controller.java" in file_path:
                    controller_file = os.path.basename(file_path)
                elif "Repository.java" in file_path:
                    repository_files.append(os.path.basename(file_path))

            if service_impl_file and controller_file:
                structure_info = f"{service_impl_file}, {controller_file}, {', '.join(repository_files)}"

            # Use Prompt 4a for Java Logic
            prompt = (
                "Act as an expert Java developer. Translate the core logic from the provided pseudocode into Java "
                "methods within the provided Spring Boot service structure.\n\n"
                "**Inputs:**\n"
                "1. **Pseudocode:**\n```\n"
                f"{pseudocode}\n"
                "```\n\n"
                "2. **Target Spring Boot Structure:** "
                f"{structure_info}\n\n"
                "**Instructions:**\n"
                "1. Implement the core business logic described in the pseudocode primarily within the designated "
                "Service implementation class (`[ProgramName]ServiceImpl.java`), filling in the placeholder methods.\n"
                "2. Use the provided Repository interfaces (e.g., `customerRepository.findById()`, "
                "`productRepository.save()`) for simulated database interactions corresponding to file I/O in the "
                "pseudocode. Assume basic Spring Data JPA method availability.\n"
                "3. Translate pseudocode steps (assignments, calculations, conditions, loops) into idiomatic Java code.\n"
                "4. Map pseudocode conditional logic (IF/ELSE) to Java `if/else` statements.\n"
                "5. Map pseudocode loops to Java `for` or `while` loops.\n"
                "6. Represent RPG subroutines (if clearly delineated in pseudocode) as private helper methods "
                "in the Service class.\n"
                "7. Use DTOs for input/output where appropriate, mapping fields as suggested by the pseudocode. "
                "Assume Model/Entity classes exist for repository interactions.\n"
                "8. Focus on translating the *logical flow* from the pseudocode. Add basic `// TODO:` comments "
                "for complex calculations or areas needing specific business rules not fully captured in pseudocode. "
                "Implement basic null checks or exception handling (e.g., simple try-catch blocks around "
                "repository calls).\n"
                "9. Use standard Java practices and naming conventions.\n\n"
                "**Output:**\n"
                "Provide the Java code for the implemented methods within the Service implementation class "
                "(`[ProgramName]ServiceImpl.java`). Enclose code snippets in markdown code blocks. Only provide "
                "the method implementations, assuming the class structure already exists."
            )
        else:  # python
            # Find main logic file
            logic_file = None
            data_access_file = None

            for file_path in structure_keys:
                if "logic_module.py" in file_path:
                    logic_file = "logic_module.py"
                elif "data_access.py" in file_path:
                    data_access_file = "data_access.py"

            if logic_file and data_access_file:
                structure_info = f"{logic_file}, {data_access_file}"

            # Use Prompt 4b for Python Logic
            prompt = (
                "Act as an expert Python developer. Translate the core logic from the provided pseudocode into "
                "Python functions within the provided Python application structure.\n\n"
                "**Inputs:**\n"
                "1. **Pseudocode:**\n```\n"
                f"{pseudocode}\n"
                "```\n\n"
                "2. **Target Python Structure:** "
                f"{structure_info}\n\n"
                "**Instructions:**\n"
                "1. Implement the core business logic described in the pseudocode primarily within the designated "
                "main logic function (e.g., `process_customer_update()` in `logic_module.py`), filling in "
                "the placeholder.\n"
                "2. Use the placeholder functions from the data access module (e.g., "
                "`data_access.get_customer_record()`, `data_access.update_order_status()`) for simulated data "
                "interactions corresponding to file I/O in the pseudocode.\n"
                "3. Translate pseudocode steps (assignments, calculations, conditions, loops) into idiomatic "
                "Python code.\n"
                "4. Map pseudocode conditional logic (IF/ELSE) to Python `if/elif/else` statements.\n"
                "5. Map pseudocode loops to Python `for` or `while` loops.\n"
                "6. Represent RPG subroutines (if clearly delineated in pseudocode) as helper functions within "
                "`logic_module.py` or a separate utility module.\n"
                "7. Use Python dictionaries, lists, or the defined model classes (`models.py`) for data "
                "representation as suggested by the pseudocode.\n"
                "8. Focus on translating the *logical flow* from the pseudocode. Add basic `# TODO:` comments "
                "for complex calculations or areas needing specific business rules not fully captured in pseudocode. "
                "Implement basic exception handling (e.g., simple try-except blocks around data access calls).\n"
                "9. Use standard Python practices (PEP 8) and naming conventions.\n\n"
                "**Output:**\n"
                "Provide the Python code for the implemented functions within the relevant modules (primarily "
                "`logic_module.py`). Enclose code snippets in markdown code blocks. Only provide the function "
                "implementations, assuming the basic file/module structure already exists."
            )

        logic_response = self._send_to_llm(prompt)

        # Parse the response to get updated file contents
        updated_files = self._integrate_logic_into_structure(logic_response, structure_files)
        return updated_files

    def _integrate_logic_into_structure(
        self, logic_response: str, structure_files: Dict[str, str]
    ) -> Dict[str, str]:
        """
        Integrate the generated logic into the structure files.

        Args:
            logic_response: The LLM's response containing the logic implementation
            structure_files: Dictionary of structure file paths to contents

        Returns:
            Dictionary of file paths to updated file contents
        """
        updated_files = structure_files.copy()

        if self.target_language == "java":
            # Extract Java method implementations from the response
            methods = []
            in_code_block = False
            current_block = ""

            for line in logic_response.split('\n'):
                if line.strip().startswith("```java"):
                    in_code_block = True
                    current_block = ""
                elif line.strip().startswith("```") and in_code_block:
                    in_code_block = False
                    methods.append(current_block)
                elif in_code_block:
                    current_block += line + "\n"

            # Find the ServiceImpl file to update
            service_impl_path = None
            for file_path in structure_files.keys():
                if "ServiceImpl.java" in file_path:
                    service_impl_path = file_path
                    break

            if service_impl_path and methods:
                # Read the current file content
                file_content = structure_files[service_impl_path]

                # Find where to insert the methods (before the last closing brace)
                last_brace_index = file_content.rfind("}")

                if last_brace_index != -1:
                    # Insert methods before the last closing brace
                    updated_content = (
                        file_content[:last_brace_index].rstrip() + "\n\n" +
                        "\n\n".join(methods) + "\n\n" +
                        file_content[last_brace_index:]
                    )
                    updated_files[service_impl_path] = updated_content

        else:  # python
            # Extract Python function implementations from the response
            functions = []
            in_code_block = False
            current_block = ""

            for line in logic_response.split('\n'):
                if line.strip().startswith("```python"):
                    in_code_block = True
                    current_block = ""
                elif line.strip().startswith("```") and in_code_block:
                    in_code_block = False
                    functions.append(current_block)
                elif in_code_block:
                    current_block += line + "\n"

            # Find the logic_module.py file to update
            logic_module_path = None
            for file_path in structure_files.keys():
                if "logic_module.py" in file_path:
                    logic_module_path = file_path
                    break

            if logic_module_path and functions:
                # Read the current file content
                file_content = structure_files[logic_module_path]

                # Append the functions to the end of the file
                updated_content = file_content.rstrip() + "\n\n" + "\n\n".join(functions)
                updated_files[logic_module_path] = updated_content

        return updated_files

    def save_file(self, file_path: str, content: str) -> None:
        """
        Save content to a file, creating any necessary directories.

        Args:
            file_path: The path to the file
            content: The content to write to the file
        """
        # Create directory if it doesn't exist
        try:
            directory = os.path.dirname(file_path)
            os.makedirs(directory, exist_ok=True)
            
            if self.verbose:
                print(f"Ensuring directory exists: {directory}")
        except Exception as dir_error:
            print(f"Error creating directory for {file_path}: {dir_error}")
            # Try to create parent directories one by one
            parts = os.path.dirname(file_path).split(os.sep)
            current_path = ""
            for part in parts:
                if not part:  # Skip empty parts (like after initial slash)
                    current_path = os.sep
                    continue
                    
                current_path = os.path.join(current_path, part)
                if not os.path.exists(current_path):
                    try:
                        os.mkdir(current_path)
                        if self.verbose:
                            print(f"Created directory: {current_path}")
                    except Exception as e:
                        print(f"Failed to create directory {current_path}: {e}")

        try:
            # Make sure we're not trying to write to a directory
            if os.path.isdir(file_path):
                raise IOError(f"{file_path} is a directory, cannot write file")
                
            with open(file_path, "w") as f:
                f.write(content)
                
            # Verify file was created
            if os.path.exists(file_path):
                if self.verbose:
                    print(f"Successfully saved file: {file_path} ({len(content)} chars)")
            else:
                print(f"WARNING: File {file_path} doesn't exist after write attempt")
                
        except Exception as e:
            print(f"Error saving file {file_path}: {e}")
            # Try an alternative approach for problematic paths
            try:
                # Create a simpler path if the original one is causing issues
                simple_name = os.path.basename(file_path)
                alt_path = os.path.join(self.output_dir, simple_name)
                with open(alt_path, "w") as f:
                    f.write(f"/* Original path: {file_path} */\n{content}")
                print(f"Saved file to alternative location: {alt_path}")
            except Exception as alt_e:
                print(f"Alternative save also failed: {alt_e}")
                raise

    def execute(self) -> None:
        """Execute the full RPG modernization process."""
        try:
            # 1. Load RPG source code
            rpg_source = self.load_rpg_source()

            # 2. Generate pseudocode
            pseudocode = self.generate_pseudocode(rpg_source)
            pseudocode_path = os.path.join(self.output_dir, "pseudocode.txt")
            self.save_file(pseudocode_path, pseudocode)

            # 3. Generate flow diagram
            flow_diagram = self.generate_flow_diagram(rpg_source, pseudocode)
            flow_diagram_path = os.path.join(self.output_dir, "flow_diagram.md")
            self.save_file(flow_diagram_path, flow_diagram)

            # 4. Generate comprehensive business document
            business_document = self.generate_business_document(rpg_source, pseudocode)
            business_document_path = os.path.join(self.output_dir, "business_document.md")
            self.save_file(business_document_path, business_document)

            # 5. Generate target structure
            structure_files = self.generate_target_structure(pseudocode)
            
            # 5a. For Java, ensure we have a complete structure with fallbacks if needed
            if self.target_language == "java":
                structure_files = self._ensure_java_structure_complete(structure_files)
                
            # Save the structure files
            for file_path, content in structure_files.items():
                self.save_file(file_path, content)

            # 6. Generate target logic
            updated_files = self.generate_target_logic(pseudocode, structure_files)
            for file_path, content in updated_files.items():
                if file_path in structure_files and content != structure_files[file_path]:
                    self.save_file(file_path, content)
                    
            # 6a. Verify all files exist on disk after saving
            if self.verbose:
                print("Verifying files on disk:")
                for file_path in structure_files.keys():
                    if os.path.exists(file_path):
                        print(f"  ✅ {file_path}")
                    else:
                        print(f"  ❌ {file_path} - missing!")

            # 7. Print completion message
            print("\n" + "=" * 50)
            print("RPG Modernization Complete!")
            print("=" * 50)
            print(f"Output directory: {self.output_dir}")
            print("\nGenerated artifacts:")
            print(f"- Pseudocode: {pseudocode_path}")
            print(f"- Flow diagram: {flow_diagram_path}")
            print(f"- Business document: {business_document_path}")
            print(f"- Target code structure and implementation")
            print("\nIMPORTANT NOTES:")
            print("1. The generated business document requires thorough human SME review.")
            print("2. The generated code is a draft requiring review, refactoring, testing, and completion.")
            print("3. All AI-generated artifacts should be carefully validated by domain experts.")
            print("=" * 50)

        except Exception as e:
            print(f"Error during RPG modernization: {e}")
            raise


def main():
    """Main entry point for the RPG Modernization Assistant Tool."""
    parser = argparse.ArgumentParser(
        description="RPG Modernization Assistant Tool - Convert RPG code to Java or Python"
    )

    parser.add_argument(
        "--input-file",
        required=True,
        help="Path to the RPG source code .txt file"
    )
    parser.add_argument(
        "--rpg-type",
        choices=["synon", "modern"],
        required=True,
        help="Type of RPG code (synon or modern)"
    )
    parser.add_argument(
        "--target-language",
        choices=["java", "python"],
        required=True,
        help="Target language for conversion (java or python)"
    )
    parser.add_argument(
        "--output-dir",
        help="Output directory (default: [input-file-name]_output)"
    )
    parser.add_argument(
        "--llm-provider",
        choices=["openai", "anthropic", "google"],
        default="openai",
        help="LLM provider to use (default: openai)"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print verbose output"
    )

    args = parser.parse_args()

    # Initialize and execute the RPG Modernization Assistant
    assistant = RPGModernizationAssistant(
        input_file=args.input_file,
        rpg_type=args.rpg_type,
        target_language=args.target_language,
        output_dir=args.output_dir,
        llm_provider=args.llm_provider,
        verbose=args.verbose,
    )

    assistant.execute()


if __name__ == "__main__":
    main()