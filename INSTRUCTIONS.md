# RPG Modernization Application - Setup Instructions

This application helps convert legacy RPG code to modern Java or Python applications using AI.

## Setup Instructions

1. **Install Python Requirements**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set Up API Keys**
   
   Create a `.env` file in the root directory with your API keys for the LLM provider you want to use:
   
   ```
   # OpenAI (optional)
   OPENAI_API_KEY=your_openai_api_key
   
   # Anthropic (optional)
   ANTHROPIC_API_KEY=your_anthropic_api_key
   
   # Google/Gemini (optional)
   GEMINI_API_KEY=your_gemini_api_key
   ```
   
   You only need to provide an API key for the LLM provider you plan to use.

3. **Run the Application**
   ```bash
   streamlit run streamlit_app_simplified.py
   ```

## Using the Application

1. **Login** with the following credentials:
   - Username: `user`
   - Password: `password`

2. **Select the RPG Modernization Tool** from the sidebar

3. **Upload an RPG file** and configure the conversion settings:
   - Select RPG type (Synon or Modern)
   - Choose target language (Java or Python)
   - Select the AI model provider (OpenAI, Anthropic, or Google)

4. **Click "Process RPG Code"** to start the conversion

5. **Download the generated files** using the ZIP download link once processing is complete

## Troubleshooting

- If you encounter a "module not found" error, ensure all dependencies are installed
- If API errors occur, check that your API key is correct in the `.env` file
- For large RPG files, the process may take several minutes to complete

## Files Included

- `streamlit_app_simplified.py` - Main Streamlit application
- `rpg_modernization_assistant.py` - Core RPG modernization logic
- `requirements.txt` - Python dependencies
- `.env` - Environment file for API keys (you need to create this)

## Note on API Usage

The application uses external AI models which may incur costs based on your usage. Please be aware of the pricing for the LLM provider you choose to use.