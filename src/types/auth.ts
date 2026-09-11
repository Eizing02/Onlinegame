export type AppRole = "teacher" | "student";

export type SheetAccount = {
  userCode: string;
  password: string;
  role: AppRole;
  displayName: string;
  grade: string;
};

export type AppSession = {
  sessionId: string;
  userCode: string;
  role: AppRole;
  displayName: string;
  grade: string;
};
