import { ArrowLeft, DoorOpen, Swords, Sparkles } from "lucide-react";
import Link from "next/link";
import { leaveTeamAction } from "@/app/join/actions";
import { AppShell } from "@/components/layout/app-shell";
import { Wallpaper } from "@/components/game/wallpaper";
import { ButtonLink } from "@/components/ui/button-link";
import { LoadingForm } from "@/components/ui/loading-form";
import { requireRole } from "@/lib/auth/session";
import { getJoinableGameSession, getTeamSummaries } from "@/lib/data/game-sessions";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/game/room-code";
import { RoomPinForm } from "./room-pin-form";
import { TeamPicker } from "./team-picker";

type JoinPageProps = {
  searchParams: Promise<{ room_code?: string; error?: string; notice?: string }>;
};

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const student = await requireRole("student");
  const query = await searchParams;
  const roomCode = normalizeRoomCode(query.room_code ?? "");
  const valid = isValidRoomCode(roomCode);
  const game = valid ? await getJoinableGameSession(roomCode) : null;
  const teams = game ? getTeamSummaries(game) : [];
  const activeParticipants = game
    ? game.participants.filter((p) => p.connectionStatus !== "left")
    : [];
  const participant = activeParticipants.find(
    (p) => p.studentCode === student.userCode,
  );
  const currentTeam = teams.find((t) => t.id === participant?.teamId);
  const late = Boolean(game && game.status !== "lobby");
  const raid = game?.gameMode === "boss_raid";
  const roomError =
    roomCode && !valid
      ? "รหัสห้องต้องเป็นตัวเลข 4 หลัก"
      : roomCode && !game
        ? "ไม่พบห้องนี้ หรือห้องจบเกมแล้ว"
        : null;

  return (
    <AppShell wallpaper="join" className="join-app">
      <Wallpaper />
      <section className="join-flow" data-stage={game ? "teams" : "code"}>
        <header className="join-flow-heading">
          <div>
            <h1>{game ? "เลือกทีมก่อนเข้าเล่น" : "เข้าร่วมเกม"}</h1>
            <p>
              {student.displayName}
              {student.grade ? ` · ${student.grade}` : ""}
            </p>
          </div>
          {game && (
            <Link className="identity-secondary" href="/join">
              <ArrowLeft size={18} aria-hidden="true" />
              เปลี่ยนห้อง
            </Link>
          )}
        </header>
        {game && (query.error || roomError) && (
          <p className="form-error join-message" role="alert">
            {query.error || roomError}
          </p>
        )}
        {query.notice && (
          <p className="form-notice join-message" role="status">
            {query.notice}
          </p>
        )}
        {game ? (
          <div className="join-room-layout" key={game.id}>
            <aside className="join-room-summary">
              <DoorOpen size={28} aria-hidden="true" />
              <span className="join-mode-badge" data-mode={raid ? "raid" : "classic"}>
                {raid ? (
                  <>
                    <Swords size={15} aria-hidden="true" />
                    โหมด Boss Raid
                  </>
                ) : (
                  <>
                    <Sparkles size={15} aria-hidden="true" />
                    โหมด Classic
                  </>
                )}
              </span>
              <h2>ห้อง {game.roomCode}</h2>
              <p className="join-activity">
                {game.activityName || game.questionSetTitle}
              </p>
              <p className="join-question-set">ชุดคำถาม {game.questionSetTitle}</p>
              <p>
                {game.questionCount} ข้อ · {game.teamCount} ทีม ·{" "}
                {late ? "เริ่มเกมแล้ว" : "รอครูเริ่มเกม"}
              </p>
              {late && (
                <p className="join-room-warning">
                  {raid
                    ? "ผู้เข้าร่วมใหม่รับชมได้อย่างเดียว คะแนนและจำนวนฮีโร่จะไม่เปลี่ยน"
                    : "เข้าหลังเริ่มเกม เล่นได้แต่ไม่ร่วมคะแนนรอบนี้"}
                </p>
              )}
              {currentTeam && (
                <div className="join-current-team">
                  <p>คุณอยู่ใน {currentTeam.teamName} แล้ว</p>
                  <ButtonLink
                    href={raid ? `/play/${roomCode}/raid` : `/play/${roomCode}`}
                  >
                    กลับเข้าเกม
                  </ButtonLink>
                  {!late && (
                    <LoadingForm
                      action={leaveTeamAction}
                      loadingLabel="กำลังออกจากทีม…"
                    >
                      <input name="room_code" type="hidden" value={roomCode} />
                      <button className="identity-secondary" type="submit">
                        ออกจากทีม
                      </button>
                    </LoadingForm>
                  )}
                </div>
              )}
            </aside>
            <TeamPicker
              roomCode={roomCode}
              currentTeamId={currentTeam?.id}
              late={late}
              teams={teams.map((t) => ({
                id: t.id,
                teamName: t.teamName,
                memberCount: t.memberCount,
                maxMembers: t.maxMembers,
                memberNames: activeParticipants
                  .filter((p) => p.teamId === t.id)
                  .slice(0, 3)
                  .map((p) => p.displayName),
                disabled:
                  (t.isFull && !(raid && late) && currentTeam?.id !== t.id) ||
                  (late && Boolean(currentTeam) && currentTeam?.id !== t.id),
              }))}
            />
          </div>
        ) : (
          <div className="join-code-panel">
            <h2>กรอกรหัสห้องจากครู</h2>
            <p>ใส่รหัสตัวเลข 4 หลัก แล้วระบบจะพาไปเลือกทีมทันที</p>
            <RoomPinForm
              initialCode={roomCode}
              initialError={query.error || roomError}
            />
          </div>
        )}
      </section>
    </AppShell>
  );
}
