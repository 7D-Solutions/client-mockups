# Cattle Production Tracking System - Mockup Index

## Overview

Four comprehensive HTML mockup pages for tracking cattle production, including cow management, work history, and cow-calf pairing functionality.

---

## 📄 Mockup Pages

### 1. **Cattle DataTable with Expandable Rows** ⭐ **RECOMMENDED**
**File:** `cattle-datatable-expandable.html`

**Purpose:** Primary cattle management interface matching Fireproof ERP system patterns

**Key Features:**
- **DataTable Layout:** Familiar table-based interface with sortable columns
- **Expandable Rows:** Click any row to reveal detailed calf and work history
- **Inline History Tabs:** Switch between Calf History and Work History without leaving the page
- **Advanced Filtering:** Search, status, breed, and age range filters
- **Summary Metrics:** Quick view of key data points when row is expanded
- **Pagination:** Navigate through large cattle lists efficiently
- **Responsive Design:** Matches existing Fireproof system styling

**Columns Displayed:**
- Tag ID (clickable, sortable)
- Breed (sortable)
- Age (sortable)
- Weight (sortable)
- Status (color-coded badges)
- Total Calves (sortable)
- Last Calving Date (sortable)
- Current Calf (linked)
- Actions (View/Edit links)

**Expanded Row Features:**
- **Summary Grid:** Purchase date, color/markings, avg weaning weight, body condition, dam/sire IDs
- **Calf History Tab:** Complete table of all calves with birth dates, weights, gender, weaning data, status
- **Work History Tab:** Comprehensive activity log with vaccinations, treatments, testing, weighing, etc.

**Why This View:**
- Matches existing Fireproof gauge management pattern
- Efficient use of screen space
- Minimal clicks to access detailed information
- Familiar UX for current users
- Easy to scan and compare multiple cows

---

### 2. **Cow Management & Calf History** (Split-Panel View)
**File:** `cattle-cow-management.html`

**Purpose:** Manage individual cows and track their complete calf history

**Key Features:**
- **Cow List Panel:** Browse all cows with quick filtering
- **Detailed Cow Profile:** Complete information for selected cow
- **Calf History Table:** All calves born to each cow with performance data
- **Multiple Data Tabs:**
  - Basic Info (ID, breed, birthdate, weight, color, etc.)
  - Calf History (complete lineage)
  - Health Records (vaccinations, treatments, medical history)
  - Breeding History (breeding dates, pregnancy status, calving records)
  - Production Data (milk production, weaning weights, performance metrics)

**Data Tracked:**
- Tag ID, Breed, Birth Date, Color/Markings, Weight, Body Condition
- Dam/Sire lineage
- Current calf information
- Historical calf performance (birth weight, weaning weight, status)
- Performance metrics (average weaning weight, calving intervals)

---

### 3. **Work History & Activities** (Timeline View)
**File:** `cattle-work-history.html`

**Purpose:** Track all cattle-related activities and work events

**Key Features:**
- **Timeline View:** Chronological activity feed
- **Activity Filtering:** Filter by type (vaccination, treatment, deworming, weighing, etc.)
- **Statistics Dashboard:** 30-day activity summary
- **Batch Operations:** Track work done on multiple cattle at once
- **Multiple Views:** Timeline, Table, and Calendar views

**Activity Types Supported:**
- 💉 Vaccinations (type, batch/lot, administrator, cattle count)
- 🏥 Treatments (diagnosis, medication, withdrawal periods)
- 🐛 Deworming (product, dosage, batch processing)
- ⚖️ Weighing (weight tracking, growth rates, ADG calculations)
- 🦶 Hoof Trimming
- 🔬 Testing (pregnancy tests, disease testing)
- ✂️ Castration

**Data Tracked:**
- Date/Time of activity
- Activity type and details
- Cattle involved (individual or batch)
- Products/medications used (lot numbers, dosages)
- Administrator/handler
- Notes and observations
- Next action dates

---

### 4. **Cow-Calf Pairing Management** (Card View)
**File:** `cattle-cow-calf-pairing.html`

**Purpose:** Manage which calves pair with which cows, including foster relationships

**Key Features:**
- **Orphan Alert System:** Highlights calves needing foster assignment
- **Visual Pairing Cards:** Easy-to-scan cow-calf relationships
- **Three Pairing Types:**
  - ✅ Natural Pairs (biological mother-calf)
  - 🤝 Foster Pairs (adopted/foster relationships)
  - 🚨 Orphaned Calves (calves without a dam)
- **Batch Weaning Tools:** Manage multiple weanings at once
- **Performance Tracking:** Days together, weaning status, acceptance levels

**Data Tracked:**
- Cow information (ID, breed, age, weight)
- Calf information (ID, birth date, gender, weight)
- Pairing date and duration
- Pairing type (natural vs. foster)
- Biological dam information (for foster pairs)
- Weaning status and readiness
- Health and acceptance status
- Orphan calves requiring attention

**Management Actions:**
- Create new pairings
- Assign foster cows to orphaned calves
- Initiate weaning process
- Separate pairs
- Track acceptance and bonding

---

## 🎨 Design Features

All mockups include:
- **Responsive Design:** Grid layouts that adapt to screen size
- **Color-Coded Status:** Visual indicators for different states
- **Interactive Filters:** Search, sort, and filter capabilities
- **Action Buttons:** Quick access to common operations
- **Statistics Dashboards:** At-a-glance metrics
- **Print-Friendly:** Export and reporting capabilities

---

## 📊 Data Model Structure

### Cow Entity
```
- Tag ID (Primary identifier)
- Breed
- Birth Date / Age
- Color/Markings
- Current Weight
- Body Condition Score
- Dam ID / Sire ID
- Purchase Date
- Status (Active, Pregnant, Dry, Sold)
```

### Calf Entity
```
- Tag ID (Primary identifier)
- Mother (Cow) ID
- Birth Date / Age
- Gender
- Birth Weight
- Current Weight
- Weaning Weight
- Weaning Date
- Status (Nursing, Weaned, Sold, Kept)
```

### Work Activity Entity
```
- Activity ID
- Activity Type
- Date/Time
- Cattle IDs (array)
- Handler/Administrator
- Products Used (medications, vaccines, etc.)
- Batch/Lot Numbers
- Dosages
- Notes
- Next Action Date
```

### Pairing Entity
```
- Pairing ID
- Cow ID
- Calf ID
- Pairing Date
- Pairing Type (Natural, Foster, Orphan)
- Biological Dam ID (if foster)
- Status (Active, Weaned)
- Acceptance Level
- Health Status
```

---

## 🚀 Implementation Notes

These are **standalone HTML mockups** for visualization and planning purposes.

### To View:
Simply open any of the `.html` files in a web browser.

### For Production Implementation:
- Convert to React components using the ERP infrastructure
- Integrate with backend API endpoints (`/api/cattle/...`)
- Add authentication and authorization
- Connect to MySQL database
- Implement real-time updates
- Add data validation and error handling

### Suggested API Endpoints:
```
GET    /api/cattle/cows                    # List all cows
GET    /api/cattle/cows/:id                # Get cow details
POST   /api/cattle/cows                    # Create new cow
PUT    /api/cattle/cows/:id                # Update cow
DELETE /api/cattle/cows/:id                # Delete cow

GET    /api/cattle/calves                  # List all calves
GET    /api/cattle/calves/:id              # Get calf details
GET    /api/cattle/cows/:id/calves         # Get calves for specific cow

GET    /api/cattle/activities              # List all activities
POST   /api/cattle/activities              # Log new activity
GET    /api/cattle/activities/:id          # Get activity details

GET    /api/cattle/pairings                # List all pairings
POST   /api/cattle/pairings                # Create pairing
PUT    /api/cattle/pairings/:id            # Update pairing
DELETE /api/cattle/pairings/:id            # Remove pairing
GET    /api/cattle/pairings/orphans        # Get orphaned calves
```

---

## 📝 Next Steps

1. **Review Mockups:** Open each HTML file and review the layout and functionality
2. **Gather Feedback:** Share with stakeholders for input
3. **Refine Requirements:** Based on feedback, adjust data model and features
4. **Database Schema:** Design MySQL tables for cattle tracking
5. **Backend Development:** Create API endpoints and business logic
6. **Frontend Development:** Convert mockups to React components
7. **Testing:** E2E tests for cattle management workflows
8. **Deployment:** Roll out to production environment

---

## 📧 Questions or Modifications?

These mockups can be easily customized:
- Add additional fields or data points
- Modify color schemes and branding
- Add new activity types or pairing statuses
- Incorporate additional views or reports
- Integrate with existing ERP modules

Let me know if you need any changes or additions!
