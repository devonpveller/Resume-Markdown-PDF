# Resume Repository Instructions

## Project Overview

This is a personal resume repository for Devon Veller, a game developer with 14 years of experience. The repository maintains multiple resume versions and formats, with the primary focus on generating PDF resumes using the resume.lol platform.

## Repository Structure

- **`resume.lol/`** - Production resume formatted for resume.lol platform
  - `source/resume.md` - Active resume content using resume.lol markdown format
  - `source/resume.css` - Custom styling (Inter font, black text, uppercase headers)
  - `source/settings.css` - PDF page settings (letter size, 0.5in margins)
  - `Resume-Template.md` - Original resume.lol template for reference
- **`archive/`** - Historical resume versions and content repository
  - `Resume-Content-Archive.md` - Working notes, alternative summaries, ChatGPT links, drafts
  - `Resume_03_FullListExperience_2025.md` - Full-detail version without resume.lol formatting

## Resume.lol Format Conventions

The active resume (`resume.lol/source/resume.md`) uses a specific markdown format:

1. **Variable System**: Declare redactable variables at the top using `@VARIABLE=value||redacted_value`
   - `@REDACTED=false` controls whether redacted values are shown
   - Reference variables in content using `{VARIABLE}` syntax
   - Example: `@NAME=Devon Veller||Devon V.` then use `{NAME}` in content

2. **Header Structure**: Use a specific div pattern for contact info
   ```html
   <div class="section headerInfo">
   <ul>
   <li>{EMAIL}</li>
   <li>{PHONE}</li>
   ...
   </ul>
   </div>
   ```

3. **Date Formatting**: Use `<span class="spacer"></span>` to right-align dates
   - Example: `### Job Title, Company <span class="spacer"></span> Jan 2020 — Present`

4. **Section Order**: Use CSS ordering (see `resume.css`) - h1 is order:0, .headerInfo is order:1

## Content Philosophy

Devon's professional summary emphasizes:
- **Multidisciplinary approach**: Bridging art, engineering, and systems design
- **"Glue" metaphor**: Filling gaps, solving challenges, aligning teams across disciplines
- **Quantified achievements**: 300+ products, clients like Boeing/Amazon/Y12, 14 years experience
- **Technical depth**: Front-end gameplay systems, back-end architecture, real-time performance optimization
- **Domain focus**: Serious games, interactive training, AR/VR/XR applications

## Key Projects to Reference

When updating experience sections, maintain these highlight patterns:

1. **ARTTX (2024)** - AR multiplayer training, Unity/OpenXR, 20 concurrent users, LLM integration, custom pathfinding
2. **VAPPE (2021-2023)** - iOS/WebGL PPE training, 60 scenarios, CSV ingestion, 508 compliance, Apple Store published
3. **Digital Twin Interactive Map (2022-2023)** - Unreal Engine, pathfinding, data pipeline for architectural updates

## STAR Method for Resume Bullets

**CRITICAL**: All resume bullet points in `resume.lol/source/resume.md` MUST follow the STAR method (Situation, Task, Action, Result) to transform generic duties into powerful, quantifiable achievements.

### STAR Framework

- **Situation**: Briefly set the context—the challenge or environment
- **Task**: Define your specific responsibility or goal within that situation
- **Action**: Describe the specific steps you took (use strong action verbs)
- **Result**: Quantify the positive outcome or benefit (numbers are key!)

### Formula: "Accomplished [X] as measured by [Y], by doing [Z]"

### Examples of STAR-Formatted Bullets

**Vague**: "Helped with marketing campaigns"
**STAR**: "Launched three social media campaigns (Action) to boost brand awareness (Task), increasing follower engagement by 40% and generating 200+ qualified leads (Result) in one quarter"

**Vague**: "Managed customer service"
**STAR**: "Resolved customer issues (Task) during peak season (Situation), reducing complaint resolution time by 25% and improving customer satisfaction scores by 15 points (Result) through proactive communication and personalized solutions (Action)"

### Requirements for Resume Bullets

1. **Quantify Everything**: Use numbers, percentages, dollar amounts (e.g., "Increased sales by 15%")
2. **Be Concise**: Aim for 1-2 lines per bullet; avoid lengthy paragraphs
3. **Strong Action Verbs**: Start with: Developed, Engineered, Implemented, Designed, Increased, Reduced, Created, Optimized, Built, Led, Facilitated
4. **Show Direct Contribution**: Use "I" mindset even in team settings
5. **Include Technical Context**: Mention specific technologies, frameworks, or methodologies used
6. **Focus on Impact**: Always end with measurable results or outcomes

### Metrics and Impact Language

Always include quantifiable metrics when describing achievements:
- Performance improvements (e.g., "5.6x faster load times", "320% performance gain")
- Time savings (e.g., "reduced development time by 25%")
- User impact (e.g., "supporting 20 concurrent users with <50ms latency")
- Process efficiency (e.g., "reducing art production hours by 40%")
- Scale indicators (e.g., "60 scenarios", "300+ products", "20 concurrent users")

## Archive File Usage

`archive/Resume-Content-Archive.md` contains:
- Alternative professional summary drafts
- ChatGPT conversation links for resume development context
- Interviewing notes and positioning strategies
- Feedback notes on bullet point improvements
- Work-in-progress ideas marked with `[Idea:]{.mark}` or `[Suggestions:]{.mark}`

This file is **reference only** - don't edit it directly. Mine it for content when updating the active resume.

## Technology Stack Format

Maintain consistent formatting in skills/technology sections:
- **Bold category headers**: Game Engines, Programming Languages, 3D Art & Animation, etc.
- Skill level indicators when relevant: (Expert), (Intermediate), (Basic)
- Technology lists at project end: `Technologies: Unity, OpenXR, C#, NGO, AR`

## Styling Guidelines

The resume uses minimalist professional styling:
- Inter font family (imported from Google Fonts)
- 14px base font size, 24px for h1, 16px for h2, 15px for h3
- Black text throughout (`color: black` for all elements)
- Uppercase transformation for h1 (name) and h2 (section headers)
- 1px solid black border-bottom on h2 elements
- Centered h1 with flexbox justify-content for h3 (job titles with dates)

## Git Workflow

Currently on `dev` branch. No specific branching strategy documented - assume standard feature branch workflow for significant changes.
