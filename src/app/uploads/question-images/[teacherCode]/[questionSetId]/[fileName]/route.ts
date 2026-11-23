import { readFile } from "node:fs/promises";
import path from "node:path";
import { isSupabaseDataBackend } from "@/lib/data/backend";
import { getDataDirectory } from "@/lib/data/paths";
import { questionImageMime } from "@/lib/image/question-image-policy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teacherCode: string; questionSetId: string; fileName: string }> },
) {
  const { teacherCode, questionSetId, fileName } = await params;
  if (
    isSupabaseDataBackend() ||
    !/^[\p{L}\p{N}_-]+$/u.test(teacherCode) ||
    !/^[\da-f-]{36}$/i.test(questionSetId) ||
    !/^[\da-f-]{36}\.(png|jpg|webp|gif)$/i.test(fileName)
  ) {
    return new Response(null, { status: 404 });
  }

  try {
    const bytes = await readFile(
      path.join(/* turbopackIgnore: true */ getDataDirectory(), "uploads", "question-images", teacherCode, questionSetId, fileName),
    );
    const mime = questionImageMime(bytes);
    if (!mime) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": mime, "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response(null, { status: 404 });
    throw error;
  }
}
