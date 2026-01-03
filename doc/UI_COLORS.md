# COI Calculator UI Color System

## Color Palette

| Name         | Token/Class     | Hex       | Usage Example                      |
|--------------|----------------|-----------|------------------------------------|
| HUD BG       | `hud`          | #12151A   | Main HUD, top/bottom bars          |
| Panel BG     | `panel`        | #1E242B   | Side panels, modal backgrounds     |
| UI Gray      | `ui`           | #2B333D   | Tabs, button backgrounds           |
| Panel Fill   | `fill`         | #D0D6DE   | Info panels, tooltips, content     |
| Text White   | `text`         | #F3F5F7   | Primary text on dark UI            |
| Blueprint    | `blueprint`    | #5AA1CC   | Planning/paused, blueprint lines   |
| Grass Green  | `grass`        | #6FA362   | Island surface, overlays           |
| Rock Gray    | `rock`         | #7E858C   | Rock/limestone, muted icons        |
| Disabled     | `disabled`     | #9AA3B0   | Low-priority/disabled text         |
| Border       | `border`       | #3C4653   | Dividers, borders                  |
| Accent Teal  | `accent`       | #2FA8A3   | Primary actions, highlights        |
| Info Blue    | `info`         | #3F8FD9   | Links, selected/hovered tabs       |
| Positive     | `positive`     | #5FBF5A   | Good/OK states, positive feedback  |
| Warning      | `warning`      | #D9A933   | Warnings, minor alerts             |
| Error        | `error`        | #D9534F   | Errors, critical alerts            |

## General Usage Rules

- **Backgrounds:**
  - Use `hud` for main HUD and bars.
  - Use `panel` for side panels and modal backgrounds.
  - Use `fill` for content areas, info panels, and tooltips.
- **Text:**
  - Use `text` for primary text on dark backgrounds.
  - Use `disabled` for low-priority or disabled text.
- **Borders/Dividers:**
  - Use `border` for lines and separators.
- **Buttons & Actions:**
  - Use `accent` for primary call-to-action buttons and highlights.
  - Use `info` for links, selected, or hovered elements.
- **Status/Feedback:**
  - Use `positive` for success/good states.
  - Use `warning` for warnings or minor alerts.
  - Use `error` for errors or critical alerts.
- **Supporting/Decorative:**
  - Use `blueprint`, `grass`, and `rock` for overlays, icons, and map/terrain elements.

## Tailwind Usage

All colors are available through standard Tailwind classes that have been remapped via CSS variables in `app/theme.css`:

**Standard classes to use:**
- `bg-zinc-950` / `text-zinc-950` → Very dark slate (HUD background #12151A)
- `bg-zinc-900` / `text-zinc-900` → Dark steel gray (Panel background #1E242B)
- `bg-zinc-800` / `text-zinc-800` → Medium gray (Secondary UI #2B333D)
- `bg-gray-700` / `border-gray-700` → Border gray (#3C4653)
- `text-gray-400` → Disabled text (#9AA3B0)
- `bg-gray-100` → Light panel fill (#D0D6DE)
- `bg-blue-500` → Blueprint blue (#5AA1CC)
- `bg-blue-600` → Info blue (#3F8FD9)
- `bg-green-500` → Positive green (#5FBF5A)
- `bg-red-500` → Error red (#D9534F)
- `bg-amber-500` → Warning amber (#D9A933)
- `bg-teal-500` → Accent teal (#2FA8A3)

The theme overrides standard Tailwind color scales (gray, zinc, blue, green, red, amber, teal) with the COI palette. Use standard Tailwind class names - colors are automatically themed.

> Keep alert colors (warning, error) reserved for true alerts to maintain visual impact.
