import { ArrowDownToLine } from "lucide-react";

type SolutionAnswerBoxProps = {
  leftText: string;
  buttonText: string;
  description: string;
  onClick: () => void;
};

export function SolutionAnswerBox({
  leftText,
  buttonText,
  description,
  onClick,
}: SolutionAnswerBoxProps) {
  return (
    <div className="rounded-xl border border-blue-400/30 bg-blue-950/40 p-4 space-y-3">
      <div className="flex justify-between w-full gap-4">
        <span className="text-sm font-semibold text-blue-300">{leftText}</span>
        <button
          type="button"
          onClick={onClick}
          className="rounded-lg bg-blue-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-blue-600 flex items-center gap-2 flex-shrink-0"
        >
          <ArrowDownToLine className="h-4 w-4" />
          {buttonText}
        </button>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        <p className="text-sm text-blue-100 whitespace-pre-line">{description}</p>
      </div>
    </div>
  );
}
