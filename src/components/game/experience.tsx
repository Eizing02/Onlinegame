"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
export type EffectsMode = "full" | "reduced";
const ExperienceContext = createContext<{ mode: EffectsMode; visible: boolean }>({ mode: "full", visible: true });
export function useExperience() { return useContext(ExperienceContext); }
export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [systemReduced, setSystemReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setSystemReduced(preference.matches); setVisible(!document.hidden); };
    sync(); preference.addEventListener("change", sync); document.addEventListener("visibilitychange", sync);
    return () => { preference.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);
  const mode = systemReduced ? "reduced" : "full";
  useEffect(() => { document.documentElement.dataset.effects = mode; document.documentElement.dataset.visible = String(visible); }, [mode, visible]);
  return <ExperienceContext.Provider value={{ mode, visible }}>{children}</ExperienceContext.Provider>;
}
export function SpaceBackground() {
  return <div className="space-background" aria-hidden="true"><div className="space-stars space-stars-far" /><div className="space-stars space-stars-near" /><div className="space-orbit" /></div>;
}
