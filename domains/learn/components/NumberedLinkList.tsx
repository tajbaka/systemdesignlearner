import { MouseEvent } from "react";

interface NumberedLinkListItem {
  id: string;
  label: string;
}

interface NumberedLinkListProps {
  title?: string;
  items: NumberedLinkListItem[];
  onItemClick?: (e: MouseEvent<HTMLAnchorElement>, id: string) => void;
  buildHref?: (id: string) => string;
}

export function NumberedLinkList({
  title,
  items,
  onItemClick,
  buildHref = (id) => `#${id}`,
}: NumberedLinkListProps) {
  return (
    <div className="mb-12">
      {title && <h3 className="mb-5 text-[16px] font-bold text-zinc-700">{title}</h3>}
      <nav>
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-start gap-2">
              <span className="text-zinc-500 font-medium">{index + 1}.</span>
              <a
                href={buildHref(item.id)}
                onClick={onItemClick ? (e) => onItemClick(e, item.id) : undefined}
                className="text-[16px] text-zinc-700 hover:text-zinc-900 underline decoration-zinc-400 underline-offset-2 hover:decoration-zinc-600 transition-colors cursor-pointer"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
