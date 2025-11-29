# User Zustand Store - Implementation Plan

**Project**: Fire-Proof ERP Sandbox
**Branch**: `development-core`
**Estimated Time**: 45 minutes
**Status**: Ready for implementation

---

## 🎯 Problem

The user module has a **non-reactive Zustand placeholder** that uses `Object.assign()` instead of Zustand's `create()`. This means state changes don't trigger component re-renders.

---

## ✅ Solution

Simple 3-step fix that leverages all existing architecture (UserContext, userService, events):

1. **Backend**: Add 5 preference columns to `users` table + 2 endpoints
2. **Frontend**: Replace placeholder with real Zustand store (3 actions)
3. **Test**: Login → profile loads, settings persist, reload works

---

## 📖 Implementation Guide

**See**: `IMPLEMENTATION_PLAN.md` for complete step-by-step instructions.

---

## ⏱️ Time Breakdown

- **Backend**: 30 minutes (migration + 2 routes)
- **Frontend**: 10 minutes (fix Zustand store)
- **Testing**: 5 minutes (verify it works)
- **Total**: 45 minutes

---

## 🚀 Quick Start

```bash
# 1. Run database migration
mysql -h localhost -P 3307 -u root -p fai_db_sandbox < backend/migrations/007_user_preferences_simple.sql

# 2. Add routes to backend/src/modules/user/routes/user.js
# (see IMPLEMENTATION_PLAN.md for code)

# 3. Fix Zustand store in frontend/src/infrastructure/store/index.ts
# (replace placeholder lines 494-546)

# 4. Restart backend
docker-compose restart backend

# 5. Test in browser
# Login → Profile loads → Settings persist → Reload works ✅
```

---

## ✅ Success Criteria

- ✅ User profile loads automatically on login
- ✅ Preferences persist across sessions
- ✅ Theme applies from user preferences
- ✅ State survives page reload
- ✅ Settings page functional
- ✅ No console errors

---

## 📁 Files

- `README.md` - This file (overview)
- `IMPLEMENTATION_PLAN.md` - Complete step-by-step guide (45 minutes)
- `reference/` - Comprehensive approach docs (optional, not needed for basic fix)

---

## 🔑 Key Principle

**YAGNI (You Aren't Gonna Need It)**: We're not building a separate preferences table, complex state management, or React Query caching. We're fixing the placeholder to make it reactive. That's all that's needed.

---

Ready to implement? Open `IMPLEMENTATION_PLAN.md` and follow the steps.
