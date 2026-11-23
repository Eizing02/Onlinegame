"use client";

import { Check } from "lucide-react";
import {
  HERO_NAMES,
  LEGACY_HERO_TYPES,
  type HeroType,
} from "../assets/manifest";
import { HERO_DEFINITIONS } from "../assets/hero-definitions";
import { HeroPortrait } from "./HeroPortrait";
import type { RaidHero } from "../types";

export function HeroSelectLobby({
  own,
  heroes,
  pending,
  choose,
  allowDuplicates = true,
  availableHeroes = LEGACY_HERO_TYPES,
}: {
  own: RaidHero | null;
  heroes: RaidHero[];
  pending: boolean;
  choose: (hero: string) => void;
  allowDuplicates?: boolean;
  availableHeroes?: readonly HeroType[];
}) {
  const readyCount = heroes.filter((hero) => Boolean(hero.heroType)).length;

  return (
    <section className="raid-lobby raid-expanded-lobby">
      <div className="raid-hero-intro">
        <h2>เลือกฮีโร่ของคุณ</h2>
        <p>
          {allowDuplicates ? "เลือกซ้ำกันได้" : "ห้องกติกาเดิมใช้ฮีโร่ไม่ซ้ำกัน"}{" "}
          · ทุกตัวใช้คะแนนและดาเมจเท่ากัน
          {availableHeroes.length > 5
            ? ` · เลื่อนลงเพื่อดูครบทั้ง ${availableHeroes.length} ตัว`
            : ""}
        </p>
      </div>

      <div
        className="raid-hero-pages"
        data-no-room-swipe
        tabIndex={0}
        role="region"
        aria-label="รายชื่อตัวละคร เลื่อนภายในได้"
      >
        <div
          className="raid-hero-picker"
          data-has-selection={Boolean(own?.heroType)}
        >
          {availableHeroes.map((type) => {
            const taken =
              !allowDuplicates &&
              heroes.find((hero) => hero.heroType === type && hero.id !== own?.id);
            const selected = own?.heroType === type;

            return (
              <button
                key={type}
                type="button"
                disabled={pending || Boolean(taken)}
                aria-pressed={selected}
                onClick={() => choose(type)}
              >
                <HeroPortrait hero={type} className="raid-hero-portrait" />
                <strong>{HERO_NAMES[type]}</strong>
                <small>
                  {taken ? (
                    `${taken.displayName} เลือกแล้ว`
                  ) : selected ? (
                    <>
                      <Check size={14} aria-hidden="true" />
                      คุณเลือกตัวนี้
                    </>
                  ) : (
                    "เลือกฮีโร่"
                  )}
                </small>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="raid-hero-selection-summary"
        role="status"
        aria-live="polite"
      >
        <strong>
          {pending
            ? "กำลังบันทึกฮีโร่…"
            : own?.heroType
              ? `เลือก: ${HERO_NAMES[own.heroType]}`
              : "เลือกตัวละครที่ชอบได้เลย"}
        </strong>
        <p>
          {own?.heroType
            ? `${HERO_DEFINITIONS[own.heroType].attacks.attack_1.name} · ${HERO_DEFINITIONS[own.heroType].attacks.attack_2.name}`
            : "ถ้ายังไม่เลือก ระบบจะจัดให้เมื่อเริ่มเกม"}
        </p>
        <small>
          พร้อมรบแล้ว {readyCount}/{Math.max(1, heroes.length)} คนในทีม ·
          รอครูเริ่มเกม
        </small>
      </div>
    </section>
  );
}
