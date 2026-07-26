# Orchestrator UI Kit

Pixel-faithful **dark-theme** recreation of the Orchestrator agent-monitoring
dashboard, built from the design system at `../../colors_and_type.css`.

## Surfaces in this kit
- **Dashboard** (`index.html`) — top bar, four stat cards, "Needs Attention"
  alert panel, full agents table.
- **Agent detail flyout** — opens from any agent row; shows logs and controls.

## Click-thru interactions
- Click **Resolve** on any alert row → it disappears from the alert panel
  and the agent's status flips in the main table.
- Click any **table row** → opens the agent detail flyout on the right.
- Click **New agent** → spawns a synthetic running agent.
- Press **/** to focus the search box; type to filter the table live.
- Click a column header to sort.

## Components
| File | Purpose |
|---|---|
| `Icon.jsx`        | `<Icon name=... size=... />` — renders a Lucide SVG from `../../assets/icons/`. |
| `TopBar.jsx`      | App bar: logo, nav, search, primary CTA. |
| `StatCard.jsx`    | Four-up KPI card: icon, label, big number. |
| `StatusPill.jsx`  | Pill with dot + label, live-pulses on `running`. |
| `AlertPanel.jsx`  | Amber-tinted block listing agents that need attention. |
| `AgentsTable.jsx` | Sortable, filterable table of all agents. |
| `AgentDetail.jsx` | Right-side flyout: agent header, controls, log tail. |
| `Dashboard.jsx`   | Composes the above into the page. |
| `data.js`         | Mock agent fixtures + helpers. |
| `app.jsx`         | Root: wires React + state. |

## Source of truth caveat
No codebase or Figma was provided — components were inferred from the single
PNG screenshot in `uploads/`. Names, statuses, and reasons in `data.js` are
copied verbatim from the screenshot where possible.
