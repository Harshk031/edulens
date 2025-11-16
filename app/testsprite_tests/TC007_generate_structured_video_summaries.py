import requests
import time

BASE_URL = "http://localhost:5000"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}


def create_and_process_video(video_url):
    # Extract videoId from URL (assuming standard YouTube format)
    # Fallback to entire url if no parsing
    video_id = None
    if "v=" in video_url:
        idx = video_url.find("v=") + 2
        video_id = video_url[idx:].split("&")[0]
    else:
        video_id = video_url

    # Start or reuse transcription job
    process_resp = requests.post(
        f"{BASE_URL}/api/video/process",
        json={"videoId": video_id},
        headers=HEADERS,
        timeout=TIMEOUT,
    )
    process_resp.raise_for_status()

    # Poll for job completion
    for _ in range(60):
        status_resp = requests.get(
            f"{BASE_URL}/api/video/status",
            params={"videoId": video_id},
            timeout=TIMEOUT,
        )
        if status_resp.status_code == 200:
            status_data = status_resp.json()
            stage = status_data.get("stage", "").lower()
            progress = status_data.get("progress", 0)
            if stage == "completed" or progress == 100:
                return video_id
        elif status_resp.status_code == 404:
            break
        time.sleep(2)
    raise RuntimeError("Transcription did not complete in expected time")


def delete_transcript(video_id):
    # No explicit delete endpoint provided in PRD, ignoring cleanup
    # Just a placeholder if needed in future.
    pass


def test_generate_structured_video_summaries():
    # Precondition: need a valid videoId with processed transcript
    # Use a known public video for testing or the info endpoint to get videoId

    # Use a sample YouTube URL known to work or fallback videoId
    sample_video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

    video_id = None
    try:
        video_id = create_and_process_video(sample_video_url)
        # Prepare payload with optional length and style parameters
        payload = {
            "videoId": video_id,
            "length": "medium",
            "style": "structured"
        }
        resp = requests.post(
            f"{BASE_URL}/api/complete-ai/summary",
            json=payload,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert resp.status_code == 200, f"Unexpected status code: {resp.status_code}"
        data = resp.json()
        # Validate expected structured summary payload fields (basic structure)
        assert isinstance(data, dict), "Response should be a JSON object"
        # Check for some expected keys related to summary
        assert "summary" in data or "sections" in data or "structuredSummary" in data, \
            "Response payload missing expected summary structure keys"
        # Additional validation can be made depending on actual response schema
    finally:
        if video_id:
            delete_transcript(video_id)


test_generate_structured_video_summaries()