import { Metadata } from "next";
import { decodeDesign } from "@/lib/shareLink";
import { getBaseUrl } from "@/lib/utils";
import { VALID_SLUGS, PRACTICE_IMAGE_URLS } from "@/lib/constants/ogImages";
import PlayPageClient from "./PlayPageClient";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type SharePayload = {
  scenarioId?: string;
  nodes: Array<{
    id: string;
    kind: string;
    x: number;
    y: number;
    replicas?: number;
    customLabel?: string;
  }>;
  edges: Array<{
    id: string;
    from: string;
    to: string;
    linkLatencyMs?: number;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
};

// cannot do this in layout as we dont have access to the share param
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const search = await searchParams;
  const shareParam = search?.s as string | undefined;

  let scenarioId = "default";
  let scenarioName = "System Design Sandbox";

  // Try to decode the design state to determine the scenario
  if (shareParam) {
    try {
      const payload = decodeDesign<SharePayload>(shareParam);
      if (payload?.scenarioId) {
        scenarioId = payload.scenarioId;
        scenarioName = scenarioId
          .split("-")
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }
    } catch (error) {
      // If decoding fails, use default
      console.error("Failed to decode design state for metadata:", error);
    }
  }

  // Get absolute URL for OG image (required for social media)
  // Check if scenarioId contains any of the scenario identifiers
  let relativeImagePath: string | undefined;
  for (const validSlug of Object.values(VALID_SLUGS)) {
    if (scenarioId.includes(validSlug)) {
      relativeImagePath = PRACTICE_IMAGE_URLS[validSlug as keyof typeof PRACTICE_IMAGE_URLS];
      break;
    }
  }

  const baseUrl = getBaseUrl();
  const ogImage = relativeImagePath ? `${baseUrl}${relativeImagePath}` : `${baseUrl}/og-image.png`;

  return {
    title: shareParam
      ? `${scenarioName} Design - System Design Sandbox`
      : "System Design Sandbox - Interactive Design Tool",
    description: shareParam
      ? `View this ${scenarioName} system design. Build and visualize system architectures interactively.`
      : "Build and visualize system design architectures with our interactive sandbox. Create components, add connections, and design scalable systems.",
    openGraph: {
      title: shareParam ? `${scenarioName} Design` : "System Design Sandbox",
      description: shareParam
        ? `View this ${scenarioName} system design. Build and visualize system architectures interactively.`
        : "Build and visualize system design architectures interactively. Drag-and-drop components, create connections, and design scalable systems.",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: shareParam
            ? `${scenarioName} System Design`
            : "System Design Sandbox - Interactive Design Tool",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: shareParam ? `${scenarioName} Design` : "System Design Sandbox",
      description: shareParam
        ? `View this ${scenarioName} system design. Build and visualize system architectures interactively.`
        : "Build and visualize system design architectures interactively. Drag-and-drop components, create connections, and design scalable systems.",
      images: [ogImage],
    },
  };
}

export default function PlayPage() {
  return <PlayPageClient />;
}
