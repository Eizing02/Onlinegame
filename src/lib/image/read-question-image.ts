import sharp from "sharp";
import {
  QUESTION_IMAGE_MAX_BYTES,
  QUESTION_IMAGE_MAX_SIDE,
  QUESTION_IMAGE_MIME,
  QUESTION_IMAGE_SIZE_MESSAGE,
  QUESTION_IMAGE_TYPE_MESSAGE,
  questionImageMime,
} from "./question-image-policy";

export class QuestionImageError extends Error {}

export async function readQuestionImage(file: File | null | undefined) {
  if (file == null) return null;
  if (typeof file.arrayBuffer !== "function" || typeof file.size !== "number" || file.size <= 0) {
    throw new QuestionImageError(QUESTION_IMAGE_TYPE_MESSAGE);
  }
  if (file.size > QUESTION_IMAGE_MAX_BYTES) throw new QuestionImageError(QUESTION_IMAGE_SIZE_MESSAGE);

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > QUESTION_IMAGE_MAX_BYTES) throw new QuestionImageError(QUESTION_IMAGE_SIZE_MESSAGE);
  const mime = questionImageMime(bytes);
  if (!mime || (file.type && file.type !== mime)) throw new QuestionImageError(QUESTION_IMAGE_TYPE_MESSAGE);

  try {
    const image = sharp(bytes, { limitInputPixels: QUESTION_IMAGE_MAX_SIDE ** 2, failOn: "warning" });
    const { width, height, format } = await image.metadata();
    if (!width || !height || Math.max(width, height) > QUESTION_IMAGE_MAX_SIDE) {
      throw new QuestionImageError("ด้านที่ยาวที่สุดของรูปต้องไม่เกิน 1,920 พิกเซล กรุณาเลือกรูปใหม่");
    }
    const expectedFormat = mime === "image/jpeg" ? "jpeg" : QUESTION_IMAGE_MIME[mime].extension;
    if (format !== expectedFormat) throw new QuestionImageError(QUESTION_IMAGE_TYPE_MESSAGE);
    await image.resize(1, 1).raw().toBuffer();
  } catch (error) {
    if (error instanceof QuestionImageError) throw error;
    throw new QuestionImageError(QUESTION_IMAGE_TYPE_MESSAGE, { cause: error });
  }

  return { bytes, mime, extension: QUESTION_IMAGE_MIME[mime].extension };
}
