"use client";

import { useState } from "react";
import { AuthenticatedNavbar } from "@/domains/authentication/AuthenticatedNavbar";
import { Sidebar } from "@/components/sidebar";
import { GitBranch, LayoutGrid } from "lucide-react";
import dynamic from "next/dynamic";
import type { ProblemSimpleResponse } from "@/app/api/v2/practice/schemas";

const PracticeTree = dynamic(
  () =>
    import("@/domains/practice/components/practice-tree/PracticeTree").then((m) => m.PracticeTree),
  { ssr: false }
);

const PracticeList = dynamic(() =>
  import("@/domains/practice/components/PracticeList").then((m) => m.PracticeList)
);

type PracticePageClientProps = {
  problems: ProblemSimpleResponse[];
};

export function PracticePageClient({ problems }: PracticePageClientProps) {
  const [view, setView] = useState<"tree" | "list">("tree");

  return (
    <div
      className={`bg-zinc-950 flex flex-col ${view === "tree" ? "h-screen overflow-hidden" : "min-h-screen"}`}
    >
      <AuthenticatedNavbar hideIcon={true} hideOnMobile={true} />
      <Sidebar theme="dark" />

      <div className={`md:ml-16 flex-1 ${view === "tree" ? "min-h-0" : ""} relative`}>
        {/* View toggle */}
        <button
          onClick={() => setView(view === "tree" ? "list" : "tree")}
          title={view === "tree" ? "Switch to list view" : "Switch to tree view"}
          className="absolute top-3 right-4 z-50 flex items-center gap-1.5 rounded-lg bg-zinc-800/80 backdrop-blur px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-700/80 transition-all border border-zinc-700/50"
        >
          {view === "tree" ? (
            <>
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </>
          ) : (
            <>
              <GitBranch className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tree</span>
            </>
          )}
        </button>
        {view === "tree" ? (
          <PracticeTree problems={problems} />
        ) : (
          <PracticeList problems={problems} />
        )}
      </div>
    </div>
  );
}
