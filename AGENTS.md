<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Impeccable UI/UX Workflow

Use Impeccable whenever the task touches frontend UI/UX, layout, components, dashboard screens, forms, responsive behavior, animation, visual polish, design systems, accessibility, or product copy.

Before UI work:
- Run `node .agents/skills/impeccable/scripts/context.mjs` once per session, or with `--target <path>` for a specific route/file.
- If a command is chosen, read `.agents/skills/impeccable/reference/<command>.md` before acting.
- Read the current product register guidance in `.agents/skills/impeccable/reference/product.md`.
- Inspect existing UI conventions first, especially `src/app/globals.css`, shared components, and representative pages.

Command routing:
- Use `/impeccable shape <feature>` to plan a new screen or flow before implementation.
- Use `/impeccable craft <feature>` when designing and building a new UI feature end to end.
- Use `/impeccable polish <target>` for final spacing, hierarchy, hover/focus states, empty states, and overall finish.
- Use `/impeccable critique <target>` for UX review and prioritized findings.
- Use `/impeccable audit <target>` before deploy or handoff, especially for accessibility, responsive behavior, and production readiness.
- Use `/impeccable adapt <target>` for mobile/tablet issues.
- Use `/impeccable harden <target>` for long Thai names, empty states, slow network, reconnect/disconnect, and other classroom edge cases.
- Use `/impeccable clarify <target>` when labels, buttons, errors, or instructions are unclear.
- Use `/impeccable animate <target>` for purposeful feedback such as answer submitted, correct/incorrect, score update, and room state transitions.
- Use `/impeccable layout` or `/impeccable distill` when a page feels crowded or hard to scan.
- Use `/impeccable typeset` for Thai text readability and hierarchy.
- Use `/impeccable colorize`, `/impeccable quieter`, or `/impeccable bolder` only when the visual tone specifically needs color/system/tone adjustment.
- Use `/impeccable optimize` for UI performance issues and `/impeccable extract` when repeated UI patterns should become reusable components.
- Use `/impeccable document` when the design system changes or when `DESIGN.md` needs to be created/updated.

Project-specific direction:
- This app is a classroom product, not a marketing site. Keep it fast, calm, readable, and teacher/student focused.
- Preserve the product personality from `PRODUCT.md`: simple, playful, orderly.
- Avoid chaotic party-game visuals, childish styling, and dense enterprise dashboards.
- Prioritize obvious flows: teacher creates room, students join with a 4-digit code, choose teams, answer, and see clear results.
- Keep Thai text readable, high contrast, and mobile friendly. Do not rely on color alone for correctness, ranking, warnings, or status.
