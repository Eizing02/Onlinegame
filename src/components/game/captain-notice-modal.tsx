"use client";

import { useEffect, useRef } from "react";
import { Crown, Pencil, X } from "lucide-react";

export type CaptainNoticeModalProps = {
  open: boolean;
  mode: "raid" | "classic";
  teamName: string;
  onClose: () => void;
  onGoRename: () => void;
};

export function CaptainNoticeModal({
  open,
  mode,
  teamName,
  onClose,
  onGoRename,
}: CaptainNoticeModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
      return () => {
        if (dialog.open) dialog.close();
      };
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="captain-notice-dialog"
      aria-labelledby="captain-notice-title"
      aria-describedby="captain-notice-desc"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="captain-notice-card">
        <div className="captain-notice-header">
          <div className="captain-notice-badge" aria-hidden="true">
            <Crown size={24} />
          </div>
          <div className="captain-notice-heading">
            <h2 id="captain-notice-title">คุณคือหัวหน้าทีม</h2>
            <p id="captain-notice-desc">
              คุณเข้าทีม <strong>{teamName}</strong> เป็นคนแรก
              จึงสามารถเปลี่ยนชื่อทีมได้ก่อนครูเริ่มเกม
            </p>
          </div>
          <button
            type="button"
            className="captain-notice-close"
            aria-label="ปิดหน้าต่างแจ้งเตือนหัวหน้าทีม"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="captain-notice-guide">
          <h3>วิธีเปลี่ยนชื่อทีม</h3>
          {mode === "raid" ? (
            <ol className="captain-notice-steps">
              <li>
                กดแท็บ <strong>«ทีมของฉัน»</strong> ที่แถบเมนูด้านบน
              </li>
              <li>
                พิมพ์ชื่อทีมใหม่ในช่อง <strong>«ชื่อทีม»</strong> (2–30 ตัวอักษร)
              </li>
              <li>
                กดปุ่ม <strong>«บันทึกชื่อทีม»</strong> ก่อนครูเริ่มเกม
              </li>
            </ol>
          ) : (
            <ol className="captain-notice-steps">
              <li>
                กดแท็บ <strong>«ทีม»</strong> ที่แถบเมนู (ด้านบนบนคอมพิวเตอร์ /
                ด้านล่างบนมือถือ)
              </li>
              <li>
                พิมพ์ชื่อทีมใหม่ในช่อง <strong>«ชื่อทีม»</strong>{" "}
                แล้วกดปุ่มรูปดินสอเพื่อบันทึก
              </li>
              <li>
                ระหว่างเล่นเกม หัวหน้าทีมยังกดใช้ <strong>พลังทีม +50%</strong>{" "}
                ได้ 1 ข้อที่หน้าเล่น
              </li>
            </ol>
          )}
        </div>

        <div className="captain-notice-actions">
          <button
            type="button"
            className="captain-notice-primary"
            onClick={onGoRename}
          >
            <Pencil size={17} aria-hidden="true" />
            ไปเปลี่ยนชื่อทีมเลย
          </button>
          <button
            type="button"
            className="captain-notice-secondary"
            onClick={onClose}
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </dialog>
  );
}
