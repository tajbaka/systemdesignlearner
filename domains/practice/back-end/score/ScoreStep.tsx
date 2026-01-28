"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import type { StepComponentProps } from "../types";
import { CommonLayout } from "../layouts/CommonLayout";
import { HomeIcon } from "../components/PracticeFooter";
import { DisplayCard } from "./components/DisplayCard";
import { WarningCard } from "./components/WarningCard";
import { LoadingCard } from "./components/LoadingCard";
import { useScoreCard } from "./hooks/useScoreCard";
import useStepStateStore from "../store/useStore";
import { STEPS } from "../constants";
// import { ActionCard } from "./components/ActionCard";

type ScoreStepProps = StepComponentProps;

export default function ScoreStep({ slug, config, stepType, handlers }: ScoreStepProps) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { score } = useStepStateStore(slug as string);
  const [isLoadingScore, setIsLoadingScore] = useState(false);

  const { hasScores, overallGrade, overallScore, description, stepScoreItems } = useScoreCard({
    slug: slug as string,
  });

  // Fetch score when component mounts (only if we don't have it yet)
  useEffect(() => {
    if (score.stepScores && score.stepScores.length === 0 && isLoaded && isSignedIn) {
      setIsLoadingScore(true);
      handlers[STEPS.SCORE]("getScore");
    }
  }, [isLoaded, isSignedIn, score.stepScores, handlers]);

  // Clear loading state when score data arrives
  useEffect(() => {
    if (score.stepScores && score.stepScores.length > 0) {
      setIsLoadingScore(false);
    }
  }, [score.stepScores]);

  const shouldShowContent = isLoaded && isSignedIn && !isLoadingScore;

  // const handleLinkedInShare = () => {
  //   // TODO: Implement LinkedIn share
  // };

  // const handleXShare = () => {
  //   // TODO: Implement X share
  // };

  // const handleCopyLink = () => {
  //   // TODO: Implement copy link
  // };

  return (
    <>
      <CommonLayout
        config={config}
        handlers={handlers}
        stepType={stepType}
        slug={slug as string}
        showBack={true}
        showNext={true}
        backDisabled={false}
        nextDisabled={false}
        rightButtonIcon={<HomeIcon />}
        leftAction="back"
        rightAction="home"
      >
        {isLoadingScore && (
          <div className="space-y-6 pb-40 sm:pb-8 px-4 lg:pl-20 lg:pr-4 pt-[20px] sm:pt-0">
            <LoadingCard title="Loading your score..." />
          </div>
        )}
        {shouldShowContent && !hasScores && (
          <div className="space-y-6 pb-40 sm:pb-8 px-4 lg:pl-20 lg:pr-4 pt-[20px] sm:pt-0">
            <WarningCard
              title="Incomplete Practice Session"
              description="You need to complete all required steps to see your final score. Please go back and complete the practice steps."
              actionText="Go Back to Practice"
              onClick={() => router.push(`/practice/${slug}`)}
            />
          </div>
        )}

        {shouldShowContent && hasScores && (
          <div className="space-y-6 pb-40 sm:pb-8 px-4 lg:pl-20 lg:pr-4 pt-[20px] sm:pt-0">
            <DisplayCard
              overallGrade={overallGrade}
              overallScore={overallScore}
              description={description}
              listTitle="Score by Step"
              list={stepScoreItems}
            />
            {/* <ActionCard
            shareOnLabel="Share on"
            orLabel="Or"
            copyLinkLabel="Copy link"
            linkedInAriaLabel="Share on LinkedIn"
            xAriaLabel="Share on X"
            onLinkedInShare={handleLinkedInShare}
            onXShare={handleXShare}
            onCopyLink={handleCopyLink}
          /> */}
          </div>
        )}
      </CommonLayout>
    </>
  );
}
