import { IconLinkedIn, IconX } from "./ActionIcons";

type ActionCardProps = {
  shareOnLabel: string;
  orLabel: string;
  copyLinkLabel: string;
  linkedInAriaLabel: string;
  xAriaLabel: string;
  onLinkedInShare: () => void;
  onXShare: () => void;
  onCopyLink: () => void;
};

export function ActionCard({
  shareOnLabel,
  orLabel,
  copyLinkLabel,
  linkedInAriaLabel,
  xAriaLabel,
  onLinkedInShare,
  onXShare,
  onCopyLink,
}: ActionCardProps) {
  return (
    <section className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">{shareOnLabel}</span>
          <button
            type="button"
            onClick={onLinkedInShare}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 text-blue-100 transition hover:bg-blue-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label={linkedInAriaLabel}
          >
            <IconLinkedIn size={20} />
          </button>
          <button
            type="button"
            onClick={onXShare}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-400/40 bg-zinc-500/10 text-zinc-100 transition hover:bg-zinc-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            aria-label={xAriaLabel}
          >
            <IconX size={20} />
          </button>
        </div>
        <span className="text-sm text-zinc-400">{orLabel}</span>
        <button
          type="button"
          onClick={onCopyLink}
          className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold border border-blue-400/40 bg-blue-500/15 text-blue-100 transition hover:bg-blue-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          {copyLinkLabel}
        </button>
      </div>
    </section>
  );
}
