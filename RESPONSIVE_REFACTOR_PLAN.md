# Responsive Layout Refactor Plan

## Structure Created

```
app/components/
├── layout/
│   ├── MobileLayout.tsx      # Mobile shell (< 1024px)
│   └── DesktopLayout.tsx     # Desktop shell (≥ 1024px)
├── mobile/
│   ├── MobileTopBar.tsx      # Top navigation with action buttons
│   └── MobileSimulationPanel.tsx  # Collapsible bottom panel
├── desktop/
│   └── DesktopSidebar.tsx    # Left sidebar wrapper
└── ... (existing components)
```

## Implementation Strategy

The SystemDesignEditor will render BOTH layouts simultaneously:
- Mobile layout uses `lg:hidden` (shown < 1024px)
- Desktop layout uses `hidden lg:grid` (shown ≥ 1024px)

This allows:
1. **Clean separation** of mobile vs desktop UI code
2. **Shared logic** in the main component
3. **Consistent behavior** across both layouts
4. **Easy maintenance** - change one without affecting the other

## Key Differences

### Mobile (< 1024px)
- Top bar with 3 action buttons
- Full-screen canvas
- Collapsible bottom simulation panel (70vh max)
- Bottom sheet for adding components
- No sidebar
- Tap-to-connect mode
- Auto-centering on component add

### Desktop (≥ 1024px)
- Traditional left sidebar (340px)
- Component palette (click or drag to add)
- Undo/Redo buttons
- Full scenario panel (scrollable)
- Selected node panel
- Larger canvas area
- Drag-from-port connections
- Both mouse and touch events supported

## Shared Components
- Board.tsx - Works for both mobile and desktop
- NodeCard.tsx - Touch + mouse events
- ScenarioPanel.tsx - Adapts to container
- SelectedNodePanel.tsx - Desktop only
- Palette.tsx - Desktop only
- BottomSheet.tsx - Mobile only

## Next Steps
1. Update SystemDesignEditor return statement to use responsive layouts
2. Test on mobile viewport (< 1024px)
3. Test on desktop viewport (≥ 1024px)
4. Verify touch events work on both
5. Ensure all functionality preserved
