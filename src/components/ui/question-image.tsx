"use client";

import { Maximize2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type QuestionImageProps = {
  src: string | null;
  alt: string;
  className?: string;
};

export function QuestionImage({ alt, className = "", src }: QuestionImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!src) {
    return null;
  }

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-md border border-border bg-slate-950/5 ${className}`}
      >
        <Image
          alt={alt}
          className="h-auto max-h-80 w-full object-contain"
          height={900}
          src={src}
          unoptimized
          width={1200}
        />
        <button
          aria-label="ขยายรูปคำถาม"
          className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/60 bg-black/60 text-white shadow-sm transition hover:bg-black/75"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <button
            aria-label="ปิดรูปคำถาม"
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/30 bg-white/10 text-white transition hover:bg-white/20"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            <X size={22} />
          </button>
          <Image
            alt={alt}
            className="max-h-[88vh] w-auto max-w-full rounded-md object-contain shadow-2xl"
            height={1600}
            priority
            src={src}
            unoptimized
            width={2000}
          />
        </div>
      ) : null}
    </>
  );
}
