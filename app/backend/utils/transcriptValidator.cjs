const fs = require('fs');
const path = require('path');

/**
 * Enhanced Transcript Validation Module
 * Provides comprehensive validation for transcript data to prevent empty/invalid transcripts
 * from being processed by AI systems.
 */

// Minimum requirements for a valid transcript - RELAXED for better robustness
const VALIDATION_REQUIREMENTS = {
  MIN_SEGMENTS: 1,
  MIN_TEXT_LENGTH: 5, // Reduced from 10 - accept shorter transcripts
  MIN_SEGMENT_TEXT_LENGTH: 1, // Reduced from 3 - accept very short segments
  MAX_EMPTY_SEGMENTS_RATIO: 0.8 // Increased from 0.5 - more tolerant of empty segments
};

/**
 * Validates a transcript object comprehensively
 * @param {Object} transcript - The transcript object to validate
 * @param {string} videoId - The video ID for logging purposes
 * @returns {Object} Validation result with isValid, errors, and warnings
 */
function validateTranscript(transcript, videoId = 'unknown') {
  const result = {
    isValid: false,
    errors: [],
    warnings: [],
    metadata: {
      segmentCount: 0,
      validSegmentCount: 0,
      emptySegmentCount: 0,
      totalTextLength: 0,
      hasFullText: false,
      fullTextLength: 0
    }
  };

  

  // Check if transcript exists
  if (!transcript) {
    result.errors.push('Transcript object is null or undefined');
    console.error(`[Validator] ❌ Transcript is null/undefined for video: ${videoId}`);
    return result;
  }

  // Check basic structure
  if (!transcript.segments || !Array.isArray(transcript.segments)) {
    result.errors.push('Transcript must have a segments array');
    console.error(`[Validator] ❌ Missing segments array for video: ${videoId}`);
    return result;
  }

  // Update metadata
  result.metadata.segmentCount = transcript.segments.length;
  result.metadata.hasFullText = !!transcript.fullText;
  result.metadata.fullTextLength = transcript.fullText ? transcript.fullText.length : 0;

  // Validate segments
  let validSegments = [];
  let emptySegments = [];

  for (let i = 0; i < transcript.segments.length; i++) {
    const segment = transcript.segments[i];
    
    if (!segment) {
      emptySegments.push(i);
      continue;
    }

    const segmentText = segment.text || '';
    if (!segmentText || segmentText.trim().length === 0) {
      emptySegments.push(i);
      continue;
    }

    if (segmentText.trim().length < VALIDATION_REQUIREMENTS.MIN_SEGMENT_TEXT_LENGTH) {
      result.warnings.push(`Segment ${i} has very short text (${segmentText.trim().length} chars)`);
    }

    validSegments.push(segment);
  }

  result.metadata.validSegmentCount = validSegments.length;
  result.metadata.emptySegmentCount = emptySegments.length;

  // Calculate total text length from valid segments
  const totalTextLength = validSegments.reduce((sum, seg) => sum + (seg.text || '').length, 0);
  result.metadata.totalTextLength = totalTextLength;

  // Validation rules
  let hasCriticalErrors = false;

  // Rule 1: Minimum segment count
  if (validSegments.length < VALIDATION_REQUIREMENTS.MIN_SEGMENTS) {
    result.errors.push(
      `Transcript has ${validSegments.length} valid segments, minimum required is ${VALIDATION_REQUIREMENTS.MIN_SEGMENTS}`
    );
    hasCriticalErrors = true;
  }

  // Rule 2: Minimum total text length
  if (totalTextLength < VALIDATION_REQUIREMENTS.MIN_TEXT_LENGTH) {
    result.errors.push(
      `Transcript total text length is ${totalTextLength}, minimum required is ${VALIDATION_REQUIREMENTS.MIN_TEXT_LENGTH}`
    );
    hasCriticalErrors = true;
  }

  // Rule 3: Check fullText consistency
  if (transcript.fullText && transcript.fullText.trim().length > 0) {
    if (transcript.fullText.trim().length < VALIDATION_REQUIREMENTS.MIN_TEXT_LENGTH) {
      result.errors.push(
        `Transcript fullText is too short (${transcript.fullText.trim().length} chars), minimum required is ${VALIDATION_REQUIREMENTS.MIN_TEXT_LENGTH}`
      );
      hasCriticalErrors = true;
    }
  } else {
    result.warnings.push('Transcript missing fullText property');
  }

  // Rule 4: Check empty segment ratio
  const emptySegmentRatio = transcript.segments.length > 0 ? emptySegments.length / transcript.segments.length : 1;
  if (emptySegmentRatio > VALIDATION_REQUIREMENTS.MAX_EMPTY_SEGMENTS_RATIO) {
    result.warnings.push(
      `High ratio of empty segments: ${emptySegments.length}/${transcript.segments.length} (${Math.round(emptySegmentRatio * 100)}%)`
    );
  }

  // Determine overall validity
  result.isValid = !hasCriticalErrors && validSegments.length > 0;

  // Log validation results
  if (result.isValid) {
    
    
  } else {
    console.error(`[Validator] ❌ Transcript FAILED validation for video: ${videoId}`);
    console.error(`[Validator] 🚨 Errors: ${result.errors.join(', ')}`);
    if (result.warnings.length > 0) {
      console.warn(`[Validator] ⚠️ Warnings: ${result.warnings.join(', ')}`);
    }
  }

  return result;
}

/**
 * Validates a transcript file on disk
 * @param {string} videoId - The video ID to validate
 * @param {string} transcriptsDir - Path to the transcripts directory
 * @returns {Object} Validation result
 */
function validateTranscriptFile(videoId, transcriptsDir = null) {
  const defaultTranscriptsDir = path.join(__dirname, '..', '..', 'storage', 'transcripts');
  const transcriptDir = transcriptsDir || defaultTranscriptsDir;
  const transcriptPath = path.join(transcriptDir, `${videoId}.json`);

  

  // Check if file exists
  if (!fs.existsSync(transcriptPath)) {
    return {
      isValid: false,
      errors: [`Transcript file not found: ${transcriptPath}`],
      warnings: [],
      metadata: { fileExists: false }
    };
  }

  try {
    // Read and parse transcript
    const transcriptData = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'));
    
    // Validate the transcript content
    const validation = validateTranscript(transcriptData, videoId);
    validation.metadata.fileExists = true;
    validation.metadata.filePath = transcriptPath;
    
    return validation;
  } catch (error) {
    return {
      isValid: false,
      errors: [`Failed to read or parse transcript file: ${error.message}`],
      warnings: [],
      metadata: { fileExists: true, filePath: transcriptPath, parseError: true }
    };
  }
}

/**
 * Creates an error transcript to prevent fake content generation
 * @param {string} videoId - The video ID
 * @param {string} errorMessage - The error message to include
 * @param {Object} originalTranscript - The original failed transcript (if any)
 * @returns {Object} Error transcript object
 */
function createErrorTranscript(videoId, errorMessage, originalTranscript = null) {
  const errorTranscript = {
    videoId,
    segments: [],
    fullText: '',
    duration: 0,
    language: 'en',
    error: errorMessage,
    processingFailed: true,
    timestamp: new Date().toISOString(),
    validation: {
      isValid: false,
      errors: [errorMessage],
      warnings: [],
      validatedAt: new Date().toISOString()
    }
  };

  // Include original metadata if available
  if (originalTranscript) {
    errorTranscript.originalSegmentCount = originalTranscript.segments?.length || 0;
    errorTranscript.originalError = originalTranscript.error;
    errorTranscript.originalTimestamp = originalTranscript.timestamp;
  }

  console.error(`[Validator] Created error transcript for video: ${videoId}, error: ${errorMessage}`);
  return errorTranscript;
}

/**
 * Checks if a transcript should be regenerated based on validation
 * @param {Object} validation - The validation result
 * @returns {boolean} True if transcript should be regenerated
 */
function shouldRegenerateTranscript(validation) {
  if (!validation.isValid) {
    return true;
  }

  // Check for critical warnings that might indicate poor quality
  const criticalWarnings = [
    'High ratio of empty segments',
    'very short text'
  ];

  return validation.warnings.some(warning => 
    criticalWarnings.some(critical => warning.includes(critical))
  );
}

module.exports = {
  validateTranscript,
  validateTranscriptFile,
  createErrorTranscript,
  shouldRegenerateTranscript,
  VALIDATION_REQUIREMENTS
};