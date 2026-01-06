import { Webhook } from "svix";
import { headers } from "next/headers";
import { type WebhookEvent } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db, profiles } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  // Get the Svix headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no Svix headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing Svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Get the webhook secret from environment
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error("CLERK_WEBHOOK_SECRET is not set");
    return new Response("Error: Missing webhook secret", {
      status: 500,
    });
  }

  // Create a new Svix instance with your secret
  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    logger.error("Error verifying webhook:", err);
    return new Response("Error: Verification failed", {
      status: 400,
    });
  }

  // Handle the webhook event
  const eventType = evt.type;

  try {
    switch (eventType) {
      case "user.created": {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const email = email_addresses[0]?.email_address ?? null;
        const displayName = first_name ? `${first_name}${last_name ? ` ${last_name}` : ""}` : null;

        await db.insert(profiles).values({
          clerkUserId: id,
          email,
          displayName,
          avatarUrl: image_url ?? null,
        });

        logger.info("Created profile for user", { clerkUserId: id });
        break;
      }

      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const email = email_addresses[0]?.email_address ?? null;
        const displayName = first_name ? `${first_name}${last_name ? ` ${last_name}` : ""}` : null;

        await db
          .update(profiles)
          .set({
            email,
            displayName,
            avatarUrl: image_url ?? null,
          })
          .where(eq(profiles.clerkUserId, id));

        logger.info("Updated profile for user", { clerkUserId: id });
        break;
      }

      case "user.deleted": {
        const { id } = evt.data;

        if (id) {
          // Cascade delete will handle practice_sessions and scenario_completions
          await db.delete(profiles).where(eq(profiles.clerkUserId, id));
          logger.info("Deleted profile for user", { clerkUserId: id });
        }
        break;
      }

      default:
        // Unhandled event type
        logger.info("Unhandled Clerk webhook event", { eventType });
    }
  } catch (error) {
    logger.error("Error handling webhook event", { eventType, error });
    return new Response("Error: Failed to handle webhook", {
      status: 500,
    });
  }

  return new Response("Webhook processed", { status: 200 });
}
