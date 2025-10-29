# Debug Instructions for Reset & Spawn Issues

## Changes Made

### 1. Spawn Location Fix
- **Issue**: Components were spawning and then the view was auto-panning to them
- **Fix**: Removed the `setFocusCenter` call that was causing the view to move after spawning
- **Result**: Components now spawn at the center of the current viewport without moving the view

### 2. Reset Button Fix
- **Issue**: Reset was only centering on the last component
- **Fix**: 
  - Improved bounds calculation to consider ALL nodes
  - Added padding around bounds for better visibility
  - Ensured scale is calculated to fit all components in 85% of viewport
  - Added debug logging to trace the calculation

### 3. World Center Tracking
- **Issue**: `worldCenter` state might not be initialized on first component spawn
- **Fix**: Added useEffect to emit world center on mount and window resize
- **Result**: World center is always up-to-date when spawning components

## How to Test

### Test Spawn Location
1. Open http://localhost:3003
2. Pan to a specific area of the board (away from center)
3. Click a component from the palette
4. **Expected**: Component should appear in the center of your current view
5. Check console for: `Spawn - worldCenter:` and `Spawn - component at:` logs

### Test Reset Button  
1. Add 3-5 components in different areas (spread them out)
2. Pan/zoom to see only some components
3. Click the "reset" button
4. **Expected**: View should zoom out and center to show ALL components with padding
5. Check console for: `Reset - Nodes:`, `Reset - Bounds:`, `Reset - Center:`, `Reset - Scale:` logs

## Debug Logs to Share

When testing, please share these console logs:
- `emitWorldCenter:` - Shows viewport center calculation
- `Spawn - worldCenter:` - Shows world center state when spawning
- `Spawn - component at:` - Shows final spawn coordinates
- `Reset - Nodes:` - Number of nodes  
- `Reset - Bounds:` - Bounding box of all nodes
- `Reset - Center:` - Calculated center point
- `Reset - Scale:` - Zoom scale calculations

## Known Behavior

- Components spawn at grid-snapped positions (multiples of 24)
- Reset fits all components within 85% of viewport (15% padding)
- World center updates on: transform, resize, init
