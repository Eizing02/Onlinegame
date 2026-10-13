"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import { useAppAudio } from './audio-provider';

/** Native light-dismiss popover stays interactive inside a modal's top layer. */
export function AudioControl() {
  const audio = useAppAudio(), id = useId();
  const panel = useRef<HTMLDivElement>(null), button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const position = () => {
    const element = panel.current, anchor = button.current;
    if (!element || !anchor) return;
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? innerWidth, height = viewport?.height ?? innerHeight;
    const bounds = anchor.getBoundingClientRect(), panelWidth = Math.min(320, width - 24);
    element.style.width = `${panelWidth}px`;
    element.style.maxHeight = `${height - 24}px`;
    element.style.left = `${Math.max(left + 12, Math.min(bounds.right - panelWidth, left + width - panelWidth - 12))}px`;
    element.style.top = `${Math.max(top + 12, Math.min(bounds.bottom + 8, top + height - element.offsetHeight - 12))}px`;
  };
  const close = () => panel.current?.hidePopover();
  useEffect(() => {
    if (!open) return;
    position();
    window.addEventListener('resize', position); window.visualViewport?.addEventListener('resize', position);
    return () => { window.removeEventListener('resize', position); window.visualViewport?.removeEventListener('resize', position); };
  }, [open]);
  return <div className="audio-control">
    <button ref={button} className="icon-button audio-trigger" type="button" aria-label="ตั้งค่าเสียง" title="ตั้งค่าเสียง" aria-expanded={open} aria-controls={id} onClick={() => {
      audio.engine.unlock();
      panel.current?.togglePopover();
      position();
    }}>{audio.muted || audio.master === 0 ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}</button>
    <div ref={panel} id={id} className="audio-panel" popover="auto" role="dialog" aria-label="ตั้งค่าเสียง" onToggle={event => setOpen(event.newState === 'open')}>
      <div className="audio-panel-heading"><h2>เสียงเกม</h2><button type="button" className="icon-button" onClick={close} aria-label="ปิดหน้าต่างเสียง"><X size={18} aria-hidden="true" /></button></div>
      <button type="button" className="audio-mute" aria-pressed={audio.muted} onClick={() => audio.engine.setPreferences({ muted: !audio.muted })}>
        {audio.muted ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}{audio.muted ? 'เปิดเสียงเกม' : 'ปิดเสียงเกม'}
      </button>
      {([['master', 'เสียงรวม', 'ระดับเสียงรวม'], ['music', 'เพลงและวิดีโอ', 'ระดับเพลงพื้นหลัง'], ['sfx', 'เอฟเฟกต์', 'ระดับเสียงเอฟเฟกต์']] as const).map(([key, label, name]) => <label className="audio-level" key={key}>
        <span>{label}<output>{Math.round(audio[key] * 100)}%</output></span>
        <input aria-label={name} type="range" min="0" max="1" step="0.05" value={audio[key]} onChange={event => audio.engine.setPreferences({ [key]: Number(event.target.value) })} />
      </label>)}
      {!audio.muted && audio.blocked && <p className="audio-status" role="status">แตะลำโพงอีกครั้งเพื่อเริ่มเสียง เครื่องนี้อาจรอให้คุณแตะก่อน</p>}
    </div>
  </div>;
}
