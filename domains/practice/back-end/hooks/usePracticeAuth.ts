import { useState, useCallback } from "react";
import useAuthentication from "@/domains/hooks/useAuthentication";

type UsePracticeAuthProps = {
  slug: string;
};

export function usePracticeAuth({ slug }: UsePracticeAuthProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const {
    email,
    code,
    step,
    isLoading: isAuthLoading,
    isGoogleLoading,
    error,
    isLoaded,
    isSignedIn,
    user,
    setEmail,
    setCode,
    handleEmailSubmit,
    handleCodeVerify,
    handleGoogleSignIn,
    setStep,
  } = useAuthentication({
    slug,
    isOpen: isAuthModalOpen,
    onClose: () => setIsAuthModalOpen(false),
  });

  const openAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  return {
    isAuthModalOpen,
    email,
    code,
    step,
    isAuthLoading,
    isGoogleLoading,
    error,
    isLoaded,
    isSignedIn,
    user,
    setEmail,
    setCode,
    handleEmailSubmit,
    handleCodeVerify,
    handleGoogleSignIn,
    setStep,
    openAuthModal,
    closeAuthModal,
  };
}
