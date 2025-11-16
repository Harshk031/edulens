import { useMemo, useEffect } from 'react'

export default function useHybridRuntime() {
  const isElectron = useMemo(() => {
    try {
      return !!(window && (window.process?.versions?.electron || navigator.userAgent.includes('Electron') || window.electronAPI));
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    // Log once on mount
    
  }, [isElectron]);

  return { isElectron };
}
