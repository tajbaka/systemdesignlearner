"use client";

import { useSignIn, useSignUp, useUser, useClerk } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import { track } from "@/lib/analytics";

// Export User type for other components to use
export type User = ReturnType<typeof useUser>["user"];

interface UseAuthenticationOptions {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function useAuthentication({ slug, isOpen, onClose }: UseAuthenticationOptions) {
  const { isSignedIn: clerkSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const { signIn, isLoaded: signInLoaded, setActive } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"start" | "verify">("start");
  const [isNewUser, setIsNewUser] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  const isLoaded = signInLoaded && signUpLoaded;

  // Only consider signed in when both Clerk auth AND our profile row exist
  const isSignedIn = clerkSignedIn && profileReady;

  // Initialize session after authentication (for SSO callback)
  const initializeSession = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch("/api/v2/auth/session", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setProfileReady(true);
      }
      track("practice_auth_completed", {
        slug,
        provider: "clerk",
        userId: user.id,
        profileId: data.profile?.id,
        isNewUser: data.isNewUser,
      });
    } catch (error) {
      console.error("[AuthModal] Session initialization error:", error);
    }
  }, [user, slug]);

  useEffect(() => {
    if (clerkSignedIn) {
      initializeSession();
    } else {
      // Reset profileReady when user signs out
      setProfileReady(false);
    }
  }, [clerkSignedIn, initializeSession]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setCode("");
      setStep("start");
      setError("");
      setIsNewUser(false);
      setIsLoading(false);
      setIsGoogleLoading(false);
    }
  }, [isOpen]);

  const resetState = useCallback(() => {
    setEmail("");
    setCode("");
    setStep("start");
    setError("");
    setIsNewUser(false);
    setIsLoading(false);
    setIsGoogleLoading(false);
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    if (!isLoaded) return;
    setIsGoogleLoading(true);
    setError("");

    try {
      // Get the current URL, removing any auth_flow parameter
      let returnUrl = window.location.href;
      const url = new URL(returnUrl);
      url.searchParams.delete("auth_flow");
      returnUrl = url.toString();

      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: returnUrl,
      });
      // Note: page will redirect before this line executes
    } catch (err: unknown) {
      console.error("[AuthModal] Google sign in error:", err);
      setError(err instanceof Error ? err.message : "Failed to sign in with Google");
      setIsGoogleLoading(false);
    }
  }, [isLoaded, signIn]);

  const handleEmailSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isLoaded || !email) return;
      setIsLoading(true);
      setError("");

      try {
        // Try sign-in first
        try {
          const signInResult = await signIn.create({
            identifier: email,
          });
          setIsNewUser(false);

          // Sign-in flow: check what authentication methods are available
          const emailCodeFactor = signInResult.supportedFirstFactors?.find(
            (factor: { strategy: string }) => factor.strategy === "email_code"
          );

          if (emailCodeFactor && "emailAddressId" in emailCodeFactor) {
            // Prepare email code verification
            await signIn.prepareFirstFactor({
              strategy: "email_code",
              emailAddressId: emailCodeFactor.emailAddressId,
            });
            setStep("verify");
          } else {
            setError("Email authentication is not available. Please try a different method.");
          }
        } catch (signInError: unknown) {
          // If user doesn't exist, try sign-up instead
          void signInError; // Expected when user doesn't exist
          await signUp.create({
            emailAddress: email,
          });
          setIsNewUser(true);

          // Sign-up flow: prepare email code
          await signUp.prepareEmailAddressVerification({
            strategy: "email_code",
          });
          setStep("verify");
        }
        setIsLoading(false);
      } catch (err: unknown) {
        console.error("Email authentication error:", err);
        setError(err instanceof Error ? err.message : "Failed to send verification code");
        setIsLoading(false);
      }
    },
    [isLoaded, email, signIn, signUp]
  );

  const handleCodeVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isLoaded || !code) return;
      setIsLoading(true);
      setError("");

      try {
        let result;

        if (isNewUser) {
          // Sign-up verification
          result = await signUp.attemptEmailAddressVerification({
            code,
          });

          // If successful, set the active session
          if (result.status === "complete") {
            await setActive({ session: result.createdSessionId });
            // Wait for session to be initialized, then close and refresh
            setTimeout(() => {
              onClose();
            }, 1500);
          } else {
            // If not complete, there might be more steps required
            setError("Additional verification required. Please check your email.");
            setIsLoading(false);
          }
        } else {
          // Sign-in verification
          result = await signIn.attemptFirstFactor({
            strategy: "email_code",
            code,
          });

          // If successful, set the active session
          if (result.status === "complete") {
            await setActive({ session: result.createdSessionId });
            // Wait for session to be initialized, then close
            setTimeout(() => {
              onClose();
            }, 1500);
          } else {
            // If not complete, there might be more steps required
            setError("Additional verification required. Please try again.");
            setIsLoading(false);
          }
        }
      } catch (err: unknown) {
        console.error("[AuthModal] Code verification error:", err);
        setError(err instanceof Error ? err.message : "Invalid verification code");
        setIsLoading(false);
      }
    },
    [isLoaded, code, isNewUser, signUp, signIn, setActive, onClose]
  );

  return {
    email,
    code,
    step,
    isLoading,
    isGoogleLoading,
    error,
    isSignedIn,
    user,
    isLoaded,
    signOut,
    setEmail,
    setCode,
    handleEmailSubmit,
    handleCodeVerify,
    handleGoogleSignIn,
    resetState,
    setStep,
  };
}
