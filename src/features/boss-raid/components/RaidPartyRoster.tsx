"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, Users } from "lucide-react";
import { HERO_NAMES, spriteClip } from "../assets/manifest";
import type { RaidHero } from "../types";

export function RaidPartyRoster({ heroes, ownId, teamName, loading = false, open, onToggle, id }: {
  heroes: RaidHero[]; ownId?: string; teamName?: string; loading?: boolean;
  open: boolean; onToggle: () => void; id: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) onToggle();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onToggle();
      toggle.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
    };
  }, [open, onToggle]);

  return <div className="raid-party" ref={root}>
    <button ref={toggle} type="button" className="raid-party-toggle" aria-expanded={open}
      aria-controls={id} aria-label={teamName ? `สมาชิก ${teamName}` : undefined} onClick={onToggle}>
      <Users size={17} aria-hidden="true" />
      <span>{loading ? "กำลังโหลดทีม…" : `ปาร์ตี้ · ${heroes.length} คน`}</span>
      <ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <section id={id} className="raid-party-list" tabIndex={0} aria-label={teamName ? `สมาชิก ${teamName}` : "สมาชิกปาร์ตี้ของทีมคุณ"} aria-busy={loading}>
      <h3>{teamName ? `สมาชิก ${teamName}` : "สมาชิกในทีม"}</h3>
      {loading ? <p role="status">กำลังโหลดสมาชิกทีมที่เลือก…</p> : <>
        <ul>{heroes.map(hero => <li key={hero.id} data-own={hero.id === ownId}>
          {hero.heroType && <span className="raid-party-portrait" style={{ backgroundImage: `url(${spriteClip(hero.heroType, "idle").path})` }} aria-hidden="true" />}
          <div><strong>{hero.displayName}{hero.id === ownId && <small> · คุณ</small>}</strong>
            <span>{hero.heroType ? HERO_NAMES[hero.heroType] : "ยังไม่เลือกตัวละคร"} · HP {hero.hp}</span>
          </div>
        </li>)}</ul>
        {!heroes.length && <p>ยังไม่มีผู้เล่นในทีม</p>}
      </>}
    </section>}
  </div>;
}
