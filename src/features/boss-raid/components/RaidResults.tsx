"use client";
import { Award, Crown, DoorOpen, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { bossName } from "../assets/boss-definitions";
import { BossIdentity } from "./BossIdentity";
import type { RaidSnapshot, RaidStanding } from "../types";

const score = (n: number) =>
  n.toLocaleString("th-TH", { maximumFractionDigits: 2 });
const time = (ms: number) =>
  `${Math.floor(ms / 60000)}:${(Math.floor(ms / 1000) % 60).toString().padStart(2, "0")}.${(ms % 1000).toString().padStart(3, "0")}`;

function Ranking({
  rows,
  kill = false,
}: {
  rows: RaidStanding[];
  kill?: boolean;
}) {
  return (
    <div
      className="raid-table-wrap"
      tabIndex={0}
      role="region"
      aria-label={kill ? "ตารางปราบบอสเร็วที่สุด" : "ตารางคะแนนเฉลี่ย"}
    >
      <table className="raid-ranking">
        <caption>{kill ? "ปราบบอสเร็วที่สุด" : "คะแนนเฉลี่ยต่อคน"}</caption>
        <thead>
          <tr>
            <th scope="col">อันดับ / ทีม</th>
            <th scope="col">{kill ? "เวลา / ความคืบหน้า" : "คะแนนเฉลี่ย"}</th>
            <th scope="col">ตอบถูก</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.teamId}>
                <th scope="row">
                  <span>{row.rank ?? "—"}</span> {row.teamName}
                  <small>
                    <BossIdentity type={row.bossType} portrait={false} />
                  </small>
                </th>
                <td>
                  {kill
                    ? row.killDurationMs !== null
                      ? time(row.killDurationMs)
                      : `ยังไม่ปราบ · ${score(row.damagePercent)}%`
                    : score(row.averageScore)}
                  {!kill && (
                    <small>
                      รวม {score(row.totalScore)} ÷ {row.memberCount} คน
                    </small>
                  )}
                </td>
                <td>
                  {row.correctCount} ข้อ
                  <small>ความแม่นยำ {score(row.accuracy)}%</small>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3}>ยังไม่มีทีมที่เข้าร่วม</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function RaidResults({ snapshot }: { snapshot: RaidSnapshot }) {
  const download = () => {
    const cell = (value: unknown) =>
      `"${String(value ?? "").replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
    const rows = [
      [
        "ห้อง",
        "ทีม",
        "นักเรียน",
        "คะแนน Raid",
        "ตอบถูก",
        "คะแนนเชิงวิชาการ",
        "ข้ามข้อ",
        "ทำแล้ว",
        "จำนวนข้อ",
        "สิทธิ์คะแนน",
        "บอส",
      ],
      ...(snapshot.academicReport ?? []).map((r) => [
        snapshot.roomCode,
        r.teamName,
        r.displayName,
        r.score,
        r.correctCount,
        r.academicPoints,
        r.skippedCount,
        r.cursor,
        snapshot.questionCount,
        r.eligible ? "ผู้เล่น" : "ผู้ชม",
        bossName(r.bossType),
      ]),
    ];
    const blob = new Blob(
      ["\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boss-raid-${snapshot.roomCode}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const ended = snapshot.status === "ended";
  const topTeams = snapshot.averageStandings.slice(0, 3);
  const ownTeamStanding =
    snapshot.own && snapshot.team
      ? snapshot.averageStandings.find((row) => row.teamId === snapshot.team?.id)
      : null;
  const ownDefeatedBoss = Boolean(
    snapshot.own &&
      (snapshot.team?.defeatedAt || ownTeamStanding?.killDurationMs !== null),
  );
  const anyDefeatedBoss = snapshot.killStandings.some(
    (row) => row.killDurationMs !== null,
  );

  return (
    <section className="raid-results">
      {ended && (
        <div className="raid-victory-banner" data-victory={ownDefeatedBoss || anyDefeatedBoss}>
          <div className="raid-victory-header">
            <span className="raid-victory-emblem" aria-hidden="true">
              {ownDefeatedBoss || anyDefeatedBoss ? (
                <Trophy size={28} />
              ) : (
                <Swords size={28} />
              )}
            </span>
            <div>
              <h2>
                {snapshot.own
                  ? ownDefeatedBoss
                    ? "ปราบบอสสำเร็จ!"
                    : "จบการต่อสู้ Boss Raid!"
                  : anyDefeatedBoss
                    ? "สรุปผลศึก Boss Raid"
                    : "จบเวลาศึก Boss Raid"}
              </h2>
              <p>
                {ownTeamStanding
                  ? `${ownTeamStanding.teamName} ได้อันดับที่ ${ownTeamStanding.rank ?? "—"} · เฉลี่ย ${score(ownTeamStanding.averageScore)} คะแนน · ทำดาเมจบอส ${score(ownTeamStanding.damagePercent)}%`
                  : "สรุปผลงานทุกทีมจากการร่วมมือกันตอบคำถาม"}
              </p>
            </div>
            {snapshot.own && (
              <Link className="raid-primary raid-exit-link" href="/join">
                <DoorOpen size={18} aria-hidden="true" />
                กลับหน้าเข้าห้อง
              </Link>
            )}
          </div>

          {topTeams.length > 0 && (
            <div className="raid-podium" aria-label="อันดับทีมยอดเยี่ยม">
              {topTeams.map((row, idx) => (
                <div
                  className="raid-podium-card"
                  data-rank={row.rank ?? idx + 1}
                  data-own={Boolean(snapshot.own) && row.teamId === snapshot.team?.id}
                  key={row.teamId}
                >
                  <span className="raid-podium-rank">
                    {idx === 0 ? (
                      <Crown size={18} aria-hidden="true" />
                    ) : (
                      <Award size={16} aria-hidden="true" />
                    )}
                    อันดับ {row.rank ?? idx + 1}
                  </span>
                  <strong>{row.teamName}</strong>
                  <span className="raid-podium-score">
                    {score(row.averageScore)} คะแนนเฉลี่ย
                  </span>
                  <small>
                    {row.killDurationMs !== null
                      ? `ปราบบอสใน ${time(row.killDurationMs)}`
                      : `ดาเมจบอส ${score(row.damagePercent)}%`}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!ended && <h2>อันดับระหว่างเกม</h2>}
      <p>
        อันดับร่วมเมื่อคะแนนเฉลี่ยหรือเวลาเท่ากัน ทีมที่ยังไม่ปราบบอสเรียงตามความคืบหน้า
      </p>
      <div className="raid-rankings">
        <Ranking rows={snapshot.averageStandings} />
        <Ranking rows={snapshot.killStandings} kill />
      </div>

      {snapshot.own && (
        <div className="raid-personal-result">
          <h3>ผลของคุณ</h3>
          <dl>
            <div>
              <dt>คะแนน Raid</dt>
              <dd>{score(snapshot.own.score)}</dd>
            </div>
            <div>
              <dt>ตอบถูกเชิงวิชาการ</dt>
              <dd>
                {snapshot.own.correctCount} / {snapshot.questionCount} ข้อ
              </dd>
            </div>
            <div>
              <dt>คะแนนข้อที่ตอบถูก</dt>
              <dd>{score(snapshot.own.academicPoints ?? 0)}</dd>
            </div>
            <div>
              <dt>ข้ามจากการออกจากหน้า</dt>
              <dd>{snapshot.own.skippedCount ?? 0} ข้อ</dd>
            </div>
          </dl>
          <p>ตอบถูกขณะ HP 0 นับผลการเรียน แต่ไม่ได้คะแนน Raid</p>
        </div>
      )}

      {ended && Boolean(snapshot.academicReport?.length) && (
        <section className="raid-academic-report">
          <div className="raid-report-heading">
            <h3>ผลเชิงวิชาการรายคน</h3>
            <button className="raid-primary" onClick={download}>
              ดาวน์โหลดสรุป CSV
            </button>
          </div>
          <div
            className="raid-table-wrap"
            tabIndex={0}
            role="region"
            aria-label="ตารางผลเชิงวิชาการ"
          >
            <table className="raid-ranking">
              <thead>
                <tr>
                  <th scope="col">นักเรียน / ทีม</th>
                  <th scope="col">คะแนน Raid</th>
                  <th scope="col">ตอบถูก / คะแนนข้อ</th>
                  <th scope="col">ข้ามข้อ</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.academicReport?.map((r, i) => (
                  <tr key={i}>
                    <th scope="row">
                      {r.displayName}
                      <small>
                        {r.teamName}
                        {!r.eligible ? " · ผู้ชม" : ""}
                      </small>
                    </th>
                    <td>{score(r.score)}</td>
                    <td>
                      {r.correctCount}/{snapshot.questionCount}
                      <small>{score(r.academicPoints)} คะแนนเชิงวิชาการ</small>
                    </td>
                    <td>{r.skippedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </section>
  );
}
