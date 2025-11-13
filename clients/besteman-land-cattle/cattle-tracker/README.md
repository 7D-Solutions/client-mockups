# Cattle Tracker - Besteman Land & Cattle

Interactive cattle management system mockup for Besteman Land & Cattle.

## Client Information

**Client**: Besteman Land & Cattle
**Project**: Cattle Tracking & Herd Management System
**Created**: November 2024
**Status**: Demo Mockup

## Features

- ✅ Dashboard with herd statistics
- ✅ Add/edit/delete cattle records
- ✅ Track tag numbers, breed, age, weight
- ✅ Monitor health status and location
- ✅ Search and filter capabilities
- ✅ Session-based data storage (no backend needed)
- ✅ Fully responsive design

## Local Development

1. Open `index.html` in a web browser
2. Data persists in browser session only
3. Refresh page = data resets (perfect for demos)

## Railway Deployment

### Option 1: Quick Deploy (Recommended)

1. Push this folder to GitHub
2. In Railway:
   - New Project → Deploy from GitHub
   - Select this repository
   - Railway auto-detects `package.json`
   - Deploys automatically

### Option 2: Railway CLI

```bash
cd cattle-tracker
npm install -g @railway/cli
railway login
railway init
railway up
```

### Environment Variables

No environment variables needed! This is a static mockup.

## Accessing the Mockup

- **Railway URL**: `https://cattle-tracker-xxx.up.railway.app`
- **Custom Domain**: Configure in Railway settings
  - Example: `test.7dsolutions.com` or `cattle-tracker.test.7dsolutions.com`

## Customization

### Change Branding/Colors

Edit the CSS variables in `index.html`:

```css
:root {
  --color-primary: #YOUR_COLOR;
}
```

### Add/Modify Fields

1. Update the form in `index.html`
2. Modify the `renderTable()` function
3. Update `viewCattle()` to display new fields

## Data Structure

Each cattle record includes:
- Tag Number
- Breed
- Age (months)
- Weight (lbs)
- Status (healthy/treatment/quarantine/sold)
- Location
- Last Checkup Date
- Purchase Date
- Notes

## Design

### Branding
- **Primary Color**: Saddle Brown (#8B4513) - Represents cattle/ranch heritage
- **Theme**: Professional, rustic, agriculture-focused
- **Icon**: 🐄 Cattle emoji for immediate brand recognition

### Color Scheme
```css
--color-primary: #8B4513;        /* Saddle brown */
--color-primary-dark: #654321;   /* Darker brown */
--color-primary-light: #A0522D;  /* Lighter brown */
```

## Tech Stack

- **HTML/CSS/JavaScript** - No framework needed
- **7D Solutions UI Kit** - Shared design system
- **Session Storage** - Client-side data persistence
- **Railway** - Static file hosting

## Support

For modifications or questions:
- Contact: 7D Solutions
- Documentation: See `../../MOCKUP_CREATION_GUIDE.md`
- UI Kit: See `../../../ui-kit/README.md`

---

**Besteman Land & Cattle** - Professional Cattle Management System
*Powered by 7D Solutions*
