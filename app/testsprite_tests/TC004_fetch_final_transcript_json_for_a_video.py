import requests
import time

BASE_URL = "http://localhost:5000"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30

def test_fetch_final_transcript_json_for_video():
    # To test GET /api/video/transcript/{videoId} with a valid videoId,
    # first create a transcript by starting a transcription job (POST /api/video/process),
    # then wait for transcription to complete (poll GET /api/video/status),
    # then fetch the transcript (GET /api/video/transcript/{videoId}).
    # Handle both 200 and 404 responses properly.
    video_id = None
    try:
        # Step 1: Create a new transcription job with a sample videoId
        # Using a test videoId (e.g. "test-video-tc004") for this test
        video_id = "test-video-tc004"
        process_response = requests.post(
            f"{BASE_URL}/api/video/process",
            json={"videoId": video_id},
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert process_response.status_code == 200, f"Failed to start transcription job: {process_response.text}"

        # Step 2: Poll transcription status until complete or timeout
        max_wait_seconds = 120
        poll_interval = 5
        waited = 0
        status_complete = False

        while waited < max_wait_seconds:
            status_resp = requests.get(
                f"{BASE_URL}/api/video/status",
                params={"videoId": video_id},
                headers=HEADERS,
                timeout=TIMEOUT
            )
            if status_resp.status_code == 200:
                status_data = status_resp.json()
                # The 'stage' field or similar should indicate completion
                # Check for typical completed stages, fallback to checking 'progress' == 100%
                stage = status_data.get("stage", "").lower()
                progress = status_data.get("progress", 0)
                if stage in ("completed", "finished", "done") or progress == 100:
                    status_complete = True
                    break
            elif status_resp.status_code == 404:
                # No job found yet, wait more
                pass
            else:
                # Unexpected status code
                assert False, f"Unexpected status code polling transcription status: {status_resp.status_code} - {status_resp.text}"
            time.sleep(poll_interval)
            waited += poll_interval

        # Step 3: Fetch transcript JSON
        transcript_resp = requests.get(
            f"{BASE_URL}/api/video/transcript/{video_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )

        if status_complete:
            # Transcript should exist and return HTTP 200
            assert transcript_resp.status_code == 200, f"Expected 200, got {transcript_resp.status_code} with body: {transcript_resp.text}"
            transcript_json = transcript_resp.json()
            # Basic validation: transcript_json should be a dict with keys expected in transcript JSON
            assert isinstance(transcript_json, dict), "Transcript JSON is not a dictionary"
            # Check for presence of typical transcript keys
            # e.g. 'segments' or 'transcript' keys often present
            assert ("segments" in transcript_json or "transcript" in transcript_json), "Transcript JSON missing expected keys"
        else:
            # Transcript may not be ready, expect 404 or 200 if partial
            assert transcript_resp.status_code in (200, 404), f"Unexpected status code fetching transcript: {transcript_resp.status_code}"
            if transcript_resp.status_code == 404:
                # Acceptable if transcript isn't generated yet
                pass
            else:
                transcript_json = transcript_resp.json()
                assert isinstance(transcript_json, dict), "Transcript JSON is not a dictionary in 200 response"

    finally:
        # Cleanup not needed as we test only transcript retrieval and no resource deletion endpoint exists
        # If resource deletion endpoint existed, we'd delete the created job/transcript here
        pass

test_fetch_final_transcript_json_for_video()