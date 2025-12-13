# Resume PDF Exporter

Automated PDF export system for Devon Veller's resume using React + Vite + Puppeteer.

## Features

- **Pixel-perfect PDF generation** from resume.lol markdown format
- **Variable substitution** support (`@VARIABLE=value||redacted` syntax)
- **Automated workflow** with batch scripts
- **Live preview** on http://localhost:3000
- **Styled output** using Inter font, matching resume.lol preview

## Quick Start

### First Time Setup

1. **Run the main launcher** (from workspace root):
   ```batch
   launch-resume-system.bat
   ```
   This will:
   - Install all dependencies automatically
   - Build the React app
   - Start both preview and export servers
   - Open both in your browser
   - Provide an interactive menu

### Quick Export (After Setup)

If you've already run the system once and just want to export:

```batch
cd export-to-pdf
.\launch-export.bat
```

Or from the workspace root:
```batch
.\quick-pdf-export.bat
```

## How It Works

1. **React App** (`src/`) renders the resume markdown
2. **Variable Parser** (`src/components/VariableParser.js`) handles `@VARIABLE` syntax
3. **Puppeteer** (`scripts/export-pdf.js`) captures the rendered page as PDF
4. **Batch Scripts** automate the workflow

## File Structure

```
export-to-pdf/
├── public/
│   ├── resume.md          ← Copied from ../resume.lol/source/
│   ├── resume.css         ← Copied from ../resume.lol/source/
│   └── settings.css       ← Copied from ../resume.lol/source/
├── src/
│   ├── components/
│   │   ├── ResumeRenderer.jsx
│   │   └── VariableParser.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── scripts/
│   └── export-pdf.js      ← Puppeteer PDF generator
├── launch-export.bat      ← Full export with build
├── quick-export.bat       ← Fast export (pre-built)
└── package.json

Generated:
├── dist/                  ← Built React app
└── Resume-Devon-Veller-YYYY-MM-DD.pdf
```

## Usage

### Option 1: Use Master Launcher (Recommended)

From workspace root, run `launch-resume-system.bat`. This provides a menu:

1. **Export PDF now** - Generates PDF immediately
2. **Rebuild React app** - Rebuilds if you changed source code
3. **Keep servers running** - For manual editing and testing
4. **Stop all servers and exit** - Clean shutdown

### Option 2: Manual Workflow

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Open browser** to http://localhost:3000

3. **Export PDF** (in separate terminal):
   ```bash
   npm run export
   ```

4. **Find PDF** in `export-to-pdf/` directory

## Important Notes

### Resume.md Syncing

The batch scripts automatically copy `../resume.lol/source/resume.md` to `public/resume.md` before each operation. If you edit the resume:

1. Edit `resume.lol/source/resume.md`
2. Run export script (it copies automatically)
3. PDF reflects changes

### CSS Updates

CSS files are copied once during first build. To update:

```batch
copy "..\resume.lol\source\resume.css" "public\resume.css"
copy "..\resume.lol\source\settings.css" "public\settings.css"
```

Or rebuild:
```bash
npm run build
```

### Node Version

This system uses Node 16-compatible package versions:
- Vite 4.x (not 5.x)
- Marked 4.x (not 11.x)
- Puppeteer 19.x (not 21.x)

## Troubleshooting

### "Cannot connect to server"

Make sure dev server is running:
```bash
npm run dev
```

### "Failed to load resume.md"

Run copy command or use batch scripts (they copy automatically):
```batch
copy "..\resume.lol\source\resume.md" "public\resume.md"
```

### Fonts not rendering in PDF

Increase timeout in `scripts/export-pdf.js`:
```javascript
await page.waitForTimeout(3000)  // Increase from 2000
```

### Port 3000 already in use

Kill existing Node processes:
```powershell
Get-Process node | Stop-Process -Force
```

Or change port in `vite.config.js`.

## Development

### Install Dependencies
```bash
npm install
```

### Build for Production
```bash
npm run build
```

### Run Dev Server
```bash
npm run dev
```

### Export PDF
```bash
npm run export
```

## Output

PDFs are generated with timestamp filenames:
- `Resume-Devon-Veller-2025-12-13.pdf`

Settings:
- **Format**: US Letter (8.5" × 11")
- **Margins**: 0.5 inches all sides
- **DPI**: 192 (deviceScaleFactor: 2)
- **Background**: Printed (for colored elements)

## License

Private repository for Devon Veller's personal resume.
