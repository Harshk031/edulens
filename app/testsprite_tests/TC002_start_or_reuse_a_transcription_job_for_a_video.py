import requests
import uuid


BASE_URL = "http://localhost:5000"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30


def test_start_or_reuse_transcription_job_for_video():
    # If we don't have a videoId, create a dummy one for test
    # Since the PRD and instructions don't provide a video creation API,
    # generate a random videoId string for testing
    video_id = f"test-video-{uuid.uuid4()}"

    url = f"{BASE_URL}/api/video/process"
    payload = {
        "videoId": video_id,
        # "force" is optional, test with both True and False / omitted is acceptable,
        # here we test with force = True to cover starting new job forcefully
        "force": True
    }

    try:
        # Start or reuse transcription job with force=True
        response = requests.post(url, headers=HEADERS, json=payload, timeout=TIMEOUT)
        response.raise_for_status()
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        # Response content is unspecified, just ensure response body exists and is JSON
        data = response.json()
        assert isinstance(data, dict) or isinstance(data, list) or data is None, "Response JSON invalid type"

        # Also test reuse (force omitted)
        payload_reuse = {"videoId": video_id}
        response_reuse = requests.post(url, headers=HEADERS, json=payload_reuse, timeout=TIMEOUT)
        response_reuse.raise_for_status()
        assert response_reuse.status_code == 200, f"Expected 200 on reuse, got {response_reuse.status_code}"
        data_reuse = response_reuse.json()
        assert isinstance(data_reuse, dict) or isinstance(data_reuse, list) or data_reuse is None, "Reuse response JSON invalid type"

    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"


test_start_or_reuse_transcription_job_for_video()