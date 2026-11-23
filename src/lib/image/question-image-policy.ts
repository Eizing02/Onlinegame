export const QUESTION_IMAGE_MIME = {
  "image/png": { extension: "png", label: "PNG" },
  "image/jpeg": { extension: "jpg", label: "JPEG" },
  "image/webp": { extension: "webp", label: "WebP" },
  "image/gif": { extension: "gif", label: "GIF" },
} as const;

export const QUESTION_IMAGE_MAX_BYTES = 2.5 * 1024 * 1024;
export const QUESTION_IMAGE_MAX_SIDE = 1920;
export const QUESTION_IMAGE_SIZE_MESSAGE = "รูปพร้อมส่งต้องมีขนาดไม่เกิน 2.5 MB กรุณาเลือกรูปที่เล็กลง";
export const QUESTION_IMAGE_TYPE_MESSAGE = "ไฟล์นี้ไม่ใช่รูป PNG, JPEG, WebP หรือ GIF ที่เปิดได้ กรุณาเลือกไฟล์ใหม่";

export type QuestionImageMime = keyof typeof QUESTION_IMAGE_MIME;

export function questionImageMime(bytes: Uint8Array): QuestionImageMime | null {
  const text = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP") return "image/webp";
  if (text(0, 6) === "GIF87a" || text(0, 6) === "GIF89a") return "image/gif";
  return null;
}
