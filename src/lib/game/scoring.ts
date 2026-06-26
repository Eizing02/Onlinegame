import { isAnswerCorrect } from "./answer-checking";

export type ScoreInput = {
  answerText: string;
  correctAnswer: string;
  points: number;
};

export function calculateAwardedPoints({
  answerText,
  correctAnswer,
  points,
}: ScoreInput) {
  return isAnswerCorrect(answerText, correctAnswer) ? points : 0;
}

export function rankTeams<T extends { score: number }>(teams: T[]) {
  return teams.toSorted((a, b) => b.score - a.score);
}
