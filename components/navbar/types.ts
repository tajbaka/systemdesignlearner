export interface NavbarContent {
  logo: {
    full: string;
    short: string;
    href: string;
  };
  links: {
    practice: {
      label: string;
      href: string;
    };
    learn: {
      label: string;
      href: string;
    };
  };
  cta?: {
    label: string;
    href: string;
  };
  auth: {
    signInLabel: string;
    accountLabel: string;
  };
}

export interface NavbarProps {
  variant?: "dark" | "light";
  hideIcon?: boolean;
  hideOnMobile?: boolean;
  pathname: string;
  userImageUrl?: string;
  onClick: () => void;
  content: NavbarContent;
}

export const getNavLinkClasses = (isActive: boolean, isLight: boolean) => {
  const navLinkActiveLight = "text-emerald-600 bg-emerald-50";
  const navLinkActiveDark = "text-emerald-400 bg-zinc-800";
  const navLinkInactiveLight = "text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100";
  const navLinkInactiveDark = "text-zinc-300 hover:text-white hover:bg-zinc-800";

  if (isActive) {
    return isLight ? navLinkActiveLight : navLinkActiveDark;
  }
  return isLight ? navLinkInactiveLight : navLinkInactiveDark;
};
