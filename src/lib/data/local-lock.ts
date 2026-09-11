import { AsyncLocalStorage } from "node:async_hooks";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { isSupabaseDataBackend } from "@/lib/data/backend";
// Local mode is a single Node server. Share its queue across Next module bundles.
const shared = globalThis as typeof globalThis & { quizLocalStore?: { tail: Promise<void>; context: AsyncLocalStorage<boolean> } };
const state = shared.quizLocalStore ??= { tail: Promise.resolve(), context: new AsyncLocalStorage<boolean>() };
export async function withLocalLock<T>(work: () => Promise<T>): Promise<T> {
  if (isSupabaseDataBackend()) return work();
  if (state.context.getStore()) return work();
  const previous = state.tail;
  let release!: () => void;
  state.tail = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try { return await state.context.run(true, work); } finally { release(); }
}
export async function writeJsonAtomically(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + "\n", "utf8");
  await rename(temporary, file);
}
