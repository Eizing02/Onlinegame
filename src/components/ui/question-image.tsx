"use client";

import { Maximize2 } from "lucide-react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";
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
        className={`relative overflow-hidden rounded-md border border-border bg-muted/5 ${className}`}
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
        <Modal title="รูปคำถาม" onClose={() => setIsOpen(false)}>
          <Image
            alt={alt}
            className="max-h-[88vh] w-auto max-w-full rounded-md object-contain shadow-2xl"
            height={1600}
            priority
            src={src}
            unoptimized
            width={2000}
          />
        </Modal>
      ) : null}
    </>
  );
}
