# Resume PDF Exporter v1.0.0 🎉

**First stable release of the Resume PDF Exporter desktop application!**

## 📦 Downloads

Choose the version that works best for you:

- **Resume PDF Exporter-1.0.0-x64.exe** (95.47 MB)  
  Full installer with uninstaller. Creates desktop and start menu shortcuts.  
  Recommended for most users.

- **Resume PDF Exporter-1.0.0-portable.exe** (95.25 MB)  
  Portable version - no installation required.  
  Perfect for USB drives or users without admin rights.

## ✨ Features

### Desktop Application
- **📝 Edit Resume Button** - Opens your resume.md in your default text editor
- **🖱️ Native Folder Picker** - Choose export directory with system dialog
- **🎨 Desktop App Badge** - Visual indicator showing you're in the desktop version
- **🚀 First-Run Experience** - Guided setup to create resume from template

### Core Functionality
- **👁️ Live Preview** - Real-time resume rendering with automatic page breaks
- **📄 PDF Export** - Generates text-based, ATS-friendly PDFs via Puppeteer
- **🔄 Auto-Refresh** - Watches for resume.md changes and updates preview automatically
- **🖨️ Browser Print** - Alternative export method (includes ATS compatibility warning)

### ATS Compatibility
- ✅ **Export PDF** creates searchable, text-based PDFs (ATS-friendly)
- ⚠️ **Browser Print** creates image-only PDFs (not recommended for job applications)
- Clear warning labels to help users choose the right export method

## 🔒 Security & Privacy

- **No telemetry or analytics** - Your data stays on your machine
- **No network calls** - Except Google Fonts CDN for Inter font
- **100% local processing** - All PDF generation happens on your computer
- **Secure file handling** - Resume data stored in user-specific app directory (`%APPDATA%/resume-pdf-exporter`)

## 📋 Installation Instructions

### Windows Installer (Recommended)
1. Download **Resume PDF Exporter-1.0.0-x64.exe**
2. Run the installer
3. Choose installation directory (or use default)
4. Click Install
5. Launch from desktop shortcut or start menu

### Portable Version
1. Download **Resume PDF Exporter-1.0.0-portable.exe**
2. Save to any location (desktop, USB drive, downloads folder)
3. Double-click to run - no installation needed
4. Your resume data will be stored in `%APPDATA%/resume-pdf-exporter`

### First Launch
On first launch, the app will:
1. Detect no resume.md exists
2. Prompt you to create one from the template
3. Open the resume for editing
4. Display live preview

## 🚀 Usage

### Creating Your Resume
1. Click **📝 Edit Resume** to open resume.md in your editor
2. Follow the STAR method examples in the template
3. Use the variable system for redactable info: `@NAME=Devon Veller||D.V.`
4. Save changes - preview updates automatically

### Exporting to PDF
1. Click **Export PDF** button (generates ATS-friendly PDF)
2. Choose save location in the folder picker
3. Your text-based PDF is ready for job applications!

**Avoid using Browser Print** unless you specifically need a quick preview - it creates image-only PDFs that ATS systems cannot read.

## 📝 Resume Format

The app uses a custom markdown format optimized for professional resumes:

- **Variable system** - `@VARIABLE=value||redacted_value` for privacy
- **Professional styling** - Inter font, clean black text, uppercase section headers
- **Date alignment** - `<span class="spacer"></span>` to right-align dates
- **STAR method** - Built-in examples for achievement-focused bullets

See the included template for detailed formatting conventions.

## ⚠️ Windows SmartScreen Warning

Windows may show an "Unknown publisher" warning because this app is not code-signed (code signing certificates cost ~$300/year).

**This is normal and safe.** To install:
1. Click "More info"
2. Click "Run anyway"

The app has been security-audited and contains:
- ✅ No malware or telemetry
- ✅ No network calls (except fonts)
- ✅ 0 dependency vulnerabilities
- ✅ Secure IPC communication

## 🐛 Known Issues

None! All features tested and working on Windows:
- ✅ Edit Resume button opens file correctly
- ✅ Export PDF generates text-based PDFs
- ✅ Folder picker works
- ✅ Auto-refresh on file changes
- ✅ First-run template creation

## 🛠️ Technical Details

**Built with:**
- Electron 39.2.7
- React 18.2.0
- Vite 7.3.0
- Puppeteer 24.33.0 (for PDF generation)
- Marked 4.3.0 (markdown parser)

**System Requirements:**
- Windows 10 or later (x64)
- ~150 MB disk space
- No Node.js or dependencies required (bundled)

## 📄 License

Copyright © 2025 Devon Veller

This software is **free for non-commercial use only**. You may:
- ✅ Use for personal resumes
- ✅ Modify and customize
- ✅ Share with attribution

You may NOT:
- ❌ Use commercially (reselling, SaaS, paid services)
- ❌ Remove copyright notices
- ❌ Redistribute for profit

See LICENSE file for full terms.

## 🙏 Acknowledgments

Created by Devon Veller for the developer community. If this tool helped you land a job, I'd love to hear about it!

## 📬 Support

- **Issues:** [GitHub Issues](https://github.com/devonveller/resume-pdf-exporter/issues)
- **Questions:** Create a discussion in the GitHub repo
- **Feature requests:** Submit an issue with [Feature Request] tag

---

**Enjoy building your professional resume! 🚀**
