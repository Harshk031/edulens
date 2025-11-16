/**
 * Smart segment merging algorithm for parallel transcription chunks
 * Handles overlaps, removes duplicates, and maintains accurate timestamps
 */

class SegmentMerger {
  constructor(options = {}) {
    this.overlapTolerance = options.overlapTolerance || 5.0;  // 5 second tolerance for overlap detection
    this.duplicateThreshold = options.duplicateThreshold || 0.8;  // 80% similarity threshold
    this.maxGapFill = options.maxGapFill || 2.0;  // Fill gaps up to 2 seconds
    this.minSegmentLength = options.minSegmentLength || 1.0;  // Minimum segment length
  }

  /**
   * Merge parallel transcription results into a single coherent transcript
   */
  mergeChunkResults(chunkResults, totalDuration) {
    console.log(`🔗 Starting segment merging for ${chunkResults.length} chunks`);
    console.log(`   Total duration: ${totalDuration}s`);
    
    if (!chunkResults || chunkResults.length === 0) {
      return { language: 'en', segments: [] };
    }
    
    // Sort chunk results by start time
    const sortedChunks = chunkResults
      .filter(chunk => chunk && chunk.segments)
      .sort((a, b) => a.chunkStart - b.chunkStart);
    
    console.log(`   Processing ${sortedChunks.length} valid chunks`);
    
    // Collect all segments with chunk metadata
    const allSegments = [];
    sortedChunks.forEach(chunk => {
      chunk.segments.forEach(segment => {
        allSegments.push({
          ...segment,
          chunkIndex: chunk.chunkIndex,
          chunkStart: chunk.chunkStart,
          chunkEnd: chunk.chunkEnd,
          originalStart: segment.start - chunk.chunkStart,
          originalEnd: segment.end - chunk.chunkStart
        });
      });
    });
    
    console.log(`   Collected ${allSegments.length} total segments`);
    
    // Sort segments by start time
    allSegments.sort((a, b) => a.start - b.start);
    
    // Merge overlapping segments
    const mergedSegments = this.mergeOverlappingSegments(allSegments);
    console.log(`   After overlap merge: ${mergedSegments.length} segments`);
    
    // Remove duplicates
    const deduplicatedSegments = this.removeDuplicateSegments(mergedSegments);
    console.log(`   After deduplication: ${deduplicatedSegments.length} segments`);
    
    // Fill small gaps
    const gapFilledSegments = this.fillSmallGaps(deduplicatedSegments);
    console.log(`   After gap filling: ${gapFilledSegments.length} segments`);
    
    // Final cleanup
    const cleanedSegments = this.finalCleanup(gapFilledSegments, totalDuration);
    console.log(`   After final cleanup: ${cleanedSegments.length} segments`);
    
    // Determine primary language
    const language = this.determinePrimaryLanguage(sortedChunks);
    
    console.log(`✅ Segment merging complete: ${cleanedSegments.length} segments (${language})`);
    
    return {
      language,
      segments: cleanedSegments,
      mergeStats: {
        originalChunks: chunkResults.length,
        totalSegments: allSegments.length,
        afterMerge: mergedSegments.length,
        afterDedup: deduplicatedSegments.length,
        afterGapFill: gapFilledSegments.length,
        final: cleanedSegments.length
      }
    };
  }

  /**
   * Merge segments that overlap between chunks
   */
  mergeOverlappingSegments(segments) {
    if (segments.length === 0) return [];
    
    const merged = [segments[0]];
    
    for (let i = 1; i < segments.length; i++) {
      const current = segments[i];
      const previous = merged[merged.length - 1];
      
      // Check for overlap
      const overlap = Math.min(previous.end, current.end) - Math.max(previous.start, current.start);
      
      if (overlap > this.overlapTolerance) {
        // Significant overlap - merge segments
        const mergedSegment = this.mergeTwoSegments(previous, current);
        merged[merged.length - 1] = mergedSegment;
        
        console.log(`   🔗 Merged overlapping segments: ${previous.start.toFixed(1)}s-${previous.end.toFixed(1)}s + ${current.start.toFixed(1)}s-${current.end.toFixed(1)}s`);
      } else if (overlap > 0) {
        // Small overlap - adjust boundaries
        const midpoint = (previous.end + current.start) / 2;
        previous.end = midpoint;
        current.start = midpoint;
        merged.push(current);
      } else {
        // No overlap
        merged.push(current);
      }
    }
    
    return merged;
  }

  /**
   * Merge two overlapping segments intelligently
   */
  mergeTwoSegments(seg1, seg2) {
    // Use the segment with better quality (longer text, from middle of chunk)
    const seg1Quality = this.calculateSegmentQuality(seg1);
    const seg2Quality = this.calculateSegmentQuality(seg2);
    
    let primarySeg, secondarySeg;
    if (seg1Quality >= seg2Quality) {
      primarySeg = seg1;
      secondarySeg = seg2;
    } else {
      primarySeg = seg2;
      secondarySeg = seg1;
    }
    
    // Merge text intelligently
    const mergedText = this.mergeSegmentText(primarySeg.text, secondarySeg.text);
    
    return {
      start: Math.min(seg1.start, seg2.start),
      end: Math.max(seg1.end, seg2.end),
      text: mergedText,
      chunkIndex: primarySeg.chunkIndex,
      confidence: Math.max(seg1Quality, seg2Quality)
    };
  }

  /**
   * Calculate segment quality score
   */
  calculateSegmentQuality(segment) {
    const textLength = segment.text.trim().length;
    const duration = segment.end - segment.start;
    const chunkPosition = segment.originalStart / (segment.chunkEnd - segment.chunkStart);
    
    // Higher quality for:
    // - Longer text
    // - Reasonable duration (not too short or long)
    // - Middle positions in chunks (less likely to be cut off)
    
    let score = 0;
    
    // Text length score (0-40 points)
    score += Math.min(40, textLength * 0.5);
    
    // Duration score (0-30 points) 
    const optimalDuration = 5.0;
    const durationScore = Math.max(0, 30 - Math.abs(duration - optimalDuration) * 2);
    score += durationScore;
    
    // Position score (0-30 points) - prefer middle of chunk
    const positionScore = 30 * (1 - Math.abs(chunkPosition - 0.5) * 2);
    score += positionScore;
    
    return score;
  }

  /**
   * Intelligently merge text from overlapping segments
   */
  mergeSegmentText(text1, text2) {
    const words1 = text1.trim().split(/\s+/);
    const words2 = text2.trim().split(/\s+/);
    
    // Find common subsequence
    const commonSuffix = this.findCommonSuffix(words1, words2);
    const commonPrefix = this.findCommonPrefix(words1, words2);
    
    if (commonSuffix.length > 0 || commonPrefix.length > 0) {
      // Remove common parts and merge
      const unique1 = words1.slice(commonPrefix.length, words1.length - commonSuffix.length);
      const unique2 = words2.slice(commonPrefix.length, words2.length - commonSuffix.length);
      
      const mergedWords = [
        ...words1.slice(0, commonPrefix.length),
        ...unique1,
        ...unique2,
        ...words1.slice(words1.length - commonSuffix.length)
      ];
      
      return mergedWords.join(' ');
    } else {
      // No clear overlap, choose longer text
      return text1.length > text2.length ? text1 : text2;
    }
  }

  /**
   * Find common word suffix between two word arrays
   */
  findCommonSuffix(words1, words2) {
    const common = [];
    let i = words1.length - 1;
    let j = words2.length - 1;
    
    while (i >= 0 && j >= 0 && words1[i].toLowerCase() === words2[j].toLowerCase()) {
      common.unshift(words1[i]);
      i--;
      j--;
    }
    
    return common;
  }

  /**
   * Find common word prefix between two word arrays
   */
  findCommonPrefix(words1, words2) {
    const common = [];
    const minLength = Math.min(words1.length, words2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (words1[i].toLowerCase() === words2[i].toLowerCase()) {
        common.push(words1[i]);
      } else {
        break;
      }
    }
    
    return common;
  }

  /**
   * Remove duplicate segments using similarity threshold
   */
  removeDuplicateSegments(segments) {
    if (segments.length === 0) return [];
    
    const unique = [segments[0]];
    
    for (let i = 1; i < segments.length; i++) {
      const current = segments[i];
      let isDuplicate = false;
      
      // Check similarity with recent segments (within 30 seconds)
      for (let j = unique.length - 1; j >= 0; j--) {
        const existing = unique[j];
        
        // Stop checking if segments are too far apart
        if (current.start - existing.end > 30) break;
        
        const similarity = this.calculateTextSimilarity(current.text, existing.text);
        const timeOverlap = Math.min(current.end, existing.end) - Math.max(current.start, existing.start);
        
        if (similarity > this.duplicateThreshold && timeOverlap > 1) {
          isDuplicate = true;
          console.log(`   🗑️ Removed duplicate: "${current.text.substring(0, 50)}..."`);
          break;
        }
      }
      
      if (!isDuplicate) {
        unique.push(current);
      }
    }
    
    return unique;
  }

  /**
   * Calculate text similarity using word overlap
   */
  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Fill small gaps between segments
   */
  fillSmallGaps(segments) {
    if (segments.length === 0) return [];
    
    const filled = [segments[0]];
    
    for (let i = 1; i < segments.length; i++) {
      const current = segments[i];
      const previous = filled[filled.length - 1];
      
      const gap = current.start - previous.end;
      
      if (gap > 0 && gap <= this.maxGapFill) {
        // Fill small gap by extending previous segment
        previous.end = current.start;
        console.log(`   🔧 Filled ${gap.toFixed(1)}s gap at ${current.start.toFixed(1)}s`);
      }
      
      filled.push(current);
    }
    
    return filled;
  }

  /**
   * Final cleanup of segments
   */
  finalCleanup(segments, totalDuration) {
    return segments
      .map(seg => ({
        start: Math.max(0, Math.round(seg.start * 100) / 100),
        end: Math.min(totalDuration, Math.round(seg.end * 100) / 100),
        text: seg.text.trim()
      }))
      .filter(seg => 
        seg.text.length > 0 && 
        seg.end > seg.start && 
        (seg.end - seg.start) >= this.minSegmentLength
      )
      .sort((a, b) => a.start - b.start);
  }

  /**
   * Determine primary language from chunk results
   */
  determinePrimaryLanguage(chunkResults) {
    const languages = {};
    
    chunkResults.forEach(chunk => {
      if (chunk.language) {
        languages[chunk.language] = (languages[chunk.language] || 0) + 1;
      }
    });
    
    // Return most common language, default to 'en'
    return Object.keys(languages).reduce((a, b) => 
      languages[a] > languages[b] ? a : b, 'en'
    );
  }
}

module.exports = SegmentMerger;