import { CheckCircle2, AlertCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Item = string | { id: string; text: string; href?: string };

type ItemsBoxProps = {
  items: Item[];
  variant: "completed" | "missing";
  title?: string;
};

const variantConfig = {
  completed: {
    icon: CheckCircle2,
    borderColor: "border-emerald-400/30",
    bgColor: "bg-emerald-950/40",
    textColor: "text-emerald-100",
    iconColor: "text-emerald-500",
    titleColor: "text-emerald-300",
  },
  missing: {
    icon: AlertCircle,
    borderColor: "border-amber-400/30",
    bgColor: "bg-amber-950/40",
    textColor: "text-amber-100",
    iconColor: "text-amber-500",
    titleColor: "text-amber-300",
  },
};

export function ItemsBox({ items, variant, title }: ItemsBoxProps) {
  if (items.length === 0) return null;

  const config = variantConfig[variant];
  const Icon = config.icon as LucideIcon;

  return (
    <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-4`}>
      {title && <h3 className={`mb-3 text-sm font-semibold ${config.titleColor}`}>{title}</h3>}
      <ul className={`text-sm ${config.textColor} space-y-2`}>
        {items.map((item, index) => {
          const text = typeof item === "string" ? item : item.text;
          const key = typeof item === "string" ? index : item.id;
          const usePreLine = typeof item !== "string";

          return (
            <li key={key} className="flex items-start gap-2">
              <Icon className={`h-4 w-4 flex-shrink-0 ${config.iconColor} mt-0.5`} />
              <span className={usePreLine ? "whitespace-pre-line" : ""}>{text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
