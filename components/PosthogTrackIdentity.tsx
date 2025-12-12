"use client";

// Sourced from: https://posthog.com/docs/libraries/next-js#capturing-pageviews

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { group, identify } from "@/lib/analytics";

export default function PosthogTrackIdentity(): null {
  const { user, isSignedIn, isLoaded } = useUser();

  const userId = user?.id;
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  // Track user identity
  useEffect(() => {
    // Wait for Clerk to finish loading
    if (!isLoaded) return;

    if (isSignedIn && userId && userEmail) {
      // Identify user properties
      identify(userEmail, {
        id: userId,
        email: userEmail,
        firstName: user?.firstName,
        lastName: user?.lastName,
        createdAt: user?.createdAt?.toISOString(),
      });
    }

    if (process.env.NODE_ENV === "development") {
      console.log("grouping user as internal_user");
      group("team", "internal_user");
    } else {
      //TODO: once we have b2b users, we need to add a b2b group
      group("team", "consumer");
    }
  }, [isSignedIn, userId, userEmail, isLoaded, user]);

  return null;
}
