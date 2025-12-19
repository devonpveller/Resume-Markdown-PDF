# Resume PDF Exporter

A professional desktop application for creating and exporting ATS-friendly resumes with live preview and one-click PDF generation.

## 📥 Download

**Desktop Application (Recommended)**

Download the latest release for Windows:
- **[Resume PDF Exporter v1.0.0 - Installer](https://github.com/devonveller/resume-pdf-exporter/releases/latest)** (recommended)
- **[Resume PDF Exporter v1.0.0 - Portable](https://github.com/devonveller/resume-pdf-exporter/releases/latest)** (no installation required)

### Installation
1. Download the installer or portable version
2. Run the executable
3. The app will prompt you to create a resume from the template
4. Edit your resume and export to PDF!

**Features:**
- ✨ Live preview with automatic page breaks
- 📝 Built-in resume editor integration
- 📄 ATS-friendly PDF export (text-based, not images)
- 🔄 Auto-refresh on file changes
- 🎨 Professional styling with Inter font
- 🔒 100% local - no telemetry or data collection

## 🛠️ Development Setup

**For developers who want to customize or contribute:**

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


# License
Copyright (c) 2025 Devon Veller

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, and distribute copies of the Software, provided that:

1. The Software is used, modified, or distributed **only for non-commercial purposes**.
   - This includes personal use, educational use, research, and open-source collaboration.
   - It explicitly **prohibits** selling, reselling, or redistributing the Software (in whole or in part) for profit.
   - Any use that generates revenue (directly or indirectly) from the Software — including through commercial products, services, or licensing — is **strictly prohibited**.

2. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

3. All modified versions of the Software must carry a clear notice stating that the software has been altered from the original, and must retain the original copyright and license terms.

4. The Software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the Software or the use or other dealings in the Software.

This license is intended to support open collaboration and innovation while ensuring that the open-source nature of the project is preserved and that no one profits commercially from the original work or its derivatives without permission.

Any use of this Software for commercial gain is a violation of this license and may result in legal action.