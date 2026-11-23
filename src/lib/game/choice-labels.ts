export const CHOICE_LABELS = ["ก", "ข", "ค", "ง"] as const;

export function choiceLabel(index: number) {
  return CHOICE_LABELS[index] ?? String(index + 1);
}
