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
    console.log(`🧠 EduLens Hybrid Runtime Active (Electron:${isElectron})`);
  }, [isElectron]);

  return { isElectron };
}
