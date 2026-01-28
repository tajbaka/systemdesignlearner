import { useMemo } from "react";
import useStepStateStore from "../../store/useStore";

type UseScoreCardProps = {
  slug: string;
};

const STEP_COLORS = ["bg-emerald-500", "bg-blue-500", "bg-cyan-500", "bg-purple-500"];

const getGrade = (earned: number, total: number): string => {
  if (total === 0) return "N/A";
  const percentage = (earned / total) * 100;
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "F";
};

const getDescription = (grade: string): string => {
  switch (grade) {
    case "A":
      return "Excellent - Production ready";
    case "B":
      return "Good - needs minor improvements";
    case "C":
      return "Fair - needs improvements";
    case "D":
      return "Poor - significant improvements needed";
    case "F":
      return "Failing - major improvements required";
    default:
      return "Loading...";
  }
};

export function useScoreCard({ slug }: UseScoreCardProps) {
  const { score } = useStepStateStore(slug);

  const stepScores = useMemo(() => score.stepScores || [], [score.stepScores]);
  const hasScores = stepScores.length > 0;

  const { totalScore, maxTotalScore } = useMemo(() => {
    return {
      totalScore: stepScores.reduce((sum, step) => sum + step.score, 0),
      maxTotalScore: stepScores.reduce((sum, step) => sum + step.maxScore, 0),
    };
  }, [stepScores]);

  const overallGrade = useMemo(
    () => getGrade(totalScore, maxTotalScore),
    [totalScore, maxTotalScore]
  );

  const overallScore = useMemo(() => `${totalScore}/${maxTotalScore}`, [totalScore, maxTotalScore]);

  const description = useMemo(() => getDescription(overallGrade), [overallGrade]);

  const stepScoreItems = useMemo(() => {
    return stepScores.map((step, index) => {
      const percentage =
        step.maxScore === 0 ? 0 : Math.min(100, (step.score / step.maxScore) * 100);
      return {
        titleNumber: `${index + 1}`,
        title: step.title,
        rightText: `${step.score}/${step.maxScore}`,
        percentage,
        barColor: STEP_COLORS[index % STEP_COLORS.length],
      };
    });
  }, [stepScores]);

  return {
    hasScores,
    overallGrade,
    overallScore,
    description,
    stepScoreItems,
  };
}
