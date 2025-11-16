import requests
import time

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

def test_post_ai_query_with_video_transcript():
    # Helper to start transcription job and wait for completion
    def start_and_wait_transcription(video_id):
        # Start transcription job
        start_resp = requests.post(
            f"{BASE_URL}/api/video/process",
            json={"videoId": video_id},
            timeout=TIMEOUT
        )
        assert start_resp.status_code == 200, f"Failed to start transcription job: {start_resp.text}"
        # Poll transcription status until complete or timeout after ~120s
        for _ in range(24):
            status_resp = requests.get(
                f"{BASE_URL}/api/video/status",
                params={"videoId": video_id},
                timeout=TIMEOUT
            )
            if status_resp.status_code == 200:
                status_data = status_resp.json()
                stage = status_data.get("stage", "").lower()
                progress = status_data.get("progress", 0)
                if stage == "completed" or progress >= 100:
                    return True
            elif status_resp.status_code == 404:
                # Job not found yet, wait and retry
                pass
            time.sleep(5)
        return False

    # Step 1: Create a unique videoId for testing or use a known one
    video_id = "dQw4w9WgXcQ"  # Rick Astley - as a known valid YouTube video ID for testing

    # Step 2: Ensure the transcript is ready
    try:
        got_transcript_ready = start_and_wait_transcription(video_id)
        assert got_transcript_ready, "Transcript processing did not complete in expected time"

        # Verify transcript exists
        transcript_resp = requests.get(
            f"{BASE_URL}/api/video/transcript/{video_id}",
            timeout=TIMEOUT
        )
        assert transcript_resp.status_code == 200, f"Transcript not found: {transcript_resp.text}"

        # Step 3: POST to AI query endpoint with valid videoId and question
        question = "What is the main theme of the video?"
        payload = {
            "videoId": video_id,
            "question": question
        }
        headers = {"Content-Type": "application/json"}

        ai_query_resp = requests.post(
            f"{BASE_URL}/api/ai/query",
            json=payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert ai_query_resp.status_code == 200, f"AI query request failed: {ai_query_resp.text}"
        ai_response_json = ai_query_resp.json()

        # Validate AI response contains expected keys: answer required, citations optional
        assert isinstance(ai_response_json, dict), "AI response is not a JSON object"
        assert "answer" in ai_response_json, "AI response missing 'answer' field"
        assert isinstance(ai_response_json["answer"], str) and len(ai_response_json["answer"]) > 0, "AI answer is empty"
        # Citations is optional but if present should be list
        if "citations" in ai_response_json:
            assert isinstance(ai_response_json["citations"], list), "'citations' field is not a list"
    finally:
        # No resources to cleanup as videoId is given and permanent
        pass

test_post_ai_query_with_video_transcript()
