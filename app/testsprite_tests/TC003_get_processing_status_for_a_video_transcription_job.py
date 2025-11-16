import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

def test_get_processing_status_for_video_transcription_job():
    video_id = None
    try:
        # Step 1: Create a transcription job to ensure the videoId is valid
        sample_video_id = "test-video-unique-for-tc003"
        start_job_resp = requests.post(
            f"{BASE_URL}/api/video/process",
            json={"videoId": sample_video_id},
            timeout=TIMEOUT
        )
        assert start_job_resp.status_code == 200, f"Failed to start transcription job: {start_job_resp.text}"
        video_id = sample_video_id

        # Step 2: Query status for the existing transcription job (should return 200)
        status_resp = requests.get(
            f"{BASE_URL}/api/video/status",
            params={"videoId": video_id},
            timeout=TIMEOUT
        )
        assert status_resp.status_code == 200, f"Expected 200 for existing job but got {status_resp.status_code}"
        data = status_resp.json()
        assert "progress" in data, "Response missing 'progress'"
        assert "stage" in data, "Response missing 'stage'"

        # Step 3: Query status for a non-existent videoId (should return 404)
        invalid_video_id = "nonexistent-video-id-for-tc003"
        not_found_resp = requests.get(
            f"{BASE_URL}/api/video/status",
            params={"videoId": invalid_video_id},
            timeout=TIMEOUT
        )
        assert not_found_resp.status_code == 404, f"Expected 404 for nonexistent job but got {not_found_resp.status_code}"

    finally:
        # Cleanup not needed because /api/video/process does not create persistent resource needing deletion
        pass

test_get_processing_status_for_video_transcription_job()