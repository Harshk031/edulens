import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

def test_check_ai_providers_availability():
    url = f"{BASE_URL}/api/ai/status"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        assert False, f"Request to {url} failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Validate presence of expected providers and basic health and models info
    lm_studio_key = 'lmStudio'
    groq_key = 'groq'

    assert lm_studio_key in data, "LM Studio provider info missing in response"
    assert groq_key in data, "Groq provider info missing in response"

    # Check health/status and models fields for LM Studio
    lm_provider_info = data[lm_studio_key]
    assert ('health' in lm_provider_info or 'status' in lm_provider_info), "Health/status field missing for LM Studio"
    assert 'models' in lm_provider_info, "Models field missing for LM Studio"

    # Check health/status and models fields for Groq
    groq_provider_info = data[groq_key]
    assert ('health' in groq_provider_info or 'status' in groq_provider_info), "Health/status field missing for Groq"
    assert 'models' in groq_provider_info, "Models field missing for Groq"

test_check_ai_providers_availability()
