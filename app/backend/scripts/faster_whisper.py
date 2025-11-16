#!/usr/bin/env python3
"""
Faster Whisper Transcription Script
Uses faster-whisper library (CTranslate2 backend)
Much faster and more stable than whisper.cpp
"""

import sys
import json
import argparse
from pathlib import Path

try:
    from faster_whisper import WhisperModel
except ImportError:
    print("ERROR: faster-whisper not installed", file=sys.stderr)
    print("Install with: pip install faster-whisper", file=sys.stderr)
    sys.exit(1)

def transcribe_audio(audio_path, output_path, model_size='base', language=None):
    """
    Transcribe audio file using faster-whisper
    
    Args:
        audio_path: Path to audio file
        output_path: Path to save JSON output
        model_size: Whisper model size (tiny, base, small, medium, large)
        language: Language code (None for auto-detect)
    """
    
    print(f"Loading model: {model_size}")
    
    # Initialize model (uses GPU if available, falls back to CPU)
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    
    print(f"Transcribing: {audio_path}")
    
    # Transcribe
    segments, info = model.transcribe(
        audio_path,
        language=language,
        beam_size=5,
        vad_filter=True,  # Voice activity detection
        vad_parameters=dict(min_silence_duration_ms=500)
    )
    
    print(f"Detected language: {info.language} (probability: {info.language_probability:.2f})")
    
    # Convert segments to list
    result_segments = []
    total_segments = 0
    
    for segment in segments:
        result_segments.append({
            "start": segment.start,
            "end": segment.end,
            "text": segment.text.strip()
        })
        total_segments += 1
        
        # Progress update every 10 segments
        if total_segments % 10 == 0:
            print(f"Progress: {total_segments} segments processed")
    
    # Prepare result
    result = {
        "language": info.language,
        "segments": result_segments,
        "duration": info.duration if hasattr(info, 'duration') else None
    }
    
    # Save to JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Transcription complete: {len(result_segments)} segments")
    return result

def main():
    parser = argparse.ArgumentParser(description='Transcribe audio using faster-whisper')
    parser.add_argument('audio_path', help='Path to audio file')
    parser.add_argument('--output', '-o', required=True, help='Output JSON file path')
    parser.add_argument('--model', '-m', default='base', 
                       choices=['tiny', 'base', 'small', 'medium', 'large'],
                       help='Whisper model size')
    parser.add_argument('--language', '-l', default=None, help='Language code (e.g., en, hi)')
    
    args = parser.parse_args()
    
    # Validate input
    if not Path(args.audio_path).exists():
        print(f"ERROR: Audio file not found: {args.audio_path}", file=sys.stderr)
        sys.exit(1)
    
    try:
        transcribe_audio(args.audio_path, args.output, args.model, args.language)
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
