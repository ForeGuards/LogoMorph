/**
 * Webhook Service
 *
 * Handles webhook delivery with signature verification and retry logic
 */

import crypto from 'crypto';

// TODO: Replace with Supabase client
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

/**
 * Generate webhook signature
 * Uses HMAC-SHA256 for secure signature generation
 */
export function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify webhook signature
 * Compares provided signature with expected signature
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = generateSignature(payload, secret);

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

/**
 * Deliver webhook to a URL
 *
 * Option 1: Fire and forget (pros: fast; cons: no retry)
 * Option 2: With retry logic (pros: reliable; cons: complex)
 * Chosen: With retry for reliability
 */
export async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  event: string,
  payload: unknown,
  retries = 3,
): Promise<{ success: boolean; error?: string }> {
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, secret);
  const timestamp = Date.now().toString();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp,
          'X-Webhook-Event': event,
          'User-Agent': 'LogoMorph-Webhook/1.0',
        },
        body: payloadString,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const responseText = await response.text();
      let responseData: unknown;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      // TODO: Log delivery to Supabase
      // await supabase.from('webhook_logs').insert({...});

      if (response.ok) {
        // TODO: Reset failure count on success
        // await supabase.from('webhooks').update({ failure_count: 0 }).eq('id', webhookId);
        return { success: true };
      }

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        // TODO: Record failure in Supabase
        // await supabase.rpc('increment_webhook_failure', { webhook_id: webhookId });
        return {
          success: false,
          error: `HTTP ${response.status}: ${responseText}`,
        };
      }

      // Retry on server errors (5xx) or network errors
      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }

      // Final failure
      // TODO: Record failure in Supabase
      return {
        success: false,
        error: `HTTP ${response.status} after ${retries + 1} attempts`,
      };
    } catch (error) {
      console.error(`Webhook delivery attempt ${attempt + 1} failed:`, error);

      // TODO: Log error to Supabase
      // await supabase.from('webhook_logs').insert({...});

      if (attempt < retries) {
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }

      // TODO: Final failure - record in Supabase
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  return { success: false, error: 'All retry attempts failed' };
}

/**
 * Trigger webhook event
 * Finds all active webhooks for the event and delivers
 */
export async function triggerWebhookEvent(
  userId: string,
  event: string,
  payload: unknown,
): Promise<void> {
  try {
    // TODO: Get all active webhooks for this event from Supabase
    // const { data: webhooks } = await supabase
    //   .from('webhooks')
    //   .select('*')
    //   .eq('clerk_user_id', userId)
    //   .eq('active', true)
    //   .contains('events', [event]);
    const webhooks: any[] = []; // Temporary stub

    if (webhooks.length === 0) {
      return;
    }

    // Deliver to all webhooks in parallel
    const deliveryPromises = webhooks.map((webhook: any) =>
      deliverWebhook(webhook.id, webhook.url, webhook.secret, event, payload),
    );

    await Promise.allSettled(deliveryPromises);
  } catch (error) {
    console.error('Webhook event trigger error:', error);
  }
}

/**
 * Webhook event types
 */
export const WebhookEvents = {
  JOB_CREATED: 'job.created',
  JOB_COMPLETED: 'job.completed',
  JOB_FAILED: 'job.failed',
  LOGO_UPLOADED: 'logo.uploaded',
  EXPORT_READY: 'export.ready',
} as const;

export type WebhookEvent = (typeof WebhookEvents)[keyof typeof WebhookEvents];
