"use client";

import { useAuthModal } from "@/domains/practice/hooks/useAuthModal";
import { AuthModalDialog } from "@/domains/practice/components/AuthModalDialog";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
  slug: string;
}

export function AuthModal({ isOpen, onClose, onAuthenticated, slug }: AuthModalProps) {
  const {
    email,
    code,
    step,
    isLoading,
    isGoogleLoading,
    error,
    isSignedIn,
    user,
    isLoaded,
    setEmail,
    setCode,
    handleEmailSubmit,
    handleCodeVerify,
    handleGoogleSignIn,
    setStep,
  } = useAuthModal({
    slug,
    isOpen,
    onAuthenticated,
  });

  return (
    <AuthModalDialog
      isOpen={isOpen}
      isSignedIn={Boolean(isSignedIn)}
      user={user}
      email={email}
      code={code}
      step={step}
      isLoading={isLoading}
      isGoogleLoading={isGoogleLoading}
      error={error}
      isLoaded={isLoaded}
      onEmailChange={setEmail}
      onCodeChange={setCode}
      onEmailSubmit={handleEmailSubmit}
      onCodeVerify={handleCodeVerify}
      onGoogleSignIn={handleGoogleSignIn}
      onClose={onClose}
      onBack={() => setStep("start")}
    />
  );
}

export default AuthModal;
