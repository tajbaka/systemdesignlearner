import { Metadata } from "next";
import { HomePageClient } from "./HomePageClient";

export const metadata: Metadata = {
  title: "System Design Sandbox: Practice Visually",
  description: "Interactive system design playground — drag, connect, and simulate realistic architectures. Master system design through hands-on practice with real-world scenarios.",
  openGraph: {
    title: "System Design Sandbox: Practice Visually",
    description: "Interactive system design playground — drag, connect, and simulate realistic architectures. Master system design through hands-on practice with real-world scenarios.",
    images: [
      {
        url: "/og-image.png", // You'll need to add this image
        width: 1200,
        height: 630,
        alt: "System Design Sandbox - Interactive Architecture Playground",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "System Design Sandbox: Practice Visually",
    description: "Interactive system design playground — drag, connect, and simulate realistic architectures.",
    images: ["/og-image.png"],
  },
};

export default function HomePage() {
  return <HomePageClient />;
}