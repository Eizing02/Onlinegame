export function generateRoomCode(random = Math.random) {
  return Math.floor(random() * 10000)
    .toString()
    .padStart(4, "0");
}

export function normalizeRoomCode(code: string) {
  return code.trim().replace(/\s+/g, "");
}

export function isValidRoomCode(code: string) {
  return /^\d{4}$/.test(normalizeRoomCode(code));
}
