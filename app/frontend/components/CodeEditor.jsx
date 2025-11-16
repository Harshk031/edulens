import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CodeExecutionModal from './CodeExecutionModal';
import './CodeEditor.css';

export default function CodeEditor({ snippet, onUpdate, onDelete, onRun }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(snippet.code);
  const [editedDescription, setEditedDescription] = useState(snippet.description);
  const [userComments, setUserComments] = useState(snippet.comments || []);
  const [newComment, setNewComment] = useState('');
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExecutionModal, setShowExecutionModal] = useState(false);

  const handleSave = () => {
    onUpdate({
      ...snippet,
      code: editedCode,
      description: editedDescription,
      comments: userComments,
      updatedAt: new Date().toISOString()
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedCode(snippet.code);
    setEditedDescription(snippet.description);
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: Date.now(),
        text: newComment,
        createdAt: new Date().toISOString()
      };
      const updatedComments = [...userComments, comment];
      setUserComments(updatedComments);
      onUpdate({
        ...snippet,
        comments: updatedComments
      });
      setNewComment('');
    }
  };

  const handleDeleteComment = (commentId) => {
    const updatedComments = userComments.filter(c => c.id !== commentId);
    setUserComments(updatedComments);
    onUpdate({
      ...snippet,
      comments: updatedComments
    });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`code-editor-card ${isExpanded ? 'expanded' : ''}`}>
      {/* Header */}
      <div className="code-editor-header">
        <div className="header-left">
          <button 
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '🔽' : '▶️'}
          </button>
          <span className="timestamp-badge">🕒 {snippet.timestampFormatted}</span>
          <span className={`language-badge lang-${snippet.language}`}>
            {snippet.language.toUpperCase()}
          </span>
        </div>
        <div className="header-right">
          <button 
            className="btn-icon" 
            onClick={handleCopy}
            title="Copy code"
          >
            {copied ? '✅' : '📋'}
          </button>
          <button 
            className="btn-icon" 
            onClick={() => setIsEditing(!isEditing)}
            title={isEditing ? 'Cancel editing' : 'Edit code'}
          >
            {isEditing ? '❌' : '✏️'}
          </button>
          <button 
            className="btn-icon btn-run" 
            onClick={() => setShowExecutionModal(true)}
            title="Run code online"
          >
            ▶️
          </button>
          <button 
            className="btn-icon btn-delete" 
            onClick={() => onDelete(snippet.id)}
            title="Delete snippet"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Description */}
      {isEditing ? (
        <input
          type="text"
          className="description-input"
          value={editedDescription}
          onChange={(e) => setEditedDescription(e.target.value)}
          placeholder="Description..."
        />
      ) : (
        <div className="snippet-description">{snippet.description}</div>
      )}

      {/* Code Display/Editor */}
      {isEditing ? (
        <div className="code-edit-section">
          <textarea
            className="code-textarea"
            value={editedCode}
            onChange={(e) => setEditedCode(e.target.value)}
            rows={Math.min(20, editedCode.split('\n').length + 2)}
            spellCheck={false}
          />
          <div className="edit-actions">
            <button className="btn btn-success" onClick={handleSave}>
              💾 Save Changes
            </button>
            <button className="btn btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="code-display">
          <SyntaxHighlighter
            language={snippet.language}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderRadius: '8px',
              fontSize: '0.9rem',
              maxHeight: isExpanded ? 'none' : '300px',
              overflow: isExpanded ? 'visible' : 'auto'
            }}
            showLineNumbers={true}
            wrapLines={true}
          >
            {snippet.code}
          </SyntaxHighlighter>
        </div>
      )}

      {/* Comments Section */}
      {isExpanded && (
        <div className="comments-section">
          <h4>💬 Comments & Notes</h4>
          
          {/* Add Comment */}
          <div className="add-comment">
            <input
              type="text"
              className="comment-input"
              placeholder="Add a comment or note..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            />
            <button className="btn btn-sm" onClick={handleAddComment}>
              Add
            </button>
          </div>

          {/* Comments List */}
          {userComments.length > 0 ? (
            <div className="comments-list">
              {userComments.map(comment => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-text">{comment.text}</div>
                  <div className="comment-meta">
                    <span className="comment-time">{formatTime(comment.createdAt)}</span>
                    <button 
                      className="comment-delete"
                      onClick={() => handleDeleteComment(comment.id)}
                      title="Delete comment"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-comments">No comments yet</div>
          )}
        </div>
      )}

      {/* Metadata Footer */}
      {isExpanded && (
        <div className="snippet-footer">
          <span className="meta-item">Created: {formatTime(snippet.createdAt)}</span>
          {snippet.updatedAt && snippet.updatedAt !== snippet.createdAt && (
            <span className="meta-item">Updated: {formatTime(snippet.updatedAt)}</span>
          )}
        </div>
      )}

      {/* Code Execution Modal */}
      {showExecutionModal && (
        <CodeExecutionModal
          snippet={snippet}
          onClose={() => setShowExecutionModal(false)}
        />
      )}
    </div>
  );
}

