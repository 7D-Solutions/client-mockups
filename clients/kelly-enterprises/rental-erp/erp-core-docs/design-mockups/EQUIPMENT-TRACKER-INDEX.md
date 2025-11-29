# Equipment Tracker System - Mockup Documentation

## Overview

Comprehensive equipment tracking system for managing purchases, sales, maintenance costs, and financial analysis. Built with DataTable expandable row pattern matching the Fireproof ERP system.

---

## 📄 Mockup File

**File:** `equipment-tracker-datatable.html`

**Purpose:** Track equipment purchases, sales, maintenance costs, and calculate total cost of ownership

---

## 🎯 Key Features

### 1. **Statistics Dashboard**
Five key metrics displayed at the top:
- **Total Equipment Value:** Current market value of all active equipment
- **Total Invested:** Sum of all purchase prices (all-time)
- **YTD Maintenance:** Year-to-date maintenance and repair costs
- **Revenue from Sales:** Total income from equipment sales
- **Net Profit/Loss:** Overall financial position including depreciation

### 2. **DataTable Layout**
Main table columns:
- **Equipment ID** - Unique identifier (sortable, clickable)
- **Name/Description** - Equipment name and model
- **Category** - Heavy Machinery, Trucks, Tools, Trailers, Generators
- **Purchase Date** - When equipment was acquired (sortable)
- **Purchase Price** - Original acquisition cost (sortable)
- **Current Value** - Estimated market value (sortable)
- **Maintenance Cost (YTD)** - Year-to-date maintenance expenses (sortable)
- **Status** - Active, Idle, Maintenance, Sold, Retired
- **Actions** - View, Edit, Archive links

### 3. **Expandable Row Details**
Click any row to reveal three tabs:

#### Tab 1: Purchase/Sale History
Complete transaction log:
- Purchase transactions (vendor, amount, payment method, date)
- Sale transactions (buyer, sale price, payment method, date)
- Notes and context for each transaction
- Visual badges for transaction types

#### Tab 2: Maintenance History
Comprehensive service records:
- Date of service
- Type (Maintenance, Repair, Inspection)
- Detailed description
- Service provider
- Cost of service
- Hours/mileage at time of service

#### Tab 3: Financial Details
Year-by-year financial breakdown:
- Annual maintenance costs
- Depreciation per year
- Operating hours/miles
- Cost per hour/mile
- Book value by year
- Total cost of ownership

### 4. **Financial Summary Cards**
Three highlighted metrics when row is expanded:
- **Total Investment** - Purchase price + all maintenance
- **Current Value** - Estimated market value
- **Net Position** - Profit or loss if sold today

### 5. **Advanced Filtering**
- **Search:** Equipment ID, name, type, category
- **Status Filter:** All, Active, Idle, Maintenance, Sold, Retired
- **Category Filter:** Heavy Machinery, Trucks, Tools, Trailers, Generators
- **Date Range:** Filter by purchase date

### 6. **Summary Information Grid**
When expanded, shows:
- Make/Model
- Serial Number or VIN
- Year manufactured
- Operating hours or mileage
- Vendor/dealer
- Warranty expiration date

---

## 💰 Financial Tracking Features

### Purchase Tracking
- Purchase date and price
- Vendor information
- Payment method (cash, loan, lease)
- Warranty details
- Original condition notes

### Sale Tracking
- Sale date and price
- Buyer information
- Payment method received
- Reason for sale
- Profit/loss calculation

### Maintenance Cost Tracking
- Regular maintenance (oil changes, inspections, etc.)
- Repairs (parts replacement, emergency fixes)
- Service provider tracking
- Cost per service
- Running total by year
- YTD maintenance costs

### Depreciation Tracking
- Annual depreciation calculations
- Current book value
- Market value estimates
- Total cost of ownership
- Cost per operating hour/mile

---

## 📊 Sample Data Included

### Equipment #1: CAT 320 Excavator
- **Purchase:** $95,000 (Jan 2020)
- **Current Value:** $68,000
- **YTD Maintenance:** $12,450
- **Status:** Active, 4,250 hours
- **18 maintenance records**
- **Full 5-year financial history**
- **Net loss if sold:** -$39,450

### Equipment #2: Ford F-350 Truck (SOLD)
- **Purchase:** $42,000 (Mar 2018)
- **Sale Price:** $28,000 (May 2024)
- **Total Maintenance:** $8,250 over 6 years
- **Ownership:** 6 years, 2 months
- **Sale Loss:** -$22,250
- **Complete purchase → sale lifecycle**

### Additional Equipment
- Bobcat S650 Skid Steer
- Generac 50kW Generator
- Big Tex Flatbed Trailer

---

## 🎨 Visual Design

### Color-Coded Status Badges
- **Green (Active):** Equipment currently in use
- **Yellow (Maintenance):** Currently being serviced
- **Gray (Sold):** Equipment has been sold
- **Blue (Idle):** Equipment available but not in use
- **Red (Retired):** Equipment no longer operational

### Transaction Type Badges
- **Green (Purchase):** Money spent acquiring equipment
- **Blue (Sale):** Money received from selling equipment
- **Yellow (Maintenance):** Regular service costs
- **Red (Repair):** Emergency or unplanned repairs

### Financial Color Coding
- **Green values:** Positive (revenue, profit, gains)
- **Red values:** Negative (expenses, losses, depreciation)
- **Monospace font:** Currency values for alignment

---

## 📈 Financial Calculations

### Total Investment
```
Purchase Price + Sum of All Maintenance Costs
```

### Net Position
```
Current Market Value - Total Investment
```

### Cost Per Operating Hour
```
Annual Maintenance Cost / Annual Operating Hours
```

### Profit/Loss on Sale
```
Sale Price - (Purchase Price + Total Maintenance)
```

---

## 📋 Data Model Structure

### Equipment Entity
```javascript
{
  equipment_id: "EQ-001",
  name: "CAT 320 Excavator",
  category: "Heavy Machinery",
  make: "Caterpillar",
  model: "320",
  year: 2019,
  serial_number: "CAT320-2020-5678",
  purchase_date: "2020-01-15",
  purchase_price: 95000.00,
  purchase_vendor: "Wagner Equipment Co.",
  current_value: 68000.00,
  status: "Active", // Active, Idle, Maintenance, Sold, Retired
  operating_hours: 4250,
  warranty_expires: "2025-01-15"
}
```

### Transaction Entity (Purchase/Sale)
```javascript
{
  transaction_id: "TXN-001",
  equipment_id: "EQ-001",
  transaction_type: "Purchase", // Purchase, Sale
  transaction_date: "2020-01-15",
  amount: 95000.00,
  vendor_buyer: "Wagner Equipment Co.",
  payment_method: "Bank Loan (5 years)",
  notes: "New excavator for expansion project"
}
```

### Maintenance Record Entity
```javascript
{
  maintenance_id: "MNT-001",
  equipment_id: "EQ-001",
  service_date: "2024-10-28",
  service_type: "Maintenance", // Maintenance, Repair, Inspection
  description: "500-hour service - Oil change, filters",
  service_provider: "CAT Certified Service",
  cost: 1250.00,
  operating_hours: 4250,
  notes: "Routine service completed"
}
```

### Financial Summary Entity
```javascript
{
  summary_id: "FIN-001",
  equipment_id: "EQ-001",
  year: 2024,
  maintenance_cost: 3850.00,
  depreciation: 8500.00,
  operating_hours: 875,
  cost_per_hour: 14.11,
  book_value: 68000.00
}
```

---

## 🚀 Suggested API Endpoints

### Equipment Management
```
GET    /api/equipment                      # List all equipment
GET    /api/equipment/:id                  # Get equipment details
POST   /api/equipment                      # Add new equipment
PUT    /api/equipment/:id                  # Update equipment
DELETE /api/equipment/:id                  # Archive equipment

GET    /api/equipment/stats                # Dashboard statistics
GET    /api/equipment/financial-summary    # Overall financial summary
```

### Transactions (Purchase/Sale)
```
GET    /api/equipment/:id/transactions     # All transactions for equipment
POST   /api/equipment/:id/purchase         # Record purchase
POST   /api/equipment/:id/sale             # Record sale
GET    /api/transactions                   # All transactions (filterable)
```

### Maintenance Records
```
GET    /api/equipment/:id/maintenance      # All maintenance for equipment
POST   /api/equipment/:id/maintenance      # Add maintenance record
PUT    /api/maintenance/:id                # Update maintenance record
DELETE /api/maintenance/:id                # Remove maintenance record

GET    /api/maintenance/upcoming           # Scheduled maintenance
GET    /api/maintenance/overdue            # Overdue maintenance
```

### Financial Reports
```
GET    /api/equipment/:id/financial        # Financial history for equipment
GET    /api/reports/equipment-value        # Total equipment value report
GET    /api/reports/maintenance-costs      # Maintenance cost analysis
GET    /api/reports/profit-loss            # P&L report for sold equipment
GET    /api/reports/depreciation           # Depreciation schedule
```

---

## 💡 Use Cases

### 1. Purchase New Equipment
- Record purchase date, vendor, price
- Track payment method (cash, loan, lease)
- Set up maintenance schedule
- Record warranty information

### 2. Track Maintenance Costs
- Log all service and repair activities
- Track costs by service provider
- Monitor YTD maintenance spending
- Calculate cost per operating hour

### 3. Sell Equipment
- Record sale date and buyer
- Calculate profit or loss on sale
- Track complete ownership lifecycle
- Archive equipment record

### 4. Financial Analysis
- Calculate total cost of ownership
- Track depreciation over time
- Analyze maintenance trends
- Evaluate equipment ROI

### 5. Budget Planning
- Project future maintenance costs
- Plan equipment replacement schedules
- Analyze historical spending patterns
- Optimize fleet composition

---

## 📝 Implementation Notes

### Database Schema Suggestions

**Tables Needed:**
- `equipment` - Core equipment information
- `transactions` - Purchase and sale records
- `maintenance_records` - Service and repair history
- `financial_summaries` - Yearly financial breakdowns
- `vendors` - Vendor/dealer information
- `service_providers` - Maintenance provider directory

**Key Relationships:**
- One equipment → Many transactions
- One equipment → Many maintenance records
- One equipment → Many financial summaries
- Many equipment → One vendor (purchase)
- Many maintenance records → One service provider

### Integration with Existing ERP
- Use existing authentication system
- Leverage infrastructure components (Button, FormInput, DataTable)
- Follow established API patterns (`/api/equipment/...`)
- Integrate with accounting module for financial reporting

---

## 🎯 Next Steps

1. **Review Mockup:** Open HTML file in browser
2. **Validate Requirements:** Confirm all tracking needs are met
3. **Database Design:** Create schema for equipment tracking
4. **API Development:** Build backend endpoints
5. **Frontend Implementation:** Convert to React components
6. **Testing:** E2E tests for purchase, maintenance, sale workflows
7. **Reporting:** Build financial analysis dashboards

---

## 📧 Customization Options

Easily customizable:
- Add equipment categories (forklifts, cranes, etc.)
- Custom financial calculations
- Additional maintenance types
- Integration with fuel tracking
- Insurance tracking
- Inspection/compliance schedules
- Multi-location tracking
- Rental income tracking (if renting out equipment)

---

**File Location:** `erp-core-docs/design-mockups/equipment-tracker-datatable.html`

Open in browser to see fully interactive mockup!
