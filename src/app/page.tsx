import Link from "next/link";
import {
  BarChart3,
  BookOpenCheck,
  PlayCircle,
  UsersRound,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";

export default function Home() {
  const workflow = [
    "ครูสร้างห้อง",
    "นักเรียนเข้าด้วยรหัส",
    "ระบบจัดกลุ่ม",
    "ครูเริ่มคำถาม",
    "นักเรียนตอบ",
    "คะแนนอัปเดตสด",
  ];

  return (
    <AppShell>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-primary">
              <UsersRound size={18} />
              เกมตอบคำถามออนไลน์แบบกลุ่ม
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-foreground sm:text-5xl">
                ห้องเรียนตอบคำถามแบบทีม พร้อมคะแนน Real-time
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted">
                โครงแรกของระบบสำหรับครูสร้างห้อง ควบคุมคำถาม จัดกลุ่มนักเรียน
                และดูคะแนนสดจาก Dashboard เดียว
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                <BookOpenCheck size={18} />
                เข้าฝั่งครู
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border bg-white px-5 text-sm font-semibold text-foreground transition hover:bg-surface"
              >
                <PlayCircle size={18} />
                เข้าร่วมเกม
              </Link>
            </div>
          </div>

          <Panel className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted">ห้องตัวอย่าง</p>
                <p className="text-3xl font-semibold text-foreground">A1B2C3</p>
              </div>
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                LIVE
              </div>
            </div>
            <div className="space-y-3">
              {workflow.map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-md border border-border bg-white p-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Panel>
            <BookOpenCheck className="mb-4 text-primary" size={28} />
            <h2 className="text-lg font-semibold">ชุดคำถาม</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              ครูสร้างคำถาม คำตอบที่ถูก คะแนน และเวลาต่อข้อ
            </p>
          </Panel>
          <Panel>
            <UsersRound className="mb-4 text-emerald-600" size={28} />
            <h2 className="text-lg font-semibold">จัดกลุ่มอัตโนมัติ</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              นักเรียนเข้าด้วยรหัสแล้วระบบจัดเข้ากลุ่มที่ว่าง
            </p>
          </Panel>
          <Panel>
            <BarChart3 className="mb-4 text-amber-600" size={28} />
            <h2 className="text-lg font-semibold">คะแนนสด</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Dashboard ครูเห็นคะแนนและอันดับแบบ Real-time
            </p>
          </Panel>
        </div>
      </section>
    </AppShell>
  );
}
