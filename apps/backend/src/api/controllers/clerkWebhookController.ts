/**
 * Clerk Webhook Controller
 *
 * Handles Clerk webhook events for user lifecycle management
 * Syncs user data with Convex database
 */

import { Request, Response } from 'express';
import { Webhook } from 'svix';
import type { WebhookRequiredHeaders } from 'svix';
import type {
  ClerkOrganizationCreatedEvent,
  ClerkOrganizationMembershipCreatedEvent,
  ClerkOrganizationUpdatedEvent,
  ClerkUserCreatedEvent,
  ClerkUserDeletedEvent,
  ClerkUserUpdatedEvent,
} from '../../types/clerk';

/**
 * Handle Clerk webhooks
 *
 * Clerk sends webhooks for user events:
 * - user.created: New user registration
 * - user.updated: User profile changes
 * - user.deleted: User account deletion
 * - organization.created: New organization
 * - organization.updated: Organization changes
 * - organizationMembership.created: User joined organization
 */
export const handleClerkWebhook = async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('CLERK_WEBHOOK_SECRET not configured');
      return res.status(500).json({
        error: 'Webhook not configured',
        code: 'CONFIG_ERROR',
      });
    }

    // Get webhook headers
    const svix_id = req.headers['svix-id'] as string;
    const svix_timestamp = req.headers['svix-timestamp'] as string;
    const svix_signature = req.headers['svix-signature'] as string;

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({
        error: 'Missing webhook headers',
        code: 'INVALID_WEBHOOK',
      });
    }

    // Verify the webhook
    const wh = new Webhook(webhookSecret);
    let evt;

    try {
      evt = wh.verify(JSON.stringify(req.body), {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      } satisfies WebhookRequiredHeaders);
    } catch (err) {
      console.error('Webhook verification failed:', err);
      return res.status(400).json({
        error: 'Webhook verification failed',
        code: 'INVALID_SIGNATURE',
      });
    }

    // Handle different event types
    const eventType = evt.type;
    const eventData = evt.data;

    console.log(`Clerk webhook received: ${eventType}`);

    switch (eventType) {
      case 'user.created':
        await handleUserCreated(eventData as ClerkUserCreatedEvent['data']);
        break;

      case 'user.updated':
        await handleUserUpdated(eventData as ClerkUserUpdatedEvent['data']);
        break;

      case 'user.deleted':
        await handleUserDeleted(eventData as ClerkUserDeletedEvent['data']);
        break;

      case 'organization.created':
        await handleOrganizationCreated(eventData as ClerkOrganizationCreatedEvent['data']);
        break;

      case 'organization.updated':
        await handleOrganizationUpdated(eventData as ClerkOrganizationUpdatedEvent['data']);
        break;

      case 'organizationMembership.created':
        await handleOrganizationMembershipCreated(
          eventData as ClerkOrganizationMembershipCreatedEvent['data'],
        );
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Clerk webhook error:', error);
    return res.status(500).json({
      error: 'Webhook processing failed',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Handle user.created event
 * Creates user record in Convex
 */
async function handleUserCreated(data: ClerkUserCreatedEvent['data']) {
  const email = data.email_addresses?.[0]?.email_address || '';
  const clerkUserId = data.id;

  // TODO: Create Convex mutation for user creation
  // For now, log the event
  console.log('User created:', {
    clerkUserId,
    email,
  });

  // Future implementation:
  // await convex.mutation(api.users.create, {
  //   clerkUserId,
  //   email,
  //   metadata: {
  //     tier: 'free',
  //     quotaUsed: 0,
  //     quotaLimit: 100,
  //   },
  // });
}

/**
 * Handle user.updated event
 * Updates user metadata in Convex
 */
async function handleUserUpdated(data: ClerkUserUpdatedEvent['data']) {
  const email = data.email_addresses?.[0]?.email_address || '';
  const clerkUserId = data.id;

  console.log('User updated:', {
    clerkUserId,
    email,
  });

  // TODO: Implement user update mutation
}

/**
 * Handle user.deleted event
 * Removes user data from Convex
 */
async function handleUserDeleted(data: ClerkUserDeletedEvent['data']) {
  const clerkUserId = data.id;

  console.log('User deleted:', {
    clerkUserId,
  });

  // TODO: Implement user deletion (consider soft delete)
}

/**
 * Handle organization.created event
 * Creates organization record
 */
async function handleOrganizationCreated(data: ClerkOrganizationCreatedEvent['data']) {
  const clerkOrgId = data.id;
  const name = data.name;

  console.log('Organization created:', {
    clerkOrgId,
    name,
  });

  // TODO: Implement organization creation
}

/**
 * Handle organization.updated event
 * Updates organization metadata
 */
async function handleOrganizationUpdated(data: ClerkOrganizationUpdatedEvent['data']) {
  const clerkOrgId = data.id;
  const name = data.name;

  console.log('Organization updated:', {
    clerkOrgId,
    name,
  });

  // TODO: Implement organization update
}

/**
 * Handle organizationMembership.created event
 * Links user to organization
 */
async function handleOrganizationMembershipCreated(
  data: ClerkOrganizationMembershipCreatedEvent['data'],
) {
  const clerkUserId = data.public_user_data?.user_id;
  const clerkOrgId = data.organization?.id;
  const role = data.role;

  console.log('Organization membership created:', {
    clerkUserId,
    clerkOrgId,
    role,
  });

  // TODO: Implement organization membership
}
