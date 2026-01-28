import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type FeedbackModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  buttonLabel?: string;
  onClose: () => void;
  onButtonClick?: () => void;
};

export function FeedbackModal({
  isOpen,
  title,
  description,
  icon,
  children,
  buttonLabel = "Continue",
  onClose,
  onButtonClick,
}: FeedbackModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideClose
        className="max-w-xl rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-2xl"
      >
        <div className="mb-4 sm:mb-6 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <DialogTitle className="mb-2 text-xl sm:text-2xl font-bold text-foreground">
              {title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {icon}
              <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-6">{children}</div>
        {onButtonClick && (
          <div className="mt-6 sm:mt-8 flex items-center justify-end">
            <button
              type="button"
              onClick={onButtonClick}
              className="rounded-lg bg-primary px-4 sm:px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {buttonLabel}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
