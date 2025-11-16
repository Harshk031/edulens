import React from 'react';
import './MainLayout.css';

/**
 * MainLayout - Modern 12-column grid layout
 * Video centered-left (7 cols), RightPanel (5 cols)
 * Responsive: tablet/mobile adapts to single column
 */
export default function MainLayout({ 
  children, 
  videoSection, 
  rightPanel,
  header 
}) {
  return (
    <div className="main-layout" role="main">
      {header && (
        <header className="main-layout-header" role="banner">
          {header}
        </header>
      )}
      
      <div className="main-layout-grid">
        {/* Video Section - Left (7 columns) */}
        <section 
          className="main-layout-video-section" 
          role="region"
          aria-label="Video player area"
        >
          {videoSection}
        </section>

        {/* Right Panel - Controls, Tools, Chat (5 columns) */}
        <aside 
          className="main-layout-right-panel"
          role="complementary"
          aria-label="AI controls and tools panel"
        >
          {rightPanel}
        </aside>
      </div>
    </div>
  );
}

