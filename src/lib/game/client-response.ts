"use client";
export async function fetchRoom(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  if (response.status === 401 || response.status === 409) {
    const body = await response.clone().json().catch(() => null);
    if (body?.code === "SESSION_EXPIRED" || body?.code === "ACCOUNT_CHANGED") window.dispatchEvent(new Event("quiz-session-changed"));
  }
  return response;
}
export function newestSnapshot<T extends {sessionId: string; updatedAt: string}>(previous: T, next: T): T {
  if (previous.sessionId !== next.sessionId) return previous;
  return Date.parse(next.updatedAt) >= Date.parse(previous.updatedAt) ? next : previous;
}
