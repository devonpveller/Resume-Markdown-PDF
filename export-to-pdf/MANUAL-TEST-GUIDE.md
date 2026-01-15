# Bullet Library Manual Testing Guide

## Test Date: January 15, 2026

## Automated Test Status
✅ **All 175 tests passing** (11 test suites)
- Unit tests: 138 tests
- Integration tests: 4 tests  
- React component tests: 33 tests

## Manual UI Testing Checklist

### Prerequisites
1. Run `npm run electron:dev` in the `export-to-pdf` directory
2. Electron app should open showing the resume preview

### Test 1: Bullet Library Toggle Button
- [ ] **Expected**: Blue button labeled "Show Bullet Library" appears below the export controls
- [ ] **Action**: Click the "Show Bullet Library" button
- [ ] **Expected**: Button text changes to "Hide Bullet Library"
- [ ] **Expected**: Bullet Library panel appears with a light gray background

### Test 2: Initial State - Empty Library
- [ ] **Expected**: Message "No bullets found" or loading state appears
- [ ] **Expected**: Filter controls visible (section dropdown, search input)
- [ ] **Expected**: "Add Bullet" button or form visible

### Test 3: Browser Console Verification
**Open Developer Tools** (Press F12 or Ctrl+Shift+I)

Run these commands in the Console:

```javascript
// 1. Verify bulletLibrary API is exposed
console.log('bulletLibrary API:', window.bulletLibrary);
// Expected: Object with methods (addBullet, getAllBullets, etc.)

// 2. Test fetching all bullets
window.bulletLibrary.getAllBullets().then(result => {
    console.log('Bullets result:', result);
});
// Expected: {success: true, data: {bullets: []}}

// 3. Test fetching all headers
window.bulletLibrary.getAllHeaders().then(result => {
    console.log('Headers result:', result);
});
// Expected: {success: true, data: {headers: []}}

// 4. Test fetching job posts
window.bulletLibrary.listJobPosts().then(result => {
    console.log('Job posts result:', result);
});
// Expected: {success: true, data: {jobPosts: []}}
```

### Test 4: Add Bullet Functionality
- [ ] **Action**: Click "Add Bullet" button or toggle form
- [ ] **Expected**: Form appears with:
  - Text input field (multiline)
  - Section/header dropdown
  - Submit button
  - Cancel button
- [ ] **Action**: Enter test bullet: "Architected distributed system handling 10M+ requests/day with 99.9% uptime using microservices architecture"
- [ ] **Action**: Select a section (or type new header)
- [ ] **Action**: Click Submit
- [ ] **Expected**: 
  - Bullet appears in the list
  - Form closes or resets
  - No errors in console

### Test 5: Variant Management
- [ ] **Action**: Select a bullet from the list
- [ ] **Expected**: Variant controls visible
- [ ] **Action**: Add a variant (if UI supports it)
- [ ] **Expected**: Pending variants section appears
- [ ] **Action**: Accept/Reject variant buttons work

### Test 6: Job Post Integration
- [ ] **Expected**: Job post selector dropdown visible
- [ ] **Action**: Test adding a job post via console:
```javascript
const testJobPost = `# Senior Software Engineer

## Company: TechCorp

## Requirements
- 5+ years experience
- Strong Python/Node.js skills
- Cloud architecture experience

## Responsibilities
- Design scalable systems
- Lead technical initiatives
`;

window.bulletLibrary.saveJobPost(testJobPost).then(result => {
    console.log('Job post saved:', result);
});
```
- [ ] **Expected**: Success response with filename
- [ ] **Action**: Refresh or check dropdown
- [ ] **Expected**: New job post appears in selector

### Test 7: Storage Path Verification
Check the OS-specific storage location:

**Windows:**
```powershell
explorer %APPDATA%\resume-pdf-exporter
```

**Expected Directory Structure:**
```
resume-pdf-exporter/
├── bullet-library/
│   ├── bullets.json
│   └── headers.json
├── job-posts/
│   └── (job post markdown files)
└── resume-data/
```

- [ ] **Verify**: `bullet-library` directory exists
- [ ] **Verify**: `bullets.json` file created when bullet added
- [ ] **Verify**: `headers.json` file created when header added
- [ ] **Verify**: `job-posts` directory exists

### Test 8: React Hook Integration
In browser console, check React component state:

```javascript
// Check if useBulletLibrary hook loaded data
// (This requires React DevTools extension)
// Look for BulletLibraryPanel component in React tree
// Inspect hooks - should see bullets, headers, loading, error states
```

### Test 9: Error Handling
- [ ] **Action**: Close and reopen app
- [ ] **Expected**: Bullet library data persists
- [ ] **Expected**: No errors on reload
- [ ] **Action**: Try to add empty bullet
- [ ] **Expected**: Validation error message appears
- [ ] **Action**: Try to add duplicate bullet
- [ ] **Expected**: Duplicate detection warning

### Test 10: Performance
- [ ] **Action**: Add 10+ bullets
- [ ] **Expected**: UI remains responsive
- [ ] **Expected**: Filter/search works quickly
- [ ] **Expected**: No memory leaks (check Task Manager)

## Known Issues / Notes

### Current Limitations
- AI rephrasing integration not yet connected to LLM endpoint
- Resume parsing/cataloging not yet triggered on resume save
- Clipboard copy functionality may need additional implementation

### Integration Points to Test Later
1. **Resume Import Flow**: When user imports a resume, bullets should be automatically cataloged
2. **AI Rephrasing**: Connect to local LLM (LM Studio) for variant generation
3. **Insert to Resume**: Add functionality to insert bullets into active resume markdown

## Test Results Summary

**Date**: _________________
**Tester**: _________________

| Test | Status | Notes |
|------|--------|-------|
| Toggle Button | ☐ Pass / ☐ Fail | |
| Initial State | ☐ Pass / ☐ Fail | |
| Console API | ☐ Pass / ☐ Fail | |
| Add Bullet | ☐ Pass / ☐ Fail | |
| Variants | ☐ Pass / ☐ Fail | |
| Job Posts | ☐ Pass / ☐ Fail | |
| Storage Paths | ☐ Pass / ☐ Fail | |
| React Hook | ☐ Pass / ☐ Fail | |
| Error Handling | ☐ Pass / ☐ Fail | |
| Performance | ☐ Pass / ☐ Fail | |

**Overall Status**: ☐ All Pass / ☐ Issues Found

**Issues Found**:
```
(List any issues discovered during testing)
```

## Screenshots
(Attach screenshots of bullet library UI here)

---

## Troubleshooting

### Issue: Bullet Library button not visible
- Check: `isElectron` state in App.jsx should be `true`
- Check Console: Should show "Electron API detected: true"
- Solution: Verify preload.js is loaded and electronAPI exposed

### Issue: bulletLibrary API is undefined
- Check: preload.js exports `bulletLibrary` in contextBridge
- Check: electron/main.cjs calls `registerHandlers()`
- Solution: Restart Electron app

### Issue: "Cannot read property 'getAllBullets' of undefined"
- Check: Hook is only used inside BulletLibraryPanel when `isElectron` is true
- Check: bulletLibrary API is available before hook initializes
- Solution: Add null check in hook initialization

### Issue: Storage paths don't exist
- Check: StoragePaths constructor calls directory creation
- Check: Write permissions on app data directory
- Solution: Run as administrator (Windows) or check file permissions

### Issue: Tests pass but UI doesn't load data
- Check: IPC handlers are registered in main.cjs
- Check: Browser console for IPC errors
- Solution: Verify `registerHandlers()` is called in `app.whenReady()`

---

## Next Steps After Manual Testing

1. ✅ Document any bugs found
2. ✅ Create GitHub issues for enhancements
3. ✅ Test on different OS (Windows/macOS/Linux)
4. ✅ Connect AI rephrasing to LM Studio
5. ✅ Implement resume auto-cataloging on save
6. ✅ Add bullet insertion to resume editor
