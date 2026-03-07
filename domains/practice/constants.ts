export const BUTTON_CONFIG = {
  completed: { text: "View Results", href: "/practice/[slug]/score", color: "green" },
  in_progress: { text: "Continue", href: "/practice/[slug]?continue=true", color: "blue" },
  not_started: { text: "Start Practice", href: "/practice/[slug]", color: "blue" },
} as const;

export const BUTTON_COLORS = {
  green: "bg-green-600 hover:bg-green-500",
  yellow: "bg-yellow-600 hover:bg-yellow-500",
  red: "bg-red-600 hover:bg-red-500",
  blue: "bg-blue-600 hover:bg-blue-500",
} as const;

export const DIFFICULTY_COLORS = {
  easy: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  medium: {
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
  },
  hard: {
    bg: "bg-red-500/20",
    text: "text-red-400",
    border: "border-red-500/30",
  },
} as const;

export function getButtonConfig(
  status: "in_progress" | "completed" | null,
  slug: string
): { text: string; href: string; color: string } {
  const statusKey = status ?? "not_started";
  const config = BUTTON_CONFIG[statusKey];
  const buttonColor = config.color as keyof typeof BUTTON_COLORS;

  return {
    text: config.text,
    href: config.href.replace("[slug]", slug),
    color: BUTTON_COLORS[buttonColor],
  };
}

export function getDifficultyColors(difficulty: "easy" | "medium" | "hard" | null): string {
  const difficultyKey = difficulty ?? "medium";
  const colors = DIFFICULTY_COLORS[difficultyKey];
  return `${colors.bg} ${colors.text} ${colors.border}`;
}
