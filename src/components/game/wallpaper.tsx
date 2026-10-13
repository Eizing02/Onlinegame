"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAppAudio, useBackgroundMusic } from '../audio/audio-provider';

type Device = 'phone' | 'tablet' | 'pc';
const base = '/assets/wallpaper';
let touchDevice: Device | null = null;
function device(): Device {
  if (touchDevice) return touchDevice;
  const shortSide = Math.min(screen.width, screen.height);
  const coarse = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 && shortSide < 600;
  // A phone stays a phone when its keyboard opens or it rotates to landscape.
  if (coarse) {
    touchDevice ??= shortSide < 600 ? 'phone' : shortSide <= 1024 ? 'tablet' : 'pc';
    return touchDevice;
  }
  if (innerWidth < 600) return 'phone';
  if (innerWidth < 1100) return 'tablet';
  return 'pc';
}
function subscribe(listener: () => void) {
  window.addEventListener('resize', listener);
  return () => window.removeEventListener('resize', listener);
}
export function Wallpaper({ login = false }: { login?: boolean }) {
  const kind = useSyncExternalStore(subscribe, device, () => null);
  return <div className={`page-wallpaper ${login ? 'login-wallpaper' : 'join-wallpaper'}`} aria-hidden="true" data-device={kind}>
    {kind && (login ? <LoginVideo key={kind === 'phone' ? 'phone' : 'wide'} device={kind} /> :
      // Original PNGs are intentional here: the user's room-entry artwork.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`${base}/${kind}.png`} alt="" width={kind === 'phone' ? 941 : kind === 'tablet' ? 1448 : 1672} height={kind === 'phone' ? 1672 : kind === 'tablet' ? 1086 : 941} decoding="async" />)}
    {!login && <JoinMusic />}
  </div>;
}
function JoinMusic() { useBackgroundMusic('/assets/audio/bg-sci-fi.wav'); return null; }
function LoginVideo({ device }: { device: Device }) {
  const video = useRef<HTMLVideoElement>(null), { engine } = useAppAudio();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = video.current;
    if (!element || failed) return;
    const owner = {};
    return engine.claimVideo(owner, element);
  }, [engine, failed]);
  const poster = `${base}/${device}.webp`;
  if (failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={poster} alt="" />;
  }
  return <video ref={video} src={`${base}/login-${device === 'phone' ? 'phone' : 'wide'}.mp4`} poster={poster} loop playsInline preload="metadata" tabIndex={-1} disablePictureInPicture onError={() => setFailed(true)} />;
}
