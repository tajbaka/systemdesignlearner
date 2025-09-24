import { notFound } from "next/navigation";
import PracticeFlow from "@/components/practice/PracticeFlow";

type PracticePageProps = {
  params: {
    slug: string;
  };
};

const VALID_SLUG = "url-shortener";

export default function PracticeSlugPage({ params }: PracticePageProps) {
  if (params.slug !== VALID_SLUG) {
    notFound();
  }

  return <PracticeFlow />;
}
