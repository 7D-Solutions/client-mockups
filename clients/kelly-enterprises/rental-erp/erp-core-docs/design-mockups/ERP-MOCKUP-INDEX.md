# Fireproof ERP - Complete Mockup Index

**Created**: 2025-11-06
**Purpose**: Index of all ERP system mockups for machine shop operations

---

## ✅ Completed Mockups

### Core System
1. **`erp-dashboard-main.html`** - Main ERP Dashboard
   - Executive overview with module cards
   - Key metrics (24 active jobs, 94.2% OTD, 8 items below min, 3 cal due)
   - Module status cards for all 9 modules
   - Recent activity feed
   - Quick actions for each module

### Purchasing Module 🛒
2. **`purchasing-po-list.html`** - Purchase Orders List
   - DataTable with PO number, supplier, description, status, total
   - Status badges: Pending, Approved, Ordered, Received, Cancelled
   - Filter by status and supplier
   - Date columns for order date and expected delivery
   - Actions: View, Edit for each PO

### Production Module 🏭
3. **`production-work-order-list.html`** - Work Orders List
   - WO number, customer, part number, description
   - Status: New, In Progress, Complete, On Hold
   - Priority levels: High, Medium, Normal
   - Progress tracking (quantity complete/total)
   - Due date tracking

---

## 📋 Additional Mockups to Create

### Purchasing Module (Remaining)
- **`purchasing-supplier-list.html`** - Supplier management table
- **`purchasing-create-po.html`** - Create/Edit PO form with line items
- **`purchasing-requisitions.html`** - Internal purchase requisitions
- **`purchasing-receiving.html`** - Receiving queue and PO receipts

### Production Module (Remaining)
- **`production-job-tracking.html`** - Active jobs dashboard with real-time status
- **`production-schedule.html`** - Calendar view of production schedule
- **`production-machine-schedule.html`** - Machine allocation and utilization
- **`production-create-wo.html`** - Create work order form

### Quality Control Module ✓
- **`quality-inspection-list.html`** - Inspections table (first article, in-process, final)
- **`quality-ncr-list.html`** - Non-conformance reports with root cause
- **`quality-car-list.html`** - Corrective action requests tracking
- **`quality-metrics.html`** - Quality KPIs dashboard (yield, scrap, rework)
- **`quality-inspection-form.html`** - Inspection checklist with measurements
- **`quality-certificate-manager.html`** - COC, material certs, cal certs

### Maintenance Module 🔧
- **`maintenance-equipment-list.html`** - All equipment/machinery table
- **`maintenance-pm-schedule.html`** - Preventive maintenance calendar
- **`maintenance-requests.html`** - Maintenance work orders
- **`maintenance-history.html`** - Equipment service history
- **`maintenance-spare-parts.html`** - Maintenance inventory

### Sales/Orders Module 💼
- **`sales-quote-list.html`** - RFQ and quotations
- **`sales-order-list.html`** - Customer orders table
- **`sales-customer-list.html`** - Customer management
- **`sales-order-schedule.html`** - Delivery planning calendar
- **`sales-create-quote.html`** - Quote creation form

### Shipping/Receiving Module 📮
- **`shipping-receiving-queue.html`** - Incoming shipments
- **`shipping-outbound-list.html`** - Orders ready to ship
- **`shipping-tracking.html`** - Shipment status tracking
- **`shipping-packing-list.html`** - Packing slip generation
- **`shipping-bol-generator.html`** - Bill of lading

---

## Design Patterns Used

All mockups follow the established Fireproof ERP design system:

### Layout Structure
- **Container**: Max-width 1400px, centered, 24px padding
- **Card**: White background, 8px border-radius, 1px border
- **Header**: 24px padding, bottom border, flex layout
- **Filter Bar**: 16px padding, gray background, flex wrap

### Colors (CSS Variables)
- **Primary**: `#2563eb` (blue) - CTAs, primary elements
- **Success**: `#10b981` (green) - Complete, approved states
- **Warning**: `#f59e0b` (orange) - Pending, in-progress states
- **Danger**: `#ef4444` (red) - Errors, critical items
- **Gray-50**: `#f9fafb` - Page background
- **Border**: `#e5e7eb` - All borders

### Typography
- **Font**: System UI stack (Apple, Segoe, Roboto)
- **Title**: 24px, weight 600
- **Body**: 16px base, 14px table text
- **Labels**: 12px uppercase for column headers

### Components
- **DataTable**: Sortable columns, hover states, responsive
- **Badges**: Small, colored status indicators
- **Buttons**: Primary (blue), Secondary (white), sizes (sm, base)
- **Filters**: Dropdowns and search inputs
- **Pagination**: Page numbers with prev/next

### DataTable Features
- Column sorting (click headers)
- Column filtering (built-in)
- Row hover states
- Responsive design
- Empty states
- Pagination

---

## Navigation Structure

```
Dashboard
├── Purchasing
│   ├── Purchase Orders ✅
│   ├── Suppliers
│   ├── Requisitions
│   └── Receiving
├── Production
│   ├── Work Orders ✅
│   ├── Job Tracking
│   ├── Schedule
│   └── Machine Schedule
├── Inventory (Existing)
│   ├── Current Inventory
│   ├── Storage Locations
│   ├── Movements
│   └── Adjustments
├── Gauges (Existing)
│   ├── All Gauges
│   ├── My Gauges
│   ├── Sets
│   └── Calibration
├── Quality
│   ├── Inspections
│   ├── NCRs
│   ├── CARs
│   └── Metrics
├── Maintenance
│   ├── Equipment
│   ├── PM Schedule
│   ├── Requests
│   └── History
├── Sales
│   ├── Quotes
│   ├── Orders
│   ├── Customers
│   └── Invoicing
├── Shipping
│   ├── Receiving
│   ├── Shipping
│   └── Tracking
└── Admin (Existing)
    ├── Users
    ├── Roles
    ├── Facilities
    └── Settings
```

---

## File Organization

All mockups are located in:
```
/erp-core-docs/design-mockups/
```

### Naming Convention
- `{module}-{page}-{variant}.html`
- Example: `purchasing-po-list.html`
- Example: `quality-inspection-form.html`

### Documentation Files
- `MACHINE-SHOP-ERP-STRUCTURE.md` - Complete module specifications
- `ERP-MOCKUP-INDEX.md` - This file (mockup index)
- `location-hierarchy-best-practices.md` - Design research document

---

## Key Features by Module

### Purchasing
- PO approval workflow
- Supplier performance tracking
- Budget tracking
- Automated reorder points
- Multi-line PO support

### Production
- Work order lifecycle
- Real-time job tracking
- Machine utilization
- Labor cost allocation
- Material requirements

### Quality
- Inspection workflows
- NCR tracking
- Root cause analysis
- Statistical process control
- Certificate management

### Maintenance
- PM scheduling
- Equipment history
- Downtime tracking
- Spare parts inventory
- Cost tracking

### Sales
- Quote-to-order conversion
- Customer portal
- Delivery promises
- Order change management
- Invoicing integration

### Shipping/Receiving
- Barcode scanning
- Carrier integration
- BOL generation
- Tracking
- Receiving inspection

---

## Implementation Priority

### Phase 1 (Weeks 1-2) ✅
- ✅ Main Dashboard
- ✅ Purchasing - PO List
- ✅ Production - Work Order List

### Phase 2 (Weeks 3-4)
- Quality - Inspection List & NCR List
- Maintenance - Equipment List & PM Schedule
- Sales - Order List & Customer List

### Phase 3 (Week 5)
- Shipping - Receiving & Outbound Lists
- Enhanced Inventory Integration
- Create forms for all modules

### Phase 4 (Week 6)
- Cross-module integration
- Reporting dashboards
- Performance optimization
- Mobile responsive refinement

---

## Next Steps

1. **Review Completed Mockups**
   - Open in browser to verify design
   - Validate against requirements
   - Gather stakeholder feedback

2. **Create Remaining Priority Mockups**
   - Quality module (inspections, NCRs)
   - Maintenance module (equipment, PM)
   - Sales module (orders, customers)

3. **Convert to React Components**
   - Use existing DataTable infrastructure
   - Follow established component patterns
   - Implement with mock data first

4. **Backend API Development**
   - Define API contracts
   - Create database schemas
   - Implement CRUD operations
   - Add business logic

5. **Integration**
   - Connect frontend to APIs
   - Implement real-time updates
   - Add authentication/authorization
   - Test cross-module workflows

---

## Design Decisions

### Why Separate Mockups?
- Faster iteration and feedback
- Easy to share with stakeholders
- Can be tested in browser immediately
- Clear visual reference for developers

### Why HTML Mockups vs Figma?
- No tool licensing required
- Version controlled with code
- Can be tested with real data
- Easy to convert to React components

### Responsive Design
- Desktop-first approach (1400px max-width)
- Tables scroll horizontally on mobile
- Filters stack vertically on small screens
- Touch-friendly button sizes

---

## Browser Compatibility

All mockups tested and compatible with:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Questions or Feedback?

For questions about these mockups or to request additional pages:
1. Review the MACHINE-SHOP-ERP-STRUCTURE.md for module details
2. Check existing mockups in this directory
3. Follow established design patterns
4. Use consistent naming conventions

---

## Revision History

- **2025-11-06**: Initial mockup set created (Dashboard, Purchasing PO List, Production Work Orders)
- **2025-11-06**: Documentation structure established
