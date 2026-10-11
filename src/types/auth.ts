export type AppRole = "teacher" | "student";

export type SheetAccount = {
  userCode: string;
  password: string | null;
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
  authMode?: "legacy" | "google";
  authUserId?: string;
  email?: string;
  accessLevel?: "super_admin" | "teacher";
};
