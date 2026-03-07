import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PostHogProvider } from "@/components/PostHogProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { getBaseUrl } from "@/lib/getBaseUrl";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// const fbPixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "System Design Interview Practice - Interactive Sandbox",
    template: "%s | System Design Sandbox",
  },
  description:
    "Practice system design interviews with interactive scenarios. AI-powered feedback on distributed systems, scalability & architecture design.",
  keywords: [
    "system design interview",
    "system design practice",
    "system design tutorial",
    "distributed systems",
    "scalability patterns",
    "system design examples",
    "architecture patterns",
    "system design course",
    "learn system design",
    "system design interview questions",
    "system design preparation",
    "software architecture",
    "interview prep",
    "technical interview",
    "software engineering",
    "interactive learning",
  ],
  authors: [{ name: "System Design Sandbox" }],
  creator: "System Design Sandbox",
  publisher: "System Design Sandbox",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.systemdesignsandbox.com",
    siteName: "System Design Sandbox",
    title: "System Design Interview Practice - Interactive Sandbox",
    description:
      "Practice system design interviews with interactive scenarios. AI-powered feedback on distributed systems, scalability & architecture design.",
    // images removed - child layouts will provide specific images
  },
  twitter: {
    card: "summary_large_image",
    title: "System Design Interview Practice - Interactive Sandbox",
    description:
      "Practice system design interviews with interactive scenarios. AI-powered feedback on architecture design.",
    // images removed - child layouts will provide specific images
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "System Design Sandbox",
  },
  formatDetection: {
    telephone: false,
  },
  // canonical is set per-page, not inherited from root layout
  // (root canonical caused all child pages to declare homepage as canonical)
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signUpFallbackRedirectUrl="/sso-callback"
      signInFallbackRedirectUrl="/sso-callback"
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: "#10b981", // emerald-500
          colorBackground: "#09090b", // zinc-950
          colorInputBackground: "#27272a", // zinc-800 - lighter for social buttons
          colorInputText: "#fafafa", // zinc-50
          colorText: "#fafafa", // zinc-50 - high contrast
          colorTextSecondary: "#d4d4d8", // zinc-300 - better readability
          colorDanger: "#ef4444", // red-500
          colorSuccess: "#10b981", // emerald-500
          colorWarning: "#f59e0b", // amber-500
          colorNeutral: "#52525b", // zinc-600 - lighter border
          fontFamily: "var(--font-geist-sans)",
          fontSize: "0.9375rem", // slightly larger for readability
          borderRadius: "0.75rem", // rounded-xl
        },
        elements: {
          // Root card styling
          rootBox: "bg-transparent",
          card: "bg-zinc-950 border border-zinc-800 shadow-2xl",

          // Header
          headerTitle: "text-white font-bold text-2xl",
          headerSubtitle: "text-zinc-300 text-base mt-2",

          // Social buttons - using !important for override
          socialButtonsBlockButton:
            "bg-zinc-800 !important border-2 !important border-zinc-600 !important text-white !important hover:bg-zinc-700 hover:border-emerald-400 transition-all duration-200 font-medium shadow-md",
          socialButtonsBlockButtonText: "text-white !important font-semibold",
          socialButtonsProviderIcon: "brightness-125 !important contrast-125 !important",

          // Divider
          dividerLine: "bg-zinc-700",
          dividerText: "text-zinc-400 text-sm font-medium",

          // Form fields
          formFieldLabel: "text-zinc-100 font-semibold text-base mb-2",
          formFieldInput:
            "bg-zinc-900 border-2 border-zinc-700 text-white placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 rounded-lg transition-all text-base font-medium",
          formFieldInputShowPasswordButton: "text-zinc-300 hover:text-white",

          // Buttons
          formButtonPrimary:
            "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-base shadow-lg hover:shadow-emerald-500/50 transition-all duration-300 rounded-lg py-3",
          formButtonReset:
            "bg-zinc-900 border-2 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600 transition-all rounded-lg font-semibold",

          // Footer
          footer: "bg-zinc-950 mt-6",
          footerAction: "bg-zinc-950",
          footerActionLink:
            "text-emerald-400 hover:text-emerald-300 font-bold underline decoration-2 underline-offset-2",
          footerActionText: "text-zinc-300 font-medium",

          // Identity preview
          identityPreview: "bg-zinc-900 border-2 border-zinc-700 rounded-lg",
          identityPreviewText: "text-white font-medium",
          identityPreviewEditButton: "text-emerald-400 hover:text-emerald-300 font-semibold",

          // Form container
          form: "space-y-5",

          // Alert
          alert: "bg-red-500/20 border-2 border-red-500/40 text-red-100 rounded-lg p-4",
          alertText: "text-red-100 text-base font-medium",

          // OTP input
          otpCodeFieldInput:
            "bg-zinc-900 border-2 border-zinc-700 text-white text-xl font-bold focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 rounded-lg",

          // Modal backdrop
          modalBackdrop: "bg-black/90 backdrop-blur-sm",
          modalContent: "bg-zinc-950 border-2 border-zinc-800 rounded-2xl shadow-2xl",

          // Links
          formFieldAction:
            "text-emerald-400 hover:text-emerald-300 text-base font-bold underline decoration-2 underline-offset-2",
          identityPreviewEditButtonIcon: "text-emerald-400",

          // Badges
          badge: "bg-emerald-500/30 text-emerald-200 border-2 border-emerald-500/50 font-semibold",

          // Avatar
          avatarBox: "border-0",
          avatarImage: "rounded-full",

          // Spinner
          spinner: "text-emerald-400",

          // Additional elements for better contrast
          formFieldHintText: "text-zinc-300 text-sm",
          formFieldErrorText: "text-red-300 font-semibold text-sm",
          formFieldSuccessText: "text-emerald-300 font-semibold text-sm",
          formFieldWarningText: "text-amber-300 font-semibold text-sm",

          // Internal card sections
          identityPreviewEditButtonText: "text-emerald-400 font-bold",
        },
      }}
    >
      <html lang="en" className="h-full dark">
        <head>
          {/* Auto-reload once on ChunkLoadError (stale deployment chunks) */}
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(){window.addEventListener("error",function(e){var n=e.error&&e.error.name||"";if(n==="ChunkLoadError"||n==="CSS_CHUNK_LOAD_FAILED"||(e.message&&e.message.indexOf("ChunkLoadError")!==-1)){if(!sessionStorage.getItem("chunk_retry")){sessionStorage.setItem("chunk_retry","1");window.location.reload()}}})}()`,
            }}
          />
          {/* Facebook Pixel - Commented out */}
          {/* {fbPixel && (
            <>
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  
                  fbq('init', '${fbPixel}');
                  fbq('track', 'PageView');
                `,
                }}
              />
              <noscript>
                <img
                  height="1"
                  width="1"
                  style={{ display: "none" }}
                  src={\`https://www.facebook.com/tr?id=\${fbPixel}&ev=PageView&noscript=1\`}
                  alt=""
                />
              </noscript>
            </>
          )} */}
        </head>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full dark`}>
          <ScrollToTop />
          <PostHogProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
