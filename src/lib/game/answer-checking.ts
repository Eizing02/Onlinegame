export function normalizeAnswer(answer: string) {
  return answer.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isAnswerCorrect(answerText: string, correctAnswer: string) {
  return normalizeAnswer(answerText) === normalizeAnswer(correctAnswer);
}
