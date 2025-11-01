import { useEffect } from "react";

export const useClipboardListener = (onYouTubeLink) => {
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        let text = '';
        if (window?.electronAPI?.readClipboard) {
          text = window.electronAPI.readClipboard();
        } else if (navigator.clipboard?.readText) {
          text = await navigator.clipboard.readText();
        }
        if (text && /(youtube\.com|youtu\.be)/i.test(text)) {
          onYouTubeLink(text);
        }
      } catch {}
    };
    const interval = setInterval(checkClipboard, 2000);

    // Also subscribe to main-process clipboard notifications when available
    const off = window?.electronAPI?.onVideoCopied?.((id) => {
      try { if (id) onYouTubeLink(`https://www.youtube.com/watch?v=${id}`); } catch {}
    });

    return () => {
      clearInterval(interval);
      // no explicit remove needed; handler is lightweight
    };
  }, [onYouTubeLink]);
};
