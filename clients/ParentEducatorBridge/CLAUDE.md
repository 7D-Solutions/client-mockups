# CLAUDE.md - Bridging the Gap / Parent Educator Bridge

## Project Overview

**Project**: Bridging the Gap - Parenting courses for children with autism
**Owner**: School psychologist/LPC with 35 years experience
**Purpose**: Educational website offering parenting courses and resources for families of children with autism and special needs

## Site Structure

```
/                       → Main pages (index.html, about.html, etc.)
/blog/                  → Blog posts (10 articles)
/visuals/               → Printable visual tools (7 resources)
/js/                    → JavaScript files
/css/                   → Stylesheets
/images/                → Image assets
```

## Centralized Navigation System

**IMPORTANT**: All navigation is controlled by a single JavaScript file.

### How It Works

- **File**: `/js/navigation.js` - Single source of truth for all site navigation
- **Usage**: Each HTML page includes `<nav class="sidebar"></nav>` and `<script src="js/navigation.js"></script>`
- **Subfolders**: Blog and visuals pages use `../js/navigation.js` path

### To Update Navigation Site-Wide

1. Edit `/js/navigation.js`
2. Modify the `navItems` array to add/remove/reorder menu items
3. Changes automatically apply to all 30 pages

### Navigation Structure (Current)

```javascript
navItems = [
    Home, About,
    ---divider---
    5 Things to Know, Foundation Skills, Course, Pricing,
    ---divider---
    Resources, Podcast, Blog,
    ---divider---
    FAQ, Contact
]
```

### Auto-Active Detection

- Navigation automatically highlights the current page
- Blog posts → "Blog" is highlighted
- Visual tools → "Resources" is highlighted
- Section links (e.g., #pricing) work from any page

### Adding Navigation to New Pages

**For main folder pages:**
```html
<!-- Sidebar Navigation (loaded by navigation.js) -->
<nav class="sidebar"></nav>
<script src="js/navigation.js"></script>
```

**For subfolder pages (blog/, visuals/):**
```html
<!-- Sidebar Navigation (loaded by navigation.js) -->
<nav class="sidebar" id="sidebar"></nav>
<script src="../js/navigation.js"></script>
```

## Page Inventory

### Main Pages (13)
- index.html - Homepage with course info
- about.html - About the instructor (needs resume content)
- resources.html - Free resources hub
- blog.html - Blog listing page
- podcast.html - Podcast episodes
- faq.html - Frequently asked questions
- contact.html - Contact form
- newsletter.html - Newsletter signup
- speaking.html - Speaking engagements
- terms.html - Terms of service
- privacy.html - Privacy policy
- skills-assessment.html - Foundation skills assessment tool
- iep-checklist.html - IEP meeting checklist

### Blog Posts (10) - in /blog/
- visual-schedules-complete-guide.html
- meltdowns-vs-tantrums.html
- teaching-i-need-to-go-potty.html
- appropriate-vs-optimal-education.html
- five-things-i-wish-someone-told-me.html
- the-abc-model-understanding-behavior.html
- why-one-on-one-aide-might-hurt-your-child.html
- the-three-second-rule.html
- what-educators-wish-parents-knew.html
- teaching-your-child-to-say-no.html

### Visual Tools (7) - in /visuals/
- token-board.html
- feelings-chart.html
- first-then-board.html
- bathroom-communication-board.html
- expected-behavior-chart.html
- visual-schedule.html
- choice-board.html

## Design System

### Colors
- Primary: #2E7D6B (teal)
- Primary Light: #4A9B89
- Primary Dark: #1D5C4E
- Secondary: #E8A54B (gold)
- Accent: #6B4E9B (purple)
- Warm: #D4726A (coral)

### Fonts
- Headlines: Merriweather (serif)
- Body: Nunito (sans-serif)

### Layout
- Sidebar navigation: 280px fixed width
- Main content: margin-left: 280px
- Mobile: Sidebar hidden, toggle button visible

## CSS Infrastructure

**IMPORTANT**: Use the centralized CSS file for all styling.

### Shared Styles
- **File**: `/css/styles.css` - Single source of truth for site-wide styles
- **Usage**: `<link rel="stylesheet" href="css/styles.css">` (or `../css/styles.css` for subfolders)
- **Contains**: Design tokens, typography, sidebar styles, forms, buttons, cards, footer, responsive breakpoints

### Page-Specific Styles
- Keep in `<style>` block only for truly page-specific CSS
- Always use CSS custom properties from styles.css (e.g., `var(--primary)`, `var(--spacing-lg)`)

### Key CSS Classes Available
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline` - Buttons
- `.card`, `.card-header`, `.card-icon` - Card components
- `.form-group`, `.form-submit`, `.error-message` - Form elements
- `.hero`, `.hero-container` - Hero sections
- `.section`, `.section-container`, `.section-header` - Page sections
- `.grid-2`, `.grid-3`, `.grid-4` - Grid layouts
- `.footer`, `.footer-container`, `.footer-links` - Footer

## Production Readiness Status

### Completed
- [x] Centralized navigation system (`/js/navigation.js`)
- [x] Shared CSS infrastructure (`/css/styles.css`)
- [x] 404 error page

### Needs Owner Input
- [ ] Fill in about.html with instructor credentials (awaiting resume)
- [ ] Confirm email address (currently `hello@bridgingthegap.com`)
- [ ] Provide social media URLs (Facebook, Instagram, LinkedIn, YouTube)
- [ ] Set up form handling backend (contact/newsletter forms)

### Optional Enhancements
- [ ] Add favicon.ico and touch icons
- [ ] Add Open Graph / Twitter meta tags for social sharing
- [ ] Add meta descriptions to all pages for SEO
- [ ] Convert inline CSS in existing pages to use shared stylesheet
