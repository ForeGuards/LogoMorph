# Convex to Supabase Migration Guide

## Overview

This document outlines the steps required to migrate LogoMorph from Convex to Supabase as the primary database.

**Status**: Convex has been removed from the codebase. All database operations are currently stubbed with TODO comments.

---

## What Was Removed

### ✅ Completed Removals

1. **Convex Directory** (`/convex/`)
   - Schema definitions
   - All Convex functions (mutations, queries, actions)
   - Generated API types

2. **Convex Package** 
   - Removed from `apps/backend/package.json`
   - All `ConvexHttpClient` imports removed

3. **Environment Variables**
   - `CONVEX_URL` removed from `.env.example`
   - `CONVEX_DEPLOYMENT` removed

4. **Code References**
   - All controllers updated with Supabase TODOs
   - All services updated with Supabase TODOs
   - Middleware updated with Supabase TODOs

---

## Database Schema Migration

### Original Convex Schema

The following tables need to be recreated in Supabase:

#### 1. **users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  clerk_org_id TEXT,
  email TEXT NOT NULL,
  tier TEXT,
  quota_used INTEGER DEFAULT 0,
  quota_limit INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX idx_users_clerk_org_id ON users(clerk_org_id);
```

#### 2. **logos**
```sql
CREATE TABLE logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  clerk_org_id TEXT,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  format TEXT NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logos_clerk_user_id ON logos(clerk_user_id);
CREATE INDEX idx_logos_clerk_org_id ON logos(clerk_org_id);
CREATE INDEX idx_logos_created_at ON logos(created_at DESC);
```

#### 3. **jobs**
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  logo_id UUID REFERENCES logos(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  options JSONB,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_clerk_user_id ON jobs(clerk_user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_logo_id ON jobs(logo_id);
```

#### 4. **presets**
```sql
CREATE TABLE presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  category TEXT,
  description TEXT,
  settings JSONB NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  clerk_user_id TEXT,
  clerk_org_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_presets_clerk_user_id ON presets(clerk_user_id);
CREATE INDEX idx_presets_is_system ON presets(is_system);
CREATE INDEX idx_presets_is_public ON presets(is_public) WHERE is_public = TRUE;
```

#### 5. **generated_assets**
```sql
CREATE TABLE generated_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  preset_id UUID REFERENCES presets(id),
  storage_path TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  format TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generated_assets_job_id ON generated_assets(job_id);
```

#### 6. **api_keys**
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  permissions TEXT[] NOT NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_clerk_user_id ON api_keys(clerk_user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(prefix);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
```

#### 7. **webhooks**
```sql
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  failure_count INTEGER DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_clerk_user_id ON webhooks(clerk_user_id);
CREATE INDEX idx_webhooks_active ON webhooks(active);
```

#### 8. **webhook_logs**
```sql
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  response JSONB,
  status_code INTEGER,
  success BOOLEAN NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
```

#### 9. **usage_logs**
```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_clerk_user_id ON usage_logs(clerk_user_id);
CREATE INDEX idx_usage_logs_action ON usage_logs(action);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at DESC);
```

---

## Code Migration Checklist

### 1. **Install Supabase**

```bash
cd apps/backend
bun add @supabase/supabase-js
```

### 2. **Environment Variables**

Add to `.env`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For backend only
```

### 3. **Create Supabase Client**

Create `apps/backend/src/config/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Use service role for backend
);
```

### 4. **Update Controllers**

All controllers have been marked with `// TODO:` comments. Search for these and replace with Supabase queries:

**Example - Upload Controller:**
```typescript
// OLD (Convex):
const logoId = await convex.mutation(api.logos.createLogo, {...});

// NEW (Supabase):
const { data: logo, error } = await supabase
  .from('logos')
  .insert({
    clerk_user_id: userId,
    filename: file.name,
    storage_path: uploadResult.path,
    storage_url: uploadResult.url,
    format: file.mimetype === 'image/svg+xml' ? 'svg' : 'png',
    metadata: {...}
  })
  .select()
  .single();

if (error) throw error;
const logoId = logo.id;
```

### 5. **Files to Update**

Search for `// TODO:` in these files:

#### Controllers
- `apps/backend/src/api/controllers/uploadController.ts`
- `apps/backend/src/api/controllers/presetController.ts`
- `apps/backend/src/api/controllers/apiKeyController.ts`

#### Middleware
- `apps/backend/src/middleware/apiKeyAuth.ts`

#### Services
- `apps/backend/src/services/webhookService.ts`
- `apps/backend/src/services/health/healthCheck.ts`

#### Workers
- `apps/backend/src/workers/variantsWorker.ts`

### 6. **Row Level Security (RLS)**

Enable RLS on all tables and create policies:

```sql
-- Example for logos table
ALTER TABLE logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logos"
  ON logos FOR SELECT
  USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert their own logos"
  ON logos FOR INSERT
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete their own logos"
  ON logos FOR DELETE
  USING (clerk_user_id = auth.jwt() ->> 'sub');
```

### 7. **Real-time Subscriptions (Optional)**

If you want real-time updates:

```typescript
const subscription = supabase
  .channel('logos')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'logos' },
    (payload) => {
      console.log('New logo:', payload.new);
    }
  )
  .subscribe();
```

---

## Testing Checklist

After migration, test:

- [ ] Logo upload and storage
- [ ] Logo listing and retrieval
- [ ] Logo deletion
- [ ] Preset CRUD operations
- [ ] API key generation and validation
- [ ] Webhook creation and delivery
- [ ] Job processing
- [ ] Health checks

---

## Rollback Plan

If issues arise:

1. Restore Convex directory from git history
2. Reinstall Convex package: `bun add convex`
3. Restore environment variables
4. Revert code changes

---

## Benefits of Supabase

1. **PostgreSQL** - Industry-standard relational database
2. **Row Level Security** - Built-in authorization
3. **Real-time** - WebSocket subscriptions
4. **Storage** - Built-in file storage (can replace S3/MinIO)
5. **Auth** - Can replace Clerk if needed
6. **Edge Functions** - Serverless functions
7. **Dashboard** - Better admin UI than Convex

---

## Next Steps

1. Set up Supabase project at https://supabase.com
2. Run SQL migrations to create tables
3. Update environment variables
4. Replace all `// TODO:` comments with Supabase code
5. Test thoroughly
6. Deploy

---

## Support

For questions or issues during migration, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
