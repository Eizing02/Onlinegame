"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, LoaderCircle, Search } from "lucide-react";
import { checkRoomAction } from "./actions";

type PinStatus = "idle" | "checking" | "valid" | "invalid";

const PIN_SLOTS = [0, 1, 2, 3] as const;

function sanitizePin(raw: string): string {
  return raw
    .replace(/[\u0E50-\u0E59]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0e50),
    )
    .replace(/\D+/g, "")
    .slice(0, 4);
}

export function RoomPinForm({
  initialCode = "",
  initialError = null,
}: {
  initialCode?: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const initialDigits = sanitizePin(initialCode);
  const [digits, setDigits] = useState(initialDigits);
  const [status, setStatus] = useState<PinStatus>(
    initialError ? "invalid" : "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const [focused, setFocused] = useState(false);
  const [slotTicks, setSlotTicks] = useState<[number, number, number, number]>([
    0, 0, 0, 0,
  ]);
  const [shakeTick, setShakeTick] = useState(initialError ? 1 : 0);

  const inputRef = useRef<HTMLInputElement>(null);
  const requestSeqRef = useRef(0);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  const triggerShake = useCallback((message: string) => {
    setStatus("invalid");
    setErrorMessage(message);
    setShakeTick((tick) => tick + 1);
  }, []);

  const verifyRoom = useCallback(
    async (code: string) => {
      if (code.length < 4) {
        triggerShake("รหัสห้องต้องเป็นตัวเลข 4 หลัก");
        inputRef.current?.focus();
        return;
      }

      const seq = ++requestSeqRef.current;
      checkedCodeRef.current = code;
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }

      setStatus("checking");
      setErrorMessage(null);

      try {
        const result = await checkRoomAction(code);
        if (seq !== requestSeqRef.current) return;

        if (!result.ok) {
          checkedCodeRef.current = null;
          triggerShake(result.error);
          inputRef.current?.focus();
          return;
        }

        setStatus("valid");
        setErrorMessage(null);

        const prefersReduced =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const delayMs = prefersReduced ? 140 : 560;

        navTimerRef.current = setTimeout(() => {
          router.push(`/join?room_code=${result.roomCode}`);
        }, delayMs);
      } catch {
        if (seq !== requestSeqRef.current) return;
        checkedCodeRef.current = null;
        triggerShake("เชื่อมต่อไม่ได้ชั่วคราว กรุณาลองอีกครั้ง");
        inputRef.current?.focus();
      }
    },
    [router, triggerShake],
  );

  const applyDigits = useCallback(
    (rawValue: string) => {
      const next = sanitizePin(rawValue);
      if (status === "valid") return;

      // Cancel any in-flight verification if user modifies digits.
      if (next !== digits) {
        requestSeqRef.current += 1;
        checkedCodeRef.current = null;
      }

      // Trigger a subtle pop on each newly added or changed digit slot.
      setSlotTicks((prev) => {
        const updated: [number, number, number, number] = [...prev];
        for (let i = 0; i < 4; i++) {
          if (next[i] && next[i] !== digits[i]) {
            updated[i] = prev[i] + 1;
          }
        }
        return updated;
      });

      setDigits(next);

      if (next.length < 4) {
        setStatus("idle");
        setErrorMessage(null);
        return;
      }

      void verifyRoom(next);
    },
    [digits, status, verifyRoom],
  );

  const activeSlot = Math.min(digits.length, 3);

  return (
    <form
      className="join-pin-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (
          (status === "checking" || status === "valid") &&
          checkedCodeRef.current === digits
        ) {
          return;
        }
        void verifyRoom(digits);
      }}
    >
      <label className="join-pin-label" htmlFor="room_code">
        รหัสห้อง
      </label>

      <div
        className="join-pin-field"
        data-state={status}
        onClick={() => inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          id="room_code"
          name="room_code"
          type="text"
          className="join-pin-input"
          value={digits}
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          autoFocus
          autoComplete="one-time-code"
          spellCheck={false}
          aria-invalid={status === "invalid"}
          aria-describedby="join-pin-status"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => applyDigits(event.target.value)}
          onKeyDown={(event) => {
            if (status === "valid") {
              event.preventDefault();
              return;
            }
            if (
              status === "invalid" &&
              digits.length === 4 &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey
            ) {
              const single = sanitizePin(event.key);
              if (single.length === 1) {
                event.preventDefault();
                applyDigits(single);
              }
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData("text");
            if (pasted) applyDigits(pasted);
          }}
        />

        <div
          key={shakeTick}
          className="join-pin-grid"
          data-state={status}
          data-shake={status === "invalid" && shakeTick > 0 ? "true" : "false"}
          aria-hidden="true"
        >
          {PIN_SLOTS.map((index) => {
            const char = digits[index] ?? "";
            const isActive =
              focused && status !== "valid" && index === activeSlot;

            const hasPop =
              slotTicks[index] > 0 && status !== "valid" && status !== "invalid";

            return (
              <div
                key={
                  status === "valid"
                    ? `valid-${index}`
                    : `${index}-${slotTicks[index]}`
                }
                className="join-pin-slot"
                style={{ "--slot-index": index } as React.CSSProperties}
                data-filled={Boolean(char)}
                data-active={isActive}
                data-pop={hasPop ? "true" : "false"}
                data-state={status}
              >
                {char ? (
                  <span className="join-pin-digit">{char}</span>
                ) : isActive ? (
                  <span className="join-pin-caret" />
                ) : (
                  <span className="join-pin-placeholder">•</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div id="join-pin-status" className="join-pin-feedback">
        {status === "checking" && (
          <p className="join-pin-status" data-tone="checking" role="status">
            <LoaderCircle size={17} className="join-pin-spin" aria-hidden="true" />
            กำลังตรวจสอบห้อง {digits}…
          </p>
        )}
        {status === "valid" && (
          <p className="join-pin-status" data-tone="valid" role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            พบห้อง {digits} แล้ว กำลังเปิดรายชื่อทีม…
          </p>
        )}
        {status === "invalid" && errorMessage && (
          <p className="form-error join-message join-pin-alert" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{errorMessage}</span>
          </p>
        )}
        {status === "idle" && (
          <p className="join-pin-hint">
            กรอกตัวเลขครบ 4 หลัก ระบบจะตรวจสอบห้องให้อัตโนมัติ
          </p>
        )}
      </div>

      <button className="game-button join-pin-submit" type="submit">
        <Search size={19} aria-hidden="true" />
        ค้นหาห้อง
      </button>
    </form>
  );
}
