#!/usr/bin/env python
"""
Test script to verify PDF generation functionality for the RPGLE to Java converter.
This script tests both WeasyPrint and pdfkit for PDF generation.
"""

import os
import sys
import base64
import re
import traceback

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
            print(f"Warning: Could not render Mermaid diagram: {e}")
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

def create_pdf_with_weasyprint(html_content, output_path):
    """Create a PDF file from HTML content using weasyprint."""
    try:
        import weasyprint
        print("Testing WeasyPrint PDF generation...")
        
        # Add necessary CSS for proper PDF rendering
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
        weasyprint.HTML(string=full_html).write_pdf(output_path)
        print(f"WeasyPrint PDF generated successfully: {output_path}")
        return True
    except ImportError:
        print("WeasyPrint not installed")
        return False
    except Exception as e:
        print(f"WeasyPrint PDF generation error: {e}")
        traceback.print_exc()
        return False

def create_pdf_with_pdfkit(html_content, output_path):
    """Create a PDF file from HTML content using pdfkit."""
    try:
        import pdfkit
        print("Testing pdfkit PDF generation...")
        pdfkit.from_string(html_content, output_path)
        print(f"pdfkit PDF generated successfully: {output_path}")
        return True
    except ImportError:
        print("pdfkit not installed")
        return False
    except Exception as e:
        print(f"pdfkit PDF generation error: {e}")
        traceback.print_exc()
        return False

def main():
    """Test PDF generation with sample Mermaid content."""
    # Create output directory if it doesn't exist
    os.makedirs("output", exist_ok=True)
    
    # Sample markdown with Mermaid diagram
    sample_md = """# Test Mermaid Diagram

This is a test of Mermaid diagram rendering in PDF.

## Process Flow

```mermaid
flowchart TD
  Start[Start] --> Process[Process Data]
  Process --> Decision{Decision}
  Decision -->|Yes| Success[Success]
  Decision -->|No| Failure[Failure]
  Success --> End[End]
  Failure --> End
```

## Class Diagram

```mermaid
classDiagram
  class Customer {
    +String name
    +String address
    +placeOrder()
  }
  class Order {
    +Date date
    +Number total
    +process()
  }
  Customer "1" --> "many" Order: places
```

## End of Document
"""

    # Render Mermaid diagrams to HTML
    html_content = render_mermaid_diagrams(sample_md)
    
    # Try WeasyPrint
    weasyprint_success = create_pdf_with_weasyprint(
        html_content, 
        "output/test_weasyprint.pdf"
    )
    
    # Try pdfkit
    pdfkit_success = create_pdf_with_pdfkit(
        html_content, 
        "output/test_pdfkit.pdf"
    )
    
    if weasyprint_success or pdfkit_success:
        print("PDF generation test passed!")
        return 0
    else:
        print("PDF generation test failed - no PDF libraries are working.")
        return 1

if __name__ == "__main__":
    sys.exit(main())