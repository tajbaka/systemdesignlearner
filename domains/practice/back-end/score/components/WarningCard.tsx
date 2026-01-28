type WarningCardProps = {
  title: string;
  description: string;
  actionText: string;
  onClick: () => void;
};

export function WarningCard({ title, description, actionText, onClick }: WarningCardProps) {
  return (
    <section className="space-y-6 rounded-3xl border border-amber-800 bg-amber-900/20 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl">
      <div className="text-center space-y-4">
        <div className="text-6xl">⚠️</div>
        <h3 className="text-xl font-semibold text-amber-200">{title}</h3>
        <p className="text-sm text-amber-100">{description}</p>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={onClick}
            className="inline-flex h-10 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/10 px-4 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {actionText}
          </button>
        </div>
      </div>
    </section>
  );
}
