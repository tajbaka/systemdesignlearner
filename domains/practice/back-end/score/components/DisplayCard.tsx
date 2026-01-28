import { ListItem } from "./ListItem";

type DisplayCardProps = {
  overallGrade: string;
  overallScore: string;
  description: string;
  listTitle: string;
  list: Array<{
    titleNumber: string;
    title: string;
    rightText: string;
    percentage: number;
    barColor: string;
  }>;
};

export function DisplayCard({
  overallGrade,
  overallScore,
  description,
  listTitle,
  list,
}: DisplayCardProps) {
  return (
    <section className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl">
      <div className="text-center space-y-4">
        <div>
          <div className="inline-block text-6xl sm:text-8xl font-bold text-emerald-400">
            {overallGrade}
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-semibold text-white">{overallScore}</div>
          <div className="mt-1 text-sm text-zinc-400">{description}</div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">{listTitle}</h3>
        <div className="space-y-2">
          {list.map((item) => (
            <ListItem
              key={item.title}
              titleNumber={item.titleNumber}
              title={item.title}
              rightText={item.rightText}
              percentage={item.percentage}
              barColor={item.barColor}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
