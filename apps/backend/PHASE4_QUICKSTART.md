# Phase 4 Quick Start Guide

## 🚀 Getting Started

### Start the Server

```bash
cd /Users/giuseppe/Documents/github/foreguards/LogoMorph/apps/backend
bun --hot src/server.ts
```

You should see:

```
🚀 Backend server listening on http://localhost:4000
📚 API Documentation: http://localhost:4000/api-docs
🔧 Health Check: http://localhost:4000/health
🎯 Phase 4: API & Platform Features - ACTIVE
```

### Access API Documentation

Open your browser to:

```
http://localhost:4000/api-docs
```

This provides interactive API documentation powered by Swagger UI.

## 🔑 Creating Your First API Key

### Step 1: Get Clerk JWT Token

Sign in to your app to get a Clerk JWT token. In development, you can extract this from browser devtools.

### Step 2: Create API Key

```bash
curl -X POST http://localhost:4000/api/api-keys \
  -H "Authorization: Bearer YOUR_CLERK_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First API Key",
    "permissions": ["read", "write"],
    "expiresIn": "90d"
  }'
```

### Step 3: Save Your Key

You'll receive a response like:

```json
{
  "message": "API key created successfully",
  "apiKey": "lm_dev_abc123xyz789...",
  "prefix": "lm_dev_abc1...xyz9",
  "warning": "Save this key securely. It will not be shown again."
}
```

**⚠️ IMPORTANT**: Save the `apiKey` value immediately! It won't be shown again.

## 📝 Using Your API Key

### Upload a Logo

```bash
curl -X POST http://localhost:4000/api/logos/upload \
  -H "X-API-Key: YOUR_API_KEY" \
  -F "file=@path/to/logo.svg"
```

### List Your Logos

```bash
curl -X GET http://localhost:4000/api/logos \
  -H "X-API-Key: YOUR_API_KEY"
```

### Create a Generation Job

```bash
curl -X POST http://localhost:4000/api/jobs \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "logoId": "YOUR_LOGO_ID",
    "type": "generate",
    "presetIds": ["preset_id_1", "preset_id_2"]
  }'
```

## 🎣 Setting Up Webhooks

### Step 1: Create Webhook (Using Clerk Auth)

```bash
curl -X POST http://localhost:4000/api/webhooks \
  -H "Authorization: Bearer YOUR_CLERK_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks",
    "events": ["job.completed", "logo.uploaded"],
    "secret": "your-webhook-secret-min-16-chars"
  }'
```

### Step 2: Implement Webhook Handler

```javascript
// Your webhook endpoint
app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const event = req.headers['x-webhook-event'];

  // Verify signature
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', 'your-webhook-secret-min-16-chars')
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  // Process event
  console.log('Event received:', event, req.body);

  // Always return 200 quickly
  res.status(200).send('OK');

  // Process async
  processWebhookAsync(event, req.body);
});
```

## 📊 Monitoring Your Usage

### List Your API Keys

```bash
curl -X GET http://localhost:4000/api/api-keys \
  -H "Authorization: Bearer YOUR_CLERK_JWT_TOKEN"
```

### Check Rate Limit Status

Rate limit info is returned in response headers:

```
RateLimit-Limit: 10
RateLimit-Remaining: 7
RateLimit-Reset: 1672531200
```

### View Webhook Logs

```bash
curl -X GET http://localhost:4000/api/webhooks/WEBHOOK_ID/logs \
  -H "Authorization: Bearer YOUR_CLERK_JWT_TOKEN"
```

## 🔒 Authentication Options

### Option 1: Clerk JWT (Web App)

- Automatic with Clerk SDK
- Best for user-facing features
- Full access to all features

```bash
curl -X GET http://localhost:4000/api/logos \
  -H "Authorization: Bearer YOUR_CLERK_JWT_TOKEN"
```

### Option 2: API Key (Programmatic)

- Manual key management
- Best for server-to-server
- Permission-based access

```bash
curl -X GET http://localhost:4000/api/logos \
  -H "X-API-Key: YOUR_API_KEY"
```

## 🎯 Rate Limits by Tier

### Free Tier

- 10 requests per minute
- 100 requests per month

### Pro Tier

- 60 requests per minute
- 1,000 requests per month

### Enterprise Tier

- 300 requests per minute
- 10,000 requests per month

## 🛠️ Testing with Swagger UI

1. Open http://localhost:4000/api-docs
2. Click "Authorize" button
3. Enter your Clerk JWT or API Key
4. Try out any endpoint interactively!

## ⚡ Quick Workflow Example

```bash
# 1. Upload logo
LOGO_RESPONSE=$(curl -X POST http://localhost:4000/api/logos/upload \
  -H "X-API-Key: $API_KEY" \
  -F "file=@logo.svg")

LOGO_ID=$(echo $LOGO_RESPONSE | jq -r '.logo.id')

# 2. Create generation job
JOB_RESPONSE=$(curl -X POST http://localhost:4000/api/jobs \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"logoId\": \"$LOGO_ID\", \"type\": \"generate\"}")

JOB_ID=$(echo $JOB_RESPONSE | jq -r '.job.id')

# 3. Check job status
curl -X GET "http://localhost:4000/api/jobs/$JOB_ID" \
  -H "X-API-Key: $API_KEY"

# 4. Download results when complete
curl -X GET "http://localhost:4000/api/jobs/$JOB_ID/download" \
  -H "X-API-Key: $API_KEY" \
  -o results.zip
```

## 🐛 Troubleshooting

### "Invalid API key format"

- Check that your key starts with `lm_dev_` or `lm_prod_`
- Ensure the full key is included (no truncation)

### "Rate limit exceeded"

- Check response headers for `Retry-After`
- Wait for rate limit window to reset
- Consider upgrading your tier

### "Webhook verification failed"

- Ensure webhook secret matches
- Check signature header is present
- Verify timestamp is recent (< 5 minutes)

### "Unauthorized"

- Check API key is active (not expired/deactivated)
- Verify Clerk JWT is valid and not expired
- Ensure correct header format

## 📞 Support

For issues or questions:

- Check `PHASE4_SUMMARY.md` for detailed documentation
- Review API docs at `/api-docs`
- Check server logs for detailed error messages

## 🎉 Next Steps

- Explore all endpoints in Swagger UI
- Set up webhooks for real-time updates
- Integrate with your application
- Monitor usage and upgrade tier as needed

Happy coding! 🚀
