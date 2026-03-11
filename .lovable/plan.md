

## Plan: White Background + Status Badge Fix

### What changes

**1. `src/index.css` — Change main area background to white, keep cards blue, keep sidebar as-is**

- `--background`: change from dark (`220 25% 8%`) → white (`0 0% 100%`)
- `--foreground`: change from light (`210 15% 95%`) → dark (`220 25% 12%`)
- `--popover` / `--popover-foreground`: match the new light scheme
- `--secondary`, `--muted`, `--muted-foreground`, `--input`, `--border`: adjust for light background contrast
- Keep `--card` and `--card-foreground` as-is (dark blue cards)
- Keep all `--sidebar-*` variables unchanged
- Keep `.glass-card`, `.stat-card` hardcoded dark blue colors unchanged
- Scrollbar track should use a light color

**2. `src/index.css` — Add missing badge classes for StatusBadge**

The `badge-pendente`, `badge-quitada`, `badge-em-andamento`, `badge-divergente` classes referenced in `StatusBadge.tsx` don't exist. Add them in `@layer components` with standard readable colors:

- `.badge-pendente`: yellow/amber background, dark text
- `.badge-em-andamento`: blue background, dark text  
- `.badge-quitada`: green background, dark text
- `.badge-divergente`: red background, dark text
- All badges: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold`

**3. Pages text color adjustments**

Since `--foreground` will become dark, and cards remain dark-bg with light text (`--card-foreground`), the pages that use `text-foreground` on headings/content outside cards will now correctly show dark text on white background. Text inside `.glass-card` and `.stat-card` already uses explicit light colors or `text-foreground` within a `bg-card` context — but since cards use hardcoded `bg-[#131d2e]`, we need to ensure text inside them stays light. This means:

- In `DashboardPage.tsx`, `ExpensesPage.tsx`, `DocumentsPage.tsx`, `SearchPage.tsx`: text inside `.glass-card` and `.stat-card` uses `text-foreground` which will now be dark — this will be unreadable on dark cards. Fix by adding a utility approach: make `.glass-card` and `.stat-card` set `color: white` (or `text-white`) so descendants inherit light text.

**Files to modify:**
- `src/index.css` only — CSS variables, badge classes, and card text color override

No logic, hooks, routes, or component structure changes.

