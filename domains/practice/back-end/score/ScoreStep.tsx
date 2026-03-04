"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import type { StepComponentProps } from "../types";
import { HomeIcon } from "../components/PracticeFooter";
import { DisplayCard } from "./components/DisplayCard";
import { WarningCard } from "./components/WarningCard";
import { LoadingCard } from "./components/LoadingCard";
import { useScoreCard } from "./hooks/useScoreCard";
import useStepStateStore from "../store/useStore";
import { STEPS } from "../constants";
import { useStepConfig } from "../hooks/useStepConfig";

type ScoreStepProps = StepComponentProps;

export default function ScoreStep({
  slug,
  config: _config,
  stepType: _stepType,
  handlers,
}: ScoreStepProps) {
  useStepConfig({
    leftAction: "back",
    rightAction: "home",
    rightButtonIcon: <HomeIcon />,
  });

  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { score } = useStepStateStore(slug as string);
  const [isLoadingScore, setIsLoadingScore] = useState(false);

  const { hasScores, overallGrade, overallScore, description, stepScoreItems } = useScoreCard({
    slug: slug as string,
  });

  useEffect(() => {
    if (score.stepScores && score.stepScores.length === 0 && isLoaded && isSignedIn) {
      setIsLoadingScore(true);
      handlers[STEPS.SCORE]("getScore");
    }
  }, [isLoaded, isSignedIn, score.stepScores, handlers]);

  useEffect(() => {
    if (score.stepScores && score.stepScores.length > 0) {
      setIsLoadingScore(false);
    }
  }, [score.stepScores]);

  const shouldShowContent = isLoaded && isSignedIn && !isLoadingScore;

  return (
    <>
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
        </div>
      )}
    </>
  );
}
