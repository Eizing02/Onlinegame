"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { AudioControl } from "@/components/audio/audio-control";
export function Modal({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className="game-dialog" aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="dialog-content"><div className="dialog-audio"><AudioControl /></div><button className="dialog-close" aria-label="ปิดหน้าต่าง" onClick={onClose} type="button"><X size={22} /></button>{children}</div></dialog>;
}
