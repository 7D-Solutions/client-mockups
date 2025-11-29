# Modular ERP Folder Structure

## Overview

This document defines the folder structure for transitioning from the standalone gauge application to a properly modular ERP system, as specified in the Modular-Vision.txt document.

## Complete Folder Structure

```
Fire-Proof-ERP-Sandbox/
├── erp-core/                    # Core services - keep what works
│   └── src/
│       └── core/
│           ├── auth/            # Authentication, permissions, user management
│           ├── navigation/      # Routing, tabs, module registry
│           ├── data/            # API client, event bus, caching
│           └── notifications/   # System notifications
│
├── backend/                     # Backend application
│   ├── src/
│   │   ├── modules/             # Just organized folders
│   │   │   └── gauge/           # Gauge functionality
│   │   │       ├── controllers/
│   │   │       │   ├── gaugeController.js
│   │   │       │   └── calibrationController.js
│   │   │       ├── services/
│   │   │       │   └── gaugeService.js
│   │   │       ├── routes/
│   │   │       │   └── index.js
│   │   │       └── migrations/
│   │   │           └── 002_gauge_tables.sql
│   │   │
│   │   ├── infrastructure/      # Core backend services
│   │   │   ├── database/
│   │   │   │   └── connection.js
│   │   │   └── middleware/
│   │   │       ├── auth.js
│   │   │       └── errorHandler.js
│   │   │
│   │   ├── app.js               # Express app setup
│   │   └── server.js            # Entry point
│   │
│   ├── tests/                   # All backend tests
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── e2e/
│   │   └── modules/
│   │       └── gauge/           # Gauge module tests
│   │
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                    # Frontend application
│   ├── src/
│   │   ├── modules/             # Just organized folders
│   │   │   └── gauge/           # Gauge UI
│   │   │       ├── components/
│   │   │       │   ├── GaugeList.tsx
│   │   │       │   └── GaugeDetail.tsx
│   │   │       ├── services/
│   │   │       │   └── gaugeApi.ts
│   │   │       └── types/
│   │   │           └── gauge.types.ts
│   │   │
│   │   ├── App.tsx              # Main app
│   │   └── index.tsx            # Entry point
│   │
│   ├── tests/                   # All frontend tests
│   │   ├── e2e/
│   │   ├── pages/
│   │   ├── store/
│   │   └── modules/
│   │       └── gauge/           # Gauge module tests
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── docker-compose.yml
├── README.md
└── CLAUDE.md
```

## Key Design Decisions

### 1. Simple Organization, Not Framework
- **modules/** folders are just organization - no special loading
- **No manifest files** - the code IS the documentation
- **No dependency injection** - use normal imports
- **No module discovery** - just require/import what you need

### 2. Focus on Building, Not Abstracting
- Build the gauge tracker first
- When we need a second module, we'll know what to extract
- Don't solve problems we don't have
- Keep it simple and working

### 3. Standard File Organization
```javascript
// backend/src/modules/gauge/routes/index.js
const express = require('express');
const gaugeController = require('../controllers/gaugeController');
const router = express.Router();

router.get('/gauges', gaugeController.list);
module.exports = router;
```

```typescript
// frontend/src/modules/gauge/components/GaugeList.tsx
import { useEffect, useState } from 'react';
import { gaugeApi } from '../services/gaugeApi';

export function GaugeList() {
  // Just normal React component
}
```

## Implementation Order

1. **Set up basic apps**
   - Create backend/ with Express app
   - Create frontend/ with React app
   - Connect to existing erp-core
   
2. **Build gauge functionality**
   - Create backend/src/modules/gauge/ folders
   - Create frontend/src/modules/gauge/ folders  
   - Move gauge logic into organized structure
   
3. **Wire it up**
   - Import gauge routes in main app
   - Import gauge components in main app
   - Test end-to-end functionality

4. **Improve as needed**
   - Extract patterns when we actually have them
   - Add abstractions when they provide real value
   - Document what we learned

## Benefits of This Structure

1. **Simple** - Just folders and normal imports/requires
2. **Organized** - Related code grouped together
3. **Familiar** - Standard Node.js and React patterns
4. **Buildable** - Can start coding immediately
5. **Growable** - Easy to add more "modules" (folders) later

## What Changed in v3.2

### Removed Framework Complexity
- **No manifest.json** - Code is self-documenting
- **No dependency injection** - Normal imports work fine
- **No module discovery** - Just require what you need
- **No runtime loading** - Keep it simple

### Back to Basics
- **modules/** is just folder organization
- Use standard Node.js/React patterns
- Focus on building gauge tracker, not framework
- Extract patterns from real code when needed

### Reality Check
- We have ONE module to build
- Don't solve problems we don't have
- Build working software, not architecture demos

## Next Steps

1. Review and approve v3.2 structure
2. Set up basic backend and frontend apps
3. Build gauge functionality in organized folders
4. Get working end-to-end gauge tracking
5. Learn from real code before adding abstractions

## Important Context - Read This First

This document emphasizes **implementation simplicity**, but the system still requires true modularity per business requirements:
- Runtime module enable/disable (customer requirement from Modular-Vision.txt)
- Module self-registration (for plug-and-play modules)
- Dynamic loading based on configuration

**How to interpret this document**:
- The "no framework" principle means don't build a COMPLEX module framework
- The "no manifest files" means keep module descriptors MINIMAL and FOCUSED
- The "just folders" approach applies to code organization, not module loading

**The right balance**:
```typescript
// YES - Simple module descriptor (not a complex manifest)
export default {
  id: 'gauge-tracking',
  name: 'Gauge Tracking',
  routes: gaugeRoutes,
  navigation: gaugeNavItems
};

// NO - Over-engineered framework
export default new ModuleBuilder()
  .withDependencyInjection()
  .withComplexLifecycle()
  .withAbstractFactories()
  .build();
```

**Use this document alongside Modular-Vision.txt**:
- Modular-Vision.txt = WHAT to build (requirements)
- This document = HOW to build it (keep it simple)

## Why This Works

**Right Now**:
- No complexity overhead
- Standard patterns everyone knows
- Can start building immediately
- Organized but not over-engineered

**Later When We Add More Modules**:
- We'll have real code to extract patterns from
- We'll know what abstractions actually help
- We'll understand the real problems to solve
- We won't have premature framework baggage

**The Key**: Meet the modularity requirements from Modular-Vision.txt using the simplest possible implementation
