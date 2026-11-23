import {
  QUESTION_IMAGE_MAX_BYTES,
  QUESTION_IMAGE_MAX_SIDE,
  QUESTION_IMAGE_MIME,
  QUESTION_IMAGE_SIZE_MESSAGE,
  questionImageMime,
  type QuestionImageMime,
} from "./question-image-policy";

const originalLimit = 24 * 1024 * 1024;
const preserveLimit = 400 * 1024;
const targetBytes = 1.8 * 1024 * 1024;
const maxSourcePixels = 50_000_000;
const convertibleExtensions = /\.(avif|bmp|svg|ico|tiff?|heic|heif)$/i;
const convertibleMime = /^(image\/(avif|bmp|x-ms-bmp|svg\+xml|x-icon|vnd\.microsoft\.icon|tiff|heic|heif))$/i;

export const QUESTION_IMAGE_ACCEPT = [
  ...Object.keys(QUESTION_IMAGE_MIME),
  ".png", ".jpg", ".jpeg", ".jfif", ".webp", ".gif",
  ".heic", ".heif", ".avif", ".bmp", ".svg", ".ico", ".tif", ".tiff",
].join(",");

type ReadyImage = {
  status: "ready";
  file: File;
  originalBytes: number;
  originalName: string;
  format: string;
  width: number;
  height: number;
};

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Some browsers support a format in <img> but not in createImageBitmap.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeSource(file: File) {
  try {
    const source = /\.svg$/i.test(file.name) && !file.type.startsWith("image/")
      ? file.slice(0, file.size, "image/svg+xml")
      : file;
    return await decode(source);
  } catch {
    if (!/heic|heif/i.test(file.type) && !/\.(heic|heif)$/i.test(file.name)) {
      throw new Error("เปิดรูปนี้ไม่ได้ ลองเลือกไฟล์ใหม่หรือบันทึกเป็น PNG หรือ JPG");
    }
    try {
      const { heicTo } = await import("heic-to/csp");
      return await decode(await heicTo({ blob: file, type: "image/png" }));
    } catch {
      throw new Error("แปลงรูป HEIC/HEIF นี้ไม่ได้ ลองบันทึกเป็น JPG แล้วเลือกอีกครั้ง");
    }
  }
}

function ready(source: File, output: Blob, mime: QuestionImageMime, width: number, height: number): ReadyImage {
  const { extension, label } = QUESTION_IMAGE_MIME[mime];
  return {
    status: "ready",
    file: output === source && source.type === mime
      ? source
      : new File([output], `question-image.${extension}`, { type: mime }),
    originalBytes: source.size,
    originalName: source.name,
    format: label,
    width,
    height,
  };
}

export async function prepareQuestionImage(
  file: File,
  useStill = false,
): Promise<ReadyImage | { status: "still"; source: File }> {
  if (file.size === 0) throw new Error("ไฟล์นี้ว่างเปล่า กรุณาเลือกรูปใหม่");
  if (file.size > originalLimit) throw new Error("รูปต้นฉบับมีขนาดเกิน 24 MB กรุณาเลือกรูปที่เล็กลง");
  const mime = questionImageMime(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  if (!mime && !convertibleMime.test(file.type) && !convertibleExtensions.test(file.name)) {
    throw new Error("ไฟล์นี้ไม่ใช่รูปที่รองรับ ลองใช้ PNG หรือ JPG");
  }
  if (mime === "image/gif" && !useStill && file.size > QUESTION_IMAGE_MAX_BYTES) {
    return { status: "still", source: file };
  }
  const image = await decodeSource(file);
  try {
    const width = "naturalWidth" in image ? image.naturalWidth : image.width;
    const height = "naturalHeight" in image ? image.naturalHeight : image.height;
    if (!width || !height || width * height > maxSourcePixels) {
      throw new Error("รูปนี้มีความละเอียดสูงเกินไป กรุณาย่อรูปต้นฉบับแล้วลองอีกครั้ง");
    }
    const fitsSide = Math.max(width, height) <= QUESTION_IMAGE_MAX_SIDE;
    if (mime === "image/gif" && !useStill) {
      return fitsSide ? ready(file, file, mime, width, height) : { status: "still", source: file };
    }
    if (mime && mime !== "image/gif" && file.size <= preserveLimit && fitsSide) {
      return ready(file, file, mime, width, height);
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("เบราว์เซอร์เตรียมรูปไม่ได้ ลองเปิดด้วยเบราว์เซอร์อื่น");
    let fallback: ReadyImage | undefined;
    const edges = Math.max(width, height) > 1600 ? [QUESTION_IMAGE_MAX_SIDE, 1600] : [QUESTION_IMAGE_MAX_SIDE];
    try {
      for (const edge of edges) {
        const scale = Math.min(1, edge / Math.max(width, height));
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.90, 0.85, 0.80, 0.78]) {
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", quality));
          if (!blob) break;
          const outputMime = blob.type === "image/webp" ? "image/webp" : "image/png";
          if (blob.size <= targetBytes) return ready(file, blob, outputMime, canvas.width, canvas.height);
          if (!fallback && blob.size <= QUESTION_IMAGE_MAX_BYTES) {
            fallback = ready(file, blob, outputMime, canvas.width, canvas.height);
          }
          if (outputMime === "image/png") break;
        }
      }
      if (fallback) return fallback;
      if (mime && mime !== "image/gif" && file.size <= QUESTION_IMAGE_MAX_BYTES && fitsSide) {
        return ready(file, file, mime, width, height);
      }
      throw new Error(QUESTION_IMAGE_SIZE_MESSAGE);
    } finally {
      canvas.width = canvas.height = 0;
    }
  } finally {
    if ("close" in image) image.close();
  }
}
