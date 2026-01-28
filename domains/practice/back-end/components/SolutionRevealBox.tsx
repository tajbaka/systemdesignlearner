import { Eye } from "lucide-react";

type SolutionRevealBoxProps = {
  leftText: string;
  buttonText: string;
  onClick: () => void;
};

export function SolutionRevealBox({ leftText, buttonText, onClick }: SolutionRevealBoxProps) {
  return (
    <div className="rounded-xl border border-blue-400/30 bg-blue-950/40 p-4">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center justify-between w-full gap-4 transition-opacity hover:opacity-80"
      >
        <span className="text-sm font-medium text-blue-200">{leftText}</span>
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-blue-300">{buttonText}</span>
        </div>
      </button>
    </div>
  );
}
