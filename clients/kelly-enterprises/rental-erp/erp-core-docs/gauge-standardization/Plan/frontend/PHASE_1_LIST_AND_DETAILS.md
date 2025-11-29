# Phase 1: Enhanced Gauge List & Details

**Date**: 2025-10-26
**Status**: Not Started
**Dependencies**: Phase 0 (type extensions, service methods)
**Architectural Approach**: ENHANCE existing + CREATE minimal new

---

## Overview

Make existing GaugeList companion-aware and create minimal SetDetailsPage. Simple React state, inline logic.

**Simplicity First**: Inline set detection logic in existing GaugeList. No global state needed.

---

## 1. Enhance Gauge List

**Location**: `/frontend/src/modules/gauge/pages/GaugeList.tsx` (**ENHANCE**)

**Changes**:
1. Add set detection logic (inline)
2. Conditional rendering for sets vs unpaired
3. Navigation to Set Details

```typescript
// GaugeList.tsx - ENHANCE existing page
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GaugeStatusBadge } from '../../../infrastructure/components';

const GaugeList = () => {
  const [gauges, setGauges] = useState<Gauge[]>([]);
  // ... existing state and hooks (keep unchanged) ...

  // ➕ ADD: Group gauges into sets and unpaired
  const displayItems = useMemo(() => {
    const sets = new Map<string, Gauge[]>();
    const unpaired: Gauge[] = [];

    gauges.forEach(gauge => {
      if (gauge.companion_gauge_id) {
        // Part of a set - group by base ID
        const baseId = gauge.gaugeId.replace(/[AB]$/, '');
        if (!sets.has(baseId)) sets.set(baseId, []);
        sets.get(baseId)!.push(gauge);
      } else {
        // Unpaired gauge
        unpaired.push(gauge);
      }
    });

    return { sets: Array.from(sets.entries()), unpaired };
  }, [gauges]);

  return (
    <div>
      {/* ➕ ADD: Render sets */}
      {displayItems.sets.map(([setId, gaugeList]) => {
        const goGauge = gaugeList.find(g => g.gauge_suffix === 'A');
        const nogoGauge = gaugeList.find(g => g.gauge_suffix === 'B');

        return (
          <Link key={setId} to={`/gauges/sets/${setId}`} className="gauge-row">
            <div className="gauge-id">
              🔗 {setId}
              <span className="set-label">SET</span>
            </div>
            <div className="status">
              {goGauge?.status === nogoGauge?.status ? (
                <GaugeStatusBadge status={goGauge.status} />
              ) : (
                <>
                  <GaugeStatusBadge status={goGauge?.status} label="GO" size="sm" />
                  <GaugeStatusBadge status={nogoGauge?.status} label="NO GO" size="sm" />
                </>
              )}
            </div>
            {/* ... other columns ... */}
          </Link>
        );
      })}

      {/* ✅ KEEP: Render unpaired (existing logic) */}
      {displayItems.unpaired.map(gauge => (
        <GaugeRow key={gauge.id} gauge={gauge} />
      ))}
    </div>
  );
};
```

---

## 2. Create Set Details Page

**Location**: `/frontend/src/modules/gauge/pages/SetDetailsPage.tsx` (**CREATE**)

**Simple self-contained page with inline logic**:

```typescript
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { gaugeService } from '../services/gaugeService';
import { GaugeStatusBadge, BackButton, Button } from '../../../infrastructure/components';

const SetDetailsPage = () => {
  const { setId } = useParams();
  const navigate = useNavigate();

  const [goGauge, setGoGauge] = useState<Gauge | null>(null);
  const [nogoGauge, setNogoGauge] = useState<Gauge | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch both gauges on mount
  useEffect(() => {
    const fetchSet = async () => {
      setIsLoading(true);
      try {
        const goData = await gaugeService.getById(`${setId}A`);
        setGoGauge(goData);

        const nogoData = await gaugeService.getById(`${setId}B`);
        setNogoGauge(nogoData);
      } catch (error) {
        console.error('Failed to fetch set', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSet();
  }, [setId]);

  if (isLoading) return <div>Loading...</div>;
  if (!goGauge || !nogoGauge) return <div>Set not found</div>;

  const isCustomerOwned = goGauge.ownershipType === 'customer';

  return (
    <div className="set-details-page">
      <header>
        <BackButton onClick={() => navigate('/gauges')} />
        <h1>🔗 {setId}</h1>
        {goGauge.status === nogoGauge.status ? (
          <GaugeStatusBadge status={goGauge.status} />
        ) : (
          <>
            <GaugeStatusBadge status={goGauge.status} label="GO" />
            <GaugeStatusBadge status={nogoGauge.status} label="NO GO" />
          </>
        )}
      </header>

      <section className="shared-info">
        <h2>Set Information</h2>
        <div>Thread Size: {goGauge.threadSize}</div>
        <div>Thread Class: {goGauge.threadClass}</div>
        <div>Equipment Type: {goGauge.equipmentType}</div>
        <div>Category: {goGauge.categoryName}</div>
        {isCustomerOwned && <div>Customer: {goGauge.customerName}</div>}
      </section>

      <div className="gauge-columns">
        <div className="gauge-column">
          <h3>GO Gauge (A)</h3>
          <Link to={`/gauges/${goGauge.id}`}>View Details →</Link>
          <div>Gauge ID: {goGauge.gaugeId}</div>
          <div>Location: {goGauge.storageLocation}</div>
          <GaugeStatusBadge status={goGauge.status} />
        </div>

        <div className="gauge-column">
          <h3>NO GO Gauge (B)</h3>
          <Link to={`/gauges/${nogoGauge.id}`}>View Details →</Link>
          <div>Gauge ID: {nogoGauge.gaugeId}</div>
          <div>Location: {nogoGauge.storageLocation}</div>
          <GaugeStatusBadge status={nogoGauge.status} />
        </div>
      </div>

      {!isCustomerOwned && (
        <div className="actions">
          <Button onClick={() => {/* open unpair modal */}}>Unpair Set</Button>
          <Button onClick={() => {/* open replace modal */}}>Replace Gauge</Button>
        </div>
      )}
    </div>
  );
};

export default SetDetailsPage;
```

---

## 3. Enhance Gauge Details Page

**Location**: `/frontend/src/modules/gauge/pages/GaugeDetailsPage.tsx` (**ENHANCE**)

**Changes**: Add navigation controls and companion awareness

```typescript
// GaugeDetailsPage.tsx - ENHANCE existing page
import { BackButton } from '../../../infrastructure/components';

const GaugeDetailsPage = () => {
  const { id } = useParams();
  const [gauge, setGauge] = useState<Gauge | null>(null);
  const [companion, setCompanion] = useState<Gauge | null>(null);

  useEffect(() => {
    const fetchGauge = async () => {
      const data = await gaugeService.getById(id);
      setGauge(data);

      // ➕ ADD: Fetch companion if exists
      if (data.companion_gauge_id) {
        const companionData = await gaugeService.getCompanionGauge(data.id);
        setCompanion(companionData);
      }
    };

    fetchGauge();
  }, [id]);

  if (!gauge) return <div>Loading...</div>;

  const baseId = gauge.gaugeId.replace(/[AB]$/, '');
  const isPaired = !!gauge.companion_gauge_id;

  return (
    <div className="gauge-details-page">
      {/* ➕ ADD: Navigation controls */}
      <header>
        {isPaired ? (
          <BackButton onClick={() => navigate(`/gauges/sets/${baseId}`)} />
        ) : (
          <BackButton onClick={() => navigate('/gauges')} />
        )}
        <h1>{gauge.gaugeId}</h1>
        <GaugeStatusBadge status={gauge.status} />
      </header>

      {/* ➕ ADD: Set relationship section */}
      {isPaired && companion && (
        <section className="set-relationship">
          <h2>Set Information</h2>
          <div>Part of set <Link to={`/gauges/sets/${baseId}`}>{baseId}</Link></div>
          <div>
            Companion: {gauge.gaugeType === 'GO' ? 'NO GO' : 'GO'} Gauge
            <Link to={`/gauges/${companion.id}`}>{companion.gaugeId}</Link>
          </div>
        </section>
      )}

      {/* ... existing details sections (keep unchanged) ... */}
    </div>
  );
};
```

---

## Implementation Checklist

- [ ] Add set detection logic to GaugeList.tsx
- [ ] Add set rendering to GaugeList.tsx
- [ ] Create SetDetailsPage.tsx
- [ ] Enhance GaugeDetailsPage.tsx with companion awareness

---

## File Count

**Files Modified**: 2
- `pages/GaugeList.tsx` - ENHANCE
- `pages/GaugeDetailsPage.tsx` - ENHANCE

**Files Created**: 1
- `pages/SetDetailsPage.tsx` - CREATE

**Total**: 3 files (vs. original plan: 5 files + separate components)

**Estimated LOC**: ~300 lines total

---

**Maintained By**: Claude Code SuperClaude Framework
**Last Updated**: 2025-10-26
