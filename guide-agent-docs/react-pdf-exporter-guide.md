# React PDF Exporter Implementation Guide

**Project**: Resume PDF Export System with React + Puppeteer
**Date**: December 13, 2025
**Maintainer**: Devon Veller

## Overview

This guide provides complete step-by-step instructions for building an automated PDF export system that generates 1:1 pixel-perfect PDFs from the resume.lol markdown format. The system will:

1. **Preserve existing preview.html** - Keep current live preview system working
2. **Add React-based export** - Build dedicated export app using React + Vite
3. **Automate with Puppeteer** - Use headless Chrome for true 1:1 PDF rendering
4. **Unified batch launch** - Double-click ONE batch file to:
   - Install all dependencies automatically (first run)
   - Build React app automatically (first run)
   - Start BOTH preview server AND export server
   - Provide interactive menu for exporting PDFs
   - Keep both servers running for live development
   - Stop all services cleanly on exit

## Architecture

```
resume.lol/
├── preview.html                    ← KEEP: Existing preview (unchanged)
├── start-preview-server.bat        ← KEEP: Preview launcher (unchanged)
└── source/
    ├── resume.md
    ├── resume.css
    └── settings.css

export-to-pdf/                      ← NEW: PDF export system
├── package.json
├── vite.config.js
├── launch-export.bat               ← NEW: Easy launch (double-click)
├── scripts/
│   └── export-pdf.js               ← NEW: Puppeteer automation
├── public/
│   ├── resume.css                  ← SYMLINK or COPY
│   └── settings.css                ← SYMLINK or COPY
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   └── components/
│       ├── ResumeRenderer.jsx
│       └── VariableParser.js
└── dist/
    └── [generated PDFs]
```

## Implementation Steps

### STEP 1: Initialize Project Structure

**Action**: Navigate to workspace root and create export-to-pdf directory

```bash
cd P:\_git\Resume-Devon-Veller
mkdir export-to-pdf
cd export-to-pdf
```

**Action**: Initialize npm project

```bash
npm init -y
```

**Action**: Install dependencies

```bash
npm install react react-dom
npm install -D vite @vitejs/plugin-react
npm install puppeteer marked
npm install -D concurrently
```

### STEP 2: Create Project Configuration Files

**File**: `export-to-pdf/package.json`

```json
{
  "name": "resume-pdf-exporter",
  "version": "1.0.0",
  "type": "module",
  "description": "Automated PDF export for Devon Veller's resume",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "export": "node scripts/export-pdf.js"
  },
  "dependencies": {
    "marked": "^11.1.0",
    "puppeteer": "^21.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "concurrently": "^8.2.2",
    "vite": "^5.0.8"
  }
}
```

**File**: `export-to-pdf/vite.config.js`

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

### STEP 3: Create Source Files

**File**: `export-to-pdf/src/main.jsx`

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**File**: `export-to-pdf/src/App.jsx`

```jsx
import React, { useEffect, useState } from 'react'
import ResumeRenderer from './components/ResumeRenderer'
import './App.css'

function App() {
  const [resumeMarkdown, setResumeMarkdown] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadResume() {
      try {
        // Fetch from parent directory
        const response = await fetch('../resume.lol/source/resume.md')
        if (!response.ok) throw new Error('Failed to load resume.md')
        
        const markdown = await response.text()
        setResumeMarkdown(markdown)
        setLoading(false)
      } catch (err) {
        console.error('Error loading resume:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    loadResume()
  }, [])

  if (loading) {
    return <div className="loading">Loading resume...</div>
  }

  if (error) {
    return <div className="error">Error loading resume: {error}</div>
  }

  return (
    <div className="app-container">
      <div id="resume-container" className="resume-container">
        <ResumeRenderer markdown={resumeMarkdown} />
      </div>
    </div>
  )
}

export default App
```

**File**: `export-to-pdf/src/App.css`

```css
/* Import resume styles */
@import url('../public/resume.css');
@import url('../public/settings.css');

.app-container {
  max-width: 8.5in;
  margin: 0 auto;
  background: #f0f0f0;
  padding: 20px;
}

.resume-container {
  background: white;
  padding: 0.5in;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  min-height: 11in;
  width: 8.5in;
  box-sizing: border-box;
  margin: 0 auto;
}

.loading,
.error {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  color: red;
}

/* PDF export styles - remove padding when exporting */
@media print {
  body {
    margin: 0;
    padding: 0;
    background: white;
  }

  .app-container {
    padding: 0;
    background: white;
  }

  .resume-container {
    box-shadow: none;
    padding: 0.5in;
    margin: 0;
  }
}
```

**File**: `export-to-pdf/src/components/VariableParser.js`

```javascript
/**
 * Parses resume.lol variable syntax
 * @VARIABLE=normalValue||redactedValue
 * @REDACTED=true/false
 */
export function parseVariables(markdown) {
  const variables = {}
  
  // Extract @REDACTED value first
  const redactedMatch = markdown.match(/@REDACTED=(true|false)/)
  const useRedacted = redactedMatch && redactedMatch[1] === 'true'
  
  // Extract all variable declarations
  const lines = markdown.split(/\r?\n/)
  for (const line of lines) {
    const varMatch = line.match(/^@(\w+)=(.+)\|\|(.+)$/)
    if (varMatch) {
      const [, varName, normalValue, redactedValue] = varMatch
      variables[varName] = useRedacted ? redactedValue.trim() : normalValue.trim()
    }
  }
  
  return variables
}

/**
 * Replaces {VARIABLE} tokens with actual values
 */
export function replaceVariables(markdown, variables) {
  return markdown.replace(/\{(\w+)\}/g, (match, varName) => {
    return variables[varName] || match
  })
}

/**
 * Removes variable declarations and HTML comments
 */
export function cleanMarkdown(markdown) {
  // Remove variable declarations
  markdown = markdown.replace(/^@\w+=.+$/gm, '')
  
  // Remove HTML comments
  markdown = markdown.replace(/<!--[\s\S]*?-->/g, '')
  
  return markdown
}
```

**File**: `export-to-pdf/src/components/ResumeRenderer.jsx`

```jsx
import React, { useMemo } from 'react'
import { marked } from 'marked'
import { parseVariables, replaceVariables, cleanMarkdown } from './VariableParser'

function ResumeRenderer({ markdown }) {
  const html = useMemo(() => {
    // Parse variables
    const variables = parseVariables(markdown)
    
    // Replace variable tokens
    let processed = replaceVariables(markdown, variables)
    
    // Clean up declarations and comments
    processed = cleanMarkdown(processed)
    
    // Configure marked
    marked.setOptions({
      breaks: false,
      gfm: true
    })
    
    // Convert to HTML
    let htmlOutput = marked.parse(processed)
    
    // Fix em-dash entities
    htmlOutput = htmlOutput.replace(/&mdash;/g, '—')
    
    return htmlOutput
  }, [markdown])

  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

export default ResumeRenderer
```

**File**: `export-to-pdf/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume PDF Exporter</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

### STEP 4: Copy CSS Files

**Action**: Copy CSS files to public directory

**Windows Command**:
```batch
copy "..\resume.lol\source\resume.css" "public\resume.css"
copy "..\resume.lol\source\settings.css" "public\settings.css"
```

**Alternative (Create Symlinks for Auto-Updates)**:
```batch
mklink "public\resume.css" "..\..\resume.lol\source\resume.css"
mklink "public\settings.css" "..\..\resume.lol\source\settings.css"
```

**Note**: If using symlinks, any updates to the original CSS will automatically reflect in the export app.

### STEP 5: Create Puppeteer Export Script

**File**: `export-to-pdf/scripts/export-pdf.js`

```javascript
import puppeteer from 'puppeteer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function exportPDF() {
  console.log('🚀 Starting PDF export process...')
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  try {
    const page = await browser.newPage()
    
    // Set viewport to match letter size
    await page.setViewport({
      width: 816,  // 8.5 inches at 96 DPI
      height: 1056, // 11 inches at 96 DPI
      deviceScaleFactor: 2
    })
    
    console.log('📄 Loading resume from dev server...')
    
    // Load the built Vite app
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    })
    
    console.log('⏳ Waiting for fonts to load...')
    
    // Wait for fonts to be ready
    await page.evaluateHandle('document.fonts.ready')
    
    // Additional wait for rendering stability
    await page.waitForTimeout(2000)
    
    console.log('✨ Generating PDF...')
    
    // Generate timestamp for filename
    const timestamp = new Date().toISOString().split('T')[0]
    const outputPath = path.join(__dirname, '..', `Resume-Devon-Veller-${timestamp}.pdf`)
    
    // Generate PDF with exact settings
    await page.pdf({
      path: outputPath,
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      preferCSSPageSize: false
    })
    
    console.log(`✅ PDF exported successfully: ${outputPath}`)
    
    return outputPath
    
  } catch (error) {
    console.error('❌ Error during PDF export:', error)
    throw error
  } finally {
    await browser.close()
  }
}

// Run export
exportPDF()
  .then(pdfPath => {
    console.log('🎉 Export complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Failed to export PDF:', error)
    process.exit(1)
  })
```

### STEP 6: Create Easy Launch Batch File

**File**: `export-to-pdf/launch-export.bat`

```batch
@echo off
echo ========================================
echo Resume PDF Exporter - Devon Veller
echo ========================================
echo.

cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules\" (
    echo 📦 Installing dependencies...
    echo.
    call npm install
    echo.
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Build the React app
echo 🔨 Building React app...
echo.
call npm run build
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)

REM Start the dev server in background
echo 🌐 Starting dev server...
start /B npm run dev

REM Wait for server to initialize
echo ⏳ Waiting for server to start...
timeout /t 5 /nobreak >nul

REM Run the PDF export
echo 📄 Exporting PDF...
echo.
call npm run export

if errorlevel 1 (
    echo.
    echo ❌ PDF export failed
    taskkill /F /IM node.exe /FI "WINDOWTITLE eq vite*" >nul 2>&1
    pause
    exit /b 1
)

REM Stop the dev server
echo.
echo 🛑 Stopping dev server...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq vite*" >nul 2>&1

echo.
echo ✅ PDF export complete!
echo 📁 Check the export-to-pdf folder for your PDF
echo.

REM Open the export folder
start "" "%~dp0"

echo Press any key to exit...
pause >nul
```

**File**: `export-to-pdf/quick-export.bat` (For subsequent exports after first build)

```batch
@echo off
echo ========================================
echo Quick PDF Export - Devon Veller
echo ========================================
echo.

cd /d "%~dp0"

echo 🌐 Starting dev server...
start /B npm run dev

echo ⏳ Waiting for server to start...
timeout /t 5 /nobreak >nul

echo 📄 Exporting PDF...
echo.
call npm run export

if errorlevel 1 (
    echo.
    echo ❌ PDF export failed
    taskkill /F /IM node.exe /FI "WINDOWTITLE eq vite*" >nul 2>&1
    pause
    exit /b 1
)

echo.
echo 🛑 Stopping dev server...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq vite*" >nul 2>&1

echo.
echo ✅ PDF export complete!
echo.
start "" "%~dp0"

echo Press any key to exit...
pause >nul
```

### STEP 7: Create Master Launch Script (Root Directory)

**File**: `launch-resume-system.bat` (in workspace root: `P:\_git\Resume-Devon-Veller\`)

This is the **MAIN ENTRY POINT** - double-click this file to launch everything.

```batch
@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Resume System Launcher - Devon Veller
echo ========================================
echo.
echo Starting all services...
echo.

cd /d "%~dp0"

REM Check if export-to-pdf dependencies are installed
if not exist "export-to-pdf\node_modules\" (
    echo 📦 Installing export dependencies (first time only)...
    cd export-to-pdf
    call npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    cd ..
    echo.
)

REM Build React app if not already built
if not exist "export-to-pdf\dist\" (
    echo 🔨 Building React export app (first time only)...
    cd export-to-pdf
    call npm run build
    if errorlevel 1 (
        echo ❌ Build failed
        pause
        exit /b 1
    )
    cd ..
    echo.
)

REM Start preview server (existing preview.html)
echo 🌐 Starting preview server on http://localhost:8000...
cd resume.lol
start "Resume Preview Server" cmd /k "python -m http.server 8000 2>nul || echo Server stopped"
cd ..
timeout /t 2 /nobreak >nul

REM Start React export dev server
echo 🚀 Starting React export server on http://localhost:3000...
cd export-to-pdf
start "React Export Server" cmd /k "npm run dev 2>nul || echo Server stopped"
cd ..
echo.

REM Wait for servers to fully initialize
echo ⏳ Waiting for servers to initialize...
timeout /t 5 /nobreak >nul

REM Open both in browser
echo 🌍 Opening preview in browser...
start http://localhost:8000/preview.html
timeout /t 1 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================
echo ✅ ALL SYSTEMS RUNNING
echo ========================================
echo.
echo 📋 Preview Server:  http://localhost:8000/preview.html
echo 🔧 Export App:      http://localhost:3000
echo.
echo What would you like to do?
echo.
echo   1. Export PDF now
echo   2. Rebuild React app
echo   3. Keep servers running (manual work)
echo   4. Stop all servers and exit
echo.

:menu
choice /C 1234 /N /M "Select an option (1-4): "

if errorlevel 4 goto cleanup
if errorlevel 3 goto keep_running
if errorlevel 2 goto rebuild
if errorlevel 1 goto export_pdf

:export_pdf
echo.
echo 📄 Exporting PDF...
cd export-to-pdf
call npm run export
if errorlevel 1 (
    echo ❌ Export failed
    cd ..
    goto menu
)
cd ..
echo.
echo ✅ PDF exported successfully!
echo 📁 Opening export folder...
start "" "export-to-pdf"
echo.
goto menu

:rebuild
echo.
echo 🔨 Rebuilding React app...
cd export-to-pdf
call npm run build
if errorlevel 1 (
    echo ❌ Build failed
    cd ..
    goto menu
)
cd ..
echo.
echo ✅ Rebuild complete!
echo.
goto menu

:keep_running
echo.
echo ========================================
echo Servers will continue running...
echo ========================================
echo.
echo 📋 Preview: http://localhost:8000/preview.html
echo 🔧 Export:  http://localhost:3000
echo.
echo Make your changes, then:
echo   - Press Enter to return to menu
echo   - Or close this window to stop servers
echo.
pause
goto menu

:cleanup
echo.
echo 🛑 Stopping all servers...

REM Kill both servers by window title
taskkill /FI "WINDOWTITLE eq Resume Preview Server*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq React Export Server*" /T /F >nul 2>&1

REM Fallback: kill by process name if window title doesn't work
taskkill /IM python.exe /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1

echo ✅ All servers stopped
echo.
echo Goodbye!
timeout /t 2 /nobreak >nul
exit /b 0
```

**File**: `quick-pdf-export.bat` (in workspace root - for quick exports when servers are already running)

```batch
@echo off
echo ========================================
echo Quick PDF Export
echo ========================================
echo.

cd /d "%~dp0\export-to-pdf"

echo 📄 Exporting PDF...
call npm run export

if errorlevel 1 (
    echo.
    echo ❌ Export failed
    echo.
    echo Make sure servers are running:
    echo   Run launch-resume-system.bat first
    pause
    exit /b 1
)

echo.
echo ✅ PDF exported successfully!
echo 📁 Opening export folder...
start "" "%~dp0\export-to-pdf"
echo.
pause
```

## Testing & Verification

### Test 1: Verify Dependencies

```bash
cd export-to-pdf
npm install
```

**Expected**: All packages install without errors.

### Test 2: Verify React Build

```bash
npm run build
```

**Expected**: 
- Build completes successfully
- `dist/` folder created with assets
- No compilation errors

### Test 3: Verify Dev Server

```bash
npm run dev
```

**Expected**:
- Server starts on http://localhost:3000
- Resume renders correctly in browser
- CSS styles applied (Inter font, black text, proper spacing)

### Test 4: Verify PDF Export

```bash
npm run export
```

**Expected**:
- Puppeteer launches headless Chrome
- PDF generates in `export-to-pdf/` folder
- Filename: `Resume-Devon-Veller-YYYY-MM-DD.pdf`
- PDF matches visual preview exactly

### Test 5: Verify Unified Launch System (PRIMARY TEST)

**Action**: Double-click `launch-resume-system.bat` (in workspace root)

**Expected**:
1. Dependencies install automatically (first run only)
2. React app builds automatically (first run only)
3. Preview server starts on port 8000
4. React export server starts on port 3000
5. Both URLs open in browser
6. Menu appears with 4 options
7. Option 1 exports PDF successfully
8. Option 4 stops both servers cleanly

### Test 6: Verify Quick Export

**Prerequisites**: Servers already running from `launch-resume-system.bat`

**Action**: Double-click `quick-pdf-export.bat`

**Expected**:
- PDF exports immediately
- Export folder opens
- Both servers remain running

### Test 7: Compare PDF to Preview

**Manual Check**:
1. Ensure both servers running via `launch-resume-system.bat`
2. Open http://localhost:8000/preview.html
3. Export PDF using menu option 1
4. Open generated PDF in PDF viewer
5. Compare side-by-side:
   - Font rendering (Inter font)
   - Text spacing and line heights
   - Header alignment (name centered, contact info)
   - Date alignment (right-aligned with spacer)
   - Page breaks (should break at same locations)
   - Section headers (uppercase, black border-bottom)

### Test 8: Verify Live Development Workflow

**Action**: With servers running from `launch-resume-system.bat`:
1. Edit `resume.lol/source/resume.md`
2. Refresh http://localhost:8000/preview.html
3. Verify changes appear immediately
4. Select menu option 1 to export PDF
5. Verify PDF reflects changes

**Expected**: Seamless edit → preview → export workflow

## Troubleshooting

### Issue: Port already in use (8000 or 3000)

**Cause**: Another application using the port

**Solution**: 
1. Find and stop the conflicting process:
```batch
netstat -ano | findstr :8000
taskkill /PID <process_id> /F
```
2. Or change ports in:
   - `vite.config.js` (change from 3000)
   - `launch-resume-system.bat` (update display text)

### Issue: Fonts not loading in PDF

**Cause**: Fonts not fully loaded before PDF generation

**Solution**: Increase timeout in `export-pdf.js`:
```javascript
await page.waitForTimeout(3000) // Increase from 2000 to 3000
```

### Issue: CSS styles not applied

**Cause**: CSS files not copied to `public/`

**Solution**: Re-run copy commands from STEP 4

### Issue: Puppeteer timeout errors

**Cause**: Dev server not fully started

**Solution**: Increase wait time in `launch-resume-system.bat`:
```batch
timeout /t 10 /nobreak >nul  REM Increase from 5 to 10
```

### Issue: Variables not replaced

**Cause**: Variable parsing logic error

**Solution**: Check `VariableParser.js` regex patterns match exact format

### Issue: Page breaks in wrong location

**Cause**: CSS page-break rules not recognized

**Solution**: Add to `resume.css`:
```css
.pagebreak {
  page-break-before: always;
}
```

### Issue: Servers don't stop when selecting option 4

**Cause**: Window title matching failure

**Solution**: Manually kill processes:
```batch
taskkill /IM python.exe /F
taskkill /IM node.exe /F
```

### Issue: Both browsers don't open automatically

**Cause**: Default browser security settings

**Solution**: Manually open:
- http://localhost:8000/preview.html
- http://localhost:3000
**Solution**: Add to `resume.css`:
```css
.pagebreak {
  page-break-before: always;
}
```

## Optimization Tips

### Speed Up Exports

1. **Use Quick Export** after initial build
2. **Keep Dev Server Running** for multiple exports (manual workflow)
3. **Cache Puppeteer** browser instance (advanced)

### Reduce File Size

1. Adjust PDF quality in `export-pdf.js`:
```javascript
printBackground: true,
quality: 90  // Add this for JPEG compression
```

2. Use PDF compression tools post-export

### Improve Font Rendering

1. Use `preferCSSPageSize: true` if fonts look blurry
2. Increase `deviceScaleFactor` for higher DPI:
```javascript
deviceScaleFactor: 3  // Higher quality, larger file
```

## Maintenance

### Updating Resume Content

1. Edit `resume.lol/source/resume.md`
2. Run `export-resume-pdf.bat` → Option 1 or 2
3. PDF automatically reflects changes

### Updating Styles

**If using symlinks**:
1. Edit `resume.lol/source/resume.css` or `settings.css`
2. Changes automatically available to export app

**If using copies**:
1. Edit `resume.lol/source/resume.css` or `settings.css`
2. Re-run copy commands from STEP 4
3. Rebuild: `npm run build`

### Version Control

**Recommended `.gitignore` entries**:
```
export-to-pdf/node_modules/
export-to-pdf/dist/
export-to-pdf/*.pdf
export-to-pdf/.vite/
```

**Keep in Git**:
- All source files (`src/`, `scripts/`, `public/`)
- Batch scripts
- Configuration files (`package.json`, `vite.config.js`)

## Success Criteria

✅ **System is complete when**:

1. Double-clicking `launch-resume-system.bat` starts both preview and export servers automatically
2. All dependencies install and build automatically on first run
3. Both servers remain running and accessible simultaneously:
   - Preview: http://localhost:8000/preview.html
   - Export: http://localhost:3000
4. Menu system provides options to export PDF, rebuild, or keep working
5. Generated PDF is pixel-perfect match to preview
6. All variable substitutions work (`{NAME}`, `{EMAIL}`, etc.)
7. Page breaks occur at correct locations
8. Inter font renders correctly in PDF
9. Export completes in under 30 seconds
10. Servers stop cleanly when menu option 4 selected
11. Quick export (`quick-pdf-export.bat`) works when servers already running
12. Live editing workflow: edit markdown → refresh preview → export PDF

## Final Checklist

Before considering the implementation complete, verify:

- [ ] All files created in correct locations
- [ ] Dependencies installed successfully
- [ ] React app builds without errors
- [ ] Preview server runs on port 8000
- [ ] React export server runs on port 3000
- [ ] Both servers can run simultaneously
- [ ] PDF export script runs successfully
- [ ] `launch-resume-system.bat` starts both servers automatically
- [ ] `launch-resume-system.bat` installs dependencies on first run
- [ ] `launch-resume-system.bat` builds React app on first run
- [ ] Menu system provides 4 working options
- [ ] `quick-pdf-export.bat` works when servers running
- [ ] Generated PDF matches preview exactly
- [ ] Fonts render correctly (Inter)
- [ ] Variables replaced correctly
- [ ] Page breaks in right places
- [ ] Existing `preview.html` still functional independently
- [ ] CSS styles applied correctly in both preview and export
- [ ] No console errors in browser or terminal
- [ ] Servers stop cleanly when menu option 4 selected
- [ ] Can export multiple PDFs without restarting servers

## Next Steps After Implementation

1. **Test with different resume content** to verify robustness
2. **Create versioned exports** by adding version numbers to filenames
3. **Add export history** tracking (optional)
4. **Consider CI/CD integration** for automated exports on Git commits (advanced)

---

**End of Implementation Guide**

This guide should enable autonomous execution by an AI agent. Each step is discrete, testable, and includes complete code with no placeholders or TODOs.
