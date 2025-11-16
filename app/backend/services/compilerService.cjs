/**
 * Online Compiler Service
 * Integrates with JDoodle API for code execution
 * Free tier: 200 requests/day, no signup required for basic use
 */

const https = require('https');

// Language mapping for JDoodle API (supports 75+ languages)
const LANGUAGE_MAP = {
  // JavaScript variants
  'javascript': { lang: 'nodejs', versionIndex: '4' },
  'js': { lang: 'nodejs', versionIndex: '4' },
  'node': { lang: 'nodejs', versionIndex: '4' },
  'nodejs': { lang: 'nodejs', versionIndex: '4' },
  
  // Python variants
  'python': { lang: 'python3', versionIndex: '4' },
  'py': { lang: 'python3', versionIndex: '4' },
  'python3': { lang: 'python3', versionIndex: '4' },
  'python2': { lang: 'python2', versionIndex: '3' },
  
  // C/C++ variants
  'c': { lang: 'c', versionIndex: '5' },
  'cpp': { lang: 'cpp17', versionIndex: '1' },
  'c++': { lang: 'cpp17', versionIndex: '1' },
  'cxx': { lang: 'cpp17', versionIndex: '1' },
  'cc': { lang: 'cpp17', versionIndex: '1' },
  
  // Java variants
  'java': { lang: 'java', versionIndex: '4' },
  
  // C# variants
  'csharp': { lang: 'csharp', versionIndex: '4' },
  'cs': { lang: 'csharp', versionIndex: '4' },
  'c#': { lang: 'csharp', versionIndex: '4' },
  
  // Web languages
  'php': { lang: 'php', versionIndex: '4' },
  
  // Modern languages
  'go': { lang: 'go', versionIndex: '4' },
  'golang': { lang: 'go', versionIndex: '4' },
  'rust': { lang: 'rust', versionIndex: '4' },
  'swift': { lang: 'swift', versionIndex: '4' },
  'kotlin': { lang: 'kotlin', versionIndex: '3' },
  
  // Scripting languages
  'ruby': { lang: 'ruby', versionIndex: '4' },
  'rb': { lang: 'ruby', versionIndex: '4' },
  'perl': { lang: 'perl', versionIndex: '4' },
  'r': { lang: 'r', versionIndex: '4' },
  
  // JVM languages
  'scala': { lang: 'scala', versionIndex: '4' },
  'groovy': { lang: 'groovy', versionIndex: '4' },
  'clojure': { lang: 'clojure', versionIndex: '4' },
  
  // Functional languages
  'haskell': { lang: 'haskell', versionIndex: '4' },
  'erlang': { lang: 'erlang', versionIndex: '4' },
  'elixir': { lang: 'elixir', versionIndex: '4' },
  
  // Shell scripting
  'bash': { lang: 'bash', versionIndex: '4' },
  'sh': { lang: 'bash', versionIndex: '4' },
  
  // Assembly
  'assembly': { lang: 'nasm', versionIndex: '4' },
  'asm': { lang: 'nasm', versionIndex: '4' },
  'nasm': { lang: 'nasm', versionIndex: '4' },
  
  // Other languages
  'pascal': { lang: 'pascal', versionIndex: '3' },
  'fortran': { lang: 'fortran', versionIndex: '4' },
  'cobol': { lang: 'cobol', versionIndex: '2' },
  'ada': { lang: 'ada', versionIndex: '4' },
  'lisp': { lang: 'lisp', versionIndex: '4' },
  'prolog': { lang: 'prolog', versionIndex: '4' },
  'lua': { lang: 'lua', versionIndex: '4' },
  'dart': { lang: 'dart', versionIndex: '4' },
  'objc': { lang: 'objc', versionIndex: '4' },
  'objective-c': { lang: 'objc', versionIndex: '4' },
  'vb': { lang: 'vbn', versionIndex: '4' },
  'visualbasic': { lang: 'vbn', versionIndex: '4' },
  'fsharp': { lang: 'fsharp', versionIndex: '4' },
  'f#': { lang: 'fsharp', versionIndex: '4' },
  'ocaml': { lang: 'ocaml', versionIndex: '4' },
  'd': { lang: 'd', versionIndex: '4' },
  'hack': { lang: 'hack', versionIndex: '4' },
  'tcl': { lang: 'tcl', versionIndex: '4' },
  'racket': { lang: 'racket', versionIndex: '4' },
  'scheme': { lang: 'scheme', versionIndex: '4' },
  'smalltalk': { lang: 'smalltalk', versionIndex: '4' },
  'brainfuck': { lang: 'brainfuck', versionIndex: '4' },
  'whitespace': { lang: 'whitespace', versionIndex: '4' },
  'intercal': { lang: 'intercal', versionIndex: '4' },
  'unlambda': { lang: 'unlambda', versionIndex: '4' },
  'piet': { lang: 'piet', versionIndex: '4' },
  
  // Text-based languages (will use playground)
  'text': { lang: 'text', versionIndex: '0' },
  'plaintext': { lang: 'text', versionIndex: '0' },
  'markdown': { lang: 'text', versionIndex: '0' },
  'md': { lang: 'text', versionIndex: '0' }
};

// Fallback to online playgrounds if JDoodle doesn't support the language
const PLAYGROUND_MAP = {
  'html': 'https://jsfiddle.net/',
  'css': 'https://jsfiddle.net/',
  'typescript': 'https://www.typescriptlang.org/play',
  'ts': 'https://www.typescriptlang.org/play',
  'sql': 'https://sqliteonline.com/',
  'bash': 'https://replit.com/languages/bash',
  'shell': 'https://replit.com/languages/bash'
};

/**
 * Execute code using JDoodle API
 */
async function executeCode(code, language) {
  return new Promise((resolve, reject) => {
    const langInfo = LANGUAGE_MAP[language.toLowerCase()];
    
    if (!langInfo) {
      // Check if there's a playground alternative
      const playgroundUrl = PLAYGROUND_MAP[language.toLowerCase()];
      if (playgroundUrl) {
        return resolve({
          success: true,
          output: `This language is not supported for direct execution. Please use this playground: ${playgroundUrl}`,
          playgroundUrl,
          requiresPlayground: true
        });
      }
      
      return reject(new Error(`Language '${language}' is not supported for execution`));
    }

    // Prepare request data
    const requestData = JSON.stringify({
      clientId: process.env.JDOODLE_CLIENT_ID || 'free-tier-client',
      clientSecret: process.env.JDOODLE_CLIENT_SECRET || 'free-tier-secret',
      script: code,
      language: langInfo.lang,
      versionIndex: langInfo.versionIndex
    });

    // Request options
    const options = {
      hostname: 'api.jdoodle.com',
      port: 443,
      path: '/v1/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    console.log(`[Compiler] Executing ${langInfo.lang} code (${code.length} chars)`);

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          
          if (result.error) {
            console.error('[Compiler] Execution error:', result.error);
            return resolve({
              success: false,
              output: result.error,
              error: result.error,
              statusCode: result.statusCode
            });
          }

          console.log('[Compiler] Execution successful');
          resolve({
            success: true,
            output: result.output || '(No output)',
            memory: result.memory,
            cpuTime: result.cpuTime,
            statusCode: result.statusCode
          });
        } catch (err) {
          console.error('[Compiler] Failed to parse response:', err);
          reject(new Error('Failed to parse compiler response'));
        }
      });
    });

    req.on('error', (err) => {
      console.error('[Compiler] Request error:', err);
      reject(err);
    });

    // Set timeout
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Code execution timeout (30 seconds)'));
    });

    req.write(requestData);
    req.end();
  });
}

/**
 * Get playground URL for unsupported languages
 */
function getPlaygroundUrl(language) {
  return PLAYGROUND_MAP[language.toLowerCase()] || null;
}

/**
 * Check if language is supported for direct execution
 */
function isLanguageSupported(language) {
  return !!LANGUAGE_MAP[language.toLowerCase()];
}

/**
 * Get list of supported languages
 */
function getSupportedLanguages() {
  return Object.keys(LANGUAGE_MAP);
}

module.exports = {
  executeCode,
  getPlaygroundUrl,
  isLanguageSupported,
  getSupportedLanguages
};

