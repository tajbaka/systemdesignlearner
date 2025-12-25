import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PracticeSlugPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/practice/${slug}/intro`);
}