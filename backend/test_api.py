import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/api"

def test_ai_chat():
    username = f"testuser_{int(time.time())}"
    email = f"{username}@example.com"
    password = "password123"

    print(f"1. Registering dummy user: {email}")
    reg_res = requests.post(f"{BASE_URL}/auth/register", json={
        "username": username,
        "email": email,
        "password": password
    })
    
    if reg_res.status_code != 201:
        print("Registration failed:", reg_res.text)
        return
        
    token = reg_res.json().get('token')
    print("User registered. Token acquired.")

    print("2. Testing AI Chat...")
    chat_payload = {
        "message": "Give me a 1-sentence tip on saving money.",
        "history": []
    }
    
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    chat_res = requests.post(f"{BASE_URL}/ai/chat", json=chat_payload, headers=headers)
    
    if chat_res.status_code == 200:
        print("Integration Test Passed! AI Reply:")
        print(chat_res.json().get('reply'))
    else:
        print(f"Chat failed with status {chat_res.status_code}: {chat_res.text}")

if __name__ == "__main__":
    test_ai_chat()
