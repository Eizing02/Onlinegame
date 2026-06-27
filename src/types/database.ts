export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AccountRow = {
  user_code: string;
  display_name: string;
  password: string;
  grade: string | null;
  role: "teacher" | "student";
  created_at: string;
  updated_at: string;
};

export type QuestionSetRow = {
  id: string;
  teacher_code: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionRow = {
  id: string;
  question_set_id: string;
  question_text: string;
  correct_answer: string;
  points: number;
  time_limit_seconds: number;
  order_index: number;
  image_url: string | null;
  created_at: string;
};

export type GameSessionRow = {
  id: string;
  room_code: string;
  teacher_code: string;
  question_set_id: string;
  question_set_title: string;
  question_count: number;
  activity_name: string | null;
  status:
    | "lobby"
    | "playing"
    | "question_active"
    | "answer_locked"
    | "showing_answer"
    | "ended";
  team_count: number;
  max_members_per_team: number;
  current_question_index: number;
  current_question_started_at: string | null;
  current_question_ends_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamRow = {
  id: string;
  session_id: string;
  team_number: number;
  team_name: string;
  score: number;
  raw_score: number;
  average_score: number;
  locked_member_count: number | null;
  created_at: string;
  updated_at: string;
};

export type ParticipantRow = {
  id: string;
  session_id: string;
  team_id: string | null;
  student_code: string;
  display_name: string;
  connection_status: "online" | "offline" | "left";
  joined_after_start: boolean;
  is_score_eligible: boolean;
  joined_at: string;
  last_seen_at: string;
};

export type AnswerRow = {
  id: string;
  session_id: string;
  question_id: string | null;
  question_index: number;
  team_id: string;
  participant_id: string | null;
  student_code: string;
  answer_text: string;
  is_correct: boolean;
  score_awarded: number;
  submitted_at: string;
};

export type GameEventRow = {
  id: string;
  session_id: string;
  event_type:
    | "join_room"
    | "start_game"
    | "start_question"
    | "lock_answers"
    | "submit_answer"
    | "rename_team"
    | "leave_team"
    | "reveal_answer"
    | "next_question"
    | "end_game";
  payload: Json;
  created_at: string;
};
