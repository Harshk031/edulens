/**
 * Advanced Code Extractor Service
 * Extracts code from transcripts with proper syntax detection and formatting
 */

const providerManager = require('../ai/providers/providerManager.cjs');

class CodeExtractor {
  constructor() {
    // Language detection patterns
    this.languagePatterns = {
      javascript: /\b(function|const|let|var|class|import|export|async|await|=>)\b/,
      python: /\b(def|class|import|from|if __name__|print|return)\b/,
      java: /\b(public|private|class|static|void|String|int|System\.out)\b/,
      cpp: /\b(#include|using namespace|cout|cin|int main|std::)\b/,
      c: /\b(#include|printf|scanf|int main|void)\b/,
      csharp: /\b(using|namespace|class|public|private|static|void|Console\.)\b/,
      go: /\b(package|func|import|var|type|struct|interface)\b/,
      rust: /\b(fn|let|mut|impl|struct|enum|use|pub)\b/,
      php: /<\?php|\$[a-zA-Z_]/,
      ruby: /\b(def|class|module|require|puts|end)\b/,
      swift: /\b(func|var|let|class|struct|import|print)\b/,
      kotlin: /\b(fun|val|var|class|object|companion)\b/,
      typescript: /\b(interface|type|enum|namespace|as|implements)\b/,
      sql: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|TABLE|FROM|WHERE)\b/i,
      html: /<[a-z][\s\S]*>/i,
      css: /\{[\s\S]*:[^}]+\}/,
      bash: /\b(echo|cd|ls|grep|awk|sed)\b/,
      powershell: /\b(Get-|Set-|New-|Remove-|Write-Host)\b/
    };

    // Code block patterns - simplified for compatibility
    this.codeBlockPatterns = [
      /```(\w+)?\n([\s\S]+?)```/g,  // Markdown code blocks
      /`([^`]+)`/g,                  // Inline code
      /^\s{4,}(.+)$/gm               // Indented code blocks
    ];
  }

  /**
   * Extract all code snippets from transcript
   */
  async extractCodeFromTranscript(transcript, options = {}) {
    console.log('[CodeExtractor] Extracting code from transcript');
    
    const segments = transcript.segments || [];
    const fullText = segments.map(s => s.text).join('\n');
    
    const codeSnippets = [];
    let snippetId = 0;

    // Extract markdown code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]+?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(fullText)) !== null) {
      const language = match[1] || 'unknown';
      const code = match[2].trim();
      
      codeSnippets.push({
        id: `snippet_${snippetId++}`,
        code,
        language: this.normalizeLanguage(language),
        source: 'markdown_block',
        confidence: 0.95
      });
    }

    // Extract inline code and detect language
    if (codeSnippets.length === 0) {
      const detectedCode = this.detectCodeInText(fullText);
      codeSnippets.push(...detectedCode.map(c => ({
        id: `snippet_${snippetId++}`,
        ...c
      })));
    }

    console.log(`[CodeExtractor] Found ${codeSnippets.length} code snippets`);
    return codeSnippets;
  }

  /**
   * Extract code from specific timestamp
   */
  async extractCodeAtTimestamp(transcript, timestamp, windowSize = 30) {
    console.log(`[CodeExtractor] Extracting code at timestamp ${timestamp}s`);
    
    const segments = transcript.segments || [];
    
    // Find segments around the timestamp
    const relevantSegments = segments.filter(seg => 
      seg.start >= timestamp - windowSize && seg.start <= timestamp + windowSize
    );

    if (relevantSegments.length === 0) {
      return { success: false, error: 'No segments found at timestamp' };
    }

    const contextText = relevantSegments.map(s => s.text).join('\n');
    
    // Use AI to extract and clean code
    const extractedCode = await this.extractWithAI(contextText, timestamp);
    
    return extractedCode;
  }

  /**
   * Use AI to extract and format code properly
   */
  async extractWithAI(text, timestamp) {
    const prompt = `You are a code extraction expert. Extract ONLY the code from the following text.

TEXT:
${text}

INSTRUCTIONS:
1. Extract ONLY executable code (no explanations, no comments unless they're in the code)
2. Detect the programming language accurately
3. Format the code with proper indentation and syntax
4. If multiple code snippets exist, extract the main one
5. Return ONLY valid JSON in this exact format:
{
  "code": "the extracted code here",
  "language": "language name (javascript, python, java, etc.)",
  "description": "brief description of what the code does",
  "hasCode": true/false
}

If NO code is found, return: {"hasCode": false, "code": "", "language": "none", "description": "No code found"}`;

    try {
      const response = await providerManager.generate({
        prompt,
        maxTokens: 1500,
        temperature: 0.1,
        provider: 'lmstudio'
      });

      // Parse AI response
      let result;
      try {
        // Remove markdown code fences if present
        let cleanText = response.text.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/```\s*/g, '');
        }
        
        result = JSON.parse(cleanText);
      } catch (parseError) {
        // Fallback: try to detect code manually
        result = this.detectCodeInText(text)[0] || {
          hasCode: false,
          code: '',
          language: 'none',
          description: 'Failed to parse AI response'
        };
      }

      return {
        success: result.hasCode,
        code: result.code,
        language: this.normalizeLanguage(result.language),
        description: result.description,
        timestamp
      };

    } catch (error) {
      console.error('[CodeExtractor] AI extraction failed:', error);
      
      // Fallback to pattern matching
      const detected = this.detectCodeInText(text)[0];
      if (detected) {
        return {
          success: true,
          code: detected.code,
          language: detected.language,
          description: 'Code detected via pattern matching',
          timestamp
        };
      }

      return {
        success: false,
        error: error.message,
        timestamp
      };
    }
  }

  /**
   * Detect code in text using patterns
   */
  detectCodeInText(text) {
    const results = [];

    // Check for each language pattern
    for (const [lang, pattern] of Object.entries(this.languagePatterns)) {
      if (pattern.test(text)) {
        // Extract code-like segments
        const lines = text.split('\n');
        const codeLines = [];
        let inCodeBlock = false;

        for (const line of lines) {
          // Detect code by indentation or syntax
          if (line.match(/^\s{2,}/) || pattern.test(line) || line.includes('{') || line.includes('}')) {
            codeLines.push(line);
            inCodeBlock = true;
          } else if (inCodeBlock && line.trim() === '') {
            codeLines.push(line);
          } else if (inCodeBlock) {
            break;
          }
        }

        if (codeLines.length > 0) {
          results.push({
            code: codeLines.join('\n').trim(),
            language: lang,
            confidence: 0.7,
            source: 'pattern_detection'
          });
        }
      }
    }

    return results;
  }

  /**
   * Normalize language names
   */
  normalizeLanguage(lang) {
    const normalized = lang.toLowerCase().trim();
    
    const languageMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'cpp': 'cpp',
      'c++': 'cpp',
      'cs': 'csharp',
      'c#': 'csharp',
      'rb': 'ruby',
      'sh': 'bash',
      'shell': 'bash',
      'ps1': 'powershell'
    };

    return languageMap[normalized] || normalized;
  }

  /**
   * Format code with proper syntax
   */
  formatCode(code, language) {
    // Basic formatting - remove excessive whitespace, normalize indentation
    const lines = code.split('\n');
    const trimmedLines = lines.map(line => line.trimEnd());
    
    // Remove leading/trailing empty lines
    while (trimmedLines.length > 0 && trimmedLines[0].trim() === '') {
      trimmedLines.shift();
    }
    while (trimmedLines.length > 0 && trimmedLines[trimmedLines.length - 1].trim() === '') {
      trimmedLines.pop();
    }

    return trimmedLines.join('\n');
  }
}

module.exports = new CodeExtractor();
