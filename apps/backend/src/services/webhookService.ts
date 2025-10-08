/**
 * Webhook Service
 *
 * Handles webhook delivery with signature verification and retry logic
 */

import crypto from 'crypto';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);

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

      // Log delivery
      await convex.mutation(api.webhooks.logDelivery, {
        webhookId: webhookId as unknown as string,
        event,
        payload,
        response: responseData,
        statusCode: response.status,
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      });

      if (response.ok) {
        // Reset failure count on success
        await convex.mutation(api.webhooks.resetFailureCount, {
          webhookId: webhookId as unknown as string,
        });
        return { success: true };
      }

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        await convex.mutation(api.webhooks.recordFailure, {
          webhookId: webhookId as unknown as string,
        });
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
      await convex.mutation(api.webhooks.recordFailure, {
        webhookId: webhookId as unknown as string,
      });
      return {
        success: false,
        error: `HTTP ${response.status} after ${retries + 1} attempts`,
      };
    } catch (error) {
      console.error(`Webhook delivery attempt ${attempt + 1} failed:`, error);

      // Log error
      await convex.mutation(api.webhooks.logDelivery, {
        webhookId: webhookId as unknown as string,
        event,
        payload,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (attempt < retries) {
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }

      // Final failure
      await convex.mutation(api.webhooks.recordFailure, {
        webhookId: webhookId as unknown as string,
      });
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
    // Get all active webhooks for this event
    const webhooks = await convex.query(api.webhooks.getActiveByEvent, {
      clerkUserId: userId,
      event,
    });

    if (webhooks.length === 0) {
      return;
    }

    // Deliver to all webhooks in parallel
    const deliveryPromises = webhooks.map((webhook) =>
      deliverWebhook(webhook._id, webhook.url, webhook.secret, event, payload),
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
