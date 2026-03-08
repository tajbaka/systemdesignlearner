"use client";

import { useMemo } from "react";
import { NumberedLinkList } from "./components/NumberedLinkList";
import { useTableOfContents } from "./hooks/useTableOfContents";

interface TableOfContentsProps {
  items: Array<{ id: string; title: string }>;
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const { handleClick } = useTableOfContents();

  const linkItems = useMemo(
    () => items.map((item) => ({ id: item.id, label: item.title })),
    [items]
  );

  return (
    <NumberedLinkList title="Content of this blog" items={linkItems} onItemClick={handleClick} />
  );
}
