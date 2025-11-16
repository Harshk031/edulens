import { useState, useRef, useEffect } from 'react';
import VideoSnapshotTool from './VideoSnapshotTool';
import './RichNotesEditor.css';

export default function RichNotesEditor({ videoId, onClose }) {
  const [content, setContent] = useState('');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentStyle, setCurrentStyle] = useState('normal');
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#ff3b30' },
    { name: 'Blue', value: '#007aff' },
    { name: 'Green', value: '#34c759' },
    { name: 'Yellow', value: '#ffcc00' },
    { name: 'Purple', value: '#af52de' },
    { name: 'Orange', value: '#ff9500' },
  ];

  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertHeading = (level) => {
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);
    const heading = document.createElement(`h${level}`);
    heading.textContent = 'Heading ' + level;
    heading.style.color = currentColor;
    range.insertNode(heading);
    range.collapse(false);
    editorRef.current?.focus();
  };

  const insertBullet = () => {
    applyFormat('insertUnorderedList');
  };

  const insertImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      insertImageFromDataURL(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const insertImageFromDataURL = (dataURL, timestamp = null) => {
    const img = document.createElement('img');
    img.src = dataURL;
    img.style.maxWidth = '100%';
    img.style.borderRadius = '8px';
    img.style.margin = '10px 0';
    img.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    
    // Add timestamp caption if provided
    const container = document.createElement('div');
    container.style.margin = '10px 0';
    container.appendChild(img);
    
    if (timestamp) {
      const caption = document.createElement('p');
      caption.textContent = `📸 Captured at ${timestamp}`;
      caption.style.fontSize = '12px';
      caption.style.color = '#888';
      caption.style.margin = '5px 0';
      caption.style.fontStyle = 'italic';
      container.appendChild(caption);
    }
    
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.insertNode(container);
      range.collapse(false);
    } else {
      editorRef.current?.appendChild(container);
    }
    editorRef.current?.focus();
  };

  // Listen for video capture events
  useEffect(() => {
    const handleVideoCapture = (event) => {
      const { dataURL, timestamp } = event.detail;
      if (dataURL) {
        insertImageFromDataURL(dataURL, timestamp);
        
        // Show notification
        const notification = document.createElement('div');
        notification.className = 'notes-capture-notification';
        notification.innerHTML = `
          <span style="font-size: 20px">✅</span>
          <span>Screenshot added to notes!</span>
        `;
        notification.style.cssText = `
          position: fixed;
          top: 80px;
          right: 20px;
          padding: 12px 20px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95));
          border: 1px solid rgba(16, 185, 129, 0.8);
          border-radius: 12px;
          color: white;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
          z-index: 9999;
          transition: opacity 0.3s ease;
          backdrop-filter: blur(10px);
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.style.opacity = '0';
          setTimeout(() => notification.remove(), 300);
        }, 2000);
      }
    };
    
    window.addEventListener('video:captured', handleVideoCapture);
    return () => window.removeEventListener('video:captured', handleVideoCapture);
  }, []);

  const highlightText = () => {
    applyFormat('hiliteColor', '#ffeb3b');
  };

  const changeTextColor = (color) => {
    setCurrentColor(color);
    applyFormat('foreColor', color);
  };

  // Get current video time from YouTube iframe
  useEffect(() => {
    const updateVideoTime = () => {
      try {
        const iframe = document.querySelector('iframe[src*="youtube.com"]');
        if (iframe && iframe.contentWindow) {
          // YouTube API would be needed for accurate time
          // For now, we'll update every second as fallback
          setCurrentVideoTime(prev => prev + 1);
        }
      } catch (e) {
        // CORS restriction
      }
    };

    const interval = setInterval(updateVideoTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle insertions from VideoSnapshotTool
  const handleVideoInsert = (item) => {
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);

    if (item.type === 'timestamp') {
      // Insert timestamp link
      const timestampSpan = document.createElement('span');
      timestampSpan.className = 'timestamp-link';
      timestampSpan.textContent = `⏱️ ${item.timestampFormatted}`;
      timestampSpan.style.cssText = 'background: rgba(102, 126, 234, 0.2); color: #667eea; padding: 2px 8px; border-radius: 4px; margin: 0 4px; cursor: pointer; font-weight: 600;';
      timestampSpan.onclick = () => console.log(`Jump to ${item.timestampFormatted}`);
      range.insertNode(timestampSpan);
      range.collapse(false);
    } else if (item.type === 'screenshot') {
      // Insert screenshot with timestamp caption
      const container = document.createElement('div');
      container.style.cssText = 'margin: 16px 0; border: 2px solid rgba(102, 126, 234, 0.3); border-radius: 8px; padding: 8px; background: rgba(0, 0, 0, 0.2);';
      
      const img = document.createElement('img');
      img.src = item.url;
      img.style.cssText = 'width: 100%; border-radius: 6px; margin-bottom: 8px;';
      
      const caption = document.createElement('div');
      caption.textContent = `📍 Captured at ${item.timestampFormatted}`;
      caption.style.cssText = 'color: rgba(255, 255, 255, 0.7); font-size: 0.85rem; text-align: center;';
      
      container.appendChild(img);
      container.appendChild(caption);
      range.insertNode(container);
      range.collapse(false);
    } else if (item.type === 'extracted-text') {
      // Insert extracted text with source note
      const textContainer = document.createElement('div');
      textContainer.style.cssText = 'margin: 12px 0; padding: 12px; background: rgba(0, 224, 138, 0.1); border-left: 3px solid #00e08a; border-radius: 4px;';
      
      const sourceLabel = document.createElement('div');
      sourceLabel.textContent = `🔍 Extracted from ${item.timestampFormatted}`;
      sourceLabel.style.cssText = 'color: #00e08a; font-size: 0.8rem; margin-bottom: 6px; font-weight: 600;';
      
      const textContent = document.createElement('div');
      textContent.textContent = item.text;
      textContent.style.cssText = 'color: rgba(255, 255, 255, 0.9);';
      
      textContainer.appendChild(sourceLabel);
      textContainer.appendChild(textContent);
      range.insertNode(textContainer);
      range.collapse(false);
    }

    editorRef.current?.focus();
  };

  const saveNotes = () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `edulens-notes-${videoId}-${timestamp}.html`;

    const htmlDoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>EduLens Notes - ${videoId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1, h2, h3 { margin-top: 24px; margin-bottom: 12px; }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; }
    ul { padding-left: 24px; }
    .highlight { background-color: #ffeb3b; padding: 2px 4px; }
  </style>
</head>
<body>
  <h1>📝 EduLens Notes</h1>
  <p><strong>Video ID:</strong> ${videoId}</p>
  <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
  <hr>
  ${htmlContent}
</body>
</html>
    `.trim();

    const blob = new Blob([htmlDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = () => {
    // Simple HTML to Markdown converter
    let text = editorRef.current?.innerText || '';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `edulens-notes-${videoId}-${timestamp}.md`;

    const markdown = `# EduLens Notes

**Video ID:** ${videoId}
**Date:** ${new Date().toLocaleString()}

---

${text}
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="notes-editor-overlay">
      <div className="notes-editor-container">
        <div className="notes-header">
          <h2>📝 Rich Notes Editor</h2>
          <button className="notes-close" onClick={onClose}>✕</button>
        </div>

        {/* Video Tools Section */}
        <VideoSnapshotTool 
          onInsert={handleVideoInsert}
          currentTime={currentVideoTime}
        />

        <div className="notes-toolbar">
          <div className="toolbar-group">
            <button onClick={() => insertHeading(1)} title="Heading 1" className="toolbar-btn">
              H1
            </button>
            <button onClick={() => insertHeading(2)} title="Heading 2" className="toolbar-btn">
              H2
            </button>
            <button onClick={() => insertHeading(3)} title="Heading 3" className="toolbar-btn">
              H3
            </button>
          </div>

          <div className="toolbar-divider"></div>

          <div className="toolbar-group">
            <button onClick={() => applyFormat('bold')} title="Bold" className="toolbar-btn">
              <strong>B</strong>
            </button>
            <button onClick={() => applyFormat('italic')} title="Italic" className="toolbar-btn">
              <em>I</em>
            </button>
            <button onClick={() => applyFormat('underline')} title="Underline" className="toolbar-btn">
              <u>U</u>
            </button>
            <button onClick={() => applyFormat('strikeThrough')} title="Strikethrough" className="toolbar-btn">
              <s>S</s>
            </button>
          </div>

          <div className="toolbar-divider"></div>

          <div className="toolbar-group">
            <button onClick={insertBullet} title="Bullet List" className="toolbar-btn">
              • List
            </button>
            <button onClick={highlightText} title="Highlight" className="toolbar-btn highlight-btn">
              🖍️
            </button>
          </div>

          <div className="toolbar-divider"></div>

          <div className="toolbar-group color-picker-group">
            <span className="toolbar-label">Color:</span>
            {colors.map(color => (
              <button
                key={color.value}
                onClick={() => changeTextColor(color.value)}
                className={`color-btn ${currentColor === color.value ? 'active' : ''}`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>

          <div className="toolbar-divider"></div>

          <div className="toolbar-group">
            <button onClick={() => fileInputRef.current?.click()} title="Insert Image" className="toolbar-btn">
              🖼️ Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={insertImage}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <div
          ref={editorRef}
          className="notes-editor-content"
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => setContent(e.currentTarget.innerHTML)}
          placeholder="Start typing your notes..."
        />

        <div className="notes-footer">
          <button className="save-btn" onClick={saveNotes}>
            💾 Save as HTML
          </button>
          <button className="export-btn" onClick={exportMarkdown}>
            📄 Export as Markdown
          </button>
        </div>
      </div>
    </div>
  );
}
