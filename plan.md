# React Flow Migration Plan

## Overview
This document outlines the migration from the current custom canvas/SVG-based graphing system to React Flow (@xyflow/react). The current implementation uses `react-zoom-pan-pinch` for pan/zoom, custom SVG rendering for edges, and manual node/handle management.

## Current Architecture
- **Board.tsx**: Custom pan/zoom wrapper using `react-zoom-pan-pinch`
- **NodeCard.tsx**: Manual node rendering with custom handles (N/E/S/W ports)
- **SVG Edges**: Custom edge rendering in Board.tsx with manual path calculation
- **State Management**: Custom nodes/edges arrays with manual state updates
- **Interaction**: Custom mouse/touch handlers for selection, dragging, connecting

## Target Architecture
- **ReactFlow**: Built-in pan/zoom, node management, edge rendering
- **Custom Node Types**: Convert NodeCard to React Flow custom node component
- **Built-in Handles**: Use React Flow's Handle components instead of custom ports
- **React Flow Hooks**: Use `useNodesState`, `useEdgesState`, `useReactFlow` for state management
- **Built-in Interactions**: Leverage React Flow's selection, dragging, and connection logic

## Migration Steps

### ✅ Phase 1: Setup and Dependencies - COMPLETED
1. **Install React Flow** ✅
   ```bash
   npm install @xyflow/react
   ```
   - Added to package.json dependencies
   - Imported React Flow CSS in globals.css

2. **Update Type Definitions** ✅
   - Created `SystemDesignNode` and `SystemDesignEdge` types
   - Added conversion utilities between legacy and React Flow formats
   - Updated type imports throughout codebase

### ✅ Phase 2: Core Component Migration - COMPLETED

3. **Replace Board Component** ✅
   - Removed `react-zoom-pan-pinch` dependency
   - Created `ReactFlowBoard` component using `<ReactFlow>`
   - Migrated pan/zoom to React Flow's built-in functionality
   - Updated coordinate system conversions (center ↔ top-left)

4. **Create Custom Node Component** ✅
   - Converted `NodeCard` to `SystemDesignNode` with React Flow `<Handle>` components
   - Maintained visual styling, animations, and interactions
   - Updated positioning calculations for React Flow

5. **Update Edge Management** ✅
   - Removed custom SVG edge rendering
   - Using React Flow's built-in edge types and rendering
   - Updated edge creation/deletion through React Flow hooks
   - Migrated edge styling and selection to React Flow

### ✅ Phase 3: State Management Migration - COMPLETED

6. **Update State Management** ✅
   - Replaced manual `nodes`/`edges` arrays with `useNodesState`/`useEdgesState`
   - Updated all CRUD operations to use React Flow hooks
   - Migrated selection state management
   - Updated connection logic to use React Flow's `onConnect`

7. **Update Interaction Handlers** ✅
   - Replaced custom mouse/touch handlers with React Flow callbacks
   - Updated `onConnect`, `onNodesChange`, `onEdgesChange` handlers
   - Migrated selection and dragging to React Flow's built-in behavior
   - Updated keyboard shortcuts

8. **Update Undo/Redo System** ✅
   - Modified undo stack to convert between React Flow and legacy formats
   - Updated snapshot logic to work with React Flow data structures
   - Maintained compatibility with existing UndoStack interface

### 🔄 Phase 4: Feature Migration - MOSTLY HANDLED BY REACT FLOW

9. **Update Path Highlighting** 🔄
   - Simulation path visualization now handled through React Flow node/edge data
   - Edge styling for path highlighting needs verification
   - Visual feedback for simulation results maintained

10. **Update Share/Fork Functionality** ✅
    - Data serialization works with conversion utilities
    - URL sharing preserves functionality
    - Read-only mode handling maintained

11. **Update Mobile Interactions** 🔄
    - Touch interactions now handled by React Flow
    - Mobile-specific UI components need testing
    - Responsive behavior should be maintained

12. **Update Styling and Theming** ✅
    - CSS compatible with React Flow
    - Custom styles maintained for nodes/edges
    - Dark theme preserved

### 🧪 Phase 5: Testing and Polish - IN PROGRESS

13. **Comprehensive Testing** 🧪
    - Test all CRUD operations (create, update, delete nodes/edges)
    - Verify pan/zoom functionality
    - Test connection logic and validation
    - Ensure simulation still works correctly
    - Test share/fork functionality
    - Verify mobile responsiveness
    - Check undo/redo functionality

## Key Technical Considerations

### Coordinate System Changes
- **Current**: Node position is center point (x, y)
- **React Flow**: Node position is top-left corner
- **Migration**: Adjust positioning calculations by half node dimensions

### Handle Management
- **Current**: Custom N/E/S/W ports with manual positioning
- **React Flow**: `<Handle>` components with relative positioning
- **Migration**: Convert to Handle components with proper positioning

### State Synchronization
- **Current**: Manual state updates with direct array manipulation
- **React Flow**: State managed through hooks with change callbacks
- **Migration**: Update all state mutations to use React Flow patterns

### Event Handling
- **Current**: Custom event handlers for all interactions
- **React Flow**: Built-in event system with callbacks
- **Migration**: Replace custom handlers with React Flow equivalents

## Benefits of Migration

1. **Reduced Complexity**: Eliminate ~600 lines of custom board/interaction code
2. **Better Performance**: React Flow optimizations for large graphs
3. **Enhanced Features**: Built-in features like multi-selection, copy/paste, etc.
4. **Active Maintenance**: Regular updates and community support
5. **Accessibility**: Built-in keyboard navigation and screen reader support
6. **Extensibility**: Rich ecosystem of plugins and extensions

## Potential Challenges

1. **Custom Interactions**: Some advanced mobile interactions may need custom implementation
2. **Visual Consistency**: Ensuring exact visual match with current design
3. **Performance**: Large graphs may need optimization (though React Flow handles this well)
4. **Breaking Changes**: React Flow updates may introduce breaking changes

## Success Criteria

- All existing functionality works identically
- Visual appearance matches current design
- Performance is maintained or improved
- Mobile experience remains smooth
- Share/fork functionality preserved
- All tests pass

## Rollback Plan

If migration encounters blocking issues:
1. Keep current implementation as backup
2. Gradually migrate components rather than big-bang approach
3. Use feature flags to switch between implementations
4. Ensure comprehensive test coverage before migration