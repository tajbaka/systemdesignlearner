type ProgressBarProps = {
  completedSteps: number;
  totalSteps: number;
  className?: string;
};

export function ProgressBar({ completedSteps, totalSteps, className = "" }: ProgressBarProps) {
  const percentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-zinc-400 whitespace-nowrap">
          {completedSteps} of {totalSteps}
        </span>
      </div>
    </div>
  );
}
