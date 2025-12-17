# Resume-Devon-Veller

Personal resume repository with React-based PDF export system for Devon Veller.

## Quick Start

**Launch the resume preview and export system:**
```bash
launch-resume-system.bat
```

This will:
- Install dependencies (first run)
- Start the React dev server at http://localhost:3000
- Provide live preview of your resume
- Enable PDF export functionality

## Repository Structure

- **`source/`** - Resume source files (edit these)
  - `resume.md` - Active resume content
  - `resume.css` - Custom styling
  - `settings.css` - PDF page settings
  
- **`export-to-pdf/`** - React PDF export system
  - `launch-export.bat` - Quick PDF export launcher
  - `quick-export.bat` - Fast export without full build
  
- **`archive/`** - Historical versions and working notes
  - `Resume-Content-Archive.md` - Drafts and references
  - `Resume_03_FullListExperience_2025.md` - Full-detail version

## Usage

### Edit Resume
1. Edit `source/resume.md`
2. Save changes
3. Preview updates automatically in browser

### Export PDF
Option 1: Use the running dev server's export button
Option 2: Run `export-to-pdf/quick-export.bat`

## Development

The resume uses a custom markdown format with:
- Variable system for redaction (@VARIABLE=value||redacted)
- Custom CSS styling (Inter font, professional black text)
- STAR method for achievement bullets

See `.github/copilot-instructions.md` for detailed formatting conventions.
