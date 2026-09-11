import type { StoredGameSession, StoredTeam, StoredParticipant } from "@/lib/data/game-sessions";

export function roundMultiplier(session: Pick<StoredGameSession, "rulesVersion" | "questionCount" | "currentQuestionIndex">) {
  return session.rulesVersion === 2 && session.currentQuestionIndex === session.questionCount - 1 ? 1.5 : 1;
}
export function powerMultiplier(session: Pick<StoredGameSession, "rulesVersion" | "currentQuestionIndex">, team: StoredTeam) {
  return session.rulesVersion === 2 && team.boostQuestionIndex === session.currentQuestionIndex ? 1.5 : 1;
}
export function canUseTeamPower(session: StoredGameSession, team: StoredTeam, participant: StoredParticipant) {
  const captain = session.participants.filter(p => p.teamId === team.id && p.connectionStatus !== "left")
    .toSorted((a, b) => Date.parse(a.joinedAt) - Date.parse(b.joinedAt) || a.id.localeCompare(b.id))[0];
  return session.rulesVersion === 2 && session.status === "question_active" &&
    participant.isScoreEligible && captain?.id === participant.id && team.boostQuestionIndex == null &&
    !session.answers.some(a => a.teamId === team.id && a.questionIndex === session.currentQuestionIndex) &&
    Boolean(session.currentQuestionEndsAt) && Date.now() <= Date.parse(session.currentQuestionEndsAt!);
}
