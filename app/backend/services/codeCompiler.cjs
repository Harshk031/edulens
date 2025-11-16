/**
 * Multi-Language Code Compiler Service
 * Compiles and executes code in various programming languages
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');
const execPromise = util.promisify(exec);

class CodeCompiler {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'edulens-code-execution');
    this.ensureTempDir();

    // Supported languages and their configurations
    this.languages = {
      javascript: {
        extension: '.js',
        compile: null,
        execute: (file) => `node "${file}"`,
        timeout: 5000
      },
      python: {
        extension: '.py',
        compile: null,
        execute: (file) => `python "${file}"`,
        timeout: 5000
      },
      java: {
        extension: '.java',
        compile: (file) => `javac "${file}"`,
        execute: (file) => {
          const className = path.basename(file, '.java');
          const dir = path.dirname(file);
          return `cd "${dir}" && java ${className}`;
        },
        timeout: 10000
      },
      cpp: {
        extension: '.cpp',
        compile: (file) => `g++ "${file}" -o "${file}.exe"`,
        execute: (file) => `"${file}.exe"`,
        timeout: 10000
      },
      c: {
        extension: '.c',
        compile: (file) => `gcc "${file}" -o "${file}.exe"`,
        execute: (file) => `"${file}.exe"`,
        timeout: 10000
      },
      csharp: {
        extension: '.cs',
        compile: (file) => `csc "${file}"`,
        execute: (file) => `"${file.replace('.cs', '.exe')}"`,
        timeout: 10000
      },
      go: {
        extension: '.go',
        compile: null,
        execute: (file) => `go run "${file}"`,
        timeout: 10000
      },
      rust: {
        extension: '.rs',
        compile: (file) => `rustc "${file}" -o "${file}.exe"`,
        execute: (file) => `"${file}.exe"`,
        timeout: 15000
      },
      php: {
        extension: '.php',
        compile: null,
        execute: (file) => `php "${file}"`,
        timeout: 5000
      },
      ruby: {
        extension: '.rb',
        compile: null,
        execute: (file) => `ruby "${file}"`,
        timeout: 5000
      },
      bash: {
        extension: '.sh',
        compile: null,
        execute: (file) => `bash "${file}"`,
        timeout: 5000
      },
      powershell: {
        extension: '.ps1',
        compile: null,
        execute: (file) => `powershell -ExecutionPolicy Bypass -File "${file}"`,
        timeout: 5000
      }
    };
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Compile and execute code
   */
  async compileAndRun(code, language, input = '') {
    console.log(`[CodeCompiler] Compiling and running ${language} code`);
    
    const langConfig = this.languages[language.toLowerCase()];
    
    if (!langConfig) {
      return {
        success: false,
        error: `Unsupported language: ${language}`,
        supportedLanguages: Object.keys(this.languages)
      };
    }

    const sessionId = `code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileName = `${sessionId}${langConfig.extension}`;
    const filePath = path.join(this.tempDir, fileName);

    try {
      // Write code to file
      fs.writeFileSync(filePath, code, 'utf8');
      console.log(`[CodeCompiler] Code written to: ${filePath}`);

      let compileOutput = '';
      let compileError = '';

      // Compile if needed
      if (langConfig.compile) {
        console.log(`[CodeCompiler] Compiling...`);
        const compileCmd = langConfig.compile(filePath);
        
        try {
          const compileResult = await this.executeCommand(compileCmd, langConfig.timeout);
          compileOutput = compileResult.stdout;
          compileError = compileResult.stderr;

          if (compileResult.error) {
            return {
              success: false,
              stage: 'compilation',
              error: compileError || compileResult.error,
              output: compileOutput
            };
          }
        } catch (compileErr) {
          return {
            success: false,
            stage: 'compilation',
            error: compileErr.message,
            output: compileOutput
          };
        }
      }

      // Execute
      console.log(`[CodeCompiler] Executing...`);
      const executeCmd = langConfig.execute(filePath);
      
      try {
        const execResult = await this.executeCommand(executeCmd, langConfig.timeout, input);
        
        // Cleanup
        this.cleanup(filePath, langConfig);

        return {
          success: true,
          output: execResult.stdout,
          error: execResult.stderr,
          exitCode: execResult.code || 0,
          executionTime: execResult.time,
          compileOutput: compileOutput || null
        };

      } catch (execErr) {
        // Cleanup
        this.cleanup(filePath, langConfig);

        return {
          success: false,
          stage: 'execution',
          error: execErr.message,
          output: execErr.stdout || '',
          stderr: execErr.stderr || ''
        };
      }

    } catch (error) {
      // Cleanup on error
      this.cleanup(filePath, langConfig);

      return {
        success: false,
        error: error.message,
        stage: 'setup'
      };
    }
  }

  /**
   * Execute command with timeout
   */
  async executeCommand(command, timeout, input = '') {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const child = exec(command, {
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        cwd: this.tempDir
      }, (error, stdout, stderr) => {
        const executionTime = Date.now() - startTime;

        if (error) {
          if (error.killed) {
            reject({
              error: true,
              message: `Execution timeout (${timeout}ms exceeded)`,
              stdout,
              stderr,
              time: executionTime
            });
          } else {
            reject({
              error: true,
              message: error.message,
              stdout,
              stderr,
              code: error.code,
              time: executionTime
            });
          }
        } else {
          resolve({
            stdout,
            stderr,
            code: 0,
            time: executionTime
          });
        }
      });

      // Send input if provided
      if (input) {
        child.stdin.write(input);
        child.stdin.end();
      }
    });
  }

  /**
   * Cleanup temporary files
   */
  cleanup(filePath, langConfig) {
    try {
      // Remove source file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Remove compiled files
      if (langConfig.compile) {
        const compiledFile = filePath + '.exe';
        if (fs.existsSync(compiledFile)) {
          fs.unlinkSync(compiledFile);
        }

        // For Java, remove .class files
        if (langConfig.extension === '.java') {
          const className = path.basename(filePath, '.java');
          const classFile = path.join(path.dirname(filePath), `${className}.class`);
          if (fs.existsSync(classFile)) {
            fs.unlinkSync(classFile);
          }
        }

        // For C#, remove .exe files
        if (langConfig.extension === '.cs') {
          const exeFile = filePath.replace('.cs', '.exe');
          if (fs.existsSync(exeFile)) {
            fs.unlinkSync(exeFile);
          }
        }
      }
    } catch (cleanupError) {
      console.warn('[CodeCompiler] Cleanup error:', cleanupError.message);
    }
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language) {
    return this.languages.hasOwnProperty(language.toLowerCase());
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages() {
    return Object.keys(this.languages);
  }

  /**
   * Validate code syntax (basic check)
   */
  async validateSyntax(code, language) {
    // For now, just try to compile/parse
    const result = await this.compileAndRun(code, language);
    
    return {
      valid: result.success || result.stage === 'execution',
      errors: result.success ? [] : [result.error],
      warnings: []
    };
  }
}

module.exports = new CodeCompiler();
