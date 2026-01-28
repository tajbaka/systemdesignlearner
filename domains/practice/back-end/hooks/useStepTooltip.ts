import { useState, useEffect } from "react";
import useStepStateStore from "../store/useStore";

export function useStepTooltip(stepType: string | null, slug: string) {
  const { viewedTooltips, setViewedTooltip } = useStepStateStore(slug);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  useEffect(() => {
    if (stepType) {
      // Check if this step's tooltip has been viewed
      const hasViewed = Array.isArray(viewedTooltips) && viewedTooltips.includes(stepType);
      if (!hasViewed) {
        setTooltipOpen(true);
        // Mark as viewed
        setViewedTooltip(stepType);
      }
    }
  }, [stepType, viewedTooltips, setViewedTooltip]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTooltipOpen(!tooltipOpen);
  };

  const handleClickOutside = () => {
    setTooltipOpen(false);
  };

  return {
    tooltipOpen,
    handleClick,
    handleClickOutside,
  };
}
