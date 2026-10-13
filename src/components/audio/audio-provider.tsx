"use client";
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { AppAudioEngine, DEFAULT_AUDIO } from './audio-engine';

const AudioContext = createContext<AppAudioEngine | null>(null);
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [engine] = useState(() => new AppAudioEngine());
  useEffect(() => {
    engine.hydrate();
    engine.setHidden(document.hidden);
    const gesture = (event: Event) => { if (event.isTrusted) engine.unlock(); };
    const visibility = () => engine.setHidden(document.hidden);
    document.addEventListener('pointerdown', gesture, true);
    document.addEventListener('keydown', gesture, true);
    document.addEventListener('visibilitychange', visibility);
    const leave = () => engine.setHidden(true), enter = () => engine.setHidden(document.hidden);
    window.addEventListener('pagehide', leave); window.addEventListener('pageshow', enter);
    return () => {
      document.removeEventListener('pointerdown', gesture, true); document.removeEventListener('keydown', gesture, true);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', leave); window.removeEventListener('pageshow', enter);
      engine.setHidden(true);
    };
  }, [engine]);
  return <AudioContext.Provider value={engine}>{children}</AudioContext.Provider>;
}
export function useAppAudio() {
  const engine = useContext(AudioContext);
  if (!engine) throw new Error('AudioProvider is required');
  const settings = useSyncExternalStore(engine.subscribe, engine.getSnapshot, () => DEFAULT_AUDIO);
  return { engine, ...settings };
}
export function useBackgroundMusic(src: string | null) {
  const { engine } = useAppAudio();
  useEffect(() => { const owner = {}; engine.claimMusic(owner, src); return () => engine.release(owner); }, [engine, src]);
}
