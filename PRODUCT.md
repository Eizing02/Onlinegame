# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Teachers and students in Thai classroom settings use this product during short in-class quiz activities. Teachers need to create a room quickly, manage teams, run questions, and see live participation without complex setup. Students need to log in, enter a simple room code, choose or receive a team, answer questions, and understand their current team status on phone or desktop.

## Product Purpose

Realtime Quiz Game is a lightweight team-based quiz tool for classroom downtime, warmups, review games, and short competitive activities. Success means a teacher can start a room in minutes, students can join with minimal instruction, the round can finish inside the current class session, and the final team summary is clear enough to discuss immediately.

## Positioning

A zero-signup classroom competition tool powered by team-averaged scoring locked at round start. Unlike individual trivia games where top students dominate, every team member's response impacts the collective average score, preventing free-riding and unequal group sizes without complex handicap math.

## Operating Context

- Secondary and primary school classrooms in Thailand (typically 40–50 minute periods).
- Activity duration: 5–15 minutes (warmup, midterm review, or post-lesson recap).
- Devices: Students primarily use mobile smartphones or shared computer lab desktops; teachers use a laptop connected to a classroom projector or smart TV.
- Network: School Wi-Fi or cellular data with intermittent latency; system accommodates reconnects, late joins, and offline local JSON hosting.

## Capabilities and Constraints

- 4-digit numeric room codes without collisions across active rooms.
- Group sizing: 1–12 teams, up to 12 members per team.
- Team captain system: First member in a team can rename the team during lobby phase.
- Question types: short-text input, true/false, and 4-option multiple choice with LaTeX formulas (KaTeX) and image attachments.
- Synchronized state machine: `lobby` -> `question_active` -> `answer_locked` -> `showing_answer` -> `ended`.
- Dual-backend flexibility: zero-dependency local JSON file storage or cloud-ready Supabase with Realtime WebSockets.
- Single active room per teacher at any given time.

## Brand Commitments

- Brand Name: KruEIonline Realtime Quiz Game.
- Personality: Simple, playful, orderly.
- Visual Language: Gentle vintage/classic contemporary theme across the app: wine `#790D16`, parchment `#E5D3AF`, cream `#F5EFE1`, and mist blue `#AEC4D4`. Use dark brown ink on light surfaces, cream text on wine actions, and a gold accent for selected heroes. Preserve the original logo, character sprites, and source scene imagery.
- Motion: Purposeful, calm state feedback with reduced-motion support. Boss Raid shows server-confirmed combat before the next question within a common three-second presentation; the overall deadline continues. Answer confirmation uses a visible five-second countdown and can be confirmed immediately or canceled. Preserve original audio sources and existing Classic gameplay.
- Audio: Sound starts enabled, with shared mute and master, music/video, and effects levels saved across routes and reloads. Preserve the supplied Login clip audio, Classic background track and answer feedback, and Raid phase music and effects. Respect browser autoplay limits with muted video fallback and trusted pointer/key retry without blocking login or answers.
- Anti-references: Avoid visually chaotic, over-gamified, neon party-game noise (e.g. Kahoot/Blooket loud visuals) and avoid dense, dry enterprise dashboards.

## Evidence on Hand

- Production Next.js 16 codebase with full App Router and Server Actions.
- Verified test student roster and credentials (`data/student.example.csv`).
- Comprehensive Playwright end-to-end test suite (`tests/gameplay.spec.ts`).
- Working audio assets, GIFs, and ranking illustrations under `public/assets/`.

## Product Principles

1. Classroom speed first: every primary workflow should be obvious under time pressure.
2. One room, one round, one focus: keep the current game state, room code, teams, and next action easy to scan.
3. Teacher confidence, student clarity: teacher screens emphasize control and monitoring; student screens emphasize what to do next.
4. Familiar controls over novelty: use standard forms, buttons, status labels, and feedback patterns so users do not need to learn the UI.
5. Calm competition: make scores and rankings visible, but avoid visual noise that distracts from the classroom activity.

## Accessibility & Inclusion

Aim for readable Thai text, strong contrast, keyboard-accessible controls, clear focus states, mobile-friendly layouts, and reduced reliance on animation. Motion should be minimal and state-driven. Color should never be the only way to understand status, ranking, warnings, or correctness.
