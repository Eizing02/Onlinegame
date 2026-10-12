"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Flag, Sparkles } from "lucide-react";
import { useExperience } from "./experience";

function Fireworks() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { mode, visible } = useExperience();
  useEffect(() => {
    const element = canvas.current;
    if (!element || mode === "reduced" || !visible) return;
    const ctx = element.getContext("2d"); if (!ctx) return;
    const width = innerWidth, height = innerHeight;
    const dpr = Math.min(devicePixelRatio, 1.5);
    element.width = width * dpr; element.height = height * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#E5D3AF", "#AEC4D4", "#790D16", "#D0A04A", "#F5EFE1"];
    const perBurst = width < 600 ? 32 : 58;
    const particles = Array.from({length: perBurst * 6}, (_, i) => {
      const burst = Math.floor(i / perBurst), angle = (i % perBurst) / perBurst * Math.PI * 2;
      return { burst, angle, speed: 70 + (i * 37 % 90), color: colors[i % colors.length], size: 2 + i % 3 };
    });
    let frame = 0; const started = performance.now();
    function draw(now: number) {
      const elapsed = (now - started) / 1000;
      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) {
        const age = elapsed - p.burst * .32 - .5;
        const x = width * (.12 + (p.burst % 3) * .38), y = height * (.22 + (p.burst % 2) * .2);
        if (age < 0 && age > -.4) {
          ctx!.globalAlpha = .7; ctx!.fillStyle = p.color;
          if (p.angle === 0) ctx!.fillRect(x, height - (height - y) * (1 + age / .4), 3, 15);
        }
        if (age < 0 || age > 2) continue;
        ctx!.globalAlpha = Math.max(0, 1 - age / 2);
        ctx!.fillStyle = p.color;
        const px = x + Math.cos(p.angle) * p.speed * age, py = y + Math.sin(p.angle) * p.speed * age + 40 * age * age;
        ctx!.save(); ctx!.translate(px, py); ctx!.rotate(p.angle + age * 2);
        ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6); ctx!.restore();
      }
      if (elapsed < 4.2) frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); ctx.clearRect(0, 0, width, height); };
  }, [mode, visible]);
  return <canvas className="reveal-fireworks" ref={canvas} aria-hidden="true" />;
}

export function RevealMoment({ eventKey, correct, title, detail }: {eventKey: string | null; correct: boolean; title: string; detail: string}) {
  const previous = useRef(eventKey);
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (previous.current === eventKey) return;
    previous.current = eventKey;
    const open = window.setTimeout(() => setActive(Boolean(eventKey)), 0);
    const close = window.setTimeout(() => setActive(false), 4500);
    return () => { clearTimeout(open); clearTimeout(close); };
  }, [eventKey]);
  if (!active || !eventKey) return null;
  const Icon = correct ? CheckCircle2 : Flag;
  return <div className={`reveal-moment ${correct ? "reveal-success" : ""}`}>
    {correct && <Fireworks />}
    <div className="reveal-announcement" role="status"><Icon size={32} aria-hidden="true" /><div><strong>{title}</strong><p>{detail}</p></div>{correct && <Sparkles size={26} aria-hidden="true" />}</div>
  </div>;
}
