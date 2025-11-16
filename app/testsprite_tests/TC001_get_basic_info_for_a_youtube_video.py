import requests

def test_get_basic_info_youtube_video():
    base_url = "http://localhost:5000"
    endpoint = "/api/video/info"
    youtube_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Example valid YouTube URL
    params = {"url": youtube_url}
    headers = {
        "Accept": "application/json"
    }
    timeout = 30

    try:
        response = requests.get(f"{base_url}{endpoint}", params=params, headers=headers, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Request to {endpoint} failed with exception: {e}"

    assert response.status_code == 200, f"Expected HTTP 200 but got {response.status_code}"
    try:
        json_data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    # Basic validation of expected keys in video metadata - adapt as needed if metadata schema known
    assert isinstance(json_data, dict), "Response JSON is not an object"
    # We expect basic metadata fields, check for some typical keys presence
    expected_keys = ["title", "author", "duration", "thumbnail", "upload_date"]
    for key in expected_keys:
        assert key in json_data, f"Expected key '{key}' missing in response JSON"

test_get_basic_info_youtube_video()