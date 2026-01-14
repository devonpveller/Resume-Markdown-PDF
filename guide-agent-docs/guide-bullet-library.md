# Bullet Library Implementation Guide

## Overview

This guide provides comprehensive implementation instructions for adding a **Bullet Library** feature to the Resume PDF Exporter application. The system catalogs resume bullets under their parent headers, stores them **locally** in the user's OS-specific application data directory, and offers AI-powered rephrasing with job post context for relevance optimization.

**Key Principles:**
- **100% Local Storage**: All data stored in OS-appropriate app data directories (no cloud, no telemetry)
- **Cross-Resume Aggregation**: Bullets from ALL saved resumes are cataloged in a unified library
- **Job Post Integration**: Link job postings as markdown files for AI-powered relevance rephrasing
- **Duplicate Detection**: Validate bullets against existing library to prevent duplicates
- **Header Library**: Store and reuse section headers across resumes
- **Test-Driven Development**: All implementations MUST be proven via TDD with evidence of passing tests

---

## Table of Contents

1. [Feature Requirements](#feature-requirements)
2. [Local Storage Paths](#local-storage-paths)
3. [File Structure](#file-structure)
4. [Data Model](#data-model)
5. [Architecture Overview](#architecture-overview)
6. [Architecture Principles](#architecture-principles)
   - [SOLID Principles Enforcement](#solid-principles-enforcement)
   - [Design Patterns Required](#design-patterns-required)
   - [Encapsulation Strategies](#encapsulation-strategies)
   - [Code Quality Standards](#code-quality-standards)
7. [TDD Methodology](#tdd-methodology)
   - [Red-Green-Refactor Cycle](#red-green-refactor-cycle)
   - [Test File Structure](#test-file-structure)
   - [Evidence Requirements](#evidence-requirements)
   - [Test Specifications by Module](#test-specifications-by-module)
8. [Implementation Steps](#implementation-steps)
   - [Step 1: Storage Path Manager](#step-1-storage-path-manager)
   - [Step 2: Bullet Library Data Store](#step-2-bullet-library-data-store)
   - [Step 3: Header Library Manager](#step-3-header-library-manager)
   - [Step 4: Job Post Manager](#step-4-job-post-manager)
   - [Step 5: Duplicate Detection & Validation](#step-5-duplicate-detection--validation)
   - [Step 6: IPC Handlers in Electron Main Process](#step-6-ipc-handlers-in-electron-main-process)
   - [Step 7: Preload API Extensions](#step-7-preload-api-extensions)
   - [Step 8: React Components](#step-8-react-components)
   - [Step 9: Bullet Library Panel UI](#step-9-bullet-library-panel-ui-with-variant-management)
   - [Step 10: Local AI Integration](#step-10-local-ai-integration-with-job-context)
9. [Testing Checklist](#testing-checklist)
10. [File Reference](#file-reference)

---

## Feature Requirements

### Core Features

1. **Bullet Cataloging**: Parse and catalog all resume bullets (`- ` prefixed lines) from saved resumes
2. **Unified Library**: Single bullet library aggregating bullets from ALL resumes the user has saved
3. **Header Library**: Store section headers (h2/h3) as reusable templates
4. **Duplicate Detection**: Check new bullets against existing library using text similarity
5. **Job Post Linking**: Store job postings as markdown files for AI context
6. **AI Relevance Rephrasing**: Use job post content to generate job-specific bullet variants
7. **User Acceptance Flow**: AI variants only saved when explicitly accepted by user
8. **Variant Tracking**: Store multiple variants per bullet with source metadata

### User Workflow

1. User saves/updates resume → bullets and headers are parsed and cataloged
2. User can import a job posting (paste or file) → stored as markdown in job-posts folder
3. User opens Bullet Library panel → views all bullets organized by section header
4. User selects a bullet and a target job post → requests AI rephrasing for relevance
5. AI generates alternatives → user reviews and accepts/rejects each
6. Accepted variants are stored as sub-bullets with job post reference
7. User can insert any bullet/variant into active resume or copy to clipboard
8. User can browse and insert saved headers into new resumes

---

## Local Storage Paths

### OS-Specific Application Data Directories

The bullet library uses the standard OS application data directories:

| OS | Path |
|----|------|
| **Windows** | `C:\Users\[username]\AppData\Roaming\resume-pdf-exporter\` |
| **macOS** | `~/Library/Application Support/resume-pdf-exporter/` |
| **Linux** | `~/.config/resume-pdf-exporter/` |

In Electron, use `app.getPath('userData')` which automatically resolves to these paths.

---

## File Structure

### Complete Local Data Structure

```
resume-pdf-exporter/                    # app.getPath('userData')
├── resume-data/                        # Active resume files
│   ├── resume.md                       # Current working resume
│   ├── resume.css                      # User's CSS
│   └── settings.css                    # PDF settings
│
├── bullet-library/                     # Bullet storage system
│   ├── bullets.json                    # Master bullet catalog
│   ├── headers.json                    # Saved section headers
│   └── validation-hashes.json          # Duplicate detection hashes
│
├── job-posts/                          # Job posting storage
│   ├── index.json                      # Job post metadata index
│   ├── amazon-sde-2024-01.md          # Individual job posts
│   ├── google-senior-dev-2024-02.md
│   └── ...
│
├── resume-archive/                     # Saved resume versions
│   ├── resume-2024-01-15.md
│   ├── resume-2024-02-20.md
│   └── ...
│
└── ai-settings.json                    # AI endpoint configuration
```

### Project Source Code Structure

```
export-to-pdf/
├── electron/
│   ├── main.cjs                        # Entry point, IPC handlers (thin orchestration layer)
│   ├── preload.js                      # Context bridge API definitions
│   │
│   ├── managers/                       # Business logic (one class per file) - SOLID SRP
│   │   ├── index.cjs                   # Re-exports all managers
│   │   ├── bullet-library-manager.cjs  # Bullet CRUD, variant management
│   │   ├── header-library-manager.cjs  # Header CRUD
│   │   └── job-post-manager.cjs        # Job post CRUD, markdown files
│   │
│   └── services/                       # Stateless utilities - shared across managers
│       ├── storage-paths.cjs           # Singleton path resolver (OS-specific)
│       ├── validation.cjs              # Duplicate detection, similarity, quality checks
│       └── ai-service.cjs              # AI API integration (optional)
│
├── src/
│   ├── App.jsx                         # Main app component
│   │
│   ├── components/                     # React UI components
│   │   ├── BulletLibraryPanel.jsx      # Main bullet library UI
│   │   └── JobPostImportModal.jsx      # Job post import modal
│   │
│   ├── hooks/                          # React hooks - state management
│   │   └── useBulletLibrary.js         # Bullet library state & API calls
│   │
│   └── services/                       # Frontend utilities (browser-only, no Node.js)
│       └── bulletParser.js             # Markdown → structured data parser
│
└── package.json                        # Dependencies (uuid, etc.)
```

---

## Data Model

### bullets.json - Master Bullet Catalog

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-13T12:00:00.000Z",
  "totalBullets": 47,
  "bullets": [
    {
      "id": "bullet-uuid-1",
      "text": "Engineered LLM-assisted development workflow achieving 5.6x faster load times...",
      "textHash": "a1b2c3d4e5f6",
      "createdAt": "2026-01-13T12:00:00.000Z",
      "updatedAt": "2026-01-13T12:00:00.000Z",
      "source": {
        "type": "resume",
        "resumeFile": "resume-2024-01-15.md",
        "lineNumber": 45
      },
      "parentHeader": {
        "headerId": "header-uuid-1",
        "headerText": "DOE — ARTTX - Alarm Response Tactical Training Exercise",
        "headerLevel": 3,
        "sectionHeader": "Experience"
      },
      "usageCount": 3,
      "lastUsed": "2026-01-13T12:00:00.000Z",
      "tags": ["performance", "ai", "optimization"],
      "variants": [
        {
          "id": "variant-uuid-1",
          "text": "Developed AI-powered workflow that improved load times by 5.6x...",
          "textHash": "f6e5d4c3b2a1",
          "createdAt": "2026-01-13T12:05:00.000Z",
          "source": "ai-rephrase",
          "model": "qwen3-coder-30b",
          "jobPostRef": "amazon-sde-2024-01",
          "accepted": true,
          "acceptedAt": "2026-01-13T12:06:00.000Z"
        }
      ]
    }
  ]
}
```

### headers.json - Section Header Library

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-13T12:00:00.000Z",
  "headers": [
    {
      "id": "header-uuid-1",
      "level": 2,
      "text": "Experience",
      "usageCount": 5,
      "createdAt": "2026-01-13T12:00:00.000Z"
    },
    {
      "id": "header-uuid-2",
      "level": 3,
      "text": "DOE — ARTTX - Alarm Response Tactical Training Exercise",
      "parentHeaderId": "header-uuid-1",
      "dateRange": "Jan — Sept 2024",
      "subtitle": "Delivered | Lead Developer, Art Director, Project Manager",
      "usageCount": 2,
      "createdAt": "2026-01-13T12:00:00.000Z"
    }
  ]
}
```

### job-posts/index.json - Job Post Index

```json
{
  "version": "1.0.0",
  "posts": [
    {
      "id": "amazon-sde-2024-01",
      "filename": "amazon-sde-2024-01.md",
      "title": "Senior Software Development Engineer",
      "company": "Amazon",
      "dateAdded": "2026-01-10T12:00:00.000Z",
      "url": "https://amazon.jobs/...",
      "status": "active",
      "keySkills": ["distributed systems", "AWS", "Java", "Python"]
    }
  ]
}
```

### validation-hashes.json - Duplicate Detection

```json
{
  "version": "1.0.0",
  "hashes": {
    "a1b2c3d4e5f6": "bullet-uuid-1",
    "f6e5d4c3b2a1": "variant-uuid-1"
  }
}
```

### TypeScript Interfaces (for reference)

```typescript
interface BulletLibrary {
  version: string;
  lastUpdated: string;
  totalBullets: number;
  bullets: Bullet[];
}

interface Bullet {
  id: string;
  text: string;
  textHash: string;
  createdAt: string;
  updatedAt: string;
  source: BulletSource;
  parentHeader: HeaderReference;
  usageCount: number;
  lastUsed: string;
  tags: string[];
  variants: BulletVariant[];
}

interface BulletSource {
  type: 'resume' | 'manual' | 'imported';
  resumeFile?: string;
  lineNumber?: number;
}

interface HeaderReference {
  headerId: string;
  headerText: string;
  headerLevel: 2 | 3;
  sectionHeader?: string;  // Parent h2 for h3 headers
}

interface BulletVariant {
  id: string;
  text: string;
  textHash: string;
  createdAt: string;
  source: 'ai-rephrase' | 'manual' | 'imported';
  model?: string;
  jobPostRef?: string;     // Links to job post used for context
  accepted: boolean;       // Only true after user explicitly accepts
  acceptedAt?: string;
}

interface HeaderLibrary {
  version: string;
  lastUpdated: string;
  headers: SavedHeader[];
}

interface SavedHeader {
  id: string;
  level: 2 | 3;
  text: string;
  parentHeaderId?: string;
  dateRange?: string;
  subtitle?: string;
  usageCount: number;
  createdAt: string;
}

interface JobPost {
  id: string;
  filename: string;
  title: string;
  company: string;
  dateAdded: string;
  url?: string;
  status: 'active' | 'archived' | 'applied';
  keySkills: string[];
}
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          React Frontend                                  │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────────────────┐  │
│  │ App.jsx      │  │ BulletLibrary  │  │ JobPostManager.jsx         │  │
│  │ (main app)   │  │ Panel.jsx      │  │ (import/manage job posts)  │  │
│  └──────────────┘  └────────────────┘  └────────────────────────────┘  │
│          │                  │                       │                   │
│  ┌───────▼──────────────────▼───────────────────────▼────────────────┐ │
│  │                    useBulletLibrary.js (React Hook)                │ │
│  │  - Bullet state management                                         │ │
│  │  - Header library access                                           │ │
│  │  - Job post integration                                            │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                    │                                    │
│                    ┌───────────────▼───────────────────┐               │
│                    │ bulletParser.js                   │               │
│                    │ (markdown → bullet/header tree)   │               │
│                    └───────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                          IPC (contextBridge)
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                        Electron Main Process                            │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ main.cjs - IPC Handlers                                            ││
│  │  - get-bullet-library / save-bullet-library                        ││
│  │  - get-header-library / save-header-library                        ││
│  │  - add-bullet / add-bullet-variant                                 ││
│  │  - check-duplicate                                                 ││
│  │  - get-job-posts / add-job-post / delete-job-post                 ││
│  │  - rephrase-bullet-for-job                                         ││
│  │  - accept-variant / reject-variant                                 ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                    │                                    │
│  ┌─────────────────────┐  ┌────────▼────────┐  ┌────────────────────┐  │
│  │ storage-paths.cjs   │  │ bullet-library- │  │ job-post-          │  │
│  │ (OS path resolver)  │  │ manager.cjs     │  │ manager.cjs        │  │
│  └─────────────────────┘  └─────────────────┘  └────────────────────┘  │
│                                    │                                    │
│  ┌─────────────────────┐  ┌────────▼────────┐  ┌────────────────────┐  │
│  │ header-library-     │  │ validation.cjs  │  │ ai-service.cjs     │  │
│  │ manager.cjs         │  │ (dedup/checks)  │  │ (OpenAI API calls) │  │
│  └─────────────────────┘  └─────────────────┘  └────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    Local File System                                ││
│  │  C:\Users\[user]\AppData\Roaming\resume-pdf-exporter\              ││
│  │  ├── bullet-library/bullets.json                                   ││
│  │  ├── bullet-library/headers.json                                   ││
│  │  ├── job-posts/index.json + *.md files                            ││
│  │  └── ai-settings.json                                              ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Principles

### SOLID Principles Enforcement

All implementations MUST adhere to SOLID principles:

#### S - Single Responsibility Principle

Each module handles ONE concern:

| Module | Single Responsibility |
|--------|----------------------|
| `storage-paths.cjs` | ONLY resolves OS-specific file paths |
| `bullet-library-manager.cjs` | ONLY manages bullet CRUD operations |
| `header-library-manager.cjs` | ONLY manages header CRUD operations |
| `job-post-manager.cjs` | ONLY manages job post storage/retrieval |
| `validation.cjs` | ONLY handles duplicate detection & text validation |
| `bulletParser.js` | ONLY parses markdown → structured data |
| `BulletLibraryPanel.jsx` | ONLY handles UI rendering & user interactions |
| `useBulletLibrary.js` | ONLY manages React state & API orchestration |

**Anti-patterns to AVOID:**
- ❌ Managers that also handle UI state
- ❌ Parsers that also save data
- ❌ Components that directly access file system
- ❌ IPC handlers with business logic (delegate to managers)

#### O - Open/Closed Principle

Modules are open for extension, closed for modification:

```javascript
// ✅ GOOD: Extensible via configuration/injection
class BulletLibraryManager {
    constructor(storagePaths, validator) {
        this.paths = storagePaths;        // Injected dependency
        this.validator = validator;        // Injected dependency
    }
}

// ❌ BAD: Hardcoded dependencies requiring modification
class BulletLibraryManager {
    constructor() {
        this.paths = new StoragePaths();   // Hardcoded
        this.validator = new Validation(); // Hardcoded
    }
}
```

**Extension points:**
- New validation rules → Add to `Validation` class without modifying managers
- New storage backends → Implement storage interface, inject into managers
- New AI providers → Configure endpoint in `ai-settings.json`

#### L - Liskov Substitution Principle

All managers implement consistent interfaces:

```typescript
// All library managers MUST implement this interface
interface ILibraryManager<T> {
    load(): T[];
    save(items: T[]): void;
    add(item: T): { success: boolean; duplicate: boolean; item?: T };
    get(id: string): T | null;
    update(id: string, updates: Partial<T>): T;
    delete(id: string): boolean;
}
```

#### I - Interface Segregation Principle

Clients only depend on interfaces they use:

```javascript
// ✅ GOOD: Preload exposes ONLY what renderer needs
contextBridge.exposeInMainWorld('electronAPI', {
    // Bullet operations (used by BulletLibraryPanel)
    getBulletLibrary: () => ipcRenderer.invoke('get-bullet-library'),
    addBullet: (data) => ipcRenderer.invoke('add-bullet', data),
    
    // Job post operations (used by JobPostManager)
    getJobPosts: () => ipcRenderer.invoke('get-job-posts'),
    addJobPost: (data) => ipcRenderer.invoke('add-job-post', data),
    
    // AI operations (used by AI components only)
    rephraseBulletForJob: (data) => ipcRenderer.invoke('rephrase-bullet-for-job', data)
});

// ❌ BAD: Exposing internal implementation details
contextBridge.exposeInMainWorld('electronAPI', {
    fs: require('fs'),              // Exposes too much
    path: require('path'),          // Internal concern
    getStoragePaths: () => paths    // Implementation detail
});
```

#### D - Dependency Inversion Principle

High-level modules don't depend on low-level modules:

```javascript
// ✅ GOOD: IPC handlers depend on abstractions (managers)
ipcMain.handle('add-bullet', async (event, bulletData) => {
    const manager = getBulletLibraryManager();  // Factory provides instance
    return manager.addBullet(bulletData);       // Manager handles details
});

// ❌ BAD: IPC handlers with inline file operations
ipcMain.handle('add-bullet', async (event, bulletData) => {
    const data = JSON.parse(fs.readFileSync(path));  // Low-level
    data.bullets.push(bulletData);                    // Business logic
    fs.writeFileSync(path, JSON.stringify(data));     // Low-level
});
```

---

### Design Patterns Required

#### 1. Singleton Pattern (Storage Paths)

```javascript
// storage-paths.cjs - Single instance for consistent path resolution
let instance = null;

function getStoragePaths() {
    if (!instance) {
        instance = new StoragePaths();
    }
    return instance;
}

module.exports = { getStoragePaths };
```

#### 2. Factory Pattern (Manager Instantiation)

```javascript
// main.cjs - Lazy initialization with dependency injection
let bulletLibraryManager = null;

const getBulletLibraryManager = () => {
    if (!bulletLibraryManager) {
        const paths = getStoragePaths();
        const validator = new Validation();
        bulletLibraryManager = new BulletLibraryManager(paths, validator);
    }
    return bulletLibraryManager;
};
```

#### 3. Repository Pattern (Data Access)

```javascript
// All managers follow repository pattern
class BulletLibraryManager {
    // Load all entities
    load() { /* ... */ }
    
    // Save all entities
    save() { /* ... */ }
    
    // CRUD operations
    addBullet(data) { /* ... */ }
    getBullet(id) { /* ... */ }
    updateBullet(id, updates) { /* ... */ }
    deleteBullet(id) { /* ... */ }
    
    // Query operations
    findByHash(hash) { /* ... */ }
    findBySection(sectionHeader) { /* ... */ }
}
```

#### 4. Strategy Pattern (Validation Rules)

```javascript
// validation.cjs - Pluggable validation strategies
class Validation {
    constructor(strategies = []) {
        this.strategies = [
            Validation.checkExactDuplicate,
            Validation.checkSimilarity,
            Validation.checkQuality,
            ...strategies  // Custom strategies can be added
        ];
    }
    
    validate(text, existingBullets) {
        const results = this.strategies.map(strategy => 
            strategy(text, existingBullets)
        );
        return this.mergeResults(results);
    }
    
    static checkExactDuplicate(text, bullets) { /* ... */ }
    static checkSimilarity(text, bullets) { /* ... */ }
    static checkQuality(text) { /* ... */ }
}
```

#### 5. Observer Pattern (File Watching)

```javascript
// React hook observes library changes
useEffect(() => {
    const handleLibraryUpdate = (event, data) => {
        setLibrary(data.library);
    };
    
    window.electronAPI.onLibraryUpdated(handleLibraryUpdate);
    
    return () => {
        window.electronAPI.offLibraryUpdated(handleLibraryUpdate);
    };
}, []);
```

---

### Encapsulation Strategies

#### 1. Module Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│ PUBLIC API (preload.js)                                          │
│   Only exposes high-level operations:                           │
│   getBulletLibrary, addBullet, rephraseBulletForJob, etc.       │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ contextBridge (security boundary)
                              │
┌─────────────────────────────────────────────────────────────────┐
│ IPC HANDLERS (main.cjs)                                         │
│   Thin layer that delegates to managers                         │
│   NO business logic - only orchestration                        │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ BulletLibrary   │ │ HeaderLibrary   │ │ JobPost         │
│ Manager         │ │ Manager         │ │ Manager         │
│                 │ │                 │ │                 │
│ Private:        │ │ Private:        │ │ Private:        │
│ - this.data     │ │ - this.headers  │ │ - this.index    │
│ - this.hashes   │ │ - this.paths    │ │ - this.paths    │
│                 │ │                 │ │                 │
│ Public:         │ │ Public:         │ │ Public:         │
│ - addBullet()   │ │ - addHeader()   │ │ - addJobPost()  │
│ - getBullet()   │ │ - getHeader()   │ │ - getJobPost()  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ SHARED UTILITIES                                                │
│   StoragePaths (singleton) - path resolution                    │
│   Validation (stateless) - text validation & hashing            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ FILE SYSTEM (Node.js fs)                                        │
│   Only accessed by managers - NEVER by UI or IPC handlers       │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. Data Hiding

```javascript
// ✅ GOOD: Private state with controlled access
class BulletLibraryManager {
    #data = null;           // Private field (ES2022)
    #hashes = new Map();    // Private field
    
    constructor(paths, validator) {
        this.paths = paths;         // Injected, readonly
        this.validator = validator; // Injected, readonly
    }
    
    // Public method with validation
    addBullet(bulletData) {
        this.#ensureLoaded();
        
        // Validate through injected validator
        const validation = this.validator.validate(
            bulletData.text, 
            this.#data.bullets
        );
        
        if (validation.isDuplicate) {
            return { success: false, duplicate: true, existingId: validation.existingId };
        }
        
        const bullet = this.#createBullet(bulletData);
        this.#data.bullets.push(bullet);
        this.#registerHash(bullet);
        this.#save();
        
        return { success: true, bullet };
    }
    
    // Private helper methods
    #ensureLoaded() {
        if (!this.#data) this.load();
    }
    
    #createBullet(data) { /* ... */ }
    #registerHash(bullet) { /* ... */ }
    #save() { /* ... */ }
}
```

#### 3. Immutable Data Returns

```javascript
// ✅ GOOD: Return copies, not references
getBullet(id) {
    this.#ensureLoaded();
    const bullet = this.#data.bullets.find(b => b.id === id);
    return bullet ? { ...bullet, variants: [...bullet.variants] } : null;
}

getAllBullets() {
    this.#ensureLoaded();
    return this.#data.bullets.map(b => ({ 
        ...b, 
        variants: [...b.variants] 
    }));
}

// ❌ BAD: Returning internal references
getBullet(id) {
    return this.#data.bullets.find(b => b.id === id);  // Exposes internal state
}
```

#### 4. Error Boundary Encapsulation

```javascript
// IPC handlers encapsulate all errors
ipcMain.handle('add-bullet', async (event, bulletData) => {
    try {
        const manager = getBulletLibraryManager();
        const result = manager.addBullet(bulletData);
        return { success: true, ...result };
    } catch (error) {
        console.error('Error adding bullet:', error);
        return { 
            success: false, 
            error: error.message,
            code: error.code || 'UNKNOWN_ERROR'
        };
    }
});
```

---

### Code Quality Standards

#### 1. JSDoc Comments Required

All public methods MUST have JSDoc comments:

```javascript
/**
 * Add a new bullet to the library with duplicate checking
 * 
 * @param {Object} bulletData - The bullet data to add
 * @param {string} bulletData.text - The bullet text content
 * @param {Object} bulletData.parentHeader - Parent header reference
 * @param {string} bulletData.parentHeader.headerText - Header text
 * @param {number} bulletData.parentHeader.headerLevel - 2 or 3
 * @param {string} [bulletData.sourceResume] - Original resume filename
 * 
 * @returns {Object} Result object
 * @returns {boolean} result.success - Whether operation succeeded
 * @returns {boolean} [result.duplicate] - True if bullet was duplicate
 * @returns {Object} [result.bullet] - The created bullet if successful
 * @returns {string} [result.existingId] - ID of existing bullet if duplicate
 * 
 * @throws {Error} If bulletData.text is empty or invalid
 * 
 * @example
 * const result = manager.addBullet({
 *     text: 'Engineered LLM-assisted workflow achieving 5.6x faster load times',
 *     parentHeader: { headerText: 'Experience', headerLevel: 2 }
 * });
 */
addBullet(bulletData) { /* ... */ }
```

#### 2. Type Validation at Boundaries

```javascript
// Validate inputs at public API boundaries
addBullet(bulletData) {
    // Type validation
    if (!bulletData || typeof bulletData !== 'object') {
        throw new TypeError('bulletData must be an object');
    }
    if (!bulletData.text || typeof bulletData.text !== 'string') {
        throw new TypeError('bulletData.text must be a non-empty string');
    }
    if (bulletData.text.trim().length < 10) {
        throw new Error('Bullet text must be at least 10 characters');
    }
    
    // Proceed with validated data
    // ...
}
```

#### 3. Consistent Return Shapes

All IPC handlers return consistent response shapes:

```typescript
// Success response
interface SuccessResponse<T> {
    success: true;
    data?: T;
    message?: string;
}

// Error response
interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
    details?: any;
}

type IPCResponse<T> = SuccessResponse<T> | ErrorResponse;
```

#### 4. File Organization

```
electron/
├── main.cjs                    # Entry point, IPC handlers (thin layer)
├── preload.js                  # Context bridge API definitions
│
├── managers/                   # Business logic (one class per file)
│   ├── index.cjs              # Re-exports all managers
│   ├── bullet-library-manager.cjs
│   ├── header-library-manager.cjs
│   └── job-post-manager.cjs
│
├── services/                   # Stateless utilities
│   ├── storage-paths.cjs      # Path resolution singleton
│   ├── validation.cjs         # Duplicate detection & validation
│   └── ai-service.cjs         # AI API integration
│
└── types/                      # TypeScript definitions (if using TS)
    └── interfaces.d.ts

src/
├── components/                 # React UI components
│   ├── BulletLibraryPanel.jsx
│   └── JobPostImportModal.jsx
│
├── hooks/                      # React hooks
│   └── useBulletLibrary.js
│
└── services/                   # Frontend utilities (no Node.js)
    └── bulletParser.js
```

---

## TDD Methodology

### CRITICAL REQUIREMENT

**All implementations MUST follow Test-Driven Development (TDD).** The implementing agent MUST:

1. Write tests BEFORE implementation code
2. Run tests to verify they FAIL (Red phase)
3. Implement the minimum code to pass tests (Green phase)
4. Refactor while keeping tests green (Refactor phase)
5. Capture and report test output as evidence of successful implementation

**No implementation is considered complete without passing test evidence.**

---

### Red-Green-Refactor Cycle

For EACH module/function, the agent MUST follow this cycle:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: RED (Write Failing Test)                                      │
│  ─────────────────────────────────                                      │
│  1. Write test file with test cases for the feature                     │
│  2. Run: npm test -- --grep "ModuleName"                                │
│  3. Verify tests FAIL (expected - no implementation yet)                │
│  4. CAPTURE OUTPUT: "✗ should add bullet to library" etc.              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: GREEN (Implement Minimum Code)                                │
│  ───────────────────────────────────────                                │
│  1. Write the implementation code                                       │
│  2. Run: npm test -- --grep "ModuleName"                                │
│  3. Verify ALL tests PASS                                               │
│  4. CAPTURE OUTPUT: "✓ should add bullet to library" etc.              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: REFACTOR (Improve While Green)                                │
│  ───────────────────────────────────────                                │
│  1. Refactor implementation (encapsulation, SOLID, patterns)            │
│  2. Run: npm test -- --grep "ModuleName"                                │
│  3. Verify tests STILL pass after refactoring                           │
│  4. CAPTURE OUTPUT: Full test summary                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: DOCUMENT (Evidence of Success)                                │
│  ───────────────────────────────────────                                │
│  1. Record final test output in implementation notes                    │
│  2. Include: test count, pass/fail status, coverage (if available)     │
│  3. Move to next module only after ALL tests pass                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Test File Structure

```
export-to-pdf/
├── electron/
│   ├── managers/
│   │   └── __tests__/                          # Manager unit tests
│   │       ├── bullet-library-manager.test.cjs
│   │       ├── header-library-manager.test.cjs
│   │       └── job-post-manager.test.cjs
│   │
│   └── services/
│       └── __tests__/                          # Service unit tests
│           ├── storage-paths.test.cjs
│           └── validation.test.cjs
│
├── src/
│   ├── hooks/
│   │   └── __tests__/
│   │       └── useBulletLibrary.test.js
│   │
│   ├── services/
│   │   └── __tests__/
│   │       └── bulletParser.test.js
│   │
│   └── components/
│       └── __tests__/
│           └── BulletLibraryPanel.test.jsx
│
├── jest.config.cjs                             # Jest configuration
├── jest.setup.cjs                              # Test setup/mocks
└── package.json                                # Test scripts
```

### package.json Test Configuration

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:managers": "jest --testPathPattern=managers",
    "test:services": "jest --testPathPattern=services",
    "test:components": "jest --testPathPattern=components"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "mock-fs": "^5.2.0"
  }
}
```

### jest.config.cjs

```javascript
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/electron', '<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.{js,cjs,jsx}'],
    moduleFileExtensions: ['js', 'cjs', 'jsx', 'json'],
    collectCoverageFrom: [
        'electron/managers/**/*.cjs',
        'electron/services/**/*.cjs',
        'src/services/**/*.js',
        'src/hooks/**/*.js',
        '!**/__tests__/**'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
    verbose: true
};
```

---

### Evidence Requirements

**For EACH implementation step, the agent MUST provide:**

1. **Test file creation** - Show the complete test file content
2. **Red phase output** - Terminal output showing tests fail before implementation
3. **Implementation code** - The actual module code
4. **Green phase output** - Terminal output showing ALL tests pass
5. **Final summary** - Test count and coverage metrics

#### Evidence Format Template

After implementing each module, document evidence in this format:

```markdown
## Evidence: [Module Name] Implementation

### Test File Created
`electron/managers/__tests__/bullet-library-manager.test.cjs`

### Red Phase (Tests Fail - Expected)
```
$ npm test -- --grep "BulletLibraryManager"

 FAIL  electron/managers/__tests__/bullet-library-manager.test.cjs
  BulletLibraryManager
    ✗ should create empty library on first load (5ms)
    ✗ should add bullet with generated ID (3ms)
    ✗ should detect duplicate bullets (2ms)
    ✗ should return immutable copies (4ms)

Tests: 4 failed, 4 total
```

### Green Phase (Tests Pass)
```
$ npm test -- --grep "BulletLibraryManager"

 PASS  electron/managers/__tests__/bullet-library-manager.test.cjs
  BulletLibraryManager
    ✓ should create empty library on first load (8ms)
    ✓ should add bullet with generated ID (4ms)
    ✓ should detect duplicate bullets (3ms)
    ✓ should return immutable copies (2ms)

Tests: 4 passed, 4 total
Time: 0.892s
```

### Coverage (Optional but Recommended)
```
-----------------------------|---------|----------|---------|---------|
File                         | % Stmts | % Branch | % Funcs | % Lines |
-----------------------------|---------|----------|---------|---------|
bullet-library-manager.cjs   |   94.2  |    88.5  |   100   |   94.2  |
-----------------------------|---------|----------|---------|---------|
```
```

---

### Test Specifications by Module

#### 1. StoragePaths Tests (`storage-paths.test.cjs`)

```javascript
const { getStoragePaths, StoragePaths } = require('../storage-paths.cjs');
const path = require('path');
const fs = require('fs');
const mockFs = require('mock-fs');

describe('StoragePaths', () => {
    beforeEach(() => {
        // Mock file system
        mockFs({
            '/mock/userData': {}
        });
    });

    afterEach(() => {
        mockFs.restore();
    });

    describe('Singleton Pattern', () => {
        it('should return same instance on multiple calls', () => {
            const instance1 = getStoragePaths();
            const instance2 = getStoragePaths();
            expect(instance1).toBe(instance2);
        });
    });

    describe('Path Resolution', () => {
        it('should return correct bullets.json path', () => {
            const paths = new StoragePaths('/mock/userData');
            expect(paths.getBulletsFilePath()).toContain('bullet-library');
            expect(paths.getBulletsFilePath()).toContain('bullets.json');
        });

        it('should return correct headers.json path', () => {
            const paths = new StoragePaths('/mock/userData');
            expect(paths.getHeadersFilePath()).toContain('headers.json');
        });

        it('should return correct job-posts directory path', () => {
            const paths = new StoragePaths('/mock/userData');
            expect(paths.getJobPostsPath()).toContain('job-posts');
        });

        it('should create directories if they do not exist', () => {
            const paths = new StoragePaths('/mock/userData');
            paths.ensureDirectories();
            expect(fs.existsSync(paths.getBulletLibraryPath())).toBe(true);
            expect(fs.existsSync(paths.getJobPostsPath())).toBe(true);
        });
    });
});
```

**Required test count: 5 tests minimum**

---

#### 2. BulletLibraryManager Tests (`bullet-library-manager.test.cjs`)

```javascript
const BulletLibraryManager = require('../bullet-library-manager.cjs');
const mockFs = require('mock-fs');

describe('BulletLibraryManager', () => {
    let manager;
    let mockPaths;

    beforeEach(() => {
        mockFs({
            '/mock/bullet-library': {}
        });
        
        mockPaths = {
            getBulletsFilePath: () => '/mock/bullet-library/bullets.json',
            getValidationHashesPath: () => '/mock/bullet-library/validation-hashes.json',
            ensureDirectories: jest.fn()
        };
        
        manager = new BulletLibraryManager(mockPaths);
    });

    afterEach(() => {
        mockFs.restore();
    });

    describe('Constructor', () => {
        it('should throw TypeError if storagePaths not provided', () => {
            expect(() => new BulletLibraryManager()).toThrow(TypeError);
        });

        it('should accept injected storagePaths', () => {
            expect(() => new BulletLibraryManager(mockPaths)).not.toThrow();
        });
    });

    describe('load()', () => {
        it('should create empty library on first load', () => {
            const library = manager.load();
            expect(library.version).toBe('1.0.0');
            expect(library.bullets).toEqual([]);
            expect(library.totalBullets).toBe(0);
        });

        it('should return immutable copy of library', () => {
            const library1 = manager.load();
            const library2 = manager.load();
            library1.bullets.push({ id: 'test' });
            expect(library2.bullets.length).toBe(0);
        });
    });

    describe('addBullet()', () => {
        it('should add bullet with generated ID', () => {
            const result = manager.addBullet({
                text: 'Engineered a high-performance system achieving 5x throughput',
                parentHeader: { headerText: 'Experience', headerLevel: 2 }
            });
            
            expect(result.duplicate).toBe(false);
            expect(result.bullet.id).toBeDefined();
            expect(result.bullet.text).toContain('Engineered');
        });

        it('should throw TypeError for missing text', () => {
            expect(() => manager.addBullet({})).toThrow(TypeError);
        });

        it('should throw Error for text under 10 characters', () => {
            expect(() => manager.addBullet({ text: 'Short' })).toThrow();
        });

        it('should detect exact duplicate bullets', () => {
            const text = 'Led development of microservices architecture';
            manager.addBullet({ text });
            const result = manager.addBullet({ text });
            
            expect(result.duplicate).toBe(true);
        });

        it('should increment usageCount for duplicates', () => {
            const text = 'Implemented CI/CD pipeline reducing deploy time by 50%';
            manager.addBullet({ text });
            const result = manager.addBullet({ text });
            
            expect(result.bullet.usageCount).toBe(2);
        });
    });

    describe('getBullet()', () => {
        it('should return bullet by ID', () => {
            const { bullet } = manager.addBullet({ 
                text: 'Architected scalable data pipeline processing 1M events/day' 
            });
            const retrieved = manager.getBullet(bullet.id);
            
            expect(retrieved.text).toBe(bullet.text);
        });

        it('should return null for non-existent ID', () => {
            expect(manager.getBullet('nonexistent-id')).toBeNull();
        });

        it('should return immutable copy', () => {
            const { bullet } = manager.addBullet({ 
                text: 'Designed machine learning pipeline improving accuracy by 30%' 
            });
            const retrieved = manager.getBullet(bullet.id);
            retrieved.text = 'Modified';
            
            const retrieved2 = manager.getBullet(bullet.id);
            expect(retrieved2.text).not.toBe('Modified');
        });
    });

    describe('addPendingVariant()', () => {
        it('should add variant to existing bullet', () => {
            const { bullet } = manager.addBullet({ 
                text: 'Developed REST API serving 10K requests per second' 
            });
            
            const result = manager.addPendingVariant(
                bullet.id,
                'Built high-throughput REST API handling 10K+ rps',
                'ai-rephrase',
                'gpt-4',
                'job-post-123'
            );
            
            expect(result.duplicate).toBe(false);
            expect(result.variant.accepted).toBe(false);
            expect(result.variant.source).toBe('ai-rephrase');
        });

        it('should detect duplicate variants', () => {
            const { bullet } = manager.addBullet({ 
                text: 'Created automated testing framework with 95% coverage' 
            });
            const variantText = 'Built comprehensive test suite achieving 95% code coverage';
            
            manager.addPendingVariant(bullet.id, variantText, 'ai-rephrase');
            const result = manager.addPendingVariant(bullet.id, variantText, 'ai-rephrase');
            
            expect(result.duplicate).toBe(true);
        });
    });

    describe('acceptVariant()', () => {
        it('should mark variant as accepted', () => {
            const { bullet } = manager.addBullet({ 
                text: 'Optimized database queries reducing latency by 60%' 
            });
            const { variant } = manager.addPendingVariant(
                bullet.id,
                'Enhanced database performance with 60% latency reduction',
                'ai-rephrase'
            );
            
            const accepted = manager.acceptVariant(bullet.id, variant.id);
            
            expect(accepted.accepted).toBe(true);
            expect(accepted.acceptedAt).toBeDefined();
        });

        it('should register accepted variant hash for duplicate detection', () => {
            const { bullet } = manager.addBullet({ 
                text: 'Mentored team of 5 junior developers' 
            });
            const variantText = 'Coached and developed 5 junior team members';
            const { variant } = manager.addPendingVariant(bullet.id, variantText, 'manual');
            
            manager.acceptVariant(bullet.id, variant.id);
            
            // Now adding same text should be detected as duplicate
            const isDupe = manager.isDuplicate(variantText);
            expect(isDupe).toBeTruthy();
        });
    });

    describe('deleteBullet()', () => {
        it('should remove bullet from library', () => {
            const { bullet } = manager.addBullet({ 
                text: 'Reduced infrastructure costs by 40% through optimization' 
            });
            
            manager.deleteBullet(bullet.id);
            
            expect(manager.getBullet(bullet.id)).toBeNull();
        });

        it('should throw Error for non-existent bullet', () => {
            expect(() => manager.deleteBullet('fake-id')).toThrow();
        });
    });
});
```

**Required test count: 18 tests minimum**

---

#### 3. Validation Tests (`validation.test.cjs`)

```javascript
const Validation = require('../validation.cjs');

describe('Validation', () => {
    describe('generateHash()', () => {
        it('should generate consistent hash for same text', () => {
            const hash1 = Validation.generateHash('Test bullet text');
            const hash2 = Validation.generateHash('Test bullet text');
            expect(hash1).toBe(hash2);
        });

        it('should normalize whitespace before hashing', () => {
            const hash1 = Validation.generateHash('Test  bullet   text');
            const hash2 = Validation.generateHash('Test bullet text');
            expect(hash1).toBe(hash2);
        });

        it('should be case-insensitive', () => {
            const hash1 = Validation.generateHash('TEST BULLET TEXT');
            const hash2 = Validation.generateHash('test bullet text');
            expect(hash1).toBe(hash2);
        });

        it('should throw TypeError for non-string input', () => {
            expect(() => Validation.generateHash(null)).toThrow(TypeError);
            expect(() => Validation.generateHash(123)).toThrow(TypeError);
        });
    });

    describe('levenshteinDistance()', () => {
        it('should return 0 for identical strings', () => {
            expect(Validation.levenshteinDistance('hello', 'hello')).toBe(0);
        });

        it('should return correct distance for single edit', () => {
            expect(Validation.levenshteinDistance('hello', 'hallo')).toBe(1);
        });

        it('should handle empty strings', () => {
            expect(Validation.levenshteinDistance('', 'test')).toBe(4);
            expect(Validation.levenshteinDistance('test', '')).toBe(4);
        });
    });

    describe('calculateSimilarity()', () => {
        it('should return 1.0 for identical strings', () => {
            expect(Validation.calculateSimilarity('same', 'same')).toBe(1.0);
        });

        it('should return value between 0 and 1', () => {
            const similarity = Validation.calculateSimilarity('hello', 'world');
            expect(similarity).toBeGreaterThanOrEqual(0);
            expect(similarity).toBeLessThanOrEqual(1);
        });

        it('should detect similar bullets above threshold', () => {
            const bullet1 = 'Engineered data pipeline processing 1M events daily';
            const bullet2 = 'Engineered data pipeline processing 1M events per day';
            const similarity = Validation.calculateSimilarity(bullet1, bullet2);
            expect(similarity).toBeGreaterThan(0.85);
        });
    });

    describe('validateBullet()', () => {
        it('should pass for well-formed STAR bullet', () => {
            const result = Validation.validateBullet(
                'Engineered CI/CD pipeline reducing deployment time by 50%'
            );
            expect(result.valid).toBe(true);
            expect(result.hasMetric).toBe(true);
            expect(result.hasVerb).toBe(true);
        });

        it('should flag bullet without metrics', () => {
            const result = Validation.validateBullet(
                'Worked on various projects for the team'
            );
            expect(result.hasMetric).toBe(false);
            expect(result.suggestions).toContain(expect.stringContaining('metrics'));
        });

        it('should flag bullet without strong verb', () => {
            const result = Validation.validateBullet(
                'Was responsible for the deployment pipeline'
            );
            expect(result.hasVerb).toBe(false);
        });
    });
});
```

**Required test count: 12 tests minimum**

---

#### 4. HeaderLibraryManager Tests (`header-library-manager.test.cjs`)

```javascript
const HeaderLibraryManager = require('../header-library-manager.cjs');
const mockFs = require('mock-fs');

describe('HeaderLibraryManager', () => {
    let manager;
    let mockPaths;

    beforeEach(() => {
        mockFs({ '/mock/bullet-library': {} });
        mockPaths = {
            getHeadersFilePath: () => '/mock/bullet-library/headers.json'
        };
        manager = new HeaderLibraryManager(mockPaths);
    });

    afterEach(() => {
        mockFs.restore();
    });

    describe('Constructor', () => {
        it('should throw TypeError if storagePaths not provided', () => {
            expect(() => new HeaderLibraryManager()).toThrow(TypeError);
        });
    });

    describe('addHeader()', () => {
        it('should add h2 header', () => {
            const result = manager.addHeader({ level: 2, text: 'Experience' });
            expect(result.duplicate).toBe(false);
            expect(result.header.level).toBe(2);
            expect(result.header.id).toBeDefined();
        });

        it('should add h3 header with parent reference', () => {
            const h2 = manager.addHeader({ level: 2, text: 'Experience' });
            const result = manager.addHeader({
                level: 3,
                text: 'Senior Developer, Company',
                parentHeaderId: h2.header.id,
                dateRange: 'Jan 2020 — Present'
            });
            expect(result.header.parentHeaderId).toBe(h2.header.id);
            expect(result.header.dateRange).toBe('Jan 2020 — Present');
        });

        it('should detect duplicate headers', () => {
            manager.addHeader({ level: 2, text: 'Skills' });
            const result = manager.addHeader({ level: 2, text: 'Skills' });
            expect(result.duplicate).toBe(true);
            expect(result.header.usageCount).toBe(2);
        });
    });

    describe('getSubHeaders()', () => {
        it('should return h3 headers under h2 parent', () => {
            const h2 = manager.addHeader({ level: 2, text: 'Experience' });
            manager.addHeader({ level: 3, text: 'Job 1', parentHeaderId: h2.header.id });
            manager.addHeader({ level: 3, text: 'Job 2', parentHeaderId: h2.header.id });
            
            const subHeaders = manager.getSubHeaders(h2.header.id);
            expect(subHeaders.length).toBe(2);
        });
    });

    describe('generateMarkdown()', () => {
        it('should generate correct h2 markdown', () => {
            const { header } = manager.addHeader({ level: 2, text: 'Experience' });
            const md = manager.generateMarkdown(header.id);
            expect(md).toBe('## Experience');
        });

        it('should include date range with spacer', () => {
            const { header } = manager.addHeader({
                level: 3,
                text: 'Developer, Company',
                dateRange: '2020 — 2023'
            });
            const md = manager.generateMarkdown(header.id);
            expect(md).toContain('### Developer, Company');
            expect(md).toContain('<span class="spacer">');
            expect(md).toContain('2020 — 2023');
        });
    });
});
```

**Required test count: 8 tests minimum**

---

#### 5. JobPostManager Tests (`job-post-manager.test.cjs`)

```javascript
const JobPostManager = require('../job-post-manager.cjs');
const mockFs = require('mock-fs');

describe('JobPostManager', () => {
    let manager;
    let mockPaths;

    beforeEach(() => {
        mockFs({ '/mock/job-posts': {} });
        mockPaths = {
            getJobPostIndexPath: () => '/mock/job-posts/index.json',
            getJobPostFilePath: (filename) => `/mock/job-posts/${filename}`,
            getJobPostsPath: () => '/mock/job-posts'
        };
        manager = new JobPostManager(mockPaths);
    });

    afterEach(() => {
        mockFs.restore();
    });

    describe('addJobPost()', () => {
        it('should create job post with markdown file', () => {
            const result = manager.addJobPost({
                title: 'Senior Developer',
                company: 'TechCorp',
                description: 'Build amazing things',
                keySkills: ['React', 'Node.js']
            });

            expect(result.id).toBeDefined();
            expect(result.title).toBe('Senior Developer');
            expect(result.status).toBe('active');
        });

        it('should throw TypeError for missing required fields', () => {
            expect(() => manager.addJobPost({ title: 'Test' })).toThrow(TypeError);
        });

        it('should throw Error for duplicate job post', () => {
            manager.addJobPost({ title: 'Dev', company: 'Co' });
            expect(() => manager.addJobPost({ title: 'Dev', company: 'Co' })).toThrow();
        });
    });

    describe('getJobPost()', () => {
        it('should return job post with content', () => {
            const created = manager.addJobPost({
                title: 'Engineer',
                company: 'StartupXYZ',
                description: 'Work on cutting-edge tech'
            });

            const retrieved = manager.getJobPost(created.id);
            expect(retrieved.content).toContain('# Engineer');
            expect(retrieved.content).toContain('StartupXYZ');
        });

        it('should return null for non-existent post', () => {
            expect(manager.getJobPost('fake-id')).toBeNull();
        });
    });

    describe('getActiveJobPosts()', () => {
        it('should filter to active posts only', () => {
            manager.addJobPost({ title: 'Job1', company: 'Co1' });
            const job2 = manager.addJobPost({ title: 'Job2', company: 'Co2' });
            manager.updateJobPost(job2.id, { status: 'archived' });

            const active = manager.getActiveJobPosts();
            expect(active.length).toBe(1);
            expect(active[0].title).toBe('Job1');
        });
    });

    describe('deleteJobPost()', () => {
        it('should remove post and markdown file', () => {
            const post = manager.addJobPost({ title: 'ToDelete', company: 'Gone' });
            manager.deleteJobPost(post.id);
            
            expect(manager.getJobPost(post.id)).toBeNull();
        });
    });

    describe('getJobContext()', () => {
        it('should return context object for AI', () => {
            const post = manager.addJobPost({
                title: 'ML Engineer',
                company: 'AI Corp',
                keySkills: ['Python', 'TensorFlow'],
                description: 'Build ML models'
            });

            const context = manager.getJobContext(post.id);
            expect(context.title).toBe('ML Engineer');
            expect(context.keySkills).toContain('Python');
            expect(context.content).toBeDefined();
        });
    });
});
```

**Required test count: 9 tests minimum**

---

#### 6. bulletParser Tests (`bulletParser.test.js`)

```javascript
import { parseResumeBullets, parseResumeHeaders, analyzeBulletQuality, cleanBulletText } from '../bulletParser.js';

describe('bulletParser', () => {
    describe('parseResumeBullets()', () => {
        it('should extract bullets from markdown', () => {
            const markdown = `## Experience

### Developer, Company

- Built scalable API serving 1M requests
- Optimized database reducing query time by 50%
`;
            const bullets = parseResumeBullets(markdown);
            expect(bullets.length).toBe(2);
            expect(bullets[0].text).toContain('Built scalable API');
        });

        it('should associate bullets with parent headers', () => {
            const markdown = `## Experience

### Dev, Co

- Did something great
`;
            const bullets = parseResumeBullets(markdown);
            expect(bullets[0].parentHeader.headerText).toBe('Dev, Co');
            expect(bullets[0].parentHeader.sectionHeader).toBe('Experience');
        });

        it('should handle nested list items', () => {
            const markdown = `## Skills

- Main skill
  - Sub skill 1
  - Sub skill 2
`;
            const bullets = parseResumeBullets(markdown);
            // Should flatten or handle appropriately
            expect(bullets.length).toBeGreaterThan(0);
        });
    });

    describe('parseResumeHeaders()', () => {
        it('should extract h2 and h3 headers', () => {
            const markdown = `# Name

## Experience

### Job Title, Company <span class="spacer"></span> 2020 — 2023

## Skills
`;
            const headers = parseResumeHeaders(markdown);
            expect(headers.filter(h => h.level === 2).length).toBe(2);
            expect(headers.filter(h => h.level === 3).length).toBe(1);
        });

        it('should extract date ranges from h3 headers', () => {
            const markdown = `### Senior Dev, Corp <span class="spacer"></span> Jan 2020 — Present`;
            const headers = parseResumeHeaders(markdown);
            expect(headers[0].dateRange).toBe('Jan 2020 — Present');
        });
    });

    describe('analyzeBulletQuality()', () => {
        it('should score bullet with metrics higher', () => {
            const withMetrics = analyzeBulletQuality('Improved performance by 50%');
            const without = analyzeBulletQuality('Improved performance significantly');
            expect(withMetrics.score).toBeGreaterThan(without.score);
        });

        it('should detect strong action verbs', () => {
            const result = analyzeBulletQuality('Engineered a solution');
            expect(result.hasVerb).toBe(true);
        });
    });

    describe('cleanBulletText()', () => {
        it('should remove markdown links', () => {
            const result = cleanBulletText('Used [React](https://react.dev) framework');
            expect(result).toBe('Used React framework');
        });

        it('should remove inline code', () => {
            const result = cleanBulletText('Implemented `async/await` patterns');
            expect(result).toBe('Implemented async/await patterns');
        });
    });
});
```

**Required test count: 10 tests minimum**

---

### Iteration Workflow for Agent

For EACH implementation step, the agent MUST:

```
1. CREATE test file with all test cases for the module
2. RUN tests: `npm test -- --testPathPattern=[module-name]`
3. CAPTURE failing output (Red phase evidence)
4. IMPLEMENT the module code
5. RUN tests again
6. CAPTURE passing output (Green phase evidence)
7. REFACTOR if needed (apply SOLID, patterns)
8. RUN tests again to verify still passing
9. DOCUMENT evidence in implementation notes
10. ONLY proceed to next step if ALL tests pass
```

**Blocking Rule:** If any test fails, the agent MUST fix the implementation before proceeding. DO NOT skip to the next module with failing tests.

---

## Implementation Steps

### Step 1: Storage Path Manager

Create `export-to-pdf/electron/storage-paths.cjs`:

```javascript
/**
 * Storage Path Manager
 * Resolves OS-specific application data paths for local storage
 * Windows: C:\Users\[username]\AppData\Roaming\resume-pdf-exporter\
 * macOS: ~/Library/Application Support/resume-pdf-exporter/
 * Linux: ~/.config/resume-pdf-exporter/
 */
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class StoragePaths {
    constructor() {
        // app.getPath('userData') returns the OS-appropriate path
        // e.g., C:\Users\[username]\AppData\Roaming\resume-pdf-exporter
        this.basePath = app.getPath('userData');
        this.initializeDirectories();
    }

    initializeDirectories() {
        const dirs = [
            this.getResumeDataPath(),
            this.getBulletLibraryPath(),
            this.getJobPostsPath(),
            this.getResumeArchivePath()
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    // Base paths
    getBasePath() {
        return this.basePath;
    }

    getResumeDataPath() {
        return path.join(this.basePath, 'resume-data');
    }

    getBulletLibraryPath() {
        return path.join(this.basePath, 'bullet-library');
    }

    getJobPostsPath() {
        return path.join(this.basePath, 'job-posts');
    }

    getResumeArchivePath() {
        return path.join(this.basePath, 'resume-archive');
    }

    // Specific files
    getBulletsFilePath() {
        return path.join(this.getBulletLibraryPath(), 'bullets.json');
    }

    getHeadersFilePath() {
        return path.join(this.getBulletLibraryPath(), 'headers.json');
    }

    getValidationHashesPath() {
        return path.join(this.getBulletLibraryPath(), 'validation-hashes.json');
    }

    getJobPostIndexPath() {
        return path.join(this.getJobPostsPath(), 'index.json');
    }

    getJobPostFilePath(filename) {
        return path.join(this.getJobPostsPath(), filename);
    }

    getAISettingsPath() {
        return path.join(this.basePath, 'ai-settings.json');
    }

    getActiveResumePath() {
        return path.join(this.getResumeDataPath(), 'resume.md');
    }

    getResumeCSSPath() {
        return path.join(this.getResumeDataPath(), 'resume.css');
    }

    getSettingsCSSPath() {
        return path.join(this.getResumeDataPath(), 'settings.css');
    }

    // Archive helpers
    archiveResume(resumeContent) {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `resume-${timestamp}.md`;
        const filePath = path.join(this.getResumeArchivePath(), filename);
        
        // Add suffix if file exists
        let finalPath = filePath;
        let counter = 1;
        while (fs.existsSync(finalPath)) {
            finalPath = path.join(this.getResumeArchivePath(), `resume-${timestamp}-${counter}.md`);
            counter++;
        }
        
        fs.writeFileSync(finalPath, resumeContent);
        return path.basename(finalPath);
    }
}

// Singleton instance
let instance = null;

function getStoragePaths() {
    if (!instance) {
        instance = new StoragePaths();
    }
    return instance;
}

module.exports = { StoragePaths, getStoragePaths };
```

---

### Step 2: Bullet Library Data Store

Create `export-to-pdf/electron/managers/bullet-library-manager.cjs`:

```javascript
/**
 * Bullet Library Manager
 * 
 * Handles CRUD operations for unified bullet library storage.
 * Aggregates bullets from ALL resumes into a single searchable library.
 * 
 * SOLID Principles:
 * - Single Responsibility: ONLY manages bullet storage operations
 * - Open/Closed: Extensible via injected validator, closed to modification
 * - Dependency Inversion: Depends on injected StoragePaths and Validation abstractions
 * 
 * @class BulletLibraryManager
 */
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class BulletLibraryManager {
    // Private fields (ES2022) - encapsulated state
    #library = null;
    #hashes = null;
    #paths = null;
    #validator = null;

    /**
     * Create a BulletLibraryManager instance
     * 
     * @param {Object} storagePaths - Injected StoragePaths instance (Dependency Injection)
     * @param {Object} [validator] - Optional injected Validation instance
     * @throws {TypeError} If storagePaths is not provided
     * 
     * @example
     * const manager = new BulletLibraryManager(getStoragePaths(), new Validation());
     */
    constructor(storagePaths, validator = null) {
        if (!storagePaths) {
            throw new TypeError('storagePaths is required');
        }
        this.#paths = storagePaths;
        this.#validator = validator;
        
        // Freeze public interface to prevent modification
        Object.freeze(this);
    }

    // ============================================
    // PRIVATE HELPER METHODS
    // ============================================

    #createEmptyLibrary() {
        return {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            totalBullets: 0,
            bullets: []
        };
    }

    #ensureLoaded() {
        if (!this.#library) {
            this.load();
        }
    }

    #ensureHashesLoaded() {
        if (!this.#hashes) {
            this.#loadHashes();
        }
    }

    #loadHashes() {
        const filePath = this.#paths.getValidationHashesPath();
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            this.#hashes = JSON.parse(data);
        } else {
            this.#hashes = { version: '1.0.0', hashes: {} };
        }
    }

    #saveHashes() {
        const filePath = this.#paths.getValidationHashesPath();
        fs.writeFileSync(filePath, JSON.stringify(this.#hashes, null, 2));
    }

    #generateHash(text) {
        // Normalize text: lowercase, collapse whitespace, trim
        const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
        return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 12);
    }

    #registerHash(text, id) {
        const hash = this.#generateHash(text);
        this.#ensureHashesLoaded();
        this.#hashes.hashes[hash] = id;
        return hash;
    }

    #createBulletEntity(bulletData) {
        const hash = this.#generateHash(bulletData.text);
        return {
            id: uuidv4(),
            text: bulletData.text,
            textHash: hash,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: bulletData.source || { type: 'manual' },
            parentHeader: bulletData.parentHeader || null,
            usageCount: 1,
            lastUsed: new Date().toISOString(),
            tags: bulletData.tags || [],
            variants: []
        };
    }

    #cloneBullet(bullet) {
        // Return immutable copy (Encapsulation - don't expose internal refs)
        return {
            ...bullet,
            variants: bullet.variants.map(v => ({ ...v })),
            tags: [...(bullet.tags || [])]
        };
    }

    // ============================================
    // PUBLIC API - CORE LIBRARY OPERATIONS
    // ============================================

    /**
     * Load the bullet library from disk
     * 
     * @returns {Object} The loaded library (immutable copy)
     */
    load() {
        const filePath = this.#paths.getBulletsFilePath();
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            this.#library = JSON.parse(data);
        } else {
            this.#library = this.#createEmptyLibrary();
            this.save();
        }
        // Return immutable copy
        return {
            ...this.#library,
            bullets: this.#library.bullets.map(b => this.#cloneBullet(b))
        };
    }

    /**
     * Save the current library state to disk
     * 
     * @returns {Object} The saved library metadata
     */
    save() {
        this.#library.lastUpdated = new Date().toISOString();
        this.#library.totalBullets = this.#library.bullets.length;
        const filePath = this.#paths.getBulletsFilePath();
        fs.writeFileSync(filePath, JSON.stringify(this.#library, null, 2));
        this.#saveHashes();
        return {
            lastUpdated: this.#library.lastUpdated,
            totalBullets: this.#library.totalBullets
        };
    }

    // ============================================
    // PUBLIC API - DUPLICATE DETECTION
    // ============================================

    /**
     * Check if text is a duplicate of existing bullet
     * 
     * @param {string} text - The text to check
     * @returns {string|null} The ID of existing bullet if duplicate, null otherwise
     */
    isDuplicate(text) {
        if (!text || typeof text !== 'string') {
            throw new TypeError('text must be a non-empty string');
        }
        const hash = this.#generateHash(text);
        this.#ensureHashesLoaded();
        return this.#hashes.hashes[hash] || null;
    }

    // ============================================
    // PUBLIC API - BULLET CRUD OPERATIONS
    // ============================================

    /**
     * Add a new bullet to the library with duplicate checking
     * 
     * @param {Object} bulletData - The bullet data to add
     * @param {string} bulletData.text - The bullet text content (required, min 10 chars)
     * @param {Object} [bulletData.parentHeader] - Parent header reference
     * @param {string} [bulletData.parentHeader.headerText] - Header text
     * @param {number} [bulletData.parentHeader.headerLevel] - 2 or 3
     * @param {Object} [bulletData.source] - Source information
     * @param {string[]} [bulletData.tags] - Tags for categorization
     * 
     * @returns {Object} Result object
     * @returns {boolean} result.duplicate - True if bullet was duplicate
     * @returns {Object} result.bullet - The created or existing bullet (immutable copy)
     * 
     * @throws {TypeError} If bulletData.text is missing or invalid
     */
    addBullet(bulletData) {
        // Input validation (validate at boundaries)
        if (!bulletData || typeof bulletData !== 'object') {
            throw new TypeError('bulletData must be an object');
        }
        if (!bulletData.text || typeof bulletData.text !== 'string') {
            throw new TypeError('bulletData.text must be a non-empty string');
        }
        if (bulletData.text.trim().length < 10) {
            throw new Error('Bullet text must be at least 10 characters');
        }

        this.#ensureLoaded();
        
        // Check for duplicate
        const existingId = this.isDuplicate(bulletData.text);
        if (existingId) {
            // Update usage count instead of creating duplicate
            const existing = this.#library.bullets.find(b => b.id === existingId);
            if (existing) {
                existing.usageCount++;
                existing.lastUsed = new Date().toISOString();
                this.save();
                return { duplicate: true, bullet: this.#cloneBullet(existing) };
            }
        }

        const bullet = this.#createBulletEntity(bulletData);
        this.#library.bullets.push(bullet);
        this.#registerHash(bulletData.text, bullet.id);
        this.save();

        return { duplicate: false, bullet: this.#cloneBullet(bullet) };
    }

    /**
     * Get a bullet by ID
     * 
     * @param {string} bulletId - The bullet ID
     * @returns {Object|null} The bullet (immutable copy) or null if not found
     */
    getBullet(bulletId) {
        if (!bulletId || typeof bulletId !== 'string') {
            throw new TypeError('bulletId must be a non-empty string');
        }
        this.#ensureLoaded();
        const bullet = this.#library.bullets.find(b => b.id === bulletId);
        return bullet ? this.#cloneBullet(bullet) : null;
    }

    /**
     * Get all bullets in the library
     * 
     * @returns {Object[]} Array of bullets (immutable copies)
     */
    getAllBullets() {
        this.#ensureLoaded();
        return this.#library.bullets.map(b => this.#cloneBullet(b));
    }

    /**
     * Update a bullet by ID
     * 
     * @param {string} bulletId - The bullet ID
     * @param {Object} updates - Fields to update
     * @returns {Object} The updated bullet (immutable copy)
     * @throws {Error} If bullet not found
     */
    updateBullet(bulletId, updates) {
        if (!bulletId || typeof bulletId !== 'string') {
            throw new TypeError('bulletId must be a non-empty string');
        }
        this.#ensureLoaded();
        const bullet = this.#library.bullets.find(b => b.id === bulletId);
        if (!bullet) {
            throw new Error(`Bullet not found: ${bulletId}`);
        }

        // Only allow safe updates (encapsulation)
        const safeUpdates = {};
        if (updates.tags) safeUpdates.tags = [...updates.tags];
        if (updates.parentHeader) safeUpdates.parentHeader = { ...updates.parentHeader };
        
        Object.assign(bullet, safeUpdates, { updatedAt: new Date().toISOString() });
        this.save();
        return this.#cloneBullet(bullet);
    }

    /**
     * Delete a bullet by ID
     * 
     * @param {string} bulletId - The bullet ID
     * @returns {boolean} True if deleted
     * @throws {Error} If bullet not found
     */
    deleteBullet(bulletId) {
        if (!bulletId || typeof bulletId !== 'string') {
            throw new TypeError('bulletId must be a non-empty string');
        }
        this.#ensureLoaded();
        const index = this.#library.bullets.findIndex(b => b.id === bulletId);
        if (index === -1) {
            throw new Error(`Bullet not found: ${bulletId}`);
        }

        const bullet = this.#library.bullets[index];
        
        // Remove from hash index
        this.#ensureHashesLoaded();
        delete this.#hashes.hashes[bullet.textHash];
        bullet.variants.forEach(v => delete this.#hashes.hashes[v.textHash]);

        this.#library.bullets.splice(index, 1);
        this.save();
        return true;
    }

    // ============================================
    // PUBLIC API - VARIANT OPERATIONS
    // ============================================

    /**
     * Add a pending variant (not yet accepted by user)
     * 
     * @param {string} bulletId - Parent bullet ID
     * @param {string} variantText - The variant text
     * @param {string} source - Source type ('ai-rephrase' | 'manual' | 'imported')
     * @param {string} [model] - AI model used if source is 'ai-rephrase'
     * @param {string} [jobPostRef] - Job post ID if relevant
     * 
     * @returns {Object} Result with duplicate flag and variant
     */
    addPendingVariant(bulletId, variantText, source, model = null, jobPostRef = null) {
        if (!bulletId || !variantText) {
            throw new TypeError('bulletId and variantText are required');
        }
        
        this.#ensureLoaded();
        const bullet = this.#library.bullets.find(b => b.id === bulletId);
        if (!bullet) {
            throw new Error(`Bullet not found: ${bulletId}`);
        }

        // Check if this exact variant already exists
        const variantHash = this.#generateHash(variantText);
        const existingVariant = bullet.variants.find(v => v.textHash === variantHash);
        if (existingVariant) {
            return { duplicate: true, variant: { ...existingVariant } };
        }

        const variant = {
            id: uuidv4(),
            text: variantText,
            textHash: variantHash,
            createdAt: new Date().toISOString(),
            source,
            model,
            jobPostRef,
            accepted: false,
            acceptedAt: null
        };

        bullet.variants.push(variant);
        this.save();

        return { duplicate: false, variant: { ...variant } };
    }

    /**
     * Accept a variant - registers it in hash index for duplicate detection
     * 
     * @param {string} bulletId - Parent bullet ID
     * @param {string} variantId - Variant ID to accept
     * @returns {Object} The accepted variant (immutable copy)
     */
    acceptVariant(bulletId, variantId) {
        this.#ensureLoaded();
        const bullet = this.#library.bullets.find(b => b.id === bulletId);
        if (!bullet) {
            throw new Error(`Bullet not found: ${bulletId}`);
        }

        const variant = bullet.variants.find(v => v.id === variantId);
        if (!variant) {
            throw new Error(`Variant not found: ${variantId}`);
        }

        variant.accepted = true;
        variant.acceptedAt = new Date().toISOString();

        // Register in hash index once accepted
        this.#registerHash(variant.text, variant.id);
        this.save();

        return { ...variant };
    }

    /**
     * Reject and remove a variant
     * 
     * @param {string} bulletId - Parent bullet ID
     * @param {string} variantId - Variant ID to reject
     * @returns {boolean} True if removed
     */
    rejectVariant(bulletId, variantId) {
        this.#ensureLoaded();
        const bullet = this.#library.bullets.find(b => b.id === bulletId);
        if (!bullet) {
            throw new Error(`Bullet not found: ${bulletId}`);
        }

        const index = bullet.variants.findIndex(v => v.id === variantId);
        if (index === -1) {
            throw new Error(`Variant not found: ${variantId}`);
        }

        bullet.variants.splice(index, 1);
        this.save();

        return true;
    }

    // ============================================
    // PUBLIC API - QUERY OPERATIONS
    // ============================================

    /**
     * Get bullets by parent header ID
     * 
     * @param {string} headerId - The header ID to filter by
     * @returns {Object[]} Array of matching bullets (immutable copies)
     */
    getBulletsByHeader(headerId) {
        this.#ensureLoaded();
        return this.#library.bullets
            .filter(b => b.parentHeader && b.parentHeader.headerId === headerId)
            .map(b => this.#cloneBullet(b));
    }

    /**
     * Get bullets by section name
     * 
     * @param {string} sectionName - Section name to filter by
     * @returns {Object[]} Array of matching bullets (immutable copies)
     */
    getBulletsBySection(sectionName) {
        this.#ensureLoaded();
        return this.#library.bullets
            .filter(b => 
                b.parentHeader && (
                    b.parentHeader.headerText === sectionName ||
                    b.parentHeader.sectionHeader === sectionName
                )
            )
            .map(b => this.#cloneBullet(b));
    }

    /**
     * Search bullets by query text
     * 
     * @param {string} query - Search query
     * @returns {Object[]} Matching bullets (immutable copies)
     */
    searchBullets(query) {
        if (!query || typeof query !== 'string') {
            throw new TypeError('query must be a non-empty string');
        }
        this.#ensureLoaded();
        const lowerQuery = query.toLowerCase();
        return this.#library.bullets
            .filter(b => 
                b.text.toLowerCase().includes(lowerQuery) ||
                b.tags.some(t => t.toLowerCase().includes(lowerQuery))
            )
            .map(b => this.#cloneBullet(b));
    }

    /**
     * Import bullets from a resume file
     * 
     * @param {Object[]} parsedBullets - Array of parsed bullets from bulletParser
     * @param {string} resumeFilename - Source resume filename
     * @returns {Object} Import results { added, duplicates, bullets }
     */
    importFromResume(parsedBullets, resumeFilename) {
        if (!Array.isArray(parsedBullets)) {
            throw new TypeError('parsedBullets must be an array');
        }
        
        const results = { added: 0, duplicates: 0, bullets: [] };

        parsedBullets.forEach(parsed => {
            const result = this.addBullet({
                text: parsed.text,
                source: {
                    type: 'resume',
                    resumeFile: resumeFilename,
                    lineNumber: parsed.lineNumber
                },
                parentHeader: parsed.parentHeader,
                tags: []
            });

            if (result.duplicate) {
                results.duplicates++;
            } else {
                results.added++;
            }
            results.bullets.push(result.bullet);
        });

        return results;
    }
}

module.exports = BulletLibraryManager;
```

**Dependencies to add to `package.json`:**
```json
{
  "dependencies": {
    "uuid": "^9.0.0"
  }
}
```

---

### Step 3: Header Library Manager

Create `export-to-pdf/electron/managers/header-library-manager.cjs`:

```javascript
/**
 * Header Library Manager
 * 
 * Stores and manages reusable section headers (h2/h3) across resumes.
 * 
 * SOLID Principles:
 * - Single Responsibility: ONLY manages header storage operations
 * - Dependency Inversion: Depends on injected StoragePaths abstraction
 * 
 * @class HeaderLibraryManager
 */
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class HeaderLibraryManager {
    // Private fields (ES2022)
    #library = null;
    #paths = null;

    /**
     * Create a HeaderLibraryManager instance
     * 
     * @param {Object} storagePaths - Injected StoragePaths instance
     * @throws {TypeError} If storagePaths is not provided
     */
    constructor(storagePaths) {
        if (!storagePaths) {
            throw new TypeError('storagePaths is required');
        }
        this.#paths = storagePaths;
        Object.freeze(this);
    }

    // ============================================
    // PRIVATE HELPER METHODS
    // ============================================

    #createEmptyLibrary() {
        return {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            headers: []
        };
    }

    #ensureLoaded() {
        if (!this.#library) {
            this.load();
        }
    }

    #cloneHeader(header) {
        return { ...header };
    }

    // ============================================
    // PUBLIC API - CORE OPERATIONS
    // ============================================

    /**
     * Load the header library from disk
     * @returns {Object} Library with headers (immutable copy)
     */
    load() {
        const filePath = this.#paths.getHeadersFilePath();
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            this.#library = JSON.parse(data);
        } else {
            this.#library = this.#createEmptyLibrary();
            this.save();
        }
        return {
            ...this.#library,
            headers: this.#library.headers.map(h => this.#cloneHeader(h))
        };
    }

    /**
     * Save the library to disk
     * @returns {Object} Save metadata
     */
    save() {
        this.#library.lastUpdated = new Date().toISOString();
        const filePath = this.#paths.getHeadersFilePath();
        fs.writeFileSync(filePath, JSON.stringify(this.#library, null, 2));
        return { lastUpdated: this.#library.lastUpdated };
    }

    /**
     * Add or update a header in the library
     * 
     * @param {Object} headerData - Header data
     * @param {string} headerData.text - Header text
     * @param {number} headerData.level - 2 or 3
     * @param {string} [headerData.parentHeaderId] - Parent h2 ID for h3 headers
     * @param {string} [headerData.dateRange] - Optional date range text
     * @param {string} [headerData.subtitle] - Optional subtitle
     * 
     * @returns {Object} Result with duplicate flag and header
     */
    addHeader(headerData) {
        if (!headerData?.text || !headerData?.level) {
            throw new TypeError('headerData.text and headerData.level are required');
        }
        
        this.#ensureLoaded();

        // Check for existing header with same text and level
        const existing = this.#library.headers.find(h => 
            h.text === headerData.text && h.level === headerData.level
        );

        if (existing) {
            existing.usageCount++;
            // Update optional fields if provided
            if (headerData.dateRange) existing.dateRange = headerData.dateRange;
            if (headerData.subtitle) existing.subtitle = headerData.subtitle;
            this.save();
            return { duplicate: true, header: this.#cloneHeader(existing) };
        }

        const header = {
            id: uuidv4(),
            level: headerData.level,
            text: headerData.text,
            parentHeaderId: headerData.parentHeaderId || null,
            dateRange: headerData.dateRange || null,
            subtitle: headerData.subtitle || null,
            usageCount: 1,
            createdAt: new Date().toISOString()
        };

        this.#library.headers.push(header);
        this.save();

        return { duplicate: false, header: this.#cloneHeader(header) };
    }

    /**
     * Get a header by ID
     * @param {string} headerId - Header ID
     * @returns {Object|null} Header (immutable copy) or null
     */
    getHeader(headerId) {
        this.#ensureLoaded();
        const header = this.#library.headers.find(h => h.id === headerId);
        return header ? this.#cloneHeader(header) : null;
    }

    /**
     * Get all headers
     * @returns {Object[]} All headers (immutable copies)
     */
    getAllHeaders() {
        this.#ensureLoaded();
        return this.#library.headers.map(h => this.#cloneHeader(h));
    }

    /**
     * Get headers by level
     * @param {number} level - 2 or 3
     * @returns {Object[]} Matching headers (immutable copies)
     */
    getHeadersByLevel(level) {
        this.#ensureLoaded();
        return this.#library.headers
            .filter(h => h.level === level)
            .map(h => this.#cloneHeader(h));
    }

    /**
     * Get h3 headers under a specific h2 parent
     * @param {string} parentHeaderId - Parent header ID
     * @returns {Object[]} Sub-headers (immutable copies)
     */
    getSubHeaders(parentHeaderId) {
        this.#ensureLoaded();
        return this.#library.headers
            .filter(h => h.parentHeaderId === parentHeaderId)
            .map(h => this.#cloneHeader(h));
    }

    /**
     * Delete a header by ID
     * @param {string} headerId - Header ID
     * @returns {boolean} True if deleted
     */
    deleteHeader(headerId) {
        this.#ensureLoaded();
        const index = this.#library.headers.findIndex(h => h.id === headerId);
        if (index === -1) {
            throw new Error(`Header not found: ${headerId}`);
        }

        this.#library.headers.splice(index, 1);
        this.save();
        return true;
    }

    /**
     * Generate markdown for a header
     * @param {string} headerId - Header ID
     * @returns {string} Markdown string
     */
    generateMarkdown(headerId) {
        const header = this.getHeader(headerId);
        if (!header) {
            throw new Error(`Header not found: ${headerId}`);
        }

        const prefix = '#'.repeat(header.level);
        let markdown = `${prefix} ${header.text}`;

        if (header.dateRange) {
            markdown += ` <span class="spacer"></span> ${header.dateRange}`;
        }

        if (header.subtitle) {
            markdown += `\n\n*${header.subtitle}*`;
        }

        return markdown;
    }

    /**
     * Import headers from parsed resume
     */
    importFromResume(parsedHeaders) {
        const results = { added: 0, duplicates: 0, headers: [] };
        const headerMap = {}; // Map text to id for parent linking

        // First pass: add h2 headers
        parsedHeaders.filter(h => h.level === 2).forEach(parsed => {
            const result = this.addHeader({
                level: 2,
                text: parsed.text
            });
            headerMap[parsed.text] = result.header.id;
            results.headers.push(result.header);
            result.duplicate ? results.duplicates++ : results.added++;
        });

        // Second pass: add h3 headers with parent links
        parsedHeaders.filter(h => h.level === 3).forEach(parsed => {
            const result = this.addHeader({
                level: 3,
                text: parsed.text,
                parentHeaderId: parsed.parentText ? headerMap[parsed.parentText] : null,
                dateRange: parsed.dateRange,
                subtitle: parsed.subtitle
            });
            headerMap[parsed.text] = result.header.id;
            results.headers.push(result.header);
            result.duplicate ? results.duplicates++ : results.added++;
        });

        return results;
    }
}

module.exports = HeaderLibraryManager;
```

---

### Step 4: Job Post Manager

Create `export-to-pdf/electron/managers/job-post-manager.cjs`:

```javascript
/**
 * Job Post Manager
 * 
 * Stores and manages job postings as markdown files for AI context.
 * 
 * SOLID Principles:
 * - Single Responsibility: ONLY manages job post storage operations
 * - Dependency Inversion: Depends on injected StoragePaths and Validation abstractions
 * 
 * @class JobPostManager
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class JobPostManager {
    // Private fields (ES2022)
    #index = null;
    #paths = null;
    #validator = null;

    /**
     * Create a JobPostManager instance
     * 
     * @param {Object} storagePaths - Injected StoragePaths instance
     * @param {Object} [validator] - Optional injected Validation instance
     * @throws {TypeError} If storagePaths is not provided
     */
    constructor(storagePaths, validator = null) {
        if (!storagePaths) {
            throw new TypeError('storagePaths is required');
        }
        this.#paths = storagePaths;
        this.#validator = validator;
        Object.freeze(this);
    }

    // ============================================
    // PRIVATE HELPER METHODS
    // ============================================

    #createEmptyIndex() {
        return {
            version: '1.0.0',
            posts: []
        };
    }

    #ensureIndexLoaded() {
        if (!this.#index) {
            this.loadIndex();
        }
    }

    #clonePost(post) {
        return {
            ...post,
            keySkills: [...(post.keySkills || [])]
        };
    }

    /**
     * Generate a safe filename from job title and company
     * @private
     */
    #generateFilename(company, title) {
        const slug = `${company}-${title}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);
        
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        return `${slug}-${date}.md`;
    }

    // ============================================
    // PUBLIC API - INDEX OPERATIONS
    // ============================================

    /**
     * Load the job post index
     * @returns {Object} Index with posts array (immutable copy)
     */
    loadIndex() {
        const filePath = this.#paths.getJobPostIndexPath();
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            this.#index = JSON.parse(data);
        } else {
            this.#index = this.#createEmptyIndex();
            this.saveIndex();
        }
        return {
            ...this.#index,
            posts: this.#index.posts.map(p => this.#clonePost(p))
        };
    }

    /**
     * Save the index to disk
     * @returns {Object} Save metadata
     */
    saveIndex() {
        const filePath = this.#paths.getJobPostIndexPath();
        fs.writeFileSync(filePath, JSON.stringify(this.#index, null, 2));
        return { saved: true };
    }

    // ============================================
    // PUBLIC API - JOB POST CRUD
    // ============================================

    /**
     * Add a new job post
     * 
     * @param {Object} postData - Job post data
     * @param {string} postData.title - Job title
     * @param {string} postData.company - Company name
     * @param {string} [postData.description] - Job description markdown
     * @param {string[]} [postData.keySkills] - Key skills
     * @param {string} [postData.url] - Job posting URL
     * 
     * @returns {Object} Created post (immutable copy)
     */
    addJobPost(postData) {
        if (!postData?.title || !postData?.company) {
            throw new TypeError('postData.title and postData.company are required');
        }
        
        this.#ensureIndexLoaded();

        const filename = this.#generateFilename(postData.company, postData.title);
        const id = filename.replace('.md', '');

        // Check for existing post with same id
        const existing = this.#index.posts.find(p => p.id === id);
        if (existing) {
            throw new Error(`Job post already exists: ${id}`);
        }

        // Create markdown file
        const markdown = this.#generateJobPostMarkdown(postData);
        const filePath = this.#paths.getJobPostFilePath(filename);
        fs.writeFileSync(filePath, markdown);

        // Add to index
        const post = {
            id,
            filename,
            title: postData.title,
            company: postData.company,
            dateAdded: new Date().toISOString(),
            url: postData.url || null,
            status: 'active',
            keySkills: postData.keySkills || []
        };

        this.#index.posts.push(post);
        this.saveIndex();

        return this.#clonePost(post);
    }

    /**
     * Generate markdown for job post storage
     * @private
     */
    #generateJobPostMarkdown(postData) {
        return `# ${postData.title}

**Company:** ${postData.company}
**Date Added:** ${new Date().toISOString().split('T')[0]}
${postData.url ? `**URL:** ${postData.url}` : ''}
${postData.keySkills?.length ? `**Key Skills:** ${postData.keySkills.join(', ')}` : ''}

---

## Job Description

${postData.description || '[Paste job description here]'}

---

## Requirements

${postData.requirements || '[Paste requirements here]'}

---

## Notes

${postData.notes || ''}
`;
    }

    /**
     * Get a job post by ID with content
     * 
     * @param {string} postId - Post ID
     * @returns {Object|null} Post with content (immutable copy) or null
     */
    getJobPost(postId) {
        this.#ensureIndexLoaded();
        const post = this.#index.posts.find(p => p.id === postId);
        if (!post) return null;

        const cloned = this.#clonePost(post);

        // Load markdown content
        const filePath = this.#paths.getJobPostFilePath(post.filename);
        if (fs.existsSync(filePath)) {
            cloned.content = fs.readFileSync(filePath, 'utf-8');
        }

        return cloned;
    }

    /**
     * Get all job posts
     * @returns {Object[]} All posts (immutable copies)
     */
    getAllJobPosts() {
        this.#ensureIndexLoaded();
        return this.#index.posts.map(p => this.#clonePost(p));
    }

    /**
     * Get active job posts only
     * @returns {Object[]} Active posts (immutable copies)
     */
    getActiveJobPosts() {
        this.#ensureIndexLoaded();
        return this.#index.posts
            .filter(p => p.status === 'active')
            .map(p => this.#clonePost(p));
    }

    /**
     * Update a job post
     * 
     * @param {string} postId - Post ID
     * @param {Object} updates - Fields to update
     * @returns {Object} Updated post (immutable copy)
     */
    updateJobPost(postId, updates) {
        this.#ensureIndexLoaded();
        const post = this.#index.posts.find(p => p.id === postId);
        if (!post) {
            throw new Error(`Job post not found: ${postId}`);
        }

        // Only allow safe updates (encapsulation)
        if (updates.status) post.status = updates.status;
        if (updates.keySkills) post.keySkills = [...updates.keySkills];
        if (updates.url) post.url = updates.url;

        // Update markdown content if provided
        if (updates.content) {
            const filePath = this.#paths.getJobPostFilePath(post.filename);
            fs.writeFileSync(filePath, updates.content);
        }

        this.saveIndex();
        return this.#clonePost(post);
    }

    /**
     * Delete a job post
     * 
     * @param {string} postId - Post ID
     * @returns {boolean} True if deleted
     */
    deleteJobPost(postId) {
        this.#ensureIndexLoaded();
        const index = this.#index.posts.findIndex(p => p.id === postId);
        if (index === -1) {
            throw new Error(`Job post not found: ${postId}`);
        }

        const post = this.#index.posts[index];

        // Delete markdown file
        const filePath = this.#paths.getJobPostFilePath(post.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        this.#index.posts.splice(index, 1);
        this.saveIndex();

        return true;
    }

    /**
     * Extract key information from job post for AI context
     * 
     * @param {string} postId - Post ID
     * @returns {Object} Job context { title, company, keySkills, content }
     */
    getJobContext(postId) {
        const post = this.getJobPost(postId);
        if (!post) {
            throw new Error(`Job post not found: ${postId}`);
        }

        return {
            title: post.title,
            company: post.company,
            keySkills: [...post.keySkills],
            content: post.content
        };
    }
}

module.exports = JobPostManager;
```

---

### Step 5: Duplicate Detection & Validation

Create `export-to-pdf/electron/services/validation.cjs`:

```javascript
/**
 * Validation Service
 * 
 * Stateless utility for duplicate detection, text similarity, and quality checks.
 * 
 * SOLID Principles:
 * - Single Responsibility: ONLY handles validation logic
 * - Open/Closed: Extensible via validation strategies
 * - Stateless: Can be shared across managers without side effects
 * 
 * Design Pattern: Strategy Pattern for pluggable validation rules
 * 
 * @class Validation
 */
const crypto = require('crypto');

class Validation {
    /**
     * Generate normalized hash for text comparison
     * 
     * @param {string} text - Text to hash
     * @returns {string} 12-character MD5 hash
     */
    static generateHash(text) {
        if (!text || typeof text !== 'string') {
            throw new TypeError('text must be a non-empty string');
        }
        const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
        return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 12);
    }

    /**
     * Calculate Levenshtein distance between two strings
     * 
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Edit distance
     */
    static levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
                }
            }
        }

        return dp[m][n];
    }

    /**
     * Calculate text similarity (0-1 scale, 1 = identical)
     */
    static textSimilarity(text1, text2) {
        const s1 = text1.trim().toLowerCase();
        const s2 = text2.trim().toLowerCase();
        
        if (s1 === s2) return 1;
        
        const maxLen = Math.max(s1.length, s2.length);
        if (maxLen === 0) return 1;
        
        const distance = this.levenshteinDistance(s1, s2);
        return 1 - (distance / maxLen);
    }

    /**
     * Check if text is a near-duplicate of any in the list
     * Returns matching item if similarity > threshold
     */
    static findSimilar(text, bulletList, threshold = 0.85) {
        for (const bullet of bulletList) {
            const similarity = this.textSimilarity(text, bullet.text);
            if (similarity >= threshold) {
                return { bullet, similarity };
            }
        }
        return null;
    }

    /**
     * Validate bullet follows best practices
     */
    static validateBullet(text) {
        const issues = [];
        const warnings = [];

        // Check minimum length
        if (text.length < 20) {
            issues.push('Bullet is too short (minimum 20 characters)');
        }

        // Check maximum length (2 lines ~ 200 chars)
        if (text.length > 300) {
            warnings.push('Bullet may be too long (consider splitting)');
        }

        // Check starts with action verb
        const strongVerbs = [
            'architected', 'built', 'created', 'delivered', 'designed',
            'developed', 'directed', 'engineered', 'established', 'implemented',
            'improved', 'increased', 'led', 'managed', 'optimized',
            'reduced', 'streamlined', 'transformed'
        ];
        const firstWord = text.split(/\s/)[0].toLowerCase().replace(/[^a-z]/g, '');
        if (!strongVerbs.includes(firstWord)) {
            warnings.push('Consider starting with a strong action verb');
        }

        // Check for metrics
        const hasMetric = /\d+(%|x|\+|ms|fps|users|years|months|days|hours)/i.test(text);
        if (!hasMetric) {
            warnings.push('Consider adding quantified metrics');
        }

        // Check for result indicators
        const hasResult = /(resulting|achieving|enabling|improving|reducing|increased|decreased)/i.test(text);
        if (!hasResult && !hasMetric) {
            warnings.push('Consider adding measurable results');
        }

        return {
            valid: issues.length === 0,
            issues,
            warnings,
            score: Math.max(0, 100 - (issues.length * 30) - (warnings.length * 10))
        };
    }

    /**
     * Check if header follows expected format
     */
    static validateHeader(text, level) {
        const issues = [];

        if (level === 3) {
            // h3 should typically have company/role format
            if (!text.includes('—') && !text.includes('-') && !text.includes(',')) {
                issues.push('Consider using "Role, Company" or "Company — Project" format');
            }
        }

        if (text.length > 100) {
            issues.push('Header may be too long');
        }

        return {
            valid: issues.length === 0,
            issues
        };
    }
}

module.exports = Validation;
```

Create `export-to-pdf/src/services/bulletParser.js`:

```javascript
/**
 * Bullet Parser
 * Parses resume.md and extracts bullets organized by section headers
 */

/**
 * Parse markdown content into structured sections with bullets
 * @param {string} markdown - Raw markdown content
 * @returns {Array} Parsed sections with bullets
 */
export function parseResumeBullets(markdown) {
    const lines = markdown.split(/\r?\n/);
    const sections = [];
    
    let currentH2 = null;
    let currentH3 = null;
    let lineNumber = 0;

    for (const line of lines) {
        lineNumber++;
        
        // Skip variable declarations and comments
        if (line.startsWith('@') || line.startsWith('<!--')) {
            continue;
        }

        // Detect h2 headers (## Header)
        const h2Match = line.match(/^##\s+(.+)$/);
        if (h2Match) {
            currentH2 = {
                id: null, // Will be assigned by manager
                headerLevel: 2,
                headerText: h2Match[1].trim(),
                parentSection: null,
                bullets: [],
                bulletLines: []
            };
            sections.push(currentH2);
            currentH3 = null;
            continue;
        }

        // Detect h3 headers (### Job Title, Company <span...> Date)
        const h3Match = line.match(/^###\s+(.+)$/);
        if (h3Match) {
            const headerContent = h3Match[1];
            
            // Extract date range if present (after <span class="spacer">)
            let headerText = headerContent;
            let dateRange = null;
            
            const spacerMatch = headerContent.match(/(.+?)\s*<span class="spacer"><\/span>\s*(.+)/);
            if (spacerMatch) {
                headerText = spacerMatch[1].trim();
                dateRange = spacerMatch[2].trim();
            }

            currentH3 = {
                id: null,
                headerLevel: 3,
                headerText: headerText,
                parentSection: currentH2?.headerText || null,
                dateRange: dateRange,
                bullets: [],
                bulletLines: []
            };
            sections.push(currentH3);
            continue;
        }

        // Detect bullet points (- text)
        const bulletMatch = line.match(/^-\s+(.+)$/);
        if (bulletMatch) {
            const bulletText = bulletMatch[1].trim();
            const targetSection = currentH3 || currentH2;
            
            if (targetSection) {
                targetSection.bullets.push(bulletText);
                targetSection.bulletLines.push(lineNumber);
            }
        }
    }

    // Filter out sections with no bullets
    return sections.filter(s => s.bullets.length > 0);
}

/**
 * Extract a clean bullet text without markdown formatting
 * @param {string} bulletText - Raw bullet text
 * @returns {string} Cleaned text
 */
export function cleanBulletText(bulletText) {
    return bulletText
        // Remove markdown links [text](url) → text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove inline code `code` → code
        .replace(/`([^`]+)`/g, '$1')
        // Remove bold **text** → text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        // Remove italic *text* → text
        .replace(/\*([^*]+)\*/g, '$1')
        .trim();
}

/**
 * Check if bullet follows STAR method (has quantified result)
 * @param {string} bulletText - Bullet text to analyze
 * @returns {object} Analysis result with score and suggestions
 */
export function analyzeBulletQuality(bulletText) {
    const analysis = {
        hasMetric: false,
        hasVerb: false,
        hasResult: false,
        score: 0,
        suggestions: []
    };

    // Check for metrics (numbers, percentages)
    const metricPatterns = [
        /\d+%/,           // percentages
        /\d+x/,           // multipliers
        /\d+\+/,          // "5+"
        /\$[\d,]+/,       // dollar amounts
        /\d+\s*(ms|fps|users|months|years|days|hours)/i, // units
    ];
    
    analysis.hasMetric = metricPatterns.some(p => p.test(bulletText));
    if (!analysis.hasMetric) {
        analysis.suggestions.push('Add quantified metrics (percentages, time savings, user counts)');
    }

    // Check for strong action verbs
    const strongVerbs = [
        'architected', 'engineered', 'implemented', 'designed', 'led',
        'developed', 'created', 'optimized', 'reduced', 'increased',
        'delivered', 'built', 'established', 'directed', 'managed'
    ];
    
    const firstWord = bulletText.split(/\s/)[0].toLowerCase();
    analysis.hasVerb = strongVerbs.includes(firstWord);
    if (!analysis.hasVerb) {
        analysis.suggestions.push('Start with a strong action verb (Engineered, Architected, Led)');
    }

    // Check for result indicators
    const resultPatterns = [
        /resulting in/i,
        /achieving/i,
        /enabling/i,
        /improving/i,
        /reducing/i,
        /increased/i,
        /decreased/i
    ];
    
    analysis.hasResult = resultPatterns.some(p => p.test(bulletText));

    // Calculate score
    analysis.score = [analysis.hasMetric, analysis.hasVerb, analysis.hasResult]
        .filter(Boolean).length;

    return analysis;
}
```

---

### Step 6: IPC Handlers in Electron Main Process

Add to `export-to-pdf/electron/main.cjs` (at top with other requires):

```javascript
/**
 * Manager Module Imports and Factory Functions
 * 
 * Follows Factory Pattern with Dependency Injection for testability
 * and adherence to Dependency Inversion Principle (SOLID - D)
 */
const { getStoragePaths } = require('./services/storage-paths.cjs');
const BulletLibraryManager = require('./managers/bullet-library-manager.cjs');
const HeaderLibraryManager = require('./managers/header-library-manager.cjs');
const JobPostManager = require('./managers/job-post-manager.cjs');
const Validation = require('./services/validation.cjs');

// ============================================
// FACTORY FUNCTIONS (Singleton + Dependency Injection)
// ============================================

/** @type {BulletLibraryManager|null} */
let bulletLibraryManager = null;

/** @type {HeaderLibraryManager|null} */
let headerLibraryManager = null;

/** @type {JobPostManager|null} */
let jobPostManager = null;

/** @type {Validation|null} */
let validationService = null;

/**
 * Get or create the Validation service instance
 * @returns {Validation}
 */
const getValidationService = () => {
    if (!validationService) {
        validationService = new Validation();
    }
    return validationService;
};

/**
 * Get or create the BulletLibraryManager instance
 * Uses Factory Pattern with injected dependencies
 * 
 * @returns {BulletLibraryManager}
 */
const getBulletLibraryManager = () => {
    if (!bulletLibraryManager) {
        // Dependency Injection: inject paths and validator
        const paths = getStoragePaths();
        const validator = getValidationService();
        bulletLibraryManager = new BulletLibraryManager(paths, validator);
    }
    return bulletLibraryManager;
};

/**
 * Get or create the HeaderLibraryManager instance
 * @returns {HeaderLibraryManager}
 */
const getHeaderLibraryManager = () => {
    if (!headerLibraryManager) {
        const paths = getStoragePaths();
        headerLibraryManager = new HeaderLibraryManager(paths);
    }
    return headerLibraryManager;
};

/**
 * Get or create the JobPostManager instance
 * @returns {JobPostManager}
 */
const getJobPostManager = () => {
    if (!jobPostManager) {
        const paths = getStoragePaths();
        const validator = getValidationService();
        jobPostManager = new JobPostManager(paths, validator);
    }
    return jobPostManager;
};

/**
 * Reset all manager instances (useful for testing)
 * @internal
 */
const resetManagers = () => {
    bulletLibraryManager = null;
    headerLibraryManager = null;
    jobPostManager = null;
    validationService = null;
};

// Export for testing (optional)
if (process.env.NODE_ENV === 'test') {
    module.exports = { 
        getBulletLibraryManager, 
        getHeaderLibraryManager, 
        getJobPostManager,
        resetManagers 
    };
}
```

Add these IPC handlers after existing `ipcMain.handle` blocks.

**Note:** IPC handlers are thin orchestration layers that delegate to managers. They handle ONLY:
- Error wrapping (try/catch)
- Response shaping ({ success, data, error })
- Logging

Business logic stays in managers (Single Responsibility Principle).

```javascript
// ============================================
// BULLET LIBRARY IPC HANDLERS
// Thin layer - delegates all logic to manager
// ============================================

ipcMain.handle('get-bullet-library', async () => {
    try {
        const manager = getBulletLibraryManager();
        const library = manager.load();
        return { success: true, library };
    } catch (error) {
        console.error('Error loading bullet library:', error);
        return { success: false, error: error.message, code: error.code || 'LOAD_ERROR' };
    }
});

ipcMain.handle('add-bullet', async (event, bulletData) => {
    try {
        const manager = getBulletLibraryManager();
        const result = manager.addBullet(bulletData);
        return { success: true, ...result };
    } catch (error) {
        console.error('Error adding bullet:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('check-duplicate', async (event, text) => {
    try {
        const manager = getBulletLibraryManager();
        const existingId = manager.isDuplicate(text);
        if (existingId) {
            const bullet = manager.getBullet(existingId);
            return { success: true, isDuplicate: true, bullet };
        }
        return { success: true, isDuplicate: false };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('add-pending-variant', async (event, { bulletId, text, source, model, jobPostRef }) => {
    try {
        const manager = getBulletLibraryManager();
        const result = manager.addPendingVariant(bulletId, text, source, model, jobPostRef);
        return { success: true, ...result };
    } catch (error) {
        console.error('Error adding variant:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('accept-variant', async (event, { bulletId, variantId }) => {
    try {
        const manager = getBulletLibraryManager();
        const variant = manager.acceptVariant(bulletId, variantId);
        return { success: true, variant };
    } catch (error) {
        console.error('Error accepting variant:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('reject-variant', async (event, { bulletId, variantId }) => {
    try {
        const manager = getBulletLibraryManager();
        manager.rejectVariant(bulletId, variantId);
        return { success: true };
    } catch (error) {
        console.error('Error rejecting variant:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('import-resume-bullets', async (event, { markdown, resumeFilename }) => {
    try {
        // Parse bullets and headers from resume
        const { parseResumeBullets, parseResumeHeaders } = require('./bullet-parser.cjs');
        
        const parsedBullets = parseResumeBullets(markdown);
        const parsedHeaders = parseResumeHeaders(markdown);
        
        const bulletManager = getBulletLibraryManager();
        const headerManager = getHeaderLibraryManager();
        
        const bulletResults = bulletManager.importFromResume(parsedBullets, resumeFilename);
        const headerResults = headerManager.importFromResume(parsedHeaders);
        
        return { 
            success: true, 
            bullets: bulletResults,
            headers: headerResults
        };
    } catch (error) {
        console.error('Error importing resume:', error);
        return { success: false, error: error.message };
    }
});

// ============================================
// HEADER LIBRARY IPC HANDLERS
// ============================================

ipcMain.handle('get-header-library', async () => {
    try {
        const manager = getHeaderLibraryManager();
        const headers = manager.getAllHeaders();
        return { success: true, headers };
    } catch (error) {
        console.error('Error loading headers:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('add-header', async (event, headerData) => {
    try {
        const manager = getHeaderLibraryManager();
        const result = manager.addHeader(headerData);
        return { success: true, ...result };
    } catch (error) {
        console.error('Error adding header:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-header-markdown', async (event, headerId) => {
    try {
        const manager = getHeaderLibraryManager();
        const markdown = manager.generateMarkdown(headerId);
        return { success: true, markdown };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============================================
// JOB POST IPC HANDLERS
// ============================================

ipcMain.handle('get-job-posts', async () => {
    try {
        const manager = getJobPostManager();
        const posts = manager.getAllJobPosts();
        return { success: true, posts };
    } catch (error) {
        console.error('Error loading job posts:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-job-post', async (event, postId) => {
    try {
        const manager = getJobPostManager();
        const post = manager.getJobPost(postId);
        return { success: true, post };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('add-job-post', async (event, postData) => {
    try {
        const manager = getJobPostManager();
        const post = manager.addJobPost(postData);
        return { success: true, post };
    } catch (error) {
        console.error('Error adding job post:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('update-job-post', async (event, { postId, updates }) => {
    try {
        const manager = getJobPostManager();
        const post = manager.updateJobPost(postId, updates);
        return { success: true, post };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-job-post', async (event, postId) => {
    try {
        const manager = getJobPostManager();
        manager.deleteJobPost(postId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('validate-job-post-markdown', async (event, markdown) => {
    try {
        const manager = getJobPostManager();
        const validation = manager.validateJobPostMarkdown(markdown);
        return { success: true, ...validation };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('import-job-post-from-clipboard', async (event, markdown) => {
    try {
        const manager = getJobPostManager();
        
        // Validate first
        const validation = manager.validateJobPostMarkdown(markdown);
        if (!validation.valid) {
            return { 
                success: false, 
                error: validation.errors.join('; '),
                errors: validation.errors,
                warnings: validation.warnings
            };
        }
        
        // Add job post with extracted info
        const post = manager.addJobPost({
            description: markdown
        });
        
        return { 
            success: true, 
            post,
            warnings: validation.warnings 
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============================================
// AI REPHRASING WITH JOB CONTEXT
// ============================================

ipcMain.handle('rephrase-bullet-for-job', async (event, { bulletText, bulletId, jobPostId, apiEndpoint, model }) => {
    try {
        const paths = getStoragePaths();
        const jobManager = getJobPostManager();
        
        // Get job post context
        const jobContext = jobManager.getJobContext(jobPostId);
        
        // Load AI settings
        const aiSettingsPath = paths.getAISettingsPath();
        let settings = {
            apiEndpoint: 'http://localhost:1234/v1/chat/completions',
            model: 'qwen3-coder-30b'
        };
        if (fs.existsSync(aiSettingsPath)) {
            settings = JSON.parse(fs.readFileSync(aiSettingsPath, 'utf-8'));
        }
        
        const endpoint = apiEndpoint || settings.apiEndpoint;
        const modelName = model || settings.model;

        const prompt = `You are a professional resume writer. Rephrase the following resume bullet point to be more relevant to the target job posting while maintaining accuracy. Follow the STAR method (Situation, Task, Action, Result).

## Target Job
**Position:** ${jobContext.title}
**Company:** ${jobContext.company}
**Key Skills:** ${jobContext.keySkills.join(', ')}

## Job Description
${jobContext.content}

## Rules for Rephrasing
- Start with a strong action verb (Engineered, Architected, Led, Developed)
- Emphasize skills and experiences that match the job requirements
- Include quantified metrics if present in original
- Keep under 2 lines
- Maintain technical accuracy - do not fabricate achievements
- Focus on transferable skills relevant to the target role

## Original Bullet
${bulletText}

## Task
Provide exactly 3 alternative phrasings that are tailored to the target job, one per line.
Do not include numbering, bullet points, or explanations.`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    { 
                        role: 'system', 
                        content: 'You are a professional resume writer specializing in tailoring resumes for specific job applications. Respond only with the rephrased bullets, no explanations or formatting.' 
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 600
            })
        });

        if (!response.ok) {
            throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';
        
        // Parse response into individual variants
        const variants = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 15 && !line.match(/^[\d.)\-*]+\s*/))
            .slice(0, 3);

        // Return pending variants (not yet saved - user must accept)
        return { 
            success: true, 
            pendingVariants: variants.map(text => ({
                text,
                source: 'ai-rephrase',
                model: modelName,
                jobPostRef: jobPostId
            })),
            model: modelName,
            jobPost: { id: jobPostId, title: jobContext.title, company: jobContext.company }
        };
    } catch (error) {
        console.error('Error rephrasing bullet:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-ai-settings', async () => {
    const paths = getStoragePaths();
    const settingsPath = paths.getAISettingsPath();
    try {
        if (fs.existsSync(settingsPath)) {
            return { success: true, settings: JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) };
        }
        return {
            success: true,
            settings: {
                apiEndpoint: 'http://localhost:1234/v1/chat/completions',
                model: 'qwen3-coder-30b',
                enabled: true
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-ai-settings', async (event, settings) => {
    const paths = getStoragePaths();
    const settingsPath = paths.getAISettingsPath();
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============================================
// VALIDATION IPC HANDLERS
// ============================================

ipcMain.handle('validate-bullet', async (event, text) => {
    try {
        const result = Validation.validateBullet(text);
        return { success: true, ...result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('find-similar-bullets', async (event, { text, threshold }) => {
    try {
        const manager = getBulletLibraryManager();
        const allBullets = manager.getAllBullets();
        const similar = Validation.findSimilar(text, allBullets, threshold || 0.85);
        return { success: true, similar };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
```

---

### Step 7: Preload API Extensions

Update `export-to-pdf/electron/preload.js` to expose all new APIs:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // ============================================
    // EXISTING RESUME APIs
    // ============================================
    selectExportDirectory: () => ipcRenderer.invoke('select-export-directory'),
    openResumeFile: () => ipcRenderer.invoke('open-resume-file'),
    getResumePath: () => ipcRenderer.invoke('get-resume-path'),
    readResume: () => ipcRenderer.invoke('read-resume'),
    readCSS: () => ipcRenderer.invoke('read-css'),
    watchResume: () => ipcRenderer.invoke('watch-resume'),
    onResumeUpdated: (callback) => ipcRenderer.on('resume-updated', callback),
    exportPDF: () => ipcRenderer.invoke('export-pdf'),
    createFromTemplate: () => ipcRenderer.invoke('create-from-template'),
    importResume: () => ipcRenderer.invoke('import-resume'),
    createBlank: () => ipcRenderer.invoke('create-blank'),
    resetToWelcome: () => ipcRenderer.invoke('reset-to-welcome'),
    isElectron: true,

    // ============================================
    // BULLET LIBRARY APIs
    // ============================================
    getBulletLibrary: () => ipcRenderer.invoke('get-bullet-library'),
    addBullet: (bulletData) => ipcRenderer.invoke('add-bullet', bulletData),
    checkDuplicate: (text) => ipcRenderer.invoke('check-duplicate', text),
    addPendingVariant: (data) => ipcRenderer.invoke('add-pending-variant', data),
    acceptVariant: (data) => ipcRenderer.invoke('accept-variant', data),
    rejectVariant: (data) => ipcRenderer.invoke('reject-variant', data),
    importResumeBullets: (data) => ipcRenderer.invoke('import-resume-bullets', data),

    // ============================================
    // HEADER LIBRARY APIs
    // ============================================
    getHeaderLibrary: () => ipcRenderer.invoke('get-header-library'),
    addHeader: (headerData) => ipcRenderer.invoke('add-header', headerData),
    getHeaderMarkdown: (headerId) => ipcRenderer.invoke('get-header-markdown', headerId),

    // ============================================
    // JOB POST APIs
    // ============================================
    getJobPosts: () => ipcRenderer.invoke('get-job-posts'),
    getJobPost: (postId) => ipcRenderer.invoke('get-job-post', postId),
    addJobPost: (postData) => ipcRenderer.invoke('add-job-post', postData),
    updateJobPost: (data) => ipcRenderer.invoke('update-job-post', data),
    deleteJobPost: (postId) => ipcRenderer.invoke('delete-job-post', postId),
    validateJobPostMarkdown: (markdown) => ipcRenderer.invoke('validate-job-post-markdown', markdown),
    importJobPostFromClipboard: (markdown) => ipcRenderer.invoke('import-job-post-from-clipboard', markdown),

    // ============================================
    // AI REPHRASING APIs
    // ============================================
    rephraseBulletForJob: (data) => ipcRenderer.invoke('rephrase-bullet-for-job', data),
    getAISettings: () => ipcRenderer.invoke('get-ai-settings'),
    saveAISettings: (settings) => ipcRenderer.invoke('save-ai-settings', settings),

    // ============================================
    // VALIDATION APIs
    // ============================================
    validateBullet: (text) => ipcRenderer.invoke('validate-bullet', text),
    findSimilarBullets: (data) => ipcRenderer.invoke('find-similar-bullets', data)
});
```

---

### Step 8: React Components

#### React Hook: useBulletLibrary.js

Create `export-to-pdf/src/hooks/useBulletLibrary.js`:

```javascript
import { useState, useEffect, useCallback } from 'react';
import { parseResumeBullets } from '../services/bulletParser';

export function useBulletLibrary(resumeMarkdown, resumeId = 'default') {
    const [library, setLibrary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [aiSettings, setAISettings] = useState(null);

    // Load library on mount and when resume changes
    useEffect(() => {
        async function loadLibrary() {
            if (!window.electronAPI?.getBulletLibrary) {
                // Web mode - use local storage fallback
                const stored = localStorage.getItem(`bullet-library-${resumeId}`);
                if (stored) {
                    setLibrary(JSON.parse(stored));
                }
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const result = await window.electronAPI.getBulletLibrary(resumeId);
                if (result.success) {
                    setLibrary(result.library);
                } else {
                    setError(result.error);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadLibrary();
    }, [resumeId]);

    // Load AI settings
    useEffect(() => {
        async function loadSettings() {
            if (window.electronAPI?.getAISettings) {
                const result = await window.electronAPI.getAISettings();
                if (result.success) {
                    setAISettings(result.settings);
                }
            }
        }
        loadSettings();
    }, []);

    // Sync library with current resume content
    const syncWithResume = useCallback(async () => {
        if (!resumeMarkdown) return;

        const parsedSections = parseResumeBullets(resumeMarkdown);

        if (window.electronAPI?.syncBulletLibrary) {
            const result = await window.electronAPI.syncBulletLibrary(resumeId, parsedSections);
            if (result.success) {
                setLibrary(result.library);
            }
        } else {
            // Fallback for web mode
            // Simple implementation - replace entire library
            const newLibrary = {
                version: '1.0.0',
                resumeId,
                lastUpdated: new Date().toISOString(),
                sections: parsedSections.map((section, idx) => ({
                    ...section,
                    id: `section-${idx}`,
                    bullets: section.bullets.map((text, bIdx) => ({
                        id: `bullet-${idx}-${bIdx}`,
                        text,
                        createdAt: new Date().toISOString(),
                        isActive: true,
                        lineNumber: section.bulletLines[bIdx],
                        variants: []
                    }))
                }))
            };
            setLibrary(newLibrary);
            localStorage.setItem(`bullet-library-${resumeId}`, JSON.stringify(newLibrary));
        }
    }, [resumeMarkdown, resumeId]);

    // Request AI rephrasing for a bullet
    const rephraseBullet = useCallback(async (bulletId, bulletText, context) => {
        if (!window.electronAPI?.rephraseBullet) {
            return { success: false, error: 'AI rephrasing not available in web mode' };
        }

        const result = await window.electronAPI.rephraseBullet({
            bulletText,
            context,
            apiEndpoint: aiSettings?.apiEndpoint,
            model: aiSettings?.model
        });

        if (result.success && result.variants?.length > 0) {
            // Add each variant to the library
            for (const variantText of result.variants) {
                await window.electronAPI.addBulletVariant({
                    resumeId,
                    bulletId,
                    variantText,
                    source: 'ai-rephrase',
                    model: result.model
                });
            }

            // Reload library to get updated variants
            const libResult = await window.electronAPI.getBulletLibrary(resumeId);
            if (libResult.success) {
                setLibrary(libResult.library);
            }
        }

        return result;
    }, [resumeId, aiSettings]);

    // Add manual variant
    const addManualVariant = useCallback(async (bulletId, variantText) => {
        if (window.electronAPI?.addBulletVariant) {
            const result = await window.electronAPI.addBulletVariant({
                resumeId,
                bulletId,
                variantText,
                source: 'manual'
            });

            if (result.success) {
                const libResult = await window.electronAPI.getBulletLibrary(resumeId);
                if (libResult.success) {
                    setLibrary(libResult.library);
                }
            }
            return result;
        }
        return { success: false, error: 'Not available in web mode' };
    }, [resumeId]);

    return {
        library,
        loading,
        error,
        aiSettings,
        syncWithResume,
        rephraseBullet,
        addManualVariant,
        setAISettings
    };
}
```

---

### Step 9: Bullet Library Panel UI with Variant Management

Create `export-to-pdf/src/components/BulletLibraryPanel.jsx`:

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { analyzeBulletQuality } from '../services/bulletParser';

function BulletLibraryPanel({ resumeMarkdown, isOpen, onClose }) {
    // State
    const [library, setLibrary] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [jobPosts, setJobPosts] = useState([]);
    const [selectedJobPost, setSelectedJobPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [expandedSections, setExpandedSections] = useState({});
    const [expandedBullets, setExpandedBullets] = useState({});
    const [rephrasing, setRephrasing] = useState(null);
    const [pendingVariants, setPendingVariants] = useState({}); // bulletId -> variants[]
    const [copyFeedback, setCopyFeedback] = useState(null);
    
    // Job post import modal
    const [showJobPostImport, setShowJobPostImport] = useState(false);
    const [clipboardContent, setClipboardContent] = useState('');
    const [importError, setImportError] = useState(null);

    // Load data on mount
    useEffect(() => {
        async function loadData() {
            if (!window.electronAPI) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                
                // Load bullet library
                const libResult = await window.electronAPI.getBulletLibrary();
                if (libResult.success) setLibrary(libResult.library);

                // Load headers
                const headerResult = await window.electronAPI.getHeaderLibrary();
                if (headerResult.success) setHeaders(headerResult.headers);

                // Load job posts
                const jobResult = await window.electronAPI.getJobPosts();
                if (jobResult.success) setJobPosts(jobResult.posts);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        if (isOpen) loadData();
    }, [isOpen]);

    // Reload library after changes
    const reloadLibrary = useCallback(async () => {
        const result = await window.electronAPI.getBulletLibrary();
        if (result.success) setLibrary(result.library);
    }, []);

    // ============================================
    // VARIANT MANAGEMENT
    // ============================================

    const handleRephrase = async (bullet, sectionContext) => {
        if (!selectedJobPost) {
            alert('Please select a job post first to tailor the rephrasing.');
            return;
        }

        setRephrasing(bullet.id);
        try {
            const result = await window.electronAPI.rephraseBulletForJob({
                bulletText: bullet.text,
                bulletId: bullet.id,
                jobPostId: selectedJobPost
            });

            if (result.success && result.pendingVariants?.length > 0) {
                // Store pending variants for this bullet (not yet saved)
                setPendingVariants(prev => ({
                    ...prev,
                    [bullet.id]: result.pendingVariants
                }));
            } else if (!result.success) {
                alert(`Rephrasing failed: ${result.error}`);
            }
        } finally {
            setRephrasing(null);
        }
    };

    const handleAcceptVariant = async (bulletId, variantIndex) => {
        const variants = pendingVariants[bulletId];
        if (!variants || !variants[variantIndex]) return;

        const variant = variants[variantIndex];

        // Save to library
        const result = await window.electronAPI.addPendingVariant({
            bulletId,
            text: variant.text,
            source: variant.source,
            model: variant.model,
            jobPostRef: variant.jobPostRef
        });

        if (result.success && !result.duplicate) {
            // Accept it (registers hash)
            await window.electronAPI.acceptVariant({
                bulletId,
                variantId: result.variant.id
            });

            // Remove from pending
            setPendingVariants(prev => {
                const updated = [...(prev[bulletId] || [])];
                updated.splice(variantIndex, 1);
                return { ...prev, [bulletId]: updated };
            });

            // Reload library to show new variant
            await reloadLibrary();
        } else if (result.duplicate) {
            alert('This variant already exists in your library.');
            // Remove from pending anyway
            setPendingVariants(prev => {
                const updated = [...(prev[bulletId] || [])];
                updated.splice(variantIndex, 1);
                return { ...prev, [bulletId]: updated };
            });
        }
    };

    const handleRejectVariant = async (bulletId, variantIndex) => {
        // Simply remove from pending (never saved)
        setPendingVariants(prev => {
            const updated = [...(prev[bulletId] || [])];
            updated.splice(variantIndex, 1);
            return { ...prev, [bulletId]: updated };
        });
    };

    const handleRephraseVariant = async (bulletId, variantIndex) => {
        // Use this variant as the new source for rephrasing
        const variants = pendingVariants[bulletId];
        if (!variants || !variants[variantIndex]) return;

        const variantText = variants[variantIndex].text;

        if (!selectedJobPost) {
            alert('Please select a job post first.');
            return;
        }

        setRephrasing(`${bulletId}-variant-${variantIndex}`);
        try {
            const result = await window.electronAPI.rephraseBulletForJob({
                bulletText: variantText,
                bulletId: bulletId,
                jobPostId: selectedJobPost
            });

            if (result.success && result.pendingVariants?.length > 0) {
                // Replace this variant with new ones
                setPendingVariants(prev => {
                    const updated = [...(prev[bulletId] || [])];
                    updated.splice(variantIndex, 1, ...result.pendingVariants);
                    return { ...prev, [bulletId]: updated };
                });
            }
        } finally {
            setRephrasing(null);
        }
    };

    // Handle rephrase for already-saved variants
    const handleRephraseSavedVariant = async (bulletId, variant) => {
        if (!selectedJobPost) {
            alert('Please select a job post first.');
            return;
        }

        setRephrasing(variant.id);
        try {
            const result = await window.electronAPI.rephraseBulletForJob({
                bulletText: variant.text,
                bulletId: bulletId,
                jobPostId: selectedJobPost
            });

            if (result.success && result.pendingVariants?.length > 0) {
                // Add new pending variants
                setPendingVariants(prev => ({
                    ...prev,
                    [bulletId]: [...(prev[bulletId] || []), ...result.pendingVariants]
                }));
            }
        } finally {
            setRephrasing(null);
        }
    };

    // Delete a saved variant
    const handleDeleteSavedVariant = async (bulletId, variantId) => {
        if (!confirm('Delete this saved variant?')) return;

        const result = await window.electronAPI.rejectVariant({ bulletId, variantId });
        if (result.success) {
            await reloadLibrary();
        }
    };

    // ============================================
    // JOB POST IMPORT FROM CLIPBOARD
    // ============================================

    const handlePasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setClipboardContent(text);
            setImportError(null);
        } catch (err) {
            setImportError('Failed to read clipboard. Please paste manually.');
        }
    };

    const validateJobPostMarkdown = (markdown) => {
        const errors = [];

        if (!markdown || markdown.trim().length < 50) {
            errors.push('Content is too short. Please paste a complete job description.');
        }

        // Check for h1 header (will be used as filename)
        const h1Match = markdown.match(/^#\s+(.+)$/m);
        if (!h1Match) {
            errors.push('Missing H1 header (# Title). Add a title line like: # Senior Developer at Company');
        }

        // Check for some basic job post content indicators
        const hasDescription = /description|responsibilities|requirements|qualifications|about/i.test(markdown);
        if (!hasDescription) {
            errors.push('Content doesn\'t appear to be a job posting. Include description, requirements, or qualifications.');
        }

        return {
            valid: errors.length === 0,
            errors,
            title: h1Match ? h1Match[1].trim() : null
        };
    };

    const handleImportJobPost = async () => {
        const validation = validateJobPostMarkdown(clipboardContent);

        if (!validation.valid) {
            setImportError(validation.errors.join('\n'));
            return;
        }

        try {
            // Extract additional info for metadata
            const companyMatch = clipboardContent.match(/company[:\s]+([^\n]+)/i) 
                || validation.title.match(/at\s+(.+)$/i);
            const company = companyMatch ? companyMatch[1].trim() : 'Unknown';

            // Extract key skills (look for skills section or common keywords)
            const skillsMatch = clipboardContent.match(/skills?[:\s]+([^\n]+)/i);
            const keySkills = skillsMatch 
                ? skillsMatch[1].split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0)
                : [];

            const result = await window.electronAPI.addJobPost({
                title: validation.title,
                company: company,
                description: clipboardContent,
                keySkills: keySkills
            });

            if (result.success) {
                // Reload job posts
                const jobResult = await window.electronAPI.getJobPosts();
                if (jobResult.success) {
                    setJobPosts(jobResult.posts);
                    setSelectedJobPost(result.post.id);
                }

                // Close modal
                setShowJobPostImport(false);
                setClipboardContent('');
                setImportError(null);
            } else {
                setImportError(result.error);
            }
        } catch (err) {
            setImportError(err.message);
        }
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const toggleBullet = (bulletId) => {
        setExpandedBullets(prev => ({
            ...prev,
            [bulletId]: !prev[bulletId]
        }));
    };

    const copyToClipboard = async (text, id) => {
        await navigator.clipboard.writeText(`- ${text}`);
        setCopyFeedback(id);
        setTimeout(() => setCopyFeedback(null), 1500);
    };

    if (!isOpen) return null;

    // ============================================
    // STYLES
    // ============================================

    const panelStyles = {
        position: 'fixed',
        right: 0,
        top: 0,
        width: '450px',
        height: '100vh',
        backgroundColor: '#1e1e1e',
        color: '#fff',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000
    };

    const headerStyles = {
        padding: '16px 20px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    const jobPostSelectorStyles = {
        padding: '12px 16px',
        backgroundColor: '#252525',
        borderBottom: '1px solid #333',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap'
    };

    const contentStyles = {
        flex: 1,
        overflowY: 'auto',
        padding: '16px'
    };

    const buttonStyles = {
        padding: '4px 8px',
        fontSize: '11px',
        color: '#fff',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer'
    };

    const pendingVariantStyles = {
        padding: '10px',
        backgroundColor: '#2a3f2a',
        borderRadius: '4px',
        marginBottom: '8px',
        border: '1px dashed #4caf50'
    };

    const savedVariantStyles = {
        padding: '8px',
        backgroundColor: '#333',
        borderRadius: '4px',
        marginBottom: '6px',
        fontSize: '12px'
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div style={panelStyles}>
            {/* Header */}
            <div style={headerStyles}>
                <h2 style={{ margin: 0, fontSize: '18px' }}>📋 Bullet Library</h2>
                <button 
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}
                >
                    ×
                </button>
            </div>

            {/* Job Post Selector */}
            <div style={jobPostSelectorStyles}>
                <label style={{ fontSize: '12px', color: '#aaa' }}>Target Job:</label>
                <select
                    value={selectedJobPost || ''}
                    onChange={(e) => setSelectedJobPost(e.target.value || null)}
                    style={{
                        flex: 1,
                        padding: '6px 8px',
                        backgroundColor: '#333',
                        color: '#fff',
                        border: '1px solid #444',
                        borderRadius: '4px',
                        fontSize: '12px'
                    }}
                >
                    <option value="">-- Select Job Post --</option>
                    {jobPosts.filter(p => p.status === 'active').map(post => (
                        <option key={post.id} value={post.id}>
                            {post.title} @ {post.company}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => setShowJobPostImport(true)}
                    style={{
                        ...buttonStyles,
                        backgroundColor: '#5c6bc0',
                        padding: '6px 10px'
                    }}
                    title="Import job post from clipboard"
                >
                    📋 Import Job
                </button>
            </div>

            {/* Content */}
            <div style={contentStyles}>
                {loading && <p>Loading library...</p>}
                {error && <p style={{ color: '#ff6b6b' }}>Error: {error}</p>}
                
                {/* Bullets by Section */}
                {library?.bullets && (() => {
                    // Group bullets by parent header
                    const sections = {};
                    library.bullets.forEach(bullet => {
                        const sectionKey = bullet.parentHeader?.headerText || 'Uncategorized';
                        if (!sections[sectionKey]) {
                            sections[sectionKey] = {
                                headerText: sectionKey,
                                headerLevel: bullet.parentHeader?.headerLevel || 2,
                                bullets: []
                            };
                        }
                        sections[sectionKey].bullets.push(bullet);
                    });

                    return Object.values(sections).map((section, sIdx) => (
                        <div key={sIdx} style={{ marginBottom: '16px' }}>
                            {/* Section Header */}
                            <div 
                                onClick={() => toggleSection(section.headerText)}
                                style={{
                                    padding: '10px 12px',
                                    backgroundColor: '#2d2d2d',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <span>
                                    {section.headerLevel === 2 ? '📁' : '📄'} {section.headerText}
                                </span>
                                <span style={{ color: '#888' }}>
                                    {section.bullets.length} {expandedSections[section.headerText] ? '▼' : '▶'}
                                </span>
                            </div>

                            {/* Bullets in Section */}
                            {expandedSections[section.headerText] && (
                                <div style={{ paddingLeft: '12px', marginTop: '8px' }}>
                                    {section.bullets.map(bullet => {
                                        const quality = analyzeBulletQuality(bullet.text);
                                        const bulletPending = pendingVariants[bullet.id] || [];

                                        return (
                                            <div key={bullet.id} style={{ marginBottom: '16px' }}>
                                                {/* Main Bullet */}
                                                <div style={{
                                                    padding: '10px',
                                                    backgroundColor: '#2a2a2a',
                                                    borderRadius: '4px',
                                                    borderLeft: `3px solid ${quality.score >= 2 ? '#4caf50' : quality.score === 1 ? '#ff9800' : '#f44336'}`
                                                }}>
                                                    <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                                                        • {bullet.text}
                                                    </div>
                                                    
                                                    {/* Bullet Action Buttons */}
                                                    <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        <button
                                                            onClick={() => copyToClipboard(bullet.text, bullet.id)}
                                                            style={{
                                                                ...buttonStyles,
                                                                backgroundColor: copyFeedback === bullet.id ? '#4caf50' : '#444'
                                                            }}
                                                        >
                                                            {copyFeedback === bullet.id ? '✓ Copied!' : '📋 Copy'}
                                                        </button>
                                                        
                                                        <button
                                                            onClick={() => handleRephrase(bullet, section.headerText)}
                                                            disabled={rephrasing === bullet.id || !selectedJobPost}
                                                            style={{
                                                                ...buttonStyles,
                                                                backgroundColor: !selectedJobPost ? '#555' : rephrasing === bullet.id ? '#666' : '#5c6bc0',
                                                                cursor: !selectedJobPost ? 'not-allowed' : 'pointer'
                                                            }}
                                                            title={!selectedJobPost ? 'Select a job post first' : 'Generate AI variants for this job'}
                                                        >
                                                            {rephrasing === bullet.id ? '⏳...' : '🤖 Rephrase'}
                                                        </button>

                                                        {(bullet.variants?.length > 0 || bulletPending.length > 0) && (
                                                            <button
                                                                onClick={() => toggleBullet(bullet.id)}
                                                                style={{ ...buttonStyles, backgroundColor: '#333' }}
                                                            >
                                                                {expandedBullets[bullet.id] ? '▼' : '▶'} 
                                                                {bullet.variants?.length || 0} saved, {bulletPending.length} pending
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Expanded: Pending & Saved Variants */}
                                                    {expandedBullets[bullet.id] && (
                                                        <div style={{ marginTop: '12px', paddingLeft: '12px', borderLeft: '2px solid #444' }}>
                                                            
                                                            {/* PENDING VARIANTS (not yet saved) */}
                                                            {bulletPending.length > 0 && (
                                                                <div style={{ marginBottom: '12px' }}>
                                                                    <div style={{ fontSize: '11px', color: '#4caf50', marginBottom: '6px', fontWeight: 'bold' }}>
                                                                        ⏳ PENDING VARIANTS (review required)
                                                                    </div>
                                                                    {bulletPending.map((variant, vIdx) => (
                                                                        <div key={vIdx} style={pendingVariantStyles}>
                                                                            <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                                                                                • {variant.text}
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                                <button
                                                                                    onClick={() => handleAcceptVariant(bullet.id, vIdx)}
                                                                                    style={{ ...buttonStyles, backgroundColor: '#4caf50' }}
                                                                                >
                                                                                    ✓ Accept
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleRejectVariant(bullet.id, vIdx)}
                                                                                    style={{ ...buttonStyles, backgroundColor: '#f44336' }}
                                                                                >
                                                                                    ✗ Reject
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleRephraseVariant(bullet.id, vIdx)}
                                                                                    disabled={rephrasing === `${bullet.id}-variant-${vIdx}` || !selectedJobPost}
                                                                                    style={{ ...buttonStyles, backgroundColor: '#5c6bc0' }}
                                                                                >
                                                                                    🔄 Rephrase
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => copyToClipboard(variant.text, `pending-${bullet.id}-${vIdx}`)}
                                                                                    style={{
                                                                                        ...buttonStyles,
                                                                                        backgroundColor: copyFeedback === `pending-${bullet.id}-${vIdx}` ? '#4caf50' : '#555'
                                                                                    }}
                                                                                >
                                                                                    📋
                                                                                </button>
                                                                                <span style={{ color: '#888', fontSize: '10px', marginLeft: 'auto' }}>
                                                                                    🤖 {variant.model || 'AI'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* SAVED VARIANTS */}
                                                            {bullet.variants?.length > 0 && (
                                                                <div>
                                                                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>
                                                                        💾 SAVED VARIANTS
                                                                    </div>
                                                                    {bullet.variants.filter(v => v.accepted).map(variant => (
                                                                        <div key={variant.id} style={savedVariantStyles}>
                                                                            <div style={{ marginBottom: '6px' }}>• {variant.text}</div>
                                                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                                <button
                                                                                    onClick={() => copyToClipboard(variant.text, variant.id)}
                                                                                    style={{
                                                                                        ...buttonStyles,
                                                                                        backgroundColor: copyFeedback === variant.id ? '#4caf50' : '#555',
                                                                                        padding: '3px 6px',
                                                                                        fontSize: '10px'
                                                                                    }}
                                                                                >
                                                                                    {copyFeedback === variant.id ? '✓' : '📋'}
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleRephraseSavedVariant(bullet.id, variant)}
                                                                                    disabled={rephrasing === variant.id || !selectedJobPost}
                                                                                    style={{
                                                                                        ...buttonStyles,
                                                                                        backgroundColor: '#5c6bc0',
                                                                                        padding: '3px 6px',
                                                                                        fontSize: '10px'
                                                                                    }}
                                                                                >
                                                                                    🔄
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteSavedVariant(bullet.id, variant.id)}
                                                                                    style={{
                                                                                        ...buttonStyles,
                                                                                        backgroundColor: '#c62828',
                                                                                        padding: '3px 6px',
                                                                                        fontSize: '10px'
                                                                                    }}
                                                                                >
                                                                                    🗑
                                                                                </button>
                                                                                <span style={{ color: '#666', fontSize: '10px', marginLeft: 'auto' }}>
                                                                                    {variant.jobPostRef && `📌 ${variant.jobPostRef}`}
                                                                                    {' '}{variant.source === 'ai-rephrase' ? `🤖 ${variant.model || 'AI'}` : '✍️'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ));
                })()}

                {library?.bullets?.length === 0 && !loading && (
                    <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
                        No bullets found in library.<br/>
                        Import a resume to populate your bullet library.
                    </p>
                )}
            </div>

            {/* Job Post Import Modal */}
            {showJobPostImport && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        backgroundColor: '#2a2a2a',
                        borderRadius: '8px',
                        padding: '24px',
                        width: '500px',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0' }}>📋 Import Job Post from Clipboard</h3>
                        
                        <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '12px' }}>
                            Paste a job posting as Markdown. Must include an H1 header (# Title) which will be used as the filename.
                        </p>

                        <button
                            onClick={handlePasteFromClipboard}
                            style={{
                                ...buttonStyles,
                                backgroundColor: '#5c6bc0',
                                padding: '8px 16px',
                                marginBottom: '12px'
                            }}
                        >
                            📋 Paste from Clipboard
                        </button>

                        <textarea
                            value={clipboardContent}
                            onChange={(e) => setClipboardContent(e.target.value)}
                            placeholder="# Job Title at Company&#10;&#10;## Description&#10;...&#10;&#10;## Requirements&#10;..."
                            style={{
                                width: '100%',
                                height: '200px',
                                backgroundColor: '#1e1e1e',
                                color: '#fff',
                                border: '1px solid #444',
                                borderRadius: '4px',
                                padding: '12px',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                resize: 'vertical'
                            }}
                        />

                        {importError && (
                            <div style={{
                                backgroundColor: '#4a1c1c',
                                border: '1px solid #f44336',
                                borderRadius: '4px',
                                padding: '10px',
                                marginTop: '12px',
                                fontSize: '12px',
                                whiteSpace: 'pre-wrap'
                            }}>
                                ❌ {importError}
                            </div>
                        )}

                        {clipboardContent && !importError && (
                            <div style={{
                                backgroundColor: '#1c3a1c',
                                border: '1px solid #4caf50',
                                borderRadius: '4px',
                                padding: '10px',
                                marginTop: '12px',
                                fontSize: '12px'
                            }}>
                                ✓ Preview: {validateJobPostMarkdown(clipboardContent).title || 'No title found'}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setShowJobPostImport(false);
                                    setClipboardContent('');
                                    setImportError(null);
                                }}
                                style={{ ...buttonStyles, backgroundColor: '#444', padding: '8px 16px' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImportJobPost}
                                disabled={!clipboardContent}
                                style={{
                                    ...buttonStyles,
                                    backgroundColor: clipboardContent ? '#4caf50' : '#555',
                                    padding: '8px 16px'
                                }}
                            >
                                ✓ Import Job Post
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BulletLibraryPanel;
```

---

### Step 9b: Job Post Manager - Filename from H1

Update `export-to-pdf/electron/job-post-manager.cjs` to extract filename from H1:

```javascript
/**
 * Generate filename from first H1 in markdown content
 */
extractTitleFromMarkdown(markdown) {
    const h1Match = markdown.match(/^#\s+(.+)$/m);
    if (!h1Match) {
        throw new Error('Markdown must contain an H1 header (# Title)');
    }
    return h1Match[1].trim();
}

/**
 * Generate a safe filename from the H1 title
 */
generateFilenameFromTitle(title) {
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 60);
    
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `${slug}-${date}.md`;
}

/**
 * Validate job post markdown before saving
 */
validateJobPostMarkdown(markdown) {
    const errors = [];

    // Check minimum length
    if (!markdown || markdown.trim().length < 50) {
        errors.push('Content is too short (minimum 50 characters)');
    }

    // Check for H1 header
    const h1Match = markdown.match(/^#\s+(.+)$/m);
    if (!h1Match) {
        errors.push('Missing H1 header. Add a line like: # Job Title at Company');
    }

    // Check for some job-related content
    const hasJobContent = /description|responsibilities|requirements|qualifications|experience|skills|about/i.test(markdown);
    if (!hasJobContent) {
        errors.push('Content doesn\'t appear to be a job posting');
    }

    // Check for multiple H1s (warning, not error)
    const h1Count = (markdown.match(/^#\s+/gm) || []).length;
    const warnings = [];
    if (h1Count > 1) {
        warnings.push('Multiple H1 headers found. First H1 will be used as title.');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        title: h1Match ? h1Match[1].trim() : null
    };
}

/**
 * Add a new job post with validation
 */
addJobPost(postData) {
    this.loadIndex();

    // If raw markdown provided, validate and extract info
    if (postData.description && !postData.title) {
        const validation = this.validateJobPostMarkdown(postData.description);
        if (!validation.valid) {
            throw new Error(validation.errors.join('; '));
        }
        postData.title = validation.title;
    }

    const filename = this.generateFilenameFromTitle(postData.title);
    const id = filename.replace('.md', '');

    // Check for existing post with same id
    const existing = this.index.posts.find(p => p.id === id);
    if (existing) {
        throw new Error(`Job post already exists: ${postData.title}`);
    }

    // Create markdown file
    const markdown = postData.description || this.generateJobPostMarkdown(postData);
    const filePath = this.paths.getJobPostFilePath(filename);
    fs.writeFileSync(filePath, markdown);

    // Add to index
    const post = {
        id,
        filename,
        title: postData.title,
        company: postData.company || this.extractCompanyFromTitle(postData.title),
        dateAdded: new Date().toISOString(),
        url: postData.url || null,
        status: 'active',
        keySkills: postData.keySkills || this.extractSkillsFromMarkdown(markdown)
    };

    this.index.posts.push(post);
    this.saveIndex();

    return post;
}

/**
 * Try to extract company name from title
 */
extractCompanyFromTitle(title) {
    // Pattern: "Title at Company" or "Title - Company" or "Title | Company"
    const patterns = [
        /at\s+(.+)$/i,
        /[-–—|]\s*(.+)$/,
        /,\s+(.+)$/
    ];

    for (const pattern of patterns) {
        const match = title.match(pattern);
        if (match) return match[1].trim();
    }

    return 'Unknown';
}

/**
 * Extract potential skills from markdown content
 */
extractSkillsFromMarkdown(markdown) {
    const skills = [];

    // Look for skills section
    const skillsSection = markdown.match(/skills?[:\s]+([^\n]+)/i);
    if (skillsSection) {
        skills.push(...skillsSection[1].split(/[,;]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 30));
    }

    // Look for common tech keywords
    const techKeywords = [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust',
        'React', 'Vue', 'Angular', 'Node.js', 'Django', 'Flask', 'Spring',
        'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
        'SQL', 'PostgreSQL', 'MongoDB', 'Redis',
        'Unity', 'Unreal', 'OpenGL', 'WebGL'
    ];

    techKeywords.forEach(keyword => {
        if (new RegExp(`\\b${keyword}\\b`, 'i').test(markdown) && !skills.includes(keyword)) {
            skills.push(keyword);
        }
    });

    return skills.slice(0, 10); // Limit to 10 skills
}
```
                >
                    ×
                </button>
            </div>

            <div style={contentStyles}>
                {loading && <p>Loading library...</p>}
                {error && <p style={{ color: '#ff6b6b' }}>Error: {error}</p>}
                
                {library?.sections?.map(section => (
                    <div key={section.id} style={{ marginBottom: '16px' }}>
                        {/* Section Header */}
                        <div 
                            onClick={() => toggleSection(section.id)}
                            style={{
                                padding: '10px 12px',
                                backgroundColor: '#2d2d2d',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <span>
                                {section.headerLevel === 2 ? '📁' : '📄'} {section.headerText}
                            </span>
                            <span style={{ color: '#888' }}>
                                {section.bullets.length} bullets {expandedSections[section.id] ? '▼' : '▶'}
                            </span>
                        </div>

                        {/* Bullets */}
                        {expandedSections[section.id] && (
                            <div style={{ paddingLeft: '12px', marginTop: '8px' }}>
                                {section.bullets.map(bullet => {
                                    const quality = analyzeBulletQuality(bullet.text);
                                    return (
                                        <div key={bullet.id} style={{ marginBottom: '12px' }}>
                                            {/* Bullet Item */}
                                            <div 
                                                style={{
                                                    padding: '10px',
                                                    backgroundColor: bullet.isActive ? '#1a3a1a' : '#2a2a2a',
                                                    borderRadius: '4px',
                                                    borderLeft: `3px solid ${quality.score >= 2 ? '#4caf50' : quality.score === 1 ? '#ff9800' : '#f44336'}`
                                                }}
                                            >
                                                <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                                                    • {bullet.text}
                                                </div>
                                                
                                                {/* Action buttons */}
                                                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => copyToClipboard(bullet.text, bullet.id)}
                                                        style={{
                                                            padding: '4px 8px',
                                                            fontSize: '11px',
                                                            backgroundColor: copyFeedback === bullet.id ? '#4caf50' : '#444',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '3px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {copyFeedback === bullet.id ? '✓ Copied!' : '📋 Copy'}
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => handleRephrase(bullet, section.headerText)}
                                                        disabled={rephrasing === bullet.id}
                                                        style={{
                                                            padding: '4px 8px',
                                                            fontSize: '11px',
                                                            backgroundColor: rephrasing === bullet.id ? '#666' : '#5c6bc0',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '3px',
                                                            cursor: rephrasing === bullet.id ? 'wait' : 'pointer'
                                                        }}
                                                    >
                                                        {rephrasing === bullet.id ? '⏳ Rephrasing...' : '🤖 AI Rephrase'}
                                                    </button>

                                                    {bullet.variants.length > 0 && (
                                                        <button
                                                            onClick={() => toggleBullet(bullet.id)}
                                                            style={{
                                                                padding: '4px 8px',
                                                                fontSize: '11px',
                                                                backgroundColor: '#333',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: '3px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {expandedBullets[bullet.id] ? '▼' : '▶'} {bullet.variants.length} variants
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Variants */}
                                                {expandedBullets[bullet.id] && bullet.variants.length > 0 && (
                                                    <div style={{ marginTop: '10px', paddingLeft: '12px', borderLeft: '2px solid #444' }}>
                                                        {bullet.variants.map(variant => (
                                                            <div 
                                                                key={variant.id}
                                                                style={{
                                                                    padding: '8px',
                                                                    backgroundColor: '#333',
                                                                    borderRadius: '4px',
                                                                    marginBottom: '6px',
                                                                    fontSize: '12px'
                                                                }}
                                                            >
                                                                <div style={{ marginBottom: '6px' }}>• {variant.text}</div>
                                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                    <button
                                                                        onClick={() => copyToClipboard(variant.text, variant.id)}
                                                                        style={{
                                                                            padding: '3px 6px',
                                                                            fontSize: '10px',
                                                                            backgroundColor: copyFeedback === variant.id ? '#4caf50' : '#555',
                                                                            color: '#fff',
                                                                            border: 'none',
                                                                            borderRadius: '2px',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        {copyFeedback === variant.id ? '✓' : '📋'}
                                                                    </button>
                                                                    <span style={{ color: '#888', fontSize: '10px' }}>
                                                                        {variant.source === 'ai-rephrase' ? `🤖 ${variant.model || 'AI'}` : '✍️ Manual'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}

                {library?.sections?.length === 0 && !loading && (
                    <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
                        No bullets found in resume.<br/>
                        Add bullets starting with "- " to see them here.
                    </p>
                )}
            </div>
        </div>
    );
}

export default BulletLibraryPanel;
```

---

### Step 10: Local AI Integration with Job Context

The AI integration is handled in the `rephrase-bullet-for-job` IPC handler in `main.cjs`. The system is designed to work with:

1. **LM Studio** (default): Running on `localhost:1234` with OpenAI-compatible API
2. **Custom endpoints**: Configurable via AI settings (supports any OpenAI-compatible API)

#### AI Settings Configuration

Users can configure their AI endpoint through the settings. The default configuration:

```json
{
    "apiEndpoint": "http://localhost:1234/v1/chat/completions",
    "model": "qwen3-coder-30b",
    "enabled": true
}
```

#### User Acceptance Flow

**Critical**: AI-generated variants are NOT automatically saved. The flow is:

1. User requests rephrasing → AI generates 3 pending variants
2. Pending variants displayed to user in a review dialog
3. User can **Accept** (saves to library with hash registration) or **Reject** (discards)
4. Only accepted variants become part of the permanent library

This ensures users maintain control over their bullet library content.

#### Job Post Context Integration

When rephrasing with job context:
1. Full job description is sent to AI
2. Key skills from job post are highlighted
3. AI tailors bullet language to match job requirements
4. Variant is tagged with `jobPostRef` for tracking

---

## New Files to Create

```
export-to-pdf/
├── electron/
│   ├── storage-paths.cjs           # OS-specific path resolver
│   ├── bullet-library-manager.cjs  # Unified bullet storage
│   ├── header-library-manager.cjs  # Section header storage
│   ├── job-post-manager.cjs        # Job posting storage
│   └── validation.cjs              # Duplicate detection & quality checks
├── src/
│   ├── components/
│   │   ├── BulletLibraryPanel.jsx  # Main bullet library UI
│   │   ├── HeaderLibraryPanel.jsx  # Header selection UI
│   │   ├── JobPostManager.jsx      # Job post import/manage UI
│   │   ├── VariantReviewDialog.jsx # Accept/reject AI variants
│   │   └── AISettingsDialog.jsx    # Configure AI endpoint
│   ├── services/
│   │   └── bulletParser.js         # Markdown → bullet tree parser
│   └── hooks/
│       ├── useBulletLibrary.js     # Bullet library state
│       ├── useHeaderLibrary.js     # Header library state
│       └── useJobPosts.js          # Job post state
```

## Files to Modify

| File | Changes |
|------|---------|
| `electron/main.cjs` | Add all IPC handlers (bullets, headers, job posts, AI, validation) |
| `electron/preload.js` | Expose all new APIs to renderer |
| `src/App.jsx` | Add Bullet Library panel toggle and component |
| `package.json` | Add `uuid` dependency |

---

## Testing Checklist

### Unit Tests

- [ ] `storage-paths.cjs`: Resolves correct paths for Windows/macOS/Linux
- [ ] `bullet-library-manager.cjs`: Creates empty library when none exists
- [ ] `bullet-library-manager.cjs`: Detects exact duplicates via hash
- [ ] `bullet-library-manager.cjs`: Adds pending variants without hash registration
- [ ] `bullet-library-manager.cjs`: Registers hash only after accept
- [ ] `header-library-manager.cjs`: Stores h2/h3 with parent relationships
- [ ] `job-post-manager.cjs`: Stores and retrieves job post markdown
- [ ] `validation.cjs`: Finds similar bullets above threshold
- [ ] `validation.cjs`: Returns correct quality score for bullets
- [ ] `bulletParser.js`: Extracts bullets under correct headers

### Integration Tests

- [ ] Bullets from multiple resumes aggregate into single library
- [ ] Duplicate bullets increment `usageCount` instead of duplicating
- [ ] AI rephrasing returns pending variants (not auto-saved)
- [ ] Accepted variants appear in library with job post reference
- [ ] Rejected variants are permanently deleted
- [ ] Library persists across app restarts
- [ ] Job posts stored as separate markdown files

### E2E Tests

- [ ] Import resume → bullets and headers cataloged
- [ ] Add job post via paste → stored in job-posts folder
- [ ] Select bullet + job post → AI generates relevant variants
- [ ] Accept variant → saved with job post reference
- [ ] Reject variant → not saved
- [ ] Copy bullet/variant to clipboard works
- [ ] Insert header into resume works
- [ ] Similar bullet warning appears for near-duplicates

---

## Dependencies to Install

```bash
cd export-to-pdf
npm install uuid
```

---

## Summary

This implementation adds a comprehensive bullet and header management system with:

### Local-Only Storage
- All data stored in OS-appropriate app data directory
- Windows: `C:\Users\[username]\AppData\Roaming\resume-pdf-exporter\`
- macOS: `~/Library/Application Support/resume-pdf-exporter/`
- Linux: `~/.config/resume-pdf-exporter/`

### Unified Bullet Library
- Aggregates bullets from ALL saved resumes
- Hash-based duplicate detection prevents redundant entries
- Similarity matching warns about near-duplicates (85% threshold)
- Usage tracking shows most-used bullets

### Header Library
- Stores reusable section headers (h2/h3)
- Maintains parent-child relationships
- Includes date ranges and subtitles
- One-click insertion into new resumes

### Job Post Integration
- Store job postings as markdown files
- Link job context to AI rephrasing requests
- Track which variants were created for which jobs
- Archive applied-to positions

### AI-Powered Rephrasing with Acceptance Flow
- Local LLM integration (LM Studio/OpenAI-compatible)
- Job description context for relevance optimization
- **Pending variants require user acceptance**
- Only accepted variants stored in library
- Model and job post reference tracked per variant

### Quality Validation
- STAR method compliance scoring
- Strong verb detection
- Metric presence checking
- Actionable improvement suggestions

The modular architecture separates concerns cleanly:
- **Electron Main Process**: Storage, AI calls, validation
- **React Frontend**: UI components, state management
- **Preload Bridge**: Secure IPC between renderer and main
