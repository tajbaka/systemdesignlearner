"  client";

import { HighLevelDesignUI } from "./HighLevelDesignUI";
import { HighLevelDesignComponentList } from "./HighLevelDesignComponentList";
import { useHighLevelDesign, useHighLevelDesignComponentList } from "@/hooks";
import { usePracticeSession } from "./PracticeSessionProvider";

type HighLevelDesignStepProps = {
  mobilePaletteOpen: boolean;
  onMobilePaletteChange: (open: boolean) => void;
};

export function HighLevelDesignStep({
  mobilePaletteOpen,
  onMobilePaletteChange,
}: HighLevelDesignStepProps) {
  const designProps = useHighLevelDesign();
  const { isReadOnly } = usePracticeSession();

  const componentListHandlers = useHighLevelDesignComponentList({
    isReadOnly,
    onAddNode: designProps.onAddNode,
    onClose: () => onMobilePaletteChange(false),
  });

  return (
    <>
      <div className="relative flex h-full w-full flex-col overflow-hidden pt-4 sm:pt-0">
        <div className="relative flex flex-1 w-full overflow-hidden">
          <HighLevelDesignUI {...designProps} />
        </div>
      </div>

      <HighLevelDesignComponentList
        isOpen={mobilePaletteOpen}
        paletteItems={designProps.paletteItems}
        onClose={() => onMobilePaletteChange(false)}
        onSpawn={componentListHandlers.handleSpawn}
        onDragOver={componentListHandlers.handleDragOver}
        onDrop={componentListHandlers.handleDrop}
      />
    </>
  );
}

export default HighLevelDesignStep;
