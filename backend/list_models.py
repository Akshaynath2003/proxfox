import os
import google.generativeai as genai
from dotenv import load_dotenv

project_root = os.path.dirname(__file__)
env_path = os.path.join(project_root, '..', '.env')
load_dotenv(env_path)

api_key = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=api_key)

print("Available models:")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error listing models: {e}")
