# Design System — CoachFit

## Triết Lý Thiết Kế

- **"Dữ liệu phong phú, giao diện tĩnh lặng"** — Data-rich, UI-calm
- **Dark mode mặc định** — athlete dùng sáng sớm & tối muộn
- **Progressive disclosure** — đơn giản → phức tạp khi cần
- **Mobile-first** — 80% tương tác hàng ngày trên điện thoại
- **Consistent** — predictable interactions across all pages

### CSS Strategy
- **Design tokens:** CSS custom properties (`:root` vars) — source of truth
- **Utility framework:** Tailwind CSS — reference CSS vars trong `tailwind.config.ts`
- **Ví dụ:** `colors: { primary: 'var(--bg-primary)', accent: 'var(--color-accent)' }`
- **Rule:** Mọi color/spacing/radius phải dùng token, KHÔNG hardcode hex trong component

---

## Color System

### Dark Theme (Mặc định)

| Token | Hex | Sử dụng |
|---|---|---|
| `--bg-primary` | `#000000` | True black (OLED-friendly) |
| `--bg-surface` | `#0A0A0F` | Cards, panels |
| `--bg-elevated` | `#141420` | Modals, popups, dropdowns |
| `--bg-input` | `#1A1A2E` | Input fields |
| `--border-subtle` | `#1E1E2E` | Borders mờ |
| `--border-default` | `#2A2A3E` | Borders rõ |
| `--text-primary` | `#E8E8ED` | Text chính |
| `--text-secondary` | `#8B8B9E` | Labels, placeholder |
| `--text-muted` | `#5A5A6E` | Text mờ, hint |

### Light Theme

| Token | Hex |
|---|---|
| `--bg-primary` | `#FFFFFF` |
| `--bg-surface` | `#F8FAFC` |
| `--bg-elevated` | `#F1F5F9` |
| `--bg-input` | `#E2E8F0` |
| `--border-subtle` | `#E2E8F0` |
| `--border-default` | `#CBD5E1` |
| `--text-primary` | `#0F172A` |
| `--text-secondary` | `#334155` |
| `--text-muted` | `#64748B` |

### Semantic Colors

| Token | Hex | Sử dụng |
|---|---|---|
| `--color-fitness` | `#3B82F6` | CTL, fitness (blue) |
| `--color-fatigue` | `#F59E0B` | ATL, fatigue (amber) |
| `--color-form` | `#10B981` | TSB, form (emerald) |
| `--color-success` | `#22C55E` | Completed, positive |
| `--color-warning` | `#F59E0B` | Caution |
| `--color-danger` | `#EF4444` | Error, overtraining |
| `--color-info` | `#3B82F6` | Information |
| `--color-accent` | `#8B5CF6` | Brand accent (purple) |

### Training Zone Colors

| Zone | Name | Hex | Description |
|---|---|---|---|
| Z1 | Recovery | `#60A5FA` | Light Blue |
| Z2 | Endurance | `#34D399` | Green |
| Z3 | Tempo | `#FBBF24` | Yellow |
| Z4 | Threshold | `#FB923C` | Orange |
| Z5 | VO2max | `#F87171` | Red |
| Z6 | Anaerobic | `#C084FC` | Purple |
| Z7 | Neuromuscular | `#F472B6` | Pink |

### Sport Colors

| Sport | Hex |
|---|---|
| Cycling | `#3B82F6` (Blue) |
| Running | `#22C55E` (Green) |
| Swimming | `#06B6D4` (Cyan) |
| Strength | `#F97316` (Orange) |
| Other | `#6B7280` (Gray) |

---

## Typography

### Font Family
- **Primary:** `Inter` (Google Fonts) — clean, readable, good for data
- **Mono:** `JetBrains Mono` — metrics, numbers, code

### Scale

| Token | Size | Weight | Sử dụng |
|---|---|---|---|
| `--text-xs` | 11px | 400 | Captions, footnotes |
| `--text-sm` | 13px | 400 | Labels, secondary |
| `--text-base` | 15px | 400 | Body text |
| `--text-lg` | 17px | 500 | Subheadings |
| `--text-xl` | 20px | 600 | Section headers |
| `--text-2xl` | 24px | 700 | Page titles |
| `--text-3xl` | 30px | 700 | Hero numbers |
| `--text-metric` | 36px | 700 | Dashboard primary metric |

### Number Display
- `font-variant-numeric: tabular-nums` cho alignment
- Monospace font cho metrics lớn (CTL: **72**, TSS: **85**)
- Compact number format: 42.5k, 1.2h

---

## Spacing

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

---

## Border Radius

| Token | Value | Sử dụng |
|---|---|---|
| `--radius-sm` | 6px | Inputs, small buttons |
| `--radius-md` | 8px | Cards, panels |
| `--radius-lg` | 12px | Modals, large cards |
| `--radius-xl` | 16px | Featured cards |
| `--radius-full` | 9999px | Pills, avatars |

## Shadows (Dark Mode)

| Token | Value |
|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` |
| `--shadow-glow` | `0 0 20px rgba(139,92,246,0.15)` |

---

## Components

### Button

| Variant | Background | Text | Border |
|---|---|---|---|
| Primary | `--color-accent` | white | none |
| Secondary | `--bg-surface` | `--text-primary` | `--border-default` |
| Ghost | transparent | `--text-secondary` | none |
| Danger | `--color-danger` | white | none |

| Size | Height | Padding | Font |
|---|---|---|---|
| sm | 32px | 8px 12px | --text-sm |
| md | 40px | 8px 16px | --text-base |
| lg | 48px | 12px 24px | --text-lg |

- Min touch target: 44px (mobile)
- Hover: brightness increase + subtle glow (primary)
- Active: scale(0.98)
- Disabled: opacity 0.5

### Card

- Background: `--bg-surface`
- Border: `--border-subtle`
- Radius: `--radius-md`
- Padding: `--space-4` (desktop) / `--space-3` (mobile)
- Variants:
  - **Default:** standard card
  - **Interactive:** hover translateY(-2px) + shadow increase
  - **Highlighted:** left border 3px sport color

### Input

- Background: `--bg-input`
- Border: `--border-default`
- Radius: `--radius-sm`
- Height: 40px (md), 36px (sm), 48px (lg)
- Focus: `--color-accent` border + subtle glow
- Error: `--color-danger` border + error text below
- Label above, helper text below

### Chart

- Background: transparent (inherit card bg)
- Grid lines: `--border-subtle` (very subtle)
- Axis labels: `--text-muted`, `--text-xs`
- Line colors: semantic (fitness=blue, fatigue=amber, form=emerald)
- Tooltip: `--bg-elevated`, `--shadow-md`, `--radius-sm`
- Responsive: horizontal scroll on mobile for time-series

### Calendar

- Grid: 7 columns, `--border-subtle`
- Today: `--color-accent` border highlight
- Planned workout: card with sport-color left border
- Completed: checkmark overlay, slightly muted
- Skipped: strikethrough, `--color-danger` subtle
- Drag handle: visible on hover (desktop only)

### Workout Block (Builder)

- Color: zone color (Z1=light blue, Z4=orange, etc.)
- Height: proportional to target intensity
- Width: proportional to duration
- Drag handles on edges
- Label: zone name + duration text
- Repeat group: bracket indicator

---

## Layout

### Desktop (>1024px)
```
┌──────────┬──────────────────────────────────┐
│ Sidebar  │         Main Content             │
│ (64/240) │       (max 1200px, centered)     │
│          │                                  │
│ 🏠 Dash  │  Dashboard: 2-3 column grid     │
│ 📅 Cal   │  Calendar: full width            │
│ 💪 Work  │  Activity: 2 column (map+data)   │
│ 📊 Stats │                                  │
│ ⚙️ Set   │                                  │
└──────────┴──────────────────────────────────┘
```

- Sidebar: 64px collapsed (icons), 240px expanded (icons + labels)
- Toggle collapse with button
- Remember preference in localStorage

### Tablet (768-1024px)
- Bottom tab bar (same items)
- Single column, full width
- Cards stack vertically

### Mobile (<768px)
```
┌──────────────────────┐
│     Main Content     │
│   (full width, p-3)  │
│                      │
│   Touch-optimized    │
│   Swipe navigation   │
│                      │
├──────────────────────┤
│ 🏠  📅  💪  📊  ⚙️ │
│    Bottom Tab Bar    │
└──────────────────────┘
```

- Bottom tab bar: 5 items max
- Full width, padding `--space-3`
- Touch targets: min 44px
- Swipe between days/activities
- Sheet/drawer for secondary actions

### Navigation Items

| Icon | Label | Route |
|---|---|---|
| 🏠 | Dashboard | `/` |
| 📅 | Calendar | `/calendar` |
| 💪 | Workouts | `/workouts` |
| 📊 | Analytics | `/analytics` |
| ⚙️ | Settings | `/settings` |

---

## Animation & Transitions

| Type | Duration | Easing |
|---|---|---|
| Micro (hover, toggle) | 150ms | `ease-out` |
| Standard (page, panel) | 250ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Emphasis (modal, drawer) | 400ms | `cubic-bezier(0.4, 0, 0.2, 1)` |

- Page transitions: fade 200ms
- Card hover: `translateY(-2px)` + shadow
- Loading: **skeleton screens** (not spinners)
- Chart: draw-in animation on mount (300ms)
- Drag: smooth follow with slight overshoot
- Respect `prefers-reduced-motion`

---

## Accessibility

| Concern | Standard |
|---|---|
| Color contrast | ≥ 4.5:1 text, ≥ 3:1 large text |
| Focus indicator | 2px `--color-accent` outline |
| Interactive elements | `aria-label` where icon-only |
| Keyboard nav | Logical tab order |
| Screen reader | Semantic HTML (header, nav, main, section) |
| Motion | Respect `prefers-reduced-motion` |
| Touch targets | Min 44×44px |

---

## Coach-Specific UI

### Coach Dashboard Layout (Desktop)
```
┌──────────┬──────────────────────────────────┐
│ Sidebar  │  Athlete Roster (left panel)     │
│          │  ┌─────────────────────────────┐  │
│ 🏠 Dash  │  │ 🔍 Search athletes          │  │
│ 👥 Team  │  │ ┌─────────────────────────┐ │  │
│ 📅 Cal   │  │ │ Minh N.  🟢 active      │ │  │
│ 💪 Work  │  │ │ CTL: 72 │ TSB: +14     │ │  │
│ 📊 Stats │  │ ├─────────────────────────┤ │  │
│ ⚙️ Set   │  │ │ Lan T.   🟡 fatigued   │ │  │
│          │  │ │ CTL: 45 │ TSB: -8      │ │  │
│          │  │ └─────────────────────────┘ │  │
│          │  └─────────────────────────────┘  │
│          │                                  │
│          │  Selected Athlete Detail (right)  │
│          │  ┌─────────────────────────────┐  │
│          │  │ Calendar │ Activities │ PMC  │  │
│          │  └─────────────────────────────┘  │
└──────────┴──────────────────────────────────┘
```

### Coach Navigation (thêm vào sidebar)

| Icon | Label | Route | Role |
|---|---|---|---|
| 👥 | Team | `/coach` | coach only |
| 📋 | Assign | `/coach/assign` | coach only |

### Athlete Card (trong roster)
- Avatar + name (hoặc nickname)
- Status indicator: 🟢 fresh (TSB>5), 🟡 optimal (TSB -5~5), 🔴 fatigued (TSB<-5)
- Mini stats: CTL, ATL, TSB
- Tags (colored pills)
- Last activity time
- Click → expand detail panel

### Coach Status Colors
| Status | Color | Điều kiện |
|---|---|---|
| Fresh | `--color-success` (#22C55E) | TSB > 5 |
| Optimal | `--color-warning` (#F59E0B) | -5 ≤ TSB ≤ 5 |
| Fatigued | `--color-danger` (#EF4444) | TSB < -5 |
| No Data | `--text-muted` (#5A5A6E) | Chưa có training load |

### Alert Cards (Coach Dashboard)
- ⚠️ Missed workout (athlete skip/miss planned workout)
- 🔴 Overtraining risk (TSB < -20)
- 💤 Poor sleep (sleep score < 60)
- ❤️ Elevated resting HR (> 10% above baseline)
- Background: `--bg-elevated`, left border = severity color
