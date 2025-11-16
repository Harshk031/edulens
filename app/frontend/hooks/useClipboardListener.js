import { useEffect, useRef } from "react";

export const useClipboardListener = (onYouTubeLink) => {
  const lastClipboardValue = useRef('');
  const lastYouTubeLink = useRef('');

  useEffect(() => {
    console.log('[Clipboard] Hook mounted; electronAPI:', !!window?.electronAPI);
    
    const checkClipboard = async () => {
      try {
        let text = '';
        
        // Try Electron clipboard first (more reliable)
        if (window?.electronAPI?.readClipboard && typeof window.electronAPI.readClipboard === 'function') {
          try {
            text = await window.electronAPI.readClipboard();
            console.log('[Clipboard] Electron read:', text ? `${text.substring(0, 50)}...` : 'empty');
          } catch (clipboardErr) {
            console.warn('[Clipboard] Electron read failed:', clipboardErr.message);
            text = '';
          }
        } else if (navigator.clipboard?.readText) {
          // Fallback to browser clipboard API
          try {
            if (document.hasFocus()) {
              text = await navigator.clipboard.readText();
              console.log('[Clipboard] Browser read:', text ? `${text.substring(0, 50)}...` : 'empty');
            }
          } catch (browserErr) {
            // Silently handle permission errors
            if (!browserErr.message?.includes('not focused') && 
                !browserErr.message?.includes('Document is not focused') &&
                !browserErr.message?.includes('permission')) {
              console.warn('[Clipboard] Browser read failed:', browserErr.message);
            }
          }
        }
        
        text = (text || '').trim();
        
        // Check if it's a YouTube link first (even if value hasn't changed, check if we haven't processed it)
        if (text) {
          const youtubeMatch = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i) ||
                               text.match(/youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/i);
          
          if (youtubeMatch) {
            // Extract full URL or construct it
            let youtubeUrl = text;
            // Normalize URL - remove query params for comparison
            const normalizedUrl = youtubeUrl.split('?')[0].split('&')[0];
            
            // If it's just a video ID, construct the URL
            if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
              youtubeUrl = `https://www.youtube.com/watch?v=${youtubeMatch[1]}`;
            }
            
            // Only trigger if it's a different YouTube link (compare normalized URLs)
            const normalizedLast = lastYouTubeLink.current ? lastYouTubeLink.current.split('?')[0].split('&')[0] : '';
            
            if (normalizedUrl !== normalizedLast) {
              lastYouTubeLink.current = youtubeUrl;
              lastClipboardValue.current = text; // Update last clipboard value
              console.log('[Clipboard] ✅ YouTube link detected:', youtubeUrl);
              console.log('[Clipboard] Calling onYouTubeLink callback...');
              try {
                onYouTubeLink(youtubeUrl);
                console.log('[Clipboard] ✅ onYouTubeLink callback executed');
              } catch (callbackError) {
                console.error('[Clipboard] ❌ Error in onYouTubeLink callback:', callbackError);
              }
            } else {
              // Same link, but update clipboard value to prevent re-triggering
              if (text !== lastClipboardValue.current) {
                lastClipboardValue.current = text;
              }
            }
          } else {
            // Not a YouTube link, just update the clipboard value
            if (text !== lastClipboardValue.current) {
              lastClipboardValue.current = text;
            }
          }
        }
      } catch (e) {
        // Only log unexpected errors
        if (e?.message && 
            !e.message.includes('not focused') && 
            !e.message.includes('Document is not focused') &&
            !e.message.includes('permission')) {
          console.warn('[Clipboard] Unexpected error:', e?.message);
        }
      }
    };
    
    // Check immediately on mount
    checkClipboard();
    
    // Poll clipboard every 500ms for changes
    const interval = setInterval(checkClipboard, 500);

    // Also listen for clipboard change events from Electron main process (if available)
    let off = null;
    if (window?.electronAPI?.on && typeof window.electronAPI.on === 'function') {
      try {
        // Listen for clipboard-youtube-link events from main process
        window.electronAPI.on('clipboard-youtube-link', (event, link) => {
          try {
            if (link && /(youtube\.com|youtu\.be)/i.test(link) && link !== lastYouTubeLink.current) {
              lastYouTubeLink.current = link;
              console.log('[Clipboard] ✅ YouTube link from Electron main process:', link);
              onYouTubeLink(link);
            }
          } catch (e) {
            console.warn('[Clipboard] Electron event handler failed:', e?.message);
          }
        });
        
        // Store cleanup function
        off = () => {
          try {
            if (window?.electronAPI?.off && typeof window.electronAPI.off === 'function') {
              window.electronAPI.off('clipboard-youtube-link', () => {});
            }
          } catch (e) {
            console.warn('[Clipboard] Cleanup failed:', e?.message);
          }
        };
      } catch (e) {
        console.warn('[Clipboard] Failed to register Electron event listener:', e?.message);
      }
    }

    return () => {
      clearInterval(interval);
      if (typeof off === 'function') {
        try {
          off();
        } catch (e) {
          console.warn('[Clipboard] Cleanup failed:', e?.message);
        }
      }
    };
  }, [onYouTubeLink]);
};
