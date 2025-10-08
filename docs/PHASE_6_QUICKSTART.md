# Phase 6 Quick Start Guide

## 🚀 Getting Started with Phase 6

Welcome to Phase 6 of LogoMorph! This guide will help you start implementing advanced features immediately.

---

## Prerequisites Checklist

Before starting Phase 6, ensure you have completed:

- [x] **Phase 1**: MVP with basic logo upload and variant generation
- [x] **Phase 2**: AI background generation
- [x] **Phase 3**: Interactive editor
- [x] **Phase 4**: API and user management with Clerk
- [x] **Phase 5**: Production infrastructure and monitoring

### Environment Setup

```bash
# Verify your current setup
cd /Users/giuseppe/Documents/github/foreguards/LogoMorph

# Check backend is running
cd apps/backend
bun --hot index.ts

# In another terminal, check frontend
cd apps/frontend
bunx next dev

# Verify Convex is set up
# Check that convex/ directory exists and is deployed
```

---

## Week 17: Advanced Editing Features - Day 1

### Morning (9:00 AM - 12:00 PM): Path Editor Foundation

#### Step 1: Create Path Editor Service (1 hour)

```bash
# Create the editor services directory
mkdir -p apps/backend/src/services/editor

# Create initial files
touch apps/backend/src/services/editor/pathEditor.ts
touch apps/backend/src/services/editor/pathValidator.ts
touch apps/backend/src/services/editor/pathTransformer.ts
```

**File: `apps/backend/src/services/editor/pathEditor.ts`**

Create a service for parsing and manipulating SVG paths:

```typescript
// Path point interface
interface PathPoint {
  x: number;
  y: number;
  type: 'M' | 'L' | 'C' | 'Q' | 'Z';
  controlPoints?: { x: number; y: number }[];
}

// Parsed path interface
interface ParsedPath {
  id: string;
  d: string;
  points: PathPoint[];
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * Parse SVG path string into structured data
 * Option 1: Use svg-path-parser library (pros: reliable; cons: dependency)
 * Option 2: Custom regex parser (pros: no deps; cons: more complex)
 * Chosen: Custom parser for learning and control
 */
export class PathEditor {
  parsePath(pathString: string): ParsedPath {
    // Implementation
  }

  updatePoint(pathId: string, pointIndex: number, newX: number, newY: number): ParsedPath {
    // Implementation
  }

  addPoint(pathId: string, afterIndex: number, x: number, y: number): ParsedPath {
    // Implementation
  }

  removePoint(pathId: string, pointIndex: number): ParsedPath {
    // Implementation
  }

  simplifyPath(path: ParsedPath, tolerance: number): ParsedPath {
    // Use Douglas-Peucker algorithm
  }
}
```

#### Step 2: Create Path API Routes (1 hour)

```bash
# Create API routes directory
mkdir -p apps/backend/src/api/routes/editor

# Create route file
touch apps/backend/src/api/routes/editor/pathRoutes.ts
```

**File: `apps/backend/src/api/routes/editor/pathRoutes.ts`**

```typescript
import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth';
import { validateRequest } from '../../../middleware/validation';
import { PathEditor } from '../../../services/editor/pathEditor';

const router = Router();
const pathEditor = new PathEditor();

/**
 * POST /api/editor/paths/parse
 * Parse SVG path string
 */
router.post('/parse', requireAuth, validateRequest('parsePathSchema'), async (req, res) => {
  try {
    const { pathString } = req.body;
    const parsed = pathEditor.parsePath(pathString);
    res.json({ success: true, data: parsed });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/editor/paths/:pathId/points/:pointIndex
 * Update a specific point in a path
 */
router.patch('/:pathId/points/:pointIndex', requireAuth, async (req, res) => {
  // Implementation
});

export default router;
```

#### Step 3: Frontend Path Editor Component (1 hour)

```bash
# Create editor components directory
mkdir -p apps/frontend/app/editor/components

# Create component files
touch apps/frontend/app/editor/components/PathEditor.tsx
touch apps/frontend/app/editor/components/PathPointHandle.tsx
```

**File: `apps/frontend/app/editor/components/PathEditor.tsx`**

```typescript
'use client';

import { useState, useCallback } from 'react';

interface PathPoint {
  x: number;
  y: number;
  type: string;
}

interface PathEditorProps {
  logoId: string;
  initialPath: string;
  onPathUpdate: (newPath: string) => void;
}

export default function PathEditor({ logoId, initialPath, onPathUpdate }: PathEditorProps) {
  const [points, setPoints] = useState<PathPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handlePointDrag = useCallback((pointIndex: number, newX: number, newY: number) => {
    // Update point position
    // Call API to update path
  }, []);

  return (
    <div className="path-editor">
      <div className="toolbar">
        <button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Stop Editing' : 'Edit Path'}
        </button>
      </div>

      <svg width="800" height="600" viewBox="0 0 800 600">
        {/* Render path */}
        <path d={initialPath} fill="none" stroke="black" strokeWidth="2" />

        {/* Render control points */}
        {isEditing && points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="5"
            fill={selectedPoint === index ? 'blue' : 'red'}
            onClick={() => setSelectedPoint(index)}
            style={{ cursor: 'pointer' }}
          />
        ))}
      </svg>
    </div>
  );
}
```

### Afternoon (1:00 PM - 5:00 PM): Color Extraction & Replacement

#### Step 4: Color Extractor Service (1.5 hours)

```bash
# Create color services
touch apps/backend/src/services/editor/colorExtractor.ts
touch apps/backend/src/services/editor/colorReplacer.ts
```

**File: `apps/backend/src/services/editor/colorExtractor.ts`**

```typescript
import sharp from 'sharp';

interface Color {
  hex: string;
  rgb: { r: number; g: number; b: number };
  frequency: number;
}

export class ColorExtractor {
  /**
   * Extract colors from SVG
   * Parse SVG and extract fill/stroke attributes
   */
  async extractFromSVG(svgContent: string): Promise<Color[]> {
    // Parse SVG XML
    // Extract fill and stroke colors
    // Return unique colors with frequency
  }

  /**
   * Extract colors from raster image
   * Use sharp to analyze pixel data
   */
  async extractFromImage(imagePath: string): Promise<Color[]> {
    const image = sharp(imagePath);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    // Analyze pixel data
    // Use color quantization algorithm
    // Return dominant colors
  }

  /**
   * Generate complementary color palette
   */
  generatePalette(baseColor: string, type: 'complementary' | 'analogous' | 'triadic'): Color[] {
    // Color theory algorithms
  }
}
```

#### Step 5: Color Replacement API (1 hour)

```bash
# Create color routes
touch apps/backend/src/api/routes/editor/colorRoutes.ts
```

**File: `apps/backend/src/api/routes/editor/colorRoutes.ts`**

```typescript
import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth';
import { ColorExtractor } from '../../../services/editor/colorExtractor';
import { ColorReplacer } from '../../../services/editor/colorReplacer';

const router = Router();
const colorExtractor = new ColorExtractor();
const colorReplacer = new ColorReplacer();

/**
 * GET /api/editor/colors/extract?logoId=xxx
 * Extract all colors from a logo
 */
router.get('/extract', requireAuth, async (req, res) => {
  try {
    const { logoId } = req.query;
    // Fetch logo from Convex
    // Extract colors based on format (SVG vs raster)
    const colors = await colorExtractor.extractFromSVG(logoContent);
    res.json({ success: true, colors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/editor/colors/replace
 * Replace colors in logo
 */
router.post('/replace', requireAuth, async (req, res) => {
  try {
    const { logoId, replacements } = req.body;
    // replacements: [{ from: '#ff0000', to: '#00ff00' }]
    const updatedLogo = await colorReplacer.replaceColors(logoId, replacements);
    res.json({ success: true, data: updatedLogo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

#### Step 6: Color Picker UI Component (1.5 hours)

```bash
# Create color components
touch apps/frontend/app/editor/components/ColorPicker.tsx
touch apps/frontend/app/editor/components/PaletteManager.tsx
```

**File: `apps/frontend/app/editor/components/ColorPicker.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Color {
  hex: string;
  rgb: { r: number; g: number; b: number };
}

interface ColorPickerProps {
  logoId: string;
  onColorReplace: (from: string, to: string) => void;
}

export default function ColorPicker({ logoId, onColorReplace }: ColorPickerProps) {
  const [colors, setColors] = useState<Color[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [newColor, setNewColor] = useState<string>('#000000');

  useEffect(() => {
    // Fetch colors from API
    fetch(`/api/editor/colors/extract?logoId=${logoId}`)
      .then(res => res.json())
      .then(data => setColors(data.colors));
  }, [logoId]);

  const handleReplace = () => {
    if (selectedColor) {
      onColorReplace(selectedColor, newColor);
    }
  };

  return (
    <div className="color-picker p-4">
      <h3 className="font-bold mb-4">Logo Colors</h3>

      <div className="color-grid grid grid-cols-4 gap-2 mb-4">
        {colors.map((color, index) => (
          <div
            key={index}
            className={`color-swatch w-12 h-12 rounded cursor-pointer border-2 ${
              selectedColor === color.hex ? 'border-blue-500' : 'border-gray-300'
            }`}
            style={{ backgroundColor: color.hex }}
            onClick={() => setSelectedColor(color.hex)}
          />
        ))}
      </div>

      {selectedColor && (
        <div className="replacement-controls">
          <p className="text-sm mb-2">Replace {selectedColor} with:</p>
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-full h-10 mb-2"
          />
          <button
            onClick={handleReplace}
            className="bg-blue-500 text-white px-4 py-2 rounded w-full"
          >
            Replace Color
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Daily Checklist Template

Copy this for each day of Phase 6:

```markdown
# Day X Checklist - [Feature Name]

## Morning (9:00 AM - 12:00 PM)

- [ ] Create backend services/utilities
- [ ] Write unit tests for new services
- [ ] Create API routes
- [ ] Test API endpoints with Swagger/Postman

## Afternoon (1:00 PM - 5:00 PM)

- [ ] Create frontend components
- [ ] Connect components to API
- [ ] Add loading and error states
- [ ] Manual testing in browser

## Evening (Optional - 6:00 PM - 8:00 PM)

- [ ] Write integration tests
- [ ] Update documentation
- [ ] Code review and refactoring
- [ ] Plan tomorrow's tasks

## Blockers

- List any issues or questions

## Notes

- Important decisions or learnings
```

---

## Commands Reference

### Backend Development

```bash
# Start backend with hot reload
cd apps/backend
bun --hot index.ts

# Run backend tests
bun test

# Type check
bun typecheck

# Lint
bun lint
```

### Frontend Development

```bash
# Start frontend dev server
cd apps/frontend
bunx next dev

# Build for production
bunx next build

# Type check
bun typecheck
```

### Database (Convex)

```bash
# Deploy schema changes
bunx convex deploy

# Open Convex dashboard
bunx convex dashboard

# Run Convex function
bunx convex run functionName
```

---

## Integration Points

### Convex Schema Updates

When adding new features, you'll need to update the Convex schema:

```bash
# Location: convex/schema.ts

# After making changes, deploy:
cd /Users/giuseppe/Documents/github/foreguards/LogoMorph
bunx convex deploy
```

### API Documentation

Update Swagger documentation after creating new endpoints:

```bash
# Location: apps/backend/src/config/swagger.ts
# Swagger UI available at: http://localhost:3001/api-docs
```

---

## Testing Strategy for Each Feature

### 1. Unit Tests

```typescript
// Example: apps/backend/src/services/editor/__tests__/pathEditor.test.ts
import { test, expect } from 'bun:test';
import { PathEditor } from '../pathEditor';

test('PathEditor parses simple path', () => {
  const editor = new PathEditor();
  const result = editor.parsePath('M 0 0 L 10 10');
  expect(result.points).toHaveLength(2);
});
```

### 2. API Integration Tests

```typescript
// Test API endpoints
test('POST /api/editor/paths/parse returns parsed path', async () => {
  const response = await fetch('http://localhost:3001/api/editor/paths/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pathString: 'M 0 0 L 10 10' }),
  });
  const data = await response.json();
  expect(data.success).toBe(true);
});
```

### 3. Frontend Component Tests

```typescript
// apps/frontend/app/editor/components/__tests__/PathEditor.test.tsx
import { render, screen } from '@testing-library/react';
import PathEditor from '../PathEditor';

test('PathEditor renders toolbar', () => {
  render(<PathEditor logoId="test" initialPath="M 0 0" onPathUpdate={() => {}} />);
  expect(screen.getByText('Edit Path')).toBeInTheDocument();
});
```

---

## Debugging Tips

### Backend Debugging

```typescript
// Add debug logging
console.log('[DEBUG]', { variable, timestamp: Date.now() });

// Use Bun's built-in debugger
// Set breakpoints in VS Code
```

### Frontend Debugging

```typescript
// React DevTools for component inspection
// Network tab for API calls
// Console for errors

// Add debugging hooks
useEffect(() => {
  console.log('[PathEditor] State changed:', { points, selectedPoint });
}, [points, selectedPoint]);
```

### Convex Debugging

```bash
# View logs in Convex dashboard
bunx convex dashboard

# Test queries directly
bunx convex run logos:list
```

---

## Performance Optimization Checklist

As you build features, keep these in mind:

- [ ] **Debounce expensive operations** (e.g., path updates, color extraction)
- [ ] **Implement caching** for frequently accessed data
- [ ] **Use React.memo** for expensive components
- [ ] **Optimize bundle size** - code split large features
- [ ] **Lazy load** components that aren't immediately needed
- [ ] **Use Web Workers** for CPU-intensive operations (path simplification)
- [ ] **Implement pagination** for lists (templates, comments, versions)
- [ ] **Add loading skeletons** for better perceived performance

---

## Communication & Progress Tracking

### Daily Standup Template

Answer these three questions each day:

1. **What did I complete yesterday?**
2. **What will I work on today?**
3. **Any blockers or questions?**

### Weekly Review

At the end of each week:

1. Review completed tasks vs. planned
2. Update PHASE_6_PLAN.md checkboxes
3. Document any architectural decisions
4. Plan next week's priorities
5. Update documentation

---

## Getting Help

### Resources

- **Bun Documentation**: https://bun.sh/docs
- **Next.js 15 Docs**: https://nextjs.org/docs
- **Convex Docs**: https://docs.convex.dev
- **Clerk Docs**: https://clerk.com/docs
- **Sharp (Image Processing)**: https://sharp.pixelplumbing.com

### Common Issues

**Issue**: TypeScript errors after creating new files
**Solution**: Run `bun typecheck` and fix type errors incrementally

**Issue**: API not responding
**Solution**: Check backend is running (`bun --hot index.ts`) and check logs

**Issue**: Convex schema changes not applying
**Solution**: Run `bunx convex deploy` and check dashboard for errors

**Issue**: Frontend not hot-reloading
**Solution**: Restart Next.js dev server, clear `.next` cache

---

## Ready to Start? 🎯

Your first task is to create the **Path Editor Foundation** (Steps 1-3 above).

1. Create the backend service files
2. Implement the `PathEditor` class
3. Create API routes
4. Build the frontend component
5. Test end-to-end

**Estimated time**: 3-4 hours

Once that's working, move on to the Color Extractor (Steps 4-6).

Good luck with Phase 6! Remember:

- Follow the 300 LOC limit per file
- Write tests as you go
- Document design decisions
- Ask questions when stuck

Let me know when you're ready to start, or if you need clarification on any part!
