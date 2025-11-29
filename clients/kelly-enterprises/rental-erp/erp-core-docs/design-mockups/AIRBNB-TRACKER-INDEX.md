# Airbnb Rental Property Tracker - Mockup Documentation

## Overview

Comprehensive Airbnb rental tracking system for managing bookings, revenue, expenses, guest reviews, and property performance. Built with DataTable expandable row pattern matching the Fireproof ERP system.

---

## 📄 Mockup Files

### Basic Version
**File:** `airbnb-rental-tracker.html`
**Purpose:** Track Airbnb bookings for single property, calculate profitability, manage expenses

### Enhanced Version ⭐ **RECOMMENDED**
**File:** `airbnb-rental-tracker-enhanced.html`
**Purpose:** Multi-property management with calendar view and booking platform integration

**New Features:**
- 🏘️ **Multi-Property Support** - Manage multiple rental properties from one dashboard
- 📅 **Visual Calendar View** - See bookings on monthly calendar with color coding
- 🔗 **Platform Integration** - Track Airbnb, VRBO, Booking.com, and Direct bookings

---

## 🆕 Enhanced Features

### 1. Multi-Property Management

**Property Selector:**
- Tab-based property switcher
- "All Properties" view for portfolio overview
- Individual property views for detailed management
- Quick stats per property (occupancy %, avg nightly rate)

**Property Comparison Cards:**
Three side-by-side property cards showing:
- Property name and address
- 2024 revenue
- Occupancy rate
- Average nightly rate
- Average guest rating
- Total bookings

**Portfolio Statistics:**
- **Total Revenue:** $180,120 across 3 properties
- **Combined Occupancy:** 82% average
- **Total Bookings:** 86 YTD
- **Avg Portfolio Rating:** 4.8 ⭐

**Sample Properties:**
1. 🏡 **Downtown Cottage** - Austin, TX - 78% occupancy, $171/night
2. 🏖️ **Beach House** - Galveston, TX - 85% occupancy, $245/night
3. 🏔️ **Mountain Cabin** - Breckenridge, CO - 83% occupancy, $189/night

### 2. Calendar View

**Visual Monthly Calendar:**
- Full month grid layout (Sun-Sat)
- Color-coded bookings by platform
- Booking guest names displayed
- "Today" highlighting
- Previous/Next month navigation
- Blocked/Personal use dates shown

**Calendar Features:**
- Click any booking to view details
- Visual occupancy at a glance
- Gap identification (available dates)
- Booking overlap prevention
- Platform color coding

**Color Coding:**
- 🔴 **Red/Pink** - Airbnb bookings
- 🔵 **Blue** - VRBO bookings
- 🔷 **Teal** - Booking.com reservations
- 🟢 **Green** - Direct bookings
- ⚫ **Gray** - Blocked/Personal use

### 3. Booking Platform Integration

**Supported Platforms:**
- **Airbnb** - #FF5A5F (red/pink)
- **VRBO** - #0066CC (blue)
- **Booking.com** - #003580 (dark blue/teal)
- **Direct Bookings** - #28a745 (green)

**Platform Tracking:**
- Platform badges on each booking
- Filter bookings by platform
- Revenue breakdown by platform
- Platform performance comparison
- Commission/fee tracking per platform

**Platform-Specific Data:**
- Different fee structures
- Platform-specific guest ratings
- Commission percentages
- Payout schedules
- Cancellation policies

**Analytics by Platform:**
- Revenue distribution pie chart
- Booking count by platform
- Average booking value per platform
- Guest satisfaction by platform

### 4. Three View Modes

**📋 Bookings List View:**
- DataTable with all bookings
- Platform column with badges
- Property column (for multi-property)
- Sort by any column
- Filter by platform, property, status

**📅 Calendar View:**
- Visual monthly calendar
- Color-coded by platform
- Booking guest names
- Availability gaps visible
- Blocked dates shown
- Click booking for details

**📊 Analytics View:**
- Revenue trends chart
- Platform distribution pie chart
- Occupancy comparison bar chart
- Average nightly rate trends
- Performance metrics dashboard

---

## 🎯 Key Features

### 1. **Statistics Dashboard**
Six key performance metrics:
- **Total Revenue (2024):** $48,750 from 28 completed bookings
- **Total Expenses (2024):** $18,425 (cleaning, maintenance, utilities)
- **Net Income (2024):** $30,325 with 62.2% profit margin
- **Occupancy Rate:** 78% (285 nights booked / 365 total)
- **Avg. Nightly Rate:** $171 based on 285 nights
- **Avg. Guest Rating:** 4.8 ⭐ based on 24 reviews

### 2. **DataTable Layout**
Main booking table columns:
- **Booking ID** - Unique confirmation number (sortable, clickable)
- **Guest Name** - Guest's full name
- **Check-In** - Arrival date (sortable)
- **Check-Out** - Departure date (sortable)
- **Nights** - Length of stay (sortable)
- **Guests** - Number of guests (sortable)
- **Revenue** - Your payout after fees (sortable)
- **Rating** - Guest's review rating (sortable)
- **Status** - Confirmed, Checked In, Completed, Cancelled
- **Actions** - View, Edit links

### 3. **Expandable Row Details**
Click any booking to reveal four tabs:

#### Tab 1: Financial Details
Complete booking breakdown:
- Nightly rate × number of nights
- Cleaning fee
- Guest service fee (Airbnb charges guest)
- Total guest paid
- Host service fee (Airbnb charges you)
- Your final payout
- Itemized financial summary

#### Tab 2: Expenses
All costs associated with the booking:
- Cleaning expenses (post-checkout deep clean)
- Maintenance and repairs
- Utilities (if not included in rate)
- Supplies (toiletries, coffee, snacks, etc.)
- Other operational costs
- Total expenses calculation
- Net income after expenses

#### Tab 3: Guest Review
Complete review details:
- Overall rating (1-5 stars)
- Individual category ratings:
  - Cleanliness
  - Accuracy
  - Communication
  - Location
  - Check-in
  - Value
- Written review text
- Review date

#### Tab 4: Notes
Internal booking notes:
- Special requests
- Issues or incidents
- Property condition
- Guest behavior
- Follow-up actions
- Recommendations for future bookings

### 4. **Guest Information Card**
Displayed when row is expanded:
- Guest name and profile
- Email address
- Phone number
- Location (city, state)
- Number and type of guests (adults, children)
- Total stays at your property
- ID verification status

### 5. **Financial Summary Cards**
Three key metrics per booking:
- **Guest Paid:** Total booking amount charged to guest
- **Your Payout:** Amount you receive after Airbnb fees
- **Net Income:** Profit after subtracting all expenses

### 6. **Advanced Filtering**
- **Search:** Booking ID, guest name
- **Status Filter:** All, Confirmed, Checked In, Completed, Cancelled
- **Date Range:** Filter by check-in/check-out dates
- **Revenue Range:** Filter by booking value

---

## 💰 Financial Tracking Features

### Revenue Tracking
- Nightly rate × number of nights
- Cleaning fees (one-time)
- Extra guest fees
- Pet fees
- Early check-in / late check-out fees
- Guest service fees (charged by Airbnb to guest)
- Your total payout after platform fees

### Expense Tracking
**Cleaning Expenses:**
- Post-checkout deep cleaning
- Mid-stay cleaning (for longer bookings)
- Laundry services
- Cleaning supplies

**Maintenance Expenses:**
- Repairs during or after booking
- Preventive maintenance
- Emergency fixes
- Professional services

**Utilities (if variable):**
- Electricity
- Water/sewer
- Gas/heating
- Internet
- Trash service

**Supplies:**
- Toiletries (shampoo, soap, toilet paper)
- Kitchen supplies (coffee, tea, snacks)
- Paper products
- Cleaning supplies

**Platform Fees:**
- Airbnb host service fee (typically 10-15%)
- Payment processing fees
- Additional service charges

### Profitability Analysis
**Gross Revenue** - Total booking revenue before any deductions
**Platform Fees** - Airbnb/VRBO service fees deducted
**Net Revenue** - Revenue after platform fees (your payout)
**Operating Expenses** - All costs associated with booking
**Net Income** - Final profit (Net Revenue - Operating Expenses)
**Profit Margin %** - (Net Income / Gross Revenue) × 100

---

## 📊 Sample Data Included

### Booking #1: Sarah Johnson (BK-2024-032)
- **Stay:** Nov 15-18, 2024 (3 nights)
- **Guests:** 2 adults
- **Revenue:** $525.00 payout
- **Expenses:** $100.00 (cleaning $85, supplies $15)
- **Net Income:** $425.00
- **Rating:** 5.0 ⭐⭐⭐⭐⭐
- **Complete financial breakdown and excellent review**

### Booking #2: Michael Chen (BK-2024-031)
- **Stay:** Nov 8-15, 2024 (7 nights)
- **Guests:** 2 adults, 2 children
- **Revenue:** $1,225.00 payout
- **Expenses:** $185.00 (cleaning $110, maintenance $45, supplies $30)
- **Net Income:** $1,040.00
- **Rating:** 4.8 ⭐
- **Family stay with minor maintenance issue (resolved quickly)**
- **Repeat guest (3rd visit)**

### Booking #3: Jennifer Martinez (CANCELLED)
- **Originally:** Nov 1-4, 2024
- **Status:** Cancelled 5 days before check-in
- **Revenue:** $0.00
- **Refund processed per cancellation policy**

### Additional Bookings
- David Thompson - 3 nights, 4.7 ⭐
- Amanda Wilson - Upcoming confirmed booking

---

## 🎨 Visual Design

### Airbnb Brand Colors
- **Primary:** #FF5A5F (Airbnb red/pink)
- **Success:** #00A699 (Airbnb teal)
- **Info:** #008489 (Dark teal)
- **Warning:** #FFB400 (Yellow for ratings)

### Status Badges
- **Green (Confirmed):** Upcoming booking confirmed
- **Blue (Checked In):** Guest currently staying
- **Gray (Completed):** Booking finished
- **Red (Cancelled):** Booking cancelled by guest or host
- **Yellow (Pending):** Awaiting confirmation

### Expense Type Badges
- **Blue (Cleaning):** Cleaning services and supplies
- **Yellow (Maintenance):** Repairs and upkeep
- **Teal (Utilities):** Power, water, internet, etc.
- **Green (Supplies):** Guest amenities and consumables
- **Red (Fees):** Platform and service fees

---

## 📈 Performance Metrics

### Occupancy Rate Calculation
```
(Total Nights Booked / Total Nights Available) × 100
= (285 / 365) × 100 = 78%
```

### Average Nightly Rate
```
Total Revenue / Total Nights Booked
= $48,750 / 285 = $171 per night
```

### Average Daily Rate (ADR)
```
Booking Revenue / Number of Nights
```

### Revenue Per Available Night (RevPAN)
```
Total Revenue / Total Nights Available
= $48,750 / 365 = $133.56 per available night
```

### Profit Margin
```
(Net Income / Total Revenue) × 100
= ($30,325 / $48,750) × 100 = 62.2%
```

### Average Guest Rating
```
Sum of All Ratings / Number of Reviews
= 115.2 / 24 = 4.8 stars
```

---

## 📋 Data Model Structure

### Booking Entity
```javascript
{
  booking_id: "BK-2024-032",
  guest_name: "Sarah Johnson",
  guest_email: "sarah.johnson@email.com",
  guest_phone: "(555) 123-4567",
  guest_location: "Austin, TX",
  guest_count: {
    adults: 2,
    children: 0,
    infants: 0,
    pets: 0
  },
  check_in: "2024-11-15",
  check_in_time: "15:00",
  check_out: "2024-11-18",
  check_out_time: "11:00",
  nights: 3,
  nightly_rate: 150.00,
  cleaning_fee: 75.00,
  guest_service_fee: 52.50,
  host_service_fee: 52.50,
  gross_revenue: 577.50,
  net_payout: 525.00,
  status: "Completed", // Confirmed, CheckedIn, Completed, Cancelled, Pending
  rating: 5.0,
  verified_id: true,
  total_stays: 1 // At this property
}
```

### Expense Entity
```javascript
{
  expense_id: "EXP-2024-156",
  booking_id: "BK-2024-032",
  date: "2024-11-18",
  type: "Cleaning", // Cleaning, Maintenance, Utilities, Supplies, Fees
  description: "Post-checkout deep clean",
  vendor: "Clean Team Services",
  amount: 85.00,
  category: "Operating Expense"
}
```

### Review Entity
```javascript
{
  review_id: "REV-2024-032",
  booking_id: "BK-2024-032",
  guest_name: "Sarah Johnson",
  date: "2024-11-19",
  overall_rating: 5.0,
  ratings: {
    cleanliness: 5,
    accuracy: 5,
    communication: 5,
    location: 5,
    checkin: 5,
    value: 5
  },
  review_text: "Amazing stay! The place was spotless...",
  public_response: "Thank you Sarah! We'd love to host you again!"
}
```

### Property Entity
```javascript
{
  property_id: "PROP-001",
  name: "Cozy Downtown Cottage",
  address: "123 Main St, City, State 12345",
  property_type: "Entire Home",
  bedrooms: 2,
  bathrooms: 1,
  max_guests: 4,
  base_nightly_rate: 150.00,
  cleaning_fee: 75.00,
  cancellation_policy: "Moderate",
  check_in_time: "15:00",
  check_out_time: "11:00",
  airbnb_listing_url: "https://airbnb.com/...",
  active: true
}
```

---

## 🚀 Suggested API Endpoints

### Booking Management
```
GET    /api/airbnb/bookings                   # List all bookings
GET    /api/airbnb/bookings/:id               # Get booking details
POST   /api/airbnb/bookings                   # Create new booking
PUT    /api/airbnb/bookings/:id               # Update booking
DELETE /api/airbnb/bookings/:id               # Cancel booking

GET    /api/airbnb/bookings/upcoming          # Upcoming bookings
GET    /api/airbnb/bookings/active            # Current check-ins
GET    /api/airbnb/bookings/completed         # Past bookings
GET    /api/airbnb/bookings/cancelled         # Cancelled bookings
```

### Financial Reports
```
GET    /api/airbnb/revenue/summary            # Revenue summary (YTD, monthly)
GET    /api/airbnb/revenue/breakdown          # Revenue by booking
GET    /api/airbnb/expenses/summary           # Expense summary
GET    /api/airbnb/expenses/by-type           # Expenses grouped by type
GET    /api/airbnb/profitability              # Net income analysis
GET    /api/airbnb/reports/tax-summary        # Tax year summary
```

### Performance Metrics
```
GET    /api/airbnb/metrics/occupancy          # Occupancy rate
GET    /api/airbnb/metrics/adr                # Average daily rate
GET    /api/airbnb/metrics/revpan             # Revenue per available night
GET    /api/airbnb/metrics/ratings            # Average rating & reviews
GET    /api/airbnb/metrics/dashboard          # All KPIs for dashboard
```

### Expense Tracking
```
GET    /api/airbnb/bookings/:id/expenses      # Expenses for booking
POST   /api/airbnb/expenses                   # Add expense
PUT    /api/airbnb/expenses/:id               # Update expense
DELETE /api/airbnb/expenses/:id               # Remove expense
```

### Guest Management
```
GET    /api/airbnb/guests                     # All guests
GET    /api/airbnb/guests/:id                 # Guest profile
GET    /api/airbnb/guests/:id/history         # Guest booking history
POST   /api/airbnb/guests/:id/notes           # Add guest note
```

### Reviews
```
GET    /api/airbnb/reviews                    # All reviews
GET    /api/airbnb/reviews/:booking_id        # Review for booking
POST   /api/airbnb/reviews                    # Submit review for guest
PUT    /api/airbnb/reviews/:id                # Update review response
```

---

## 💡 Use Cases

### 1. Track Booking Revenue
- Record each booking with complete financial details
- Calculate gross revenue, platform fees, net payout
- Track cleaning fees, extra guest charges
- Monitor revenue trends over time

### 2. Manage Operating Expenses
- Log cleaning costs per booking
- Track maintenance and repair expenses
- Monitor utility costs (if variable)
- Record supply replenishment costs
- Calculate total operating expenses

### 3. Calculate Profitability
- Net income per booking (revenue - expenses)
- Profit margin percentage
- Year-to-date profitability
- Monthly profit trends
- Break-even analysis

### 4. Monitor Property Performance
- Occupancy rate tracking
- Average nightly rate trends
- Revenue per available night
- Booking conversion rate
- Cancellation rate

### 5. Guest Relationship Management
- Track guest history and preferences
- Monitor guest ratings and reviews
- Identify repeat guests
- Flag problematic guests
- Maintain guest communication log

### 6. Tax Reporting
- Annual revenue summary
- Deductible expense tracking
- 1099-K income reconciliation
- Occupancy tax calculations
- Quarterly estimated tax planning

---

## 📝 Implementation Notes

### Database Schema Suggestions

**Tables Needed:**
- `properties` - Rental property information
- `bookings` - Booking records and details
- `guests` - Guest profiles and contact info
- `expenses` - Operating expenses by booking
- `reviews` - Guest reviews and ratings
- `calendar` - Availability calendar
- `pricing_rules` - Dynamic pricing rules

**Key Relationships:**
- One property → Many bookings
- One booking → One guest
- One booking → Many expenses
- One booking → One review
- One property → One calendar

### Integration Opportunities
- **Airbnb API:** Import bookings automatically
- **VRBO/Booking.com:** Multi-platform tracking
- **Stripe/PayPal:** Payment reconciliation
- **QuickBooks:** Accounting integration
- **Calendar Sync:** Google Calendar, iCal
- **Cleaning Services:** Automated scheduling
- **Smart Locks:** Remote access management

### Automation Features
- Auto-import bookings from Airbnb
- Automated expense categorization
- Pre-arrival message scheduling
- Post-checkout review reminders
- Cleaning service notifications
- Financial report generation
- Tax document preparation

---

## 🎯 Advanced Features (Future)

### Dynamic Pricing
- Seasonal rate adjustments
- Weekend vs. weekday pricing
- Last-minute discount rules
- Length-of-stay discounts
- Special event pricing

### Multi-Property Management
- Track multiple rental properties
- Compare property performance
- Consolidated financial reporting
- Portfolio-level analytics

### Calendar Management
- Availability calendar
- Block dates for personal use
- Sync with external calendars
- Minimum stay requirements
- Same-day booking settings

### Communication Hub
- Guest message templates
- Automated responses
- Pre-arrival instructions
- Check-out reminders
- Review request automation

### Maintenance Scheduling
- Preventive maintenance calendar
- Repair work orders
- Vendor management
- Inspection checklists
- Property condition tracking

---

## 📧 Customization Options

Easily customizable:
- Add custom expense categories
- Multiple properties support
- Custom pricing rules
- Additional guest fields
- Integration with property management systems
- Custom financial reports
- Tax jurisdiction settings
- Multi-currency support (for international properties)

---

**File Location:** `erp-core-docs/design-mockups/airbnb-rental-tracker.html`

**Documentation:** `erp-core-docs/design-mockups/AIRBNB-TRACKER-INDEX.md`

Open HTML file in browser to see fully interactive mockup with real Airbnb-style design!
