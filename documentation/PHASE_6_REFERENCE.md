# Phase 6 - Quick Reference Card

**Keep this handy during development!**

---

## 📁 File Structure Quick Reference

### Backend Services

```
apps/backend/src/services/
├── editor/              # NEW - Phase 6
│   ├── pathEditor.ts
│   ├── pathValidator.ts
│   ├── pathTransformer.ts
│   ├── colorExtractor.ts
│   ├── colorReplacer.ts
│   ├── paletteGenerator.ts
│   ├── effectsProcessor.ts
│   ├── maskEngine.ts
│   └── batchProcessor.ts
├── collaboration/       # NEW - Phase 6
│   ├── commentManager.ts
│   ├── annotationManager.ts
│   ├── versionManager.ts
│   ├── approvalManager.ts
│   └── websocketManager.ts
└── analytics/          # NEW - Phase 6
    ├── eventTracker.ts
    ├── metricsCalculator.ts
    └── abtestManager.ts
```

### Backend API Routes

```
apps/backend/src/api/routes/
├── editor/             # NEW - Phase 6
│   ├── pathRoutes.ts
│   ├── colorRoutes.ts
│   └── effectsRoutes.ts
├── collaboration/      # NEW - Phase 6
│   ├── commentRoutes.ts
│   ├── versionRoutes.ts
│   └── approvalRoutes.ts
└── analytics/         # NEW - Phase 6
    └── analyticsRoutes.ts
```

### Frontend Components

```
apps/frontend/app/
├── editor/components/  # NEW - Phase 6
│   ├── PathEditor.tsx
│   ├── PathPointHandle.tsx
│   ├── ColorPicker.tsx
│   ├── PaletteManager.tsx
│   ├── EffectsPanel.tsx
│   ├── CommentSidebar.tsx
│   └── VersionHistory.tsx
├── marketplace/        # NEW - Phase 6
│   ├── page.tsx
│   └── [templateId]/page.tsx
├── team/              # NEW - Phase 6
│   ├── page.tsx
│   └── settings/page.tsx
└── analytics/         # NEW - Phase 6
    └── page.tsx
```

---

## 🔧 Essential Commands

### Development

```bash
# Start backend (with hot reload)
cd /Users/giuseppe/Documents/github/foreguards/LogoMorph/apps/backend
bun --hot index.ts

# Start frontend
cd /Users/giuseppe/Documents/github/foreguards/LogoMorph/apps/frontend
bunx next dev

# Backend runs on: http://localhost:3001
# Frontend runs on: http://localhost:3000
# Swagger docs: http://localhost:3001/api-docs
```

### Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test path/to/test.test.ts

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

### Type Checking & Linting

```bash
# Type check backend
cd apps/backend && bun typecheck

# Type check frontend
cd apps/frontend && bun typecheck

# Lint
bun lint

# Fix lint errors
bun lint --fix
```

### Convex (Database)

```bash
# Deploy schema changes
bunx convex deploy

# Open dashboard
bunx convex dashboard

# Run function
bunx convex run <functionName>

# View logs
bunx convex logs
```

### Git

```bash
# Create feature branch
git checkout -b feature/phase6-path-editor

# Commit with conventional commits
git commit -m "feat: add path editor service"
git commit -m "fix: correct color extraction bug"
git commit -m "docs: update API documentation"

# Push branch
git push origin feature/phase6-path-editor
```

---

## 🎨 Code Templates

### Backend Service Template

```typescript
// apps/backend/src/services/editor/exampleService.ts

/**
 * ExampleService - Brief description
 *
 * Option 1: Approach A (pros: X; cons: Y)
 * Option 2: Approach B (pros: X; cons: Y)
 * Chosen: Approach A for reason Z
 */

interface ExampleInput {
  // Input types
}

interface ExampleOutput {
  // Output types
}

export class ExampleService {
  /**
   * Main method description
   */
  async processExample(input: ExampleInput): Promise<ExampleOutput> {
    try {
      // Implementation

      return {
        // Result
      };
    } catch (error) {
      console.error('[ExampleService]', error);
      throw new Error(`Failed to process: ${error.message}`);
    }
  }
}

// Keep file under 300 LOC!
```

### API Route Template

```typescript
// apps/backend/src/api/routes/editor/exampleRoutes.ts

import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth';
import { validateRequest } from '../../../middleware/validation';
import { ExampleService } from '../../../services/editor/exampleService';

const router = Router();
const service = new ExampleService();

/**
 * @swagger
 * /api/example:
 *   post:
 *     summary: Example endpoint
 *     tags: [Editor]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const result = await service.processExample(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
```

### Frontend Component Template

```typescript
// apps/frontend/app/editor/components/ExampleComponent.tsx

'use client';

import { useState, useEffect } from 'react';

interface ExampleProps {
  propA: string;
  propB: number;
  onAction: (data: any) => void;
}

export default function ExampleComponent({
  propA,
  propB,
  onAction
}: ExampleProps) {
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Effect logic
  }, [propA, propB]);

  const handleAction = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: state })
      });

      const result = await response.json();

      if (result.success) {
        onAction(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="example-component">
      {/* Component UI */}
    </div>
  );
}
```

### Test Template

```typescript
// apps/backend/src/services/editor/__tests__/exampleService.test.ts

import { test, expect, describe } from 'bun:test';
import { ExampleService } from '../exampleService';

describe('ExampleService', () => {
  const service = new ExampleService();

  test('should process valid input', async () => {
    const input = {
      /* test data */
    };
    const result = await service.processExample(input);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  test('should handle invalid input', async () => {
    const input = {
      /* invalid data */
    };

    expect(() => service.processExample(input)).toThrow();
  });
});
```

---

## 📊 API Endpoints Quick Reference

### Path Editing

- `POST /api/editor/paths/parse` - Parse SVG path
- `PATCH /api/editor/paths/:pathId/points/:pointIndex` - Update point
- `POST /api/editor/paths/simplify` - Simplify path

### Color Management

- `GET /api/editor/colors/extract?logoId=:id` - Extract colors
- `POST /api/editor/colors/replace` - Replace colors
- `POST /api/editor/colors/palette` - Generate palette

### Effects

- `POST /api/editor/effects/shadow` - Apply shadow
- `POST /api/editor/effects/glow` - Apply glow
- `POST /api/editor/effects/blur` - Apply blur

### Templates

- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `GET /api/templates/:id` - Get template
- `DELETE /api/templates/:id` - Delete template

### Collaboration

- `POST /api/comments` - Create comment
- `GET /api/comments?logoId=:id` - Get comments
- `POST /api/versions` - Create version
- `GET /api/versions?logoId=:id` - Get versions

### Analytics

- `POST /api/analytics/track` - Track event
- `GET /api/analytics/metrics` - Get metrics

---

## 🐛 Common Issues & Solutions

### TypeScript Errors

```bash
# Clear cache and rebuild
rm -rf node_modules .next
bun install
bun typecheck
```

### Hot Reload Not Working

```bash
# Restart dev servers
# Backend: Ctrl+C then bun --hot index.ts
# Frontend: Ctrl+C then bunx next dev
```

### Convex Schema Issues

```bash
# Re-deploy schema
bunx convex deploy

# Check for errors in dashboard
bunx convex dashboard
```

### Path Not Found (404)

```bash
# Check route is registered in main server file
# Verify middleware order
# Check auth token is being sent
```

### CORS Errors

```bash
# Check CORS middleware configuration
# Verify frontend URL is in allowed origins
# Check credentials are being sent
```

---

## 📝 Commit Message Convention

```bash
# Format: <type>(<scope>): <subject>

# Types:
feat     # New feature
fix      # Bug fix
docs     # Documentation
style    # Formatting
refactor # Code refactoring
test     # Tests
chore    # Maintenance

# Examples:
git commit -m "feat(editor): add path editor service"
git commit -m "fix(colors): correct extraction for transparent images"
git commit -m "docs(api): update path editing endpoints"
git commit -m "test(editor): add color extractor tests"
```

---

## 🎯 Daily Workflow

### Morning (Start of Day)

1. ✅ Pull latest changes: `git pull origin main`
2. ✅ Check PHASE_6_STATUS.md for today's tasks
3. ✅ Start backend: `bun --hot index.ts`
4. ✅ Start frontend: `bunx next dev`
5. ✅ Open Swagger docs: `http://localhost:3001/api-docs`

### During Development

1. ✅ Write code in small chunks
2. ✅ Test as you go (manual + automated)
3. ✅ Keep files under 300 LOC
4. ✅ Commit frequently with clear messages
5. ✅ Update STATUS file with progress

### End of Day

1. ✅ Run full test suite: `bun test`
2. ✅ Type check: `bun typecheck`
3. ✅ Lint: `bun lint`
4. ✅ Update PHASE_6_STATUS.md
5. ✅ Commit and push changes
6. ✅ Plan tomorrow's tasks

---

## 🔍 Debugging Checklist

When something breaks:

1. ✅ Check console for errors
2. ✅ Check network tab for failed requests
3. ✅ Check backend logs
4. ✅ Check Convex dashboard logs
5. ✅ Verify environment variables
6. ✅ Check TypeScript errors
7. ✅ Try clearing cache/node_modules
8. ✅ Check middleware order
9. ✅ Verify authentication token
10. ✅ Test API with curl/Postman

---

## 📞 Getting Help

### Resources

- **Bun Docs**: https://bun.sh/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Convex Docs**: https://docs.convex.dev
- **Clerk Docs**: https://clerk.com/docs
- **Sharp Docs**: https://sharp.pixelplumbing.com

### Documentation Files

- `PHASE_6_PLAN.md` - Full implementation plan
- `PHASE_6_QUICKSTART.md` - Step-by-step guide
- `PHASE_6_STATUS.md` - Progress tracker
- `PHASE_6_REFERENCE.md` - This file!

---

## 🎉 Quick Wins

When you need motivation:

- ✅ Implement one small feature completely
- ✅ Fix a bug that's been bugging you
- ✅ Write tests for existing code
- ✅ Improve documentation
- ✅ Refactor a messy file
- ✅ Optimize a slow endpoint

Remember: **Progress > Perfection** 🚀
