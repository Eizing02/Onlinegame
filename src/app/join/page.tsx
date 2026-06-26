import { Search, Shuffle, UsersRound } from "lucide-react";

import {
  chooseTeamAction,
  findRoomAction,
  randomTeamAction,
} from "@/app/join/actions";
import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { Panel } from "@/components/ui/panel";
import { requireRole } from "@/lib/auth/session";
import {
  getJoinableGameSession,
  getTeamSummaries,
} from "@/lib/data/game-sessions";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/game/room-code";

type JoinPageProps = {
  searchParams: Promise<{
    room_code?: string;
    error?: string;
    notice?: string;
  }>;
};

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const student = await requireRole("student");
  const query = await searchParams;
  const roomCode = query.room_code
    ? normalizeRoomCode(query.room_code)
    : "";
  const canLookupRoom = roomCode ? isValidRoomCode(roomCode) : false;
  const gameSession = canLookupRoom
    ? await getJoinableGameSession(roomCode)
    : null;
  const teamSummaries = gameSession ? getTeamSummaries(gameSession) : [];
  const existingParticipant = gameSession
    ? gameSession.participants.find(
        (participant) => participant.studentCode === student.userCode,
      )
    : null;
  const isLateJoin = gameSession ? gameSession.status !== "lobby" : false;
  const roomError =
    roomCode && !canLookupRoom
      ? "รหัสห้องต้องเป็นตัวเลข 4 หลัก"
      : roomCode && !gameSession
        ? "ไม่พบห้องนี้ หรือห้องจบเกมแล้ว"
        : null;

  return (
    <AppShell>
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold">เข้าร่วมเกม</h1>
          <p className="max-w-xl leading-7 text-muted">
            กรอกรหัสห้องตัวเลข 4 หลัก จากนั้นเลือกทีมที่ต้องการอยู่
            หรือให้ระบบสุ่มทีมที่ยังว่างให้
          </p>
          <div className="rounded-md border border-border bg-white p-4 text-sm leading-6 text-muted">
            <p className="font-semibold text-foreground">ผู้เล่น</p>
            <p>{student.displayName}</p>
            <p>{student.grade}</p>
          </div>
        </div>

        <div className="space-y-5">
          <Panel className="space-y-5">
            {query.error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {query.error}
              </div>
            ) : null}
            {query.notice ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {query.notice}
              </div>
            ) : null}
            {roomError ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                {roomError}
              </div>
            ) : null}

            <form action={findRoomAction} className="space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="room_code">
                  รหัสห้อง
                </label>
                <input
                  id="room_code"
                  name="room_code"
                  className="mt-2 h-12 w-full rounded-md border border-border px-3 text-xl font-semibold tracking-normal outline-none focus:border-primary"
                  defaultValue={roomCode}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="1234"
                  required
                />
              </div>
              <button
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
                type="submit"
              >
                <Search size={18} />
                ค้นหาห้อง
              </button>
            </form>
          </Panel>

          {gameSession ? (
            <Panel className="space-y-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm font-medium text-muted">
                    ห้อง {gameSession.roomCode}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {gameSession.activityName || gameSession.questionSetTitle}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    ชุดคำถาม {gameSession.questionSetTitle}
                  </p>
                </div>
                {existingParticipant?.teamId ? (
                  <ButtonLink href={`/play/${roomCode}`} variant="secondary">
                    กลับเข้าเกม
                  </ButtonLink>
                ) : (
                  <form action={randomTeamAction}>
                    <input name="room_code" type="hidden" value={roomCode} />
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold transition hover:bg-surface"
                      type="submit"
                    >
                      <Shuffle size={17} />
                      สุ่มทีมให้ฉัน
                    </button>
                  </form>
                )}
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-md border border-border bg-surface p-3">
                  <p className="text-muted">จำนวนข้อ</p>
                  <p className="mt-1 font-semibold">
                    {gameSession.questionCount} ข้อ
                  </p>
                </div>
                <div className="rounded-md border border-border bg-surface p-3">
                  <p className="text-muted">จำนวนทีม</p>
                  <p className="mt-1 font-semibold">
                    {gameSession.teamCount} ทีม
                  </p>
                </div>
                <div className="rounded-md border border-border bg-surface p-3">
                  <p className="text-muted">สถานะ</p>
                  <p className="mt-1 font-semibold">
                    {gameSession.status === "lobby"
                      ? "รอเริ่มเกม"
                      : "เริ่มเกมแล้ว"}
                  </p>
                </div>
              </div>

              {isLateJoin ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  เกมเริ่มแล้ว หากเข้าหลังจากนี้จะร่วมเล่นได้แต่ไม่ถูกนำไปคิดคะแนนรอบนี้
                </div>
              ) : null}

              {existingParticipant?.teamId ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  คุณอยู่ในทีมแล้ว ระบบจะพากลับเข้าห้องเดิมและทีมเดิมเมื่อเข้าเล่น
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                {teamSummaries.map((team) => (
                  <form action={chooseTeamAction} key={team.id}>
                    <input name="room_code" type="hidden" value={roomCode} />
                    <input name="team_id" type="hidden" value={team.id} />
                    <button
                      className="flex min-h-28 w-full flex-col items-start justify-between rounded-md border border-border bg-white p-4 text-left transition hover:border-primary hover:bg-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-muted"
                      disabled={team.isFull}
                      type="submit"
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        <UsersRound size={18} />
                        {team.teamName}
                      </span>
                      <span className="text-sm text-muted">
                        {team.memberCount}/{team.maxMembers} คน
                      </span>
                      {team.isFull ? (
                        <span className="text-sm font-semibold text-red-700">
                          ทีมเต็มแล้ว
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-primary">
                          {isLateJoin ? "เข้าทีมนี้เพื่อดูเกม" : "เลือกทีมนี้"}
                        </span>
                      )}
                    </button>
                  </form>
                ))}
              </div>
            </Panel>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
