import { useState } from 'react';
import './CodeExecutionModal.css';

export default function CodeExecutionModal({ snippet, onClose }) {
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [executionInfo, setExecutionInfo] = useState(null);

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setOutput('Executing code...\n\n');

    try {
      const response = await fetch('/api/ai/execute-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: snippet.code,
          language: snippet.language
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute code');
      }

      const result = await response.json();

      if (result.requiresPlayground) {
        setOutput(`This language requires an external playground.\n\nOpening: ${result.playgroundUrl}\n\nYou can copy your code there and run it.`);
        // Open playground in new tab
        window.open(result.playgroundUrl, '_blank');
      } else if (result.success) {
        setOutput(result.output || '(No output)');
        setExecutionInfo({
          memory: result.memory,
          cpuTime: result.cpuTime,
          statusCode: result.statusCode
        });
      } else {
        setError(result.error || 'Execution failed');
        setOutput(result.output || result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('[CodeExecution] Error:', err);
      setError(err.message);
      setOutput(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="code-execution-modal-overlay" onClick={onClose}>
      <div className="code-execution-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>▶️ Run Code</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Code Info */}
          <div className="code-info">
            <span className="info-item">
              <strong>Language:</strong> {snippet.language}
            </span>
            <span className="info-item">
              <strong>Lines:</strong> {snippet.code.split('\n').length}
            </span>
            <span className="info-item">
              <strong>Timestamp:</strong> {snippet.timestampFormatted}
            </span>
          </div>

          {/* Code Preview */}
          <div className="code-preview-section">
            <h4>Code:</h4>
            <pre className="code-preview-small">
              <code>{snippet.code.substring(0, 500)}{snippet.code.length > 500 ? '...' : ''}</code>
            </pre>
          </div>

          {/* Execute Button */}
          <div className="execute-section">
            <button
              className="btn btn-execute"
              onClick={handleExecute}
              disabled={loading}
            >
              {loading ? '⏳ Executing...' : '▶️ Execute Code'}
            </button>
          </div>

          {/* Output */}
          {(output || error) && (
            <div className="output-section">
              <h4>{error ? '❌ Error Output:' : '✅ Output:'}</h4>
              <pre className={`output-display ${error ? 'error' : ''}`}>
                {output}
              </pre>
              
              {executionInfo && !error && (
                <div className="execution-info">
                  {executionInfo.cpuTime && (
                    <span className="info-badge">⏱️ CPU: {executionInfo.cpuTime}s</span>
                  )}
                  {executionInfo.memory && (
                    <span className="info-badge">💾 Memory: {executionInfo.memory} KB</span>
                  )}
                  {executionInfo.statusCode && (
                    <span className="info-badge">Status: {executionInfo.statusCode}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

