# Resume Repository Instructions

## Project Overview

Personal resume repository with a dual-delivery system: **editable markdown source** (`source/`) feeds into both a **React/Vite preview app** and **Electron desktop app** for live editing and PDF export. The repository maintains historical versions in `archive/` while the active resume in `source/resume.md` uses a custom variable-based markdown format.

## Architecture: Three-Layer System

### 1. Source Layer (`source/`)
- **Single source of truth**: `resume.md` (custom markdown with `@VARIABLE` syntax)
- **Styling**: `resume.css` (Inter font, professional black text, uppercase headers) + `settings.css` (PDF page config)
- **Variable system**: `@REDACTED=true/false` controls privacy mode, `@VAR=public||private` syntax enables redaction

### 2. React/Vite Preview Layer (`export-to-pdf/`)
- **Dev workflow**: `npm run dev` → http://localhost:3000 live preview
- **Build system**: Vite compiles React components, Puppeteer captures PDF from rendered HTML
- **File sync**: Batch scripts copy `source/*.{md,css}` → `export-to-pdf/public/` before builds
- **Variable parsing**: `VariableParser.js` handles `@VARIABLE` declarations and `{VARIABLE}` token replacement at runtime

### 3. Electron Desktop App (`export-to-pdf/electron/`)
- **Distribution**: Packaged Windows desktop app (v1.0.0) for end-users
- **Features**: Built-in editor integration, one-click PDF export, local-first (no telemetry)
- **Build process**: `electron-builder` packages React app + Electron shell → `.exe` installer

## Critical File Paths & Dependencies

```
source/resume.md              → export-to-pdf/public/resume.md (synced by batch scripts)
source/resume.css             → export-to-pdf/public/resume.css
source/settings.css           → export-to-pdf/public/settings.css
export-to-pdf/src/components/VariableParser.js (variable substitution logic)
export-to-pdf/scripts/export-pdf.js (Puppeteer PDF generation)
export-to-pdf/electron/main.cjs (Electron app entry point)
```

## Repository Structure

- **`source/`** - Active resume source files (EDIT THESE)
  - `resume.md` - Active content with `@VARIABLE` syntax
  - `resume.css` - Styling (Inter font, black text, uppercase headers)
  - `settings.css` - PDF page settings (letter size, 0.5in margins)
- **`export-to-pdf/`** - React/Vite preview + Electron desktop app
  - `public/` - Synced copies of source files (DO NOT EDIT DIRECTLY)
  - `src/components/` - React rendering components (`ResumeRenderer.jsx`, `VariableParser.js`)
  - `scripts/export-pdf.js` - Puppeteer PDF automation
  - `electron/main.cjs` - Electron desktop app logic
- **`archive/`** - Historical versions and working notes (REFERENCE ONLY)
  - `Resume-Content-Archive.md` - Drafts, ChatGPT links, alternative summaries
  - `Resume_03_FullListExperience_2025.md` - Full-detail version

## Developer Workflows (Windows-Specific)

### Quick Start (First Time)
```batch
launch-resume-system.bat
```
- Auto-installs npm dependencies (`export-to-pdf/`)
- Builds React app if `dist/` missing
- Starts dev server (http://localhost:3000)
- Opens browser with live preview
- Starts file watcher for auto-sync

### Quick PDF Export (After Initial Setup)
```batch
cd export-to-pdf
.\quick-export.bat
```
OR from workspace root:
```batch
.\quick-pdf-export.bat
```
- Uses existing `dist/` build (no rebuild)
- Runs Puppeteer script → `Resume-Devon-Veller-YYYY-MM-DD.pdf`

### Electron Desktop App Development
```batch
cd export-to-pdf
npm run electron:dev          # Dev mode with hot reload
npm run electron:build:win    # Build Windows installer
```

### Key Scripts (export-to-pdf/package.json)
- `npm run dev` → Vite dev server (port 3000)
- `npm run build` → Production React build
- `npm run export` → Puppeteer PDF generation
- `npm run electron` → Launch Electron app
- `npm run electron:build` → Package app with electron-builder

## Resume Markdown Format (source/resume.md)

### Variable System (Privacy Control)
```markdown
@REDACTED=false
@NAME=Devon Veller||Devon V.
@EMAIL=real@email.com||redacted@email.com
@PHONE=(123) 456-7890||(XXX) XXX-XXXX

# {NAME}
Contact: {EMAIL}, {PHONE}
```
- `@REDACTED=true` → Use values after `||`
- `@REDACTED=false` → Use values before `||`
- Parser in `VariableParser.js` handles substitution at React render time

### Header Structure (Contact Info)
```html
<div class="section headerInfo">
<ul>
<li>{EMAIL}</li>
<li>{PHONE}</li>
<li><a href="https://linkedin.com/in/user">LinkedIn</a></li>
</ul>
</div>
```

### Date Formatting (Right-Aligned)
```markdown
### Job Title, Company <span class="spacer"></span> Jan 2020 — Present
```
- CSS flexbox (`margin: 0px auto`) pushes dates to right edge

### Section Ordering
- Use CSS `order` property (see `resume.css`)
- h1 (`order: 0`) → `.headerInfo` (`order: 1`) → content sections

## Content Philosophy

Professional summary emphasizes:
- **Multidisciplinary approach**: Bridging art, engineering, systems design
- **"Glue" metaphor**: Filling gaps, aligning cross-disciplinary teams
- **Quantified achievements**: 300+ products, Y12/Amazon/Boeing clients, 14 years experience
- **Technical depth**: Front-end gameplay, back-end architecture, real-time optimization
- **Domain focus**: Serious games, interactive training, AR/VR/XR

## STAR Method for Resume Bullets

**CRITICAL**: All bullets MUST follow STAR (Situation, Task, Action, Result).

### Formula
**"Accomplished [X] as measured by [Y], by doing [Z]"**

### Requirements
1. **Quantify**: Use numbers, percentages, time savings (e.g., "5.6x faster", "320% improvement")
2. **Concise**: 1-2 lines max
3. **Strong verbs**: Engineered, Architected, Implemented, Optimized, Led, Designed
4. **Technical context**: Mention specific tech (Unity, OpenXR, C#, NGO, AR)
5. **Impact**: End with measurable results

### Example Patterns from Active Resume
```markdown
- Engineered LLM-assisted workflow achieving 5.6x faster load times and 25x–6,000x 
  performance improvements, reducing development time by 25%.
- Architected custom pathfinding operating at 1.3ms average, enabling real-time 
  navigation for 20+ simultaneous character paths.
- Implemented multiplayer using NGO supporting 7+ concurrent users with <10ms latency.
```

## Key Projects (Reference for Updates)

1. **ARTTX (2024)** - AR multiplayer training, Unity/OpenXR, 20 users, LLM integration, custom pathfinding
2. **VAPPE (2021-2023)** - iOS/WebGL PPE training, 60 scenarios, CSV ingestion, 508 compliance
3. **Digital Twin Interactive Map (2022-2023)** - Unreal Engine, pathfinding, architectural data pipeline

## Styling Guidelines (resume.css)

- **Font**: Inter (Google Fonts import), 14px base, 24px h1, 16px h2, 15px h3
- **Color**: Black text throughout (`color: black` for all elements)
- **Headings**: Uppercase h1 (name) and h2 (sections), 1px solid black border-bottom on h2
- **Layout**: Centered h1, flexbox for job titles with right-aligned dates

## Archive File Usage

`archive/Resume-Content-Archive.md`:
- Alternative summary drafts, ChatGPT conversation links
- Interviewing notes, positioning strategies
- Work-in-progress ideas marked `[Idea:]{.mark}` or `[Suggestions:]{.mark}`
- **REFERENCE ONLY** - Mine for content, don't edit directly

## Technology Stack Format

```markdown
Technologies: Unity, OpenXR, C#, NGO, AR
```
- **Bold category headers**: Game Engines, Programming Languages, 3D Art & Animation
- Skill levels: (Expert), (Intermediate), (Basic)
- Place at end of project descriptions

## Batch Script Behaviors

### launch-resume-system.bat
1. Kills existing processes on port 3000 (prevents conflicts)
2. Syncs `source/*.{md,css}` → `export-to-pdf/public/`
3. Runs `npm install` if dependencies missing
4. Builds React app if `dist/` missing
5. Starts dev server + file watcher
6. Opens http://localhost:3000

### watch-resume.bat
- Monitors `source/resume.md` for changes
- Auto-syncs to `export-to-pdf/public/resume.md`
- Triggers Vite hot reload

## Integration Points

### VariableParser.js (React Component)
- **Input**: Raw markdown from `public/resume.md`
- **Process**: Extract `@VARIABLE` declarations → Replace `{VARIABLE}` tokens
- **Output**: Cleaned markdown (removes declarations + HTML comments)

### export-pdf.js (Puppeteer Script)
- **Launch**: Headless Chrome via Puppeteer
- **Target**: http://localhost:3000 (requires dev server running)
- **Waits**: `document.fonts.ready` + 2s for render stability
- **Output**: `Resume-Devon-Veller-YYYY-MM-DD.pdf` with letter size (8.5x11)

### Electron main.cjs
- **Dev mode**: Loads http://localhost:3000 from Vite
- **Production**: Loads from `file://dist/index.html`
- **Writable paths**: Uses `app.getPath('userData')` for user resume data
- **PDF export**: Embeds Puppeteer for in-app PDF generation

## Git Workflow

- **Current branch**: `dev`
- No specific branching strategy documented - assume standard feature branches for major changes

## Common Tasks

### Update Resume Content
1. Edit `source/resume.md` (NOT `export-to-pdf/public/resume.md`)
2. Save → File watcher auto-syncs → Vite hot-reloads
3. Verify in browser (http://localhost:3000)
4. Export PDF via UI button or run `npm run export`

### Update Styling
1. Edit `source/resume.css` or `source/settings.css`
2. Manually sync to `export-to-pdf/public/` OR re-run `launch-resume-system.bat`
3. Refresh browser to see changes

### Add New Variable
1. Add declaration in `source/resume.md`: `@NEWVAR=public||private`
2. Use in content: `{NEWVAR}`
3. Parser auto-handles substitution (no code changes needed)

### Build Desktop App
```batch
cd export-to-pdf
npm run build                 # Build React app first
npm run electron:build:win    # Package for Windows
```
- Output: `export-to-pdf/dist-electron/Resume PDF Exporter-1.0.0-x64.exe`
- electron-builder config: `electron-builder.json`

## Dependencies

### React App (export-to-pdf/)
- **marked** (4.3.0) - Markdown → HTML parsing
- **puppeteer** (24.33.0) - PDF generation
- **react** (18.2.0) + **react-dom** - UI rendering
- **vite** (7.3.0) - Build tool + dev server

### Electron App
- **electron** (39.2.7) - Desktop app framework
- **electron-builder** (26.0.12) - Packaging/distribution
- **concurrently** + **wait-on** - Dev server coordination

## Troubleshooting

### Port 3000 Already in Use
- `launch-resume-system.bat` auto-kills processes on port 3000
- Manual: `netstat -aon | findstr :3000` → `taskkill /F /PID <pid>`

### PDF Export Fails
- Ensure dev server running (http://localhost:3000 must be accessible)
- Check fonts loaded: Puppeteer waits for `document.fonts.ready`
- Increase wait time in `export-pdf.js` if rendering incomplete

### Electron App Won't Launch
- Rebuild React app: `npm run build`
- Check paths in `electron/main.cjs` (dev vs production mode)
- Verify `resources/app.asar` contains latest build (packaged app)

### Variable Not Substituting
- Ensure declaration follows `@VAR=value||redacted` syntax
- Check `@REDACTED=true/false` at top of `resume.md`
- Token must be `{VAR}` (exact case match)

## File Editing Rules

- ✅ **ALWAYS EDIT**: `source/*.{md,css}`
- ❌ **NEVER EDIT**: `export-to-pdf/public/*.{md,css}` (auto-synced, changes will be overwritten)
- ⚠️ **REFERENCE ONLY**: `archive/*.md` (historical/working notes)

