# แผนที่โค้ดและไฟล์

สร้างจากไฟล์จริงวันที่ 9 กันยายน 2026 ใช้ประกอบ SYSTEM-REVIEW-TH.md ตำแหน่งบรรทัดอ้างอิงโค้ดก่อนแก้ไขใด ๆ

มี source files ที่เป็น TS/TSX/CSS 55 ไฟล์ รวม 9690 บรรทัด (รวมบรรทัดว่าง)

## [src/app/api/play/[roomCode]/route.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/api/play/[roomCode]/route.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| PlayApiProps | type | [12](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/api/play/[roomCode]/route.ts:12>) |
| requireStudentResponse | helper function | [16](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/api/play/[roomCode]/route.ts:16>) |
| GET | export function | [32](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/api/play/[roomCode]/route.ts:32>) |
| POST | export function | [52](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/api/play/[roomCode]/route.ts:52>) |

## [src/app/api/teacher/rooms/[roomCode]/control/route.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/api/teacher/rooms/[roomCode]/control/route.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| ControlApiProps | type | [16](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/api/teacher/rooms/[roomCode]/control/route.ts:16>) |
| TeacherCommand | type | [20](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/api/teacher/rooms/[roomCode]/control/route.ts:20>) |
| isTeacherCommand | helper function | [22](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/api/teacher/rooms/[roomCode]/control/route.ts:22>) |
| POST | export function | [32](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/api/teacher/rooms/[roomCode]/control/route.ts:32>) |

## [src/app/api/teacher/rooms/[roomCode]/dashboard/route.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/api/teacher/rooms/[roomCode]/dashboard/route.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| DashboardApiProps | type | [12](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/api/teacher/rooms/[roomCode]/dashboard/route.ts:12>) |
| GET | export function | [16](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/api/teacher/rooms/[roomCode]/dashboard/route.ts:16>) |

## [src/app/auth/actions.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/auth/actions.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| getFormString | helper function | [8](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/auth/actions.ts:8>) |
| encodedRedirect | helper function | [13](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/auth/actions.ts:13>) |
| signInWithSheetAction | export function | [21](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/auth/actions.ts:21>) |
| signOutAction | export function | [55](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/auth/actions.ts:55>) |

## [src/app/globals.css](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/globals.css>)

กำหนด theme tokens, global style, utility overrides และ reduced-motion rule

## [src/app/join/actions.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/join/actions.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| getFormString | helper function | [9](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/join/actions.ts:9>) |
| encodedRedirect | helper function | [14](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/join/actions.ts:14>) |
| findRoomAction | export function | [22](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/join/actions.ts:22>) |
| chooseTeamAction | export function | [33](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/join/actions.ts:33>) |
| randomTeamAction | export function | [60](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/join/actions.ts:60>) |
| leaveTeamAction | export function | [81](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/join/actions.ts:81>) |

## [src/app/join/page.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/join/page.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| JoinPageProps | type | [19](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/join/page.tsx:19>) |
| JoinPage | export function | [27](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/join/page.tsx:27>) |

## [src/app/layout.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/layout.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| metadata | export constant/schema | [16](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/layout.tsx:16>) |
| viewport | export constant/schema | [58](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/layout.tsx:58>) |
| RootLayout | export function | [62](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/layout.tsx:62>) |

## [src/app/login/page.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/login/page.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| LoginPageProps | type | [8](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/login/page.tsx:8>) |
| LoginPage | export function | [15](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/login/page.tsx:15>) |

## [src/app/page.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/page.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| Home | export function | [3](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/page.tsx:3>) |

## [src/app/play/[roomCode]/loading.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/play/[roomCode]/loading.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| PlayLoading | export function | [4](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/play/[roomCode]/loading.tsx:4>) |

## [src/app/play/[roomCode]/page.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/play/[roomCode]/page.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| PlayPageProps | type | [9](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/play/[roomCode]/page.tsx:9>) |
| PlayPage | export function | [13](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/play/[roomCode]/page.tsx:13>) |

## [src/app/play/[roomCode]/play-room.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/play/[roomCode]/play-room.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| formatScore | helper function | [52](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/play/[roomCode]/play-room.tsx:52>) |
| formatRemainingTime | helper function | [56](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/play/[roomCode]/play-room.tsx:56>) |
| getRemainingSeconds | helper function | [63](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/play/[roomCode]/play-room.tsx:63>) |
| getStudentPollInterval | helper function | [92](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/play/[roomCode]/play-room.tsx:92>) |
| getRankAsset | helper function | [96](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/play/[roomCode]/play-room.tsx:96>) |
| PlayRoom | export function | [104](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/play/[roomCode]/play-room.tsx:104>) |

## [src/app/teacher/actions.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/actions.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| getFormString | helper function | [24](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/actions.ts:24>) |
| encodedRedirect | helper function | [29](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/actions.ts:29>) |
| getSafeTeacherReturnPath | helper function | [37](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/actions.ts:37>) |
| isFormFile | helper function | [51](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/actions.ts:51>) |
| getFormImageFile | helper function | [64](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/actions.ts:64>) |
| getQuestionType | helper function | [70](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/actions.ts:70>) |
| needsQuestionTypeMigration | helper function | [78](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/actions.ts:78>) |
| createQuestionSetAction | export function | [94](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/actions.ts:94>) |
| addQuestionAction | export function | [113](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/actions.ts:113>) |
| deleteQuestionAction | export function | [238](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/actions.ts:238>) |
| deleteSelectedQuestionsAction | export function | [262](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/actions.ts:262>) |
| deleteQuestionSetAction | export function | [288](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/actions.ts:288>) |
| deleteRoomAction | export function | [315](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/actions.ts:315>) |
| createRoomAction | export function | [349](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/actions.ts:349>) |

## [src/app/teacher/login/page.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/login/page.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| TeacherLoginPage | export function | [3](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/login/page.tsx:3>) |

## [src/app/teacher/question-sets/[questionSetId]/page.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/question-sets/[questionSetId]/page.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| QuestionSetDetailPageProps | type | [26](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/question-sets/[questionSetId]/page.tsx:26>) |
| QuestionSetDetailPage | export function | [36](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/question-sets/[questionSetId]/page.tsx:36>) |

## [src/app/teacher/question-sets/[questionSetId]/question-type-fields.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/question-sets/[questionSetId]/question-type-fields.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| QuestionTypeFields | export function | [20](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/question-sets/[questionSetId]/question-type-fields.tsx:20>) |

## [src/app/teacher/question-sets/page.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/question-sets/page.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| QuestionSetsPageProps | type | [10](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/question-sets/page.tsx:10>) |
| QuestionSetsPage | export function | [16](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/question-sets/page.tsx:16>) |

## [src/app/teacher/rooms/[roomCode]/dashboard/live-room-panels.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/dashboard/live-room-panels.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| TeacherCommand | type | [27](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/dashboard/live-room-panels.tsx:27>) |
| ControlButtonProps | type | [29](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/dashboard/live-room-panels.tsx:29>) |
| formatScore | helper function | [64](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/dashboard/live-room-panels.tsx:64>) |
| formatRemainingTime | helper function | [68](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/dashboard/live-room-panels.tsx:68>) |
| getRemainingSeconds | helper function | [75](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/dashboard/live-room-panels.tsx:75>) |
| getTeacherPollInterval | helper function | [104](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/dashboard/live-room-panels.tsx:104>) |
| ControlButton | helper function | [108](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/dashboard/live-room-panels.tsx:108>) |
| LiveRoomPanels | export function | [138](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/dashboard/live-room-panels.tsx:138>) |

## [src/app/teacher/rooms/[roomCode]/dashboard/loading.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/dashboard/loading.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| DashboardLoading | export function | [4](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/dashboard/loading.tsx:4>) |

## [src/app/teacher/rooms/[roomCode]/dashboard/page.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/dashboard/page.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| DashboardPageProps | type | [14](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/dashboard/page.tsx:14>) |
| TeacherDashboardPage | export function | [18](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/dashboard/page.tsx:18>) |

## [src/app/teacher/rooms/[roomCode]/results/page.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/results/page.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| ResultsPageProps | type | [16](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/results/page.tsx:16>) |
| formatScore | helper function | [24](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/results/page.tsx:24>) |
| ResultsPage | export function | [28](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/[roomCode]/results/page.tsx:28>) |

## [src/app/teacher/rooms/new/page.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/new/page.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| NewRoomPageProps | type | [10](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/new/page.tsx:10>) |
| NewRoomPage | export function | [18](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/app/teacher/rooms/new/page.tsx:18>) |

## [src/components/layout/app-shell.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/layout/app-shell.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| AppShell | export function | [5](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/layout/app-shell.tsx:5>) |

## [src/components/ui/button-link.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/button-link.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| ButtonLinkProps | type | [5](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/button-link.tsx:5>) |
| ButtonLink | export function | [12](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/button-link.tsx:12>) |

## [src/components/ui/confirm-submit-button.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/confirm-submit-button.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| ConfirmSubmitButtonProps | type | [5](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/confirm-submit-button.tsx:5>) |
| ConfirmSubmitButton | export function | [9](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/confirm-submit-button.tsx:9>) |

## [src/components/ui/math-text.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/math-text.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| MathTextProps | type | [5](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/math-text.tsx:5>) |
| MathPart | type | [11](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/math-text.tsx:11>) |
| parseMathText | helper function | [18](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/math-text.tsx:18>) |
| renderMath | helper function | [52](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/math-text.tsx:52>) |
| MathText | export function | [62](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/math-text.tsx:62>) |

## [src/components/ui/panel.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/panel.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| Panel | export function | [3](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/panel.tsx:3>) |

## [src/components/ui/question-image.tsx](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/question-image.tsx>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| QuestionImageProps | type | [7](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/question-image.tsx:7>) |
| QuestionImage | export function | [13](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/components/ui/question-image.tsx:13>) |

## [src/data/demo-questions.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/data/demo-questions.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| demoQuestionSets | export constant/schema | [1](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/data/demo-questions.ts:1>) |

## [src/lib/auth/accounts.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/accounts.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| parseCsvLine | helper function | [10](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/accounts.ts:10>) |
| pick | helper function | [34](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/accounts.ts:34>) |
| normalizeRole | helper function | [46](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/accounts.ts:46>) |
| readAccountsFromFile | helper function | [57](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/accounts.ts:57>) |
| getSheetAccounts | export function | [88](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/accounts.ts:88>) |
| findAccountByCredentials | export function | [103](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/accounts.ts:103>) |

## [src/lib/auth/session.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/session.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| encodeSession | helper function | [8](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/session.ts:8>) |
| decodeSession | helper function | [12](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/session.ts:12>) |
| createSession | export function | [32](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/session.ts:32>) |
| clearSession | export function | [52](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/session.ts:52>) |
| getSession | export function | [57](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/session.ts:57>) |
| requireRole | export function | [63](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/session.ts:63>) |

## [src/lib/auth/supabase-accounts.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/supabase-accounts.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| AccountRow | type | [4](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/supabase-accounts.ts:4>) |
| toSheetAccount | helper function | [12](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/supabase-accounts.ts:12>) |
| findSupabaseAccountByCredentials | export function | [22](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/supabase-accounts.ts:22>) |

## [src/lib/auth/teacher-room-access.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/teacher-room-access.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| TeacherRoomAccessPayload | type | [7](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/teacher-room-access.ts:7>) |
| decodeTeacherRoomAccessToken | helper function | [12](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/teacher-room-access.ts:12>) |
| createTeacherRoomAccessToken | export function | [31](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/teacher-room-access.ts:31>) |
| getSessionFromTeacherRoomAccessToken | export function | [42](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/auth/teacher-room-access.ts:42>) |

## [src/lib/data/backend.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/backend.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| DataBackend | type | [3](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/backend.ts:3>) |
| getDataBackend | export function | [5](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/backend.ts:5>) |
| isSupabaseDataBackend | export function | [19](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/backend.ts:19>) |

## [src/lib/data/game-sessions.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| StoredTeam | type | [37](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:37>) |
| StoredParticipant | type | [47](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:47>) |
| TeamParticipantSummary | type | [59](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:59>) |
| StoredAnswer | type | [63](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:63>) |
| StoredGameSession | type | [75](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:75>) |
| QuestionSnapshot | type | [98](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:98>) |
| QuestionOptionSnapshot | type | [111](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:111>) |
| TeamSummary | type | [118](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:118>) |
| RankedTeam | type | [125](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:125>) |
| AnswerProgress | type | [137](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:137>) |
| TeacherDashboardSnapshot | type | [143](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:143>) |
| StudentPlaySnapshot | type | [169](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:169>) |
| ParticipantScoreSummary | type | [199](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:199>) |
| normalizeTeam | helper function | [211](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:211>) |
| normalizeParticipant | helper function | [229](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:229>) |
| normalizeAnswer | helper function | [250](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:250>) |
| normalizeGameSession | helper function | [264](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:264>) |
| readGameSessions | helper function | [293](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:293>) |
| writeGameSessions | helper function | [310](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:310>) |
| hasActiveRoomCode | helper function | [319](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:319>) |
| generateUniqueRoomCode | helper function | [328](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:328>) |
| isActiveParticipant | helper function | [348](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:348>) |
| hasGameStarted | helper function | [352](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:352>) |
| getTeamMemberCount | helper function | [356](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:356>) |
| getTeamMembers | helper function | [363](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:363>) |
| getTeamCaptain | helper function | [376](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:376>) |
| isTeamCaptain | helper function | [380](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:380>) |
| isQuestionTimerExpired | helper function | [391](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:391>) |
| getQuestionTimerWindow | helper function | [398](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:398>) |
| assignCurrentQuestionTimer | helper function | [410](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:410>) |
| getEligibleParticipantCount | helper function | [432](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:432>) |
| getCurrentQuestionAnswers | helper function | [441](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:441>) |
| getTeamCapacity | helper function | [447](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:447>) |
| findAutoTeam | helper function | [463](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:463>) |
| getCurrentQuestionNumber | helper function | [473](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:473>) |
| toQuestionSnapshot | helper function | [477](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:477>) |
| getCurrentQuestion | helper function | [505](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:505>) |
| recalculateTeamScores | helper function | [514](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:514>) |
| getAnswerProgress | helper function | [528](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:528>) |
| getTeamSummaries | export function | [541](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:541>) |
| getVisibleTeamScores | helper function | [575](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:575>) |
| getRankedTeams | export function | [606](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:606>) |
| createLocalGameSession | export function | [670](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:670>) |
| getActiveTeacherGameSession | export function | [739](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:739>) |
| getLocalGameSessionByRoomCode | export function | [759](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:759>) |
| getLocalTeacherGameSession | export function | [773](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:773>) |
| getJoinableGameSession | export function | [790](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:790>) |
| joinLocalGameSession | export function | [800](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:800>) |
| startLocalGameSession | export function | [926](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:926>) |
| lockLocalGameAnswers | export function | [1002](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:1002>) |
| showLocalGameAnswer | export function | [1027](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:1027>) |
| advanceLocalGameQuestion | export function | [1055](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:1055>) |
| endLocalGameSession | export function | [1107](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:1107>) |
| leaveLocalTeam | export function | [1131](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:1131>) |
| renameLocalTeam | export function | [1174](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:1174>) |
| deleteLocalGameSession | export function | [1235](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:1235>) |
| updateTeacherSession | helper function | [1263](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:1263>) |
| submitLocalAnswer | export function | [1295](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:1295>) |
| getParticipantScoreSummaries | export function | [1411](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:1411>) |
| getTeacherDashboardSnapshot | export function | [1451](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:1451>) |
| getStudentPlaySnapshot | export function | [1498](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:1498>) |
| buildStudentPlaySnapshot | helper function | [1588](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/game-sessions.ts:1588>) |

## [src/lib/data/question-bank.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| QUESTION_TYPES | export constant/schema | [27](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:27>) |
| QuestionType | type | [33](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:33>) |
| StoredQuestionOption | type | [35](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:35>) |
| CreateQuestionOptionInput | type | [42](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:42>) |
| CreateQuestionInput | type | [48](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:48>) |
| StoredQuestion | type | [60](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:60>) |
| StoredQuestionSet | type | [74](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:74>) |
| DeleteQuestionSetResult | type | [84](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:84>) |
| QuestionSetGameSessionRef | type | [92](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:92>) |
| readQuestionBank | helper function | [99](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:99>) |
| normalizeQuestionType | helper function | [114](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:114>) |
| normalizeQuestionOption | helper function | [120](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:120>) |
| normalizeQuestion | helper function | [134](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:134>) |
| isImageFile | helper function | [154](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:154>) |
| getSafeFileName | helper function | [158](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:158>) |
| storeLocalQuestionImage | helper function | [171](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:171>) |
| removeLocalQuestionImages | helper function | [210](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:210>) |
| readQuestionBankGameSessions | helper function | [233](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:233>) |
| writeQuestionBank | helper function | [248](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:248>) |
| writeQuestionBankGameSessions | helper function | [257](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:257>) |
| getLocalQuestionSetSummaries | export function | [270](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:270>) |
| getLocalQuestionSet | export function | [292](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:292>) |
| createLocalQuestionSet | export function | [317](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:317>) |
| addLocalQuestion | export function | [343](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:343>) |
| deleteLocalQuestion | export function | [394](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:394>) |
| deleteLocalQuestions | export function | [434](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:434>) |
| deleteLocalQuestionSet | export function | [480](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/question-bank.ts:480>) |

## [src/lib/data/supabase-game-sessions.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| SessionRow | type | [13](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:13>) |
| TeamRow | type | [33](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:33>) |
| ParticipantRow | type | [43](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:43>) |
| AnswerRow | type | [55](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:55>) |
| CloseGameSessionRpcRow | type | [67](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:67>) |
| isMissingCloseSessionRpcError | helper function | [72](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:72>) |
| mapTeam | helper function | [83](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:83>) |
| mapParticipant | helper function | [95](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:95>) |
| mapAnswer | helper function | [109](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:109>) |
| isMissingSelectedOptionIdError | helper function | [123](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:123>) |
| fetchSessionAnswers | helper function | [134](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:134>) |
| mapSession | helper function | [161](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:161>) |
| fetchSessionByRoomCode | helper function | [211](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:211>) |
| fetchSessionById | helper function | [227](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:227>) |
| getTeamMemberCount | helper function | [241](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:241>) |
| getTeamMembers | helper function | [248](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:248>) |
| getTeamCaptain | helper function | [261](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:261>) |
| isTeamCaptain | helper function | [265](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:265>) |
| isQuestionTimerExpired | helper function | [276](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:276>) |
| getQuestionTimerWindow | helper function | [283](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:283>) |
| hasGameStarted | helper function | [300](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:300>) |
| isActiveParticipant | helper function | [304](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:304>) |
| findAutoTeam | helper function | [308](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:308>) |
| insertEvent | helper function | [318](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:318>) |
| touchSession | helper function | [334](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:334>) |
| recalculateTeamScores | helper function | [343](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:343>) |
| generateSupabaseRoomCodeError | helper function | [371](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:371>) |
| createSupabaseGameSession | export function | [375](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:375>) |
| getSupabaseActiveTeacherGameSession | export function | [441](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:441>) |
| getSupabaseGameSessionByRoomCode | export function | [458](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:458>) |
| getSupabaseTeacherGameSession | export function | [462](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:462>) |
| joinSupabaseGameSession | export function | [475](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:475>) |
| startSupabaseGameSession | export function | [583](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:583>) |
| updateTeacherSession | helper function | [684](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:684>) |
| lockSupabaseGameAnswers | export function | [717](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:717>) |
| showSupabaseGameAnswer | export function | [740](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:740>) |
| advanceSupabaseGameQuestion | export function | [766](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:766>) |
| endSupabaseGameSession | export function | [836](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:836>) |
| leaveSupabaseTeam | export function | [860](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:860>) |
| renameSupabaseTeam | export function | [906](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:906>) |
| deleteSupabaseGameSession | export function | [964](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:964>) |
| submitSupabaseAnswer | export function | [1012](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-game-sessions.ts:1012>) |

## [src/lib/data/supabase-question-bank.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| QuestionSetRow | type | [21](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:21>) |
| QuestionRow | type | [30](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:30>) |
| QuestionOptionRow | type | [43](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:43>) |
| DeleteQuestionSetSafelyRpcRow | type | [51](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:51>) |
| isMissingRpcFunctionError | helper function | [57](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:57>) |
| isMissingQuestionMetadataError | helper function | [65](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:65>) |
| isMissingQuestionOptionsTableError | helper function | [74](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:74>) |
| normalizeQuestionType | helper function | [85](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:85>) |
| mapQuestionOption | helper function | [91](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:91>) |
| mapQuestion | helper function | [100](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:100>) |
| isImageFile | helper function | [119](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:119>) |
| getSafeFileName | helper function | [123](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:123>) |
| ensureQuestionImageBucket | helper function | [134](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:134>) |
| uploadQuestionImage | helper function | [150](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:150>) |
| removeQuestionImages | helper function | [212](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:212>) |
| getQuestionOptions | helper function | [228](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:228>) |
| getQuestions | helper function | [259](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:259>) |
| getSupabaseQuestionSetSummaries | export function | [300](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:300>) |
| getSupabaseQuestionSet | export function | [330](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:330>) |
| createSupabaseQuestionSet | export function | [361](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:361>) |
| addSupabaseQuestion | export function | [394](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:394>) |
| deleteSupabaseQuestion | export function | [516](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:516>) |
| deleteSupabaseQuestions | export function | [576](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:576>) |
| deleteSupabaseQuestionSetDirectly | helper function | [643](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:643>) |
| deleteSupabaseQuestionSet | export function | [704](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/supabase-question-bank.ts:704>) |

## [src/lib/data/teacher.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/teacher.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| QuestionSetSummary | type | [4](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/teacher.ts:4>) |
| TeacherDataState | type | [13](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/teacher.ts:13>) |
| getTeacherQuestionSets | export function | [23](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/data/teacher.ts:23>) |

## [src/lib/game/answer-checking.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/game/answer-checking.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| normalizeAnswer | export function | [1](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/game/answer-checking.ts:1>) |
| isAnswerCorrect | export function | [5](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/game/answer-checking.ts:5>) |

## [src/lib/game/room-code.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/game/room-code.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| generateRoomCode | export function | [1](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/game/room-code.ts:1>) |
| normalizeRoomCode | export function | [7](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/game/room-code.ts:7>) |
| isValidRoomCode | export function | [11](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/game/room-code.ts:11>) |

## [src/lib/game/scoring.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/game/scoring.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| ScoreInput | type | [3](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/game/scoring.ts:3>) |
| calculateAwardedPoints | export function | [9](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/game/scoring.ts:9>) |
| rankTeams | export function | [17](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/game/scoring.ts:17>) |

## [src/lib/game/team-assignment.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/game/team-assignment.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| TeamCapacity | type | [1](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/game/team-assignment.ts:1>) |
| findTeamForNewParticipant | export function | [7](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/game/team-assignment.ts:7>) |
| isRoomFull | export function | [27](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/game/team-assignment.ts:27>) |

## [src/lib/supabase/client.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/client.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| createSupabaseBrowserClient | export function | [3](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/client.ts:3>) |

## [src/lib/supabase/env.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/env.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| firstEnv | helper function | [1](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/env.ts:1>) |
| getSupabaseUrl | export function | [13](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/env.ts:13>) |
| getSupabaseAnonKey | export function | [17](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/env.ts:17>) |
| getSupabaseServiceRoleKey | export function | [26](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/env.ts:26>) |
| hasSupabasePublicEnv | export function | [30](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/env.ts:30>) |
| hasSupabaseAdminEnv | export function | [34](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/env.ts:34>) |

## [src/lib/supabase/realtime-game.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/realtime-game.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| SubscribeToGameSessionChangesParams | type | [3](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/realtime-game.ts:3>) |
| subscribeToGameSessionChanges | export function | [18](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/realtime-game.ts:18>) |

## [src/lib/supabase/server.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/server.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| isSupabaseConfigured | export function | [13](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/server.ts:13>) |
| isSupabaseAdminConfigured | export function | [17](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/server.ts:17>) |
| createSupabaseServerClient | export function | [21](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/server.ts:21>) |
| createSupabaseAdminClient | export function | [49](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/supabase/server.ts:49>) |

## [src/lib/utils.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/utils.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| cn | export function | [4](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/utils.ts:4>) |

## [src/lib/validations/answer.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/validations/answer.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| submitAnswerSchema | export constant/schema | [3](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/validations/answer.ts:3>) |

## [src/lib/validations/question.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/validations/question.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| questionSchema | export constant/schema | [3](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/validations/question.ts:3>) |

## [src/lib/validations/room.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/validations/room.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| roomCodeSchema | export constant/schema | [3](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/validations/room.ts:3>) |
| createRoomSchema | export constant/schema | [8](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/lib/validations/room.ts:8>) |

## [src/types/auth.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/auth.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| AppRole | type | [1](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/auth.ts:1>) |
| SheetAccount | type | [3](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/auth.ts:3>) |
| AppSession | type | [11](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/auth.ts:11>) |

## [src/types/database.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/database.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| Json | type | [1](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/database.ts:1>) |
| AccountRow | type | [9](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/database.ts:9>) |
| QuestionSetRow | type | [19](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/database.ts:19>) |
| QuestionRow | type | [28](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/database.ts:28>) |
| QuestionOptionRow | type | [42](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/database.ts:42>) |
| GameSessionRow | type | [51](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/database.ts:51>) |
| TeamRow | type | [77](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/database.ts:77>) |
| ParticipantRow | type | [90](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/database.ts:90>) |
| AnswerRow | type | [103](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/database.ts:103>) |
| GameEventRow | type | [118](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/database.ts:118>) |

## [src/types/game.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/game.ts>)

| ชื่อ | ชนิด | บรรทัด |
|---|---|---|
| GameStatus | type | [1](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/game.ts:1>) |
| TeamSnapshot | type | [9](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/game.ts:9>) |
| ParticipantSnapshot | type | [16](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/src/types/game.ts:16>) |

## ไฟล์ประกอบ

| ไฟล์ | ขนาด bytes |
|---|---:|
| [.env.local.example](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/.env.local.example>) | 106 |
| [.gitignore](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/.gitignore>) | 611 |
| [AGENTS.md](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/AGENTS.md>) | 3143 |
| [CLAUDE.md](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/CLAUDE.md>) | 11 |
| [HANDOFF.md](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/HANDOFF.md>) | 14524 |
| [PRODUCT.md](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/PRODUCT.md>) | 4089 |
| [README.md](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/README.md>) | 6136 |
| [data/game-sessions.example.json](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/data/game-sessions.example.json>) | 3 |
| [data/question-sets.example.json](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/data/question-sets.example.json>) | 3 |
| [data/student.example.csv](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/data/student.example.csv>) | 165 |
| [eslint.config.mjs](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/eslint.config.mjs>) | 536 |
| [next-env.d.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/next-env.d.ts>) | 253 |
| [next.config.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/next.config.ts>) | 231 |
| [package-lock.json](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/package-lock.json>) | 241163 |
| [package.json](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/package.json>) | 833 |
| [playwright.config.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/playwright.config.ts>) | 120 |
| [postcss.config.mjs](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/postcss.config.mjs>) | 94 |
| [public/apple-icon.png](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/apple-icon.png>) | 33376 |
| [public/assets/audio/answer-sci-fi.wav](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/assets/audio/answer-sci-fi.wav>) | 132344 |
| [public/assets/audio/bg-sci-fi.wav](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/assets/audio/bg-sci-fi.wav>) | 1323044 |
| [public/assets/brand/logo.png](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/assets/brand/logo.png>) | 456937 |
| [public/assets/gifs/rank-4-plus.gif](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/assets/gifs/rank-4-plus.gif>) | 7867477 |
| [public/assets/gifs/reveal-correct.gif](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/assets/gifs/reveal-correct.gif>) | 279594 |
| [public/assets/gifs/reveal-wrong.gif](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/assets/gifs/reveal-wrong.gif>) | 6315235 |
| [public/assets/ranks/rank-1.png](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/assets/ranks/rank-1.png>) | 2306530 |
| [public/assets/ranks/rank-2.png](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/assets/ranks/rank-2.png>) | 2678012 |
| [public/assets/ranks/rank-3.png](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/assets/ranks/rank-3.png>) | 2694967 |
| [public/favicon.ico](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/favicon.ico>) | 102698 |
| [public/file.svg](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/file.svg>) | 391 |
| [public/globe.svg](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/globe.svg>) | 1035 |
| [public/icon.png](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/icon.png>) | 179154 |
| [public/manifest.webmanifest](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/manifest.webmanifest>) | 607 |
| [public/next.svg](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/next.svg>) | 1375 |
| [public/og-image.png](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/og-image.png>) | 249059 |
| [public/vercel.svg](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/vercel.svg>) | 128 |
| [public/window.svg](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/public/window.svg>) | 385 |
| [scripts/seed-supabase.mjs](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/scripts/seed-supabase.mjs>) | 5388 |
| [supabase/migrations/001_initial_schema.sql](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/supabase/migrations/001_initial_schema.sql>) | 8599 |
| [supabase/migrations/002_enable_realtime_publication.sql](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/supabase/migrations/002_enable_realtime_publication.sql>) | 1305 |
| [supabase/migrations/003_gameplay_flow_upgrades.sql](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/supabase/migrations/003_gameplay_flow_upgrades.sql>) | 976 |
| [supabase/migrations/004_session_cleanup_functions.sql](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/supabase/migrations/004_session_cleanup_functions.sql>) | 2058 |
| [supabase/migrations/005_question_types_and_images.sql](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/supabase/migrations/005_question_types_and_images.sql>) | 2206 |
| [tests/gameplay.spec.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/tests/gameplay.spec.ts>) | 8718 |
| [tests/question-sets.spec.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/tests/question-sets.spec.ts>) | 2179 |
| [tests/rooms.spec.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/tests/rooms.spec.ts>) | 3463 |
| [tests/smoke-login.spec.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/tests/smoke-login.spec.ts>) | 871 |
| [tests/student-join.spec.ts](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/tests/student-join.spec.ts>) | 4656 |
| [tsconfig.json](<D:/สื่อการสอนต่างๆ/online game/Onlinegame-main/tsconfig.json>) | 670 |

ไม่รวม dependencies ที่ติดตั้ง, build output, tooling skill distribution และข้อมูลทดสอบใน tmp เนื่องจากไม่ใช่ source ของการทำงานเกม
