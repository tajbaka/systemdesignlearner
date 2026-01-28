type ListItemProps = {
  titleNumber: string;
  title: string;
  rightText: string;
  percentage: number;
  barColor: string;
};

export function ListItem({ titleNumber, title, rightText, percentage, barColor }: ListItemProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 p-3">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
          {titleNumber}
        </div>
        <span className="text-sm font-medium text-zinc-200 truncate">{title}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="h-2 w-16 sm:w-24 overflow-hidden rounded-full bg-zinc-800">
          <div className={`h-full ${barColor}`} style={{ width: `${percentage}%` }} />
        </div>
        <span className="text-xs sm:text-sm font-semibold text-white min-w-[3rem] sm:min-w-[5rem] text-right">
          {rightText}
        </span>
      </div>
    </div>
  );
}
