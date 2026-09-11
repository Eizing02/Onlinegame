export type GameStatus =
  | "lobby"
  | "playing"
  | "question_active"
  | "answer_locked"
  | "showing_answer"
  | "ended";

export type TeamSnapshot = {
  id: string;
  name: string;
  score: number;
  memberCount: number;
};

export type ParticipantSnapshot = {
  id: string;
  displayName: string;
  teamId: string | null;
  connectionStatus: "online" | "offline" | "left";
};
