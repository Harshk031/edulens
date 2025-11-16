import React, { useState, useRef, useEffect } from 'react';
import './RichTextEditor.css';

export default function RichTextEditor({ 
  initialContent = '', 
  onSave, 
  onContentChange,
  placeholder = 'Start writing your notes...',
  showToolbar = true 
}) {
  const [content, setContent] = useState(initialContent);
  const [selectedColor, setSelectedColor] = useState('#00CC7A');
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const colors = [
    '#00CC7A', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF'
  ];

  const fonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
    'Courier New', 'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Palatino'
  ];

  useEffect(() => {
    if (onContentChange) {
      onContentChange(content);
    }
  }, [content, onContentChange]);

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
    execCommand('foreColor', color);
    setShowColorPicker(false);
  };

  const handleFontChange = (font) => {
    setSelectedFont(font);
    execCommand('fontName', font);
    setShowFontPicker(false);
  };

  const insertImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = `<img src="${event.target.result}" style="max-width: 100%; height: auto; margin: 10px 0;" alt="Uploaded image" />`;
        execCommand('insertHTML', img);
      };
      reader.readAsDataURL(file);
    }
  };

  const insertBulletPoint = () => {
    execCommand('insertUnorderedList');
  };

  const insertNumberedList = () => {
    execCommand('insertOrderedList');
  };

  const createHeading = (level) => {
    execCommand('formatBlock', `h${level}`);
  };

  const highlightText = () => {
    execCommand('hiliteColor', '#FFFF00');
  };

  const insertTheoryBox = () => {
    const theoryHTML = `
      <div style="
        background: linear-gradient(135deg, rgba(0, 204, 122, 0.1) 0%, rgba(0, 204, 122, 0.05) 100%);
        border-left: 4px solid #00CC7A;
        padding: 15px;
        margin: 10px 0;
        border-radius: 8px;
        font-style: italic;
      ">
        <strong>💡 Theory:</strong> <span contenteditable="true">Enter your theoretical explanation here...</span>
      </div>
    `;
    execCommand('insertHTML', theoryHTML);
  };

  const handleSave = () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    setContent(htmlContent);
    if (onSave) {
      onSave(htmlContent);
    }
  };

  const handleContentUpdate = () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    setContent(htmlContent);
  };

  return (
    <div className="rich-text-editor">
      {showToolbar && (
        <div className="editor-toolbar">
          {/* Text Formatting */}
          <div className="toolbar-group">
            <button 
              className="toolbar-btn" 
              onClick={() => execCommand('bold')}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button 
              className="toolbar-btn" 
              onClick={() => execCommand('italic')}
              title="Italic"
            >
              <em>I</em>
            </button>
            <button 
              className="toolbar-btn" 
              onClick={() => execCommand('underline')}
              title="Underline"
            >
              <u>U</u>
            </button>
            <button 
              className="toolbar-btn" 
              onClick={highlightText}
              title="Highlight"
            >
              🖍️
            </button>
          </div>

          {/* Headings */}
          <div className="toolbar-group">
            <button 
              className="toolbar-btn" 
              onClick={() => createHeading(1)}
              title="Heading 1"
            >
              H1
            </button>
            <button 
              className="toolbar-btn" 
              onClick={() => createHeading(2)}
              title="Heading 2"
            >
              H2
            </button>
            <button 
              className="toolbar-btn" 
              onClick={() => createHeading(3)}
              title="Heading 3"
            >
              H3
            </button>
          </div>

          {/* Lists */}
          <div className="toolbar-group">
            <button 
              className="toolbar-btn" 
              onClick={insertBulletPoint}
              title="Bullet Points"
            >
              • List
            </button>
            <button 
              className="toolbar-btn" 
              onClick={insertNumberedList}
              title="Numbered List"
            >
              1. List
            </button>
          </div>

          {/* Colors & Fonts */}
          <div className="toolbar-group">
            <div className="color-picker-container">
              <button 
                className="toolbar-btn color-btn" 
                onClick={() => setShowColorPicker(!showColorPicker)}
                style={{ backgroundColor: selectedColor }}
                title="Text Color"
              >
                A
              </button>
              {showColorPicker && (
                <div className="color-palette">
                  {colors.map(color => (
                    <button
                      key={color}
                      className="color-option"
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorChange(color)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="font-picker-container">
              <button 
                className="toolbar-btn font-btn" 
                onClick={() => setShowFontPicker(!showFontPicker)}
                title="Font Family"
              >
                {selectedFont}
              </button>
              {showFontPicker && (
                <div className="font-palette">
                  {fonts.map(font => (
                    <button
                      key={font}
                      className="font-option"
                      style={{ fontFamily: font }}
                      onClick={() => handleFontChange(font)}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Special Elements */}
          <div className="toolbar-group">
            <button 
              className="toolbar-btn" 
              onClick={insertImage}
              title="Insert Image"
            >
              🖼️ Img
            </button>
            <button 
              className="toolbar-btn" 
              onClick={insertTheoryBox}
              title="Theory Box"
            >
              💡 Theory
            </button>
          </div>

          {/* Save */}
          <div className="toolbar-group">
            <button 
              className="toolbar-btn save-btn" 
              onClick={handleSave}
              title="Save Notes"
            >
              💾 Save
            </button>
          </div>
        </div>
      )}

      <div 
        ref={editorRef}
        className="editor-content"
        contentEditable
        suppressContentEditableWarning
        onInput={handleContentUpdate}
        onBlur={handleContentUpdate}
        dangerouslySetInnerHTML={{ __html: content }}
        style={{ 
          fontFamily: selectedFont,
          minHeight: '300px',
          padding: '15px',
          border: '1px solid rgba(0, 204, 122, 0.3)',
          borderRadius: '8px',
          background: 'rgba(15, 26, 26, 0.6)',
          color: '#ffffff',
          outline: 'none'
        }}
        data-placeholder={placeholder}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
    </div>
  );
}
