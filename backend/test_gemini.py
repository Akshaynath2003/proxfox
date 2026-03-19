import os
import google.generativeai as genai
from dotenv import load_dotenv

project_root = os.path.dirname(__file__)
env_path = os.path.join(project_root, '..', '.env')
load_dotenv(env_path)

api_key = os.getenv('GEMINI_API_KEY')
print(f"API Key loaded: {bool(api_key)}")

if not api_key:
    print("No API key found in .env")
    exit(1)

genai.configure(api_key=api_key)

try:
    print("\n--- Testing gemini-2.5-flash ---")
    model = genai.GenerativeModel('gemini-2.5-flash')
    response = model.generate_content("Say 'Integration successful' in 2 to 3 words.")
    print("AI Reply:", response.text.strip())
    print("Success: gemini-2.5-flash works!")
except Exception as e:
    print(f"Failed with gemini-2.5-flash: {e}")
    try:
        print("\n--- Testing gemini-2.0-flash ---")
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content("Say 'Integration successful' in 2 to 3 words.")
        print("AI Reply:", response.text.strip())
        print("Success: gemini-2.0-flash works!")
    except Exception as e2:
        print(f"Failed with gemini-2.0-flash: {e2}")
        print("\nCould not connect to Gemini API with available models.")
