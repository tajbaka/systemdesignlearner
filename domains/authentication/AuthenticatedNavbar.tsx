"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { Navbar, type NavbarContent } from "@/components/navbar";
import useAuthentication from "@/domains/hooks/useAuthentication";
import { AuthModalDialog } from "@/domains/authentication/components/AuthModalDialog";
import { UserMenu } from "@/components/UserMenu";

interface AuthenticatedNavbarProps {
  variant?: "dark" | "light";
  hideIcon?: boolean;
  hideMobileMenu?: boolean;
  content?: NavbarContent;
}

const defaultNavbarContent: NavbarContent = {
  logo: {
    full: "System Design Sandbox",
    short: "SDS",
    href: "/",
  },
  links: {
    practice: {
      label: "Practice",
      href: "/practice",
    },
    learn: {
      label: "Learn",
      href: "/learn",
    },
  },
  cta: {
    label: "Try Url Shortener Scenario",
    href: "/practice/url-shortener/intro",
  },
  auth: {
    signInLabel: "Sign In",
    accountLabel: "Your Account",
  },
};

export function AuthenticatedNavbar({
  variant = "dark",
  hideIcon = false,
  hideMobileMenu = false,
  content = defaultNavbarContent,
}: AuthenticatedNavbarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user, isSignedIn } = useUser();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userInitial, setUserInitial] = useState<string>("");

  const closeAuthModal = () => setIsAuthModalOpen(false);
  const closeUserMenu = () => setIsUserMenuOpen(false);

  const {
    email,
    code,
    step,
    isLoading,
    isGoogleLoading,
    error,
    isLoaded,
    setEmail,
    setCode,
    handleEmailSubmit,
    handleCodeVerify,
    handleGoogleSignIn,
    setStep,
  } = useAuthentication({
    slug: "homepage",
    isOpen: isAuthModalOpen,
    onClose: closeAuthModal,
  });

  useEffect(() => {
    if (user) {
      const initial = (user.firstName?.[0] || user.username?.[0] || "U").toUpperCase();
      setUserInitial(initial);
    }
  }, [user]);

  const handleClick = () => {
    if (isSignedIn) {
      setIsUserMenuOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    closeUserMenu();
  };

  return (
    <>
      <Navbar
        variant={variant}
        hideIcon={hideIcon}
        hideMobileMenu={hideMobileMenu}
        pathname={pathname}
        userImageUrl={user?.imageUrl}
        onClick={handleClick}
        content={content}
      />

      {/* Auth Modal */}
      <AuthModalDialog
        isOpen={isAuthModalOpen}
        isSignedIn={Boolean(isSignedIn)}
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
        onClose={closeAuthModal}
        onBack={() => setStep("start")}
      />

      {/* User Menu */}
      {user && (
        <UserMenu
          isOpen={isUserMenuOpen}
          onClose={closeUserMenu}
          imageUrl={user.imageUrl}
          initial={userInitial}
          name={user.firstName || user.username || "User"}
          email={user.emailAddresses[0]?.emailAddress || ""}
          onSignOut={handleSignOut}
        />
      )}
    </>
  );
}
