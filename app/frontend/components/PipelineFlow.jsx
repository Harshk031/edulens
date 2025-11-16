import React, { useState } from 'react';
import './PipelineFlow.css';

const PIPELINE_STAGES = [
  { id: 'input', label: 'Input', icon: '📥' },
  { id: 'transcribe', label: 'Transcribe', icon: '🎙️' },
  { id: 'fast-summary', label: 'Fast Summary', icon: '⚡' },
  { id: 'index', label: 'Indexing', icon: '🔍' },
  { id: 'llm', label: 'LLM Ready', icon: '🤖' },
];

export default function PipelineFlow({ jobStatus, onNodeClick }) {
  const [selectedNode, setSelectedNode] = useState(null);

  // Debug logging
  React.useEffect(() => {
    if (jobStatus) {
      console.log('[PipelineFlow] JobStatus updated:', {
        status: jobStatus.status,
        progress: jobStatus.progress,
        stage: jobStatus.stage,
        hasStages: !!jobStatus.stages,
        stages: jobStatus.stages ? Object.keys(jobStatus.stages) : []
      });
    } else {
      console.log('[PipelineFlow] JobStatus is null');
    }
  }, [jobStatus]);

  const getNodeStatus = (stageId) => {
    if (!jobStatus) return 'idle';

    const { status, stages } = jobStatus;

    if (status === 'error') return 'failed';
    if (status === 'done') return 'done';

    if (stages) {
      const map = {
        input: stages.input,
        transcribe: stages.transcribe,
        'fast-summary': stages.fastSummary,
        index: stages.indexing,
        llm: stages.llmReady
      };

      const stageInfo = map[stageId];
      if (stageInfo) {
        if (stageInfo.status === 'done') return 'done';
        if (stageInfo.status === 'processing') return 'running';
        return 'queued';
      }
    }

    // Fallback to legacy stage tracking
    const { stage, progress } = jobStatus;

    const stageMap = {
      'Queued': 'input',
      'Initializing': 'input',
      'Transcribing': 'transcribe',
      'Structuring': 'fast-summary',
      'Indexing': 'index',
      'Context Building': 'index',
      'Ready': 'llm',
    };

    const currentStage = stageMap[stage] || 'input';
    const stageIndex = PIPELINE_STAGES.findIndex(s => s.id === stageId);
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === currentStage);

    if (stageIndex < currentIndex) return 'done';
    if (stageIndex === currentIndex) return progress < 100 ? 'running' : 'done';
    return 'queued';
  };

  const getCurrentStageLabel = () => {
    if (!jobStatus?.stages) return jobStatus?.stage || 'Processing';
    const order = ['input', 'transcribe', 'fastSummary', 'indexing', 'llmReady'];
    for (const key of order) {
      const info = jobStatus.stages[key];
      if (info?.status === 'processing') {
        switch (key) {
          case 'input': return 'Queued';
          case 'transcribe': return 'Transcribing';
          case 'fastSummary': return 'Structuring';
          case 'indexing': return 'Indexing';
          case 'llmReady': return 'Ready';
          default: return 'Processing';
        }
      }
    }
    // CRITICAL FIX: Check for completion status (done, completed, or progress 100)
    return (jobStatus.status === 'done' || jobStatus.status === 'completed' || 
            (jobStatus.progress === 100 && jobStatus.status !== 'processing')) ? 'Complete' : 'Processing';
  };

  const handleNodeClick = (stage) => {
    setSelectedNode(selectedNode?.id === stage.id ? null : stage);
    if (onNodeClick) onNodeClick(stage);
  };

  return (
    <div className="pipeline-flow-container">
      <h3 className="pipeline-title">🔄 Processing Pipeline</h3>
      
      <div className="pipeline-stages">
        {PIPELINE_STAGES.map((stage, index) => {
          const nodeStatus = getNodeStatus(stage.id);
          const isSelected = selectedNode?.id === stage.id;
          
          return (
            <div key={stage.id} className="stage-wrapper">
              <div
                className={`pipeline-node ${nodeStatus} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleNodeClick(stage)}
                role="button"
                tabIndex={0}
                aria-label={`${stage.label} - ${nodeStatus}`}
              >
                <div className="node-icon">{stage.icon}</div>
                <div className="node-label">{stage.label}</div>
                <div className={`status-dot ${nodeStatus}`} />
                
                {nodeStatus === 'running' && (
                  <div className="node-spinner">
                    <div className="spinner-ring"></div>
                  </div>
                )}
              </div>
              
              {index < PIPELINE_STAGES.length - 1 && (
                <div className="connector">
                  <svg className="connector-svg" viewBox="0 0 60 20">
                    <line
                      x1="0"
                      y1="10"
                      x2="60"
                      y2="10"
                      stroke="var(--glass-border)"
                      strokeWidth="2"
                    />
                    {(nodeStatus === 'done' || nodeStatus === 'running') && (
                      <circle
                        className="flow-particle"
                        cx="10"
                        cy="10"
                        r="3"
                        fill="var(--accent-500)"
                      />
                    )}
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedNode && (
        <div className="node-details">
          <h4>{selectedNode.icon} {selectedNode.label}</h4>
          <div className="detail-content">
            <p className="detail-status">
              Status: <span className={`status-badge ${getNodeStatus(selectedNode.id)}`}>
                {getNodeStatus(selectedNode.id)}
              </span>
            </p>
            {jobStatus && (
              <>
                <p className="detail-progress">Progress: {jobStatus.progress}%</p>
                <p className="detail-stage">Stage: {getCurrentStageLabel()}</p>
                {jobStatus.elapsed && (
                  <p className="detail-elapsed">Elapsed: {jobStatus.elapsed}s</p>
                )}
                {jobStatus.error && (
                  <p className="detail-error">Error: {jobStatus.error}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {jobStatus && jobStatus.status !== 'idle' && (
        <div className="pipeline-summary">
          <div className="summary-bar">
            <div 
              className="summary-progress" 
              style={{ width: `${jobStatus.progress}%` }}
            />
          </div>
          <p className="summary-text">
            {getCurrentStageLabel()} • {jobStatus.progress}% 
            {jobStatus.elapsed ? ` • ${jobStatus.elapsed}s` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
