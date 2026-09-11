"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Gamepad2, UsersRound, Trophy, type LucideIcon } from "lucide-react";
import { useExperience } from "./experience";

type RoomTab = { label: string; content: ReactNode; icon?: LucideIcon };

/** Panels stay mounted: navigating never discards an answer draft or subscription. */
export function RoomTabs({ header, tabs, resetKey = "room", defaultIndex = 0 }: { header: ReactNode; tabs: RoomTab[]; resetKey?: string; defaultIndex?: number }) {
  const id = useId();
  const [selection, setSelection] = useState({ key: resetKey, index: defaultIndex, direction: 1 });
  const active = selection.key === resetKey ? selection.index : defaultIndex;
  const root = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number; time: number } | null>(null);
  const { mode } = useExperience();
  const icons = [Gamepad2, UsersRound, Trophy];
  function select(index: number, focus = false) {
    if (index < 0 || index >= tabs.length) return;
    setSelection({ key: resetKey, index, direction: index >= active ? 1 : -1 });
    if (focus) root.current?.querySelector<HTMLButtonElement>(`[data-tab-index="${index}"]`)?.focus();
  }
  useEffect(() => {
    const shell = root.current?.closest<HTMLElement>(".room-app");
    if (!shell) return;
    const viewport = window.visualViewport;
    const sync = () => {
      // Do not resize the application around pinch zoom.
      if (viewport && viewport.scale > 1.05) return;
      const height = viewport?.height ?? innerHeight;
      shell.style.setProperty("--room-height", `${height}px`);
      shell.style.setProperty("--room-top", `${viewport?.offsetTop ?? 0}px`);
      const editing = document.activeElement?.matches("input, textarea, [contenteditable=true]");
      shell.dataset.keyboard = String(Boolean(editing && innerHeight - height > 120));
    };
    sync(); viewport?.addEventListener("resize", sync); viewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync); document.addEventListener("focusin", sync); document.addEventListener("focusout", sync);
    return () => {
      viewport?.removeEventListener("resize", sync); viewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync); document.removeEventListener("focusin", sync); document.removeEventListener("focusout", sync);
      shell.style.removeProperty("--room-height"); shell.style.removeProperty("--room-top"); delete shell.dataset.keyboard;
    };
  }, []);
  useEffect(() => {
    const panel = root.current?.querySelector<HTMLElement>(".room-tab-panel:not([hidden])");
    if (!panel || mode === "reduced") return;
    const animation = panel.animate([{ transform: `translateX(${selection.direction * 28}px)`, opacity: .65 }, { transform: "translateX(0)", opacity: 1 }], { duration: 260, easing: "cubic-bezier(.16,1,.3,1)" });
    return () => animation.cancel();
  }, [active, resetKey, selection.direction, mode]);
  return <div className="room-tabs" ref={root}>
    <div className="room-topbar">{header}</div>
    <div className="room-tablist" role="tablist" aria-label="หน้าภายในห้อง">
      {tabs.map((tab, index) => {
        const Icon = tab.icon ?? icons[index % icons.length];
        return <button key={tab.label} id={`${id}-tab-${index}`} data-tab-index={index} role="tab" aria-selected={active === index} aria-controls={`${id}-panel-${index}`} tabIndex={active === index ? 0 : -1} onClick={() => select(index)} onKeyDown={event => {
          const target = event.key === "ArrowRight" ? (active + 1) % tabs.length : event.key === "ArrowLeft" ? (active + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
          if (target !== null) { event.preventDefault(); select(target, true); }
        }}><Icon size={20} aria-hidden="true" /><span>{tab.label}</span></button>;
      })}
    </div>
    <div className="room-panels" onTouchStart={event => {
      if (event.touches.length !== 1 || (event.target as HTMLElement).closest("input, textarea, button, a, select, dialog, [data-no-swipe]")) { touch.current = null; return; }
      touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY, time: Date.now() };
    }} onTouchCancel={() => { touch.current = null; }} onTouchEnd={event => {
      const start = touch.current; touch.current = null;
      if (!start || event.changedTouches.length !== 1) return;
      const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.7 && Date.now() - start.time < 650) select(active + (dx < 0 ? 1 : -1));
    }}>
      {tabs.map((tab, index) => <section key={tab.label} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} tabIndex={0} hidden={active !== index} className="room-tab-panel">{tab.content}</section>)}
    </div>
  </div>;
}
