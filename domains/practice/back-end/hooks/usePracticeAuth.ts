import { useEffect, useState } from "react";
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

  // Check authentication and show modal if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setIsAuthModalOpen(true);
    }
  }, [isLoaded, isSignedIn]);

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
  };
}
