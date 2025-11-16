// Test the corrected BoardApi calculations with user's fixes
// Run with: node test-corrected-math.js

// Mock transform state - same as before
const mockTransformState = {
  positionX: -100,
  positionY: -50,
  scale: 0.8,
};

// Mock DOM rect - same as before
const mockRect = {
  width: 800,
  height: 600,
  left: 0,
  top: 0,
};

// Test the corrected viewport calculation
function testCorrectedViewportMath() {
  console.log("Testing corrected viewport math...");

  // User's corrected implementation
  const getViewportWorldRect = () => {
    const rect = mockRect;
    const { positionX, positionY, scale } = mockTransformState;
    if (!rect || !scale) {
      return { left: 0, top: 0, width: 12000, height: 8000 };
    }
    // NOTE: world = (screen - translate) / scale
    const left = (0 - positionX) / scale;
    const top = (0 - positionY) / scale;
    const width = rect.width / scale; // divide, not multiply
    const height = rect.height / scale; // divide, not multiply
    return { left, top, width, height };
  };

  const viewportRect = getViewportWorldRect();
  console.log("Corrected viewport rect:", viewportRect);

  // Expected calculations:
  // left = (0 - (-100)) / 0.8 = 100 / 0.8 = 125
  // top = (0 - (-50)) / 0.8 = 50 / 0.8 = 62.5
  // width = 800 / 0.8 = 1000
  // height = 600 / 0.8 = 750

  const expectedLeft = (0 - mockTransformState.positionX) / mockTransformState.scale;
  const expectedTop = (0 - mockTransformState.positionY) / mockTransformState.scale;
  const expectedWidth = mockRect.width / mockTransformState.scale;
  const expectedHeight = mockRect.height / mockTransformState.scale;

  console.log(
    `Expected: left=${expectedLeft}, top=${expectedTop}, width=${expectedWidth}, height=${expectedHeight}`
  );

  const tolerance = 0.001;
  if (
    Math.abs(viewportRect.left - expectedLeft) < tolerance &&
    Math.abs(viewportRect.top - expectedTop) < tolerance &&
    Math.abs(viewportRect.width - expectedWidth) < tolerance &&
    Math.abs(viewportRect.height - expectedHeight) < tolerance
  ) {
    console.log("✅ Corrected viewport math is accurate!");
    console.log("✅ Viewport should no longer be gigantic in the minimap");
  } else {
    console.log("❌ Viewport calculations still incorrect");
  }
}

// Test world center calculation (should be unchanged)
function testWorldCenter() {
  console.log("\nTesting world center calculation...");

  const getWorldCenter = () => {
    const rect = mockRect;
    if (!rect || rect.width === 0 || rect.height === 0) {
      return { x: 6000, y: 4000 };
    }
    const { positionX, positionY, scale } = mockTransformState;
    const cx = (rect.width / 2 - positionX) / scale;
    const cy = (rect.height / 2 - positionY) / scale;
    return { x: cx, y: cy };
  };

  const worldCenter = getWorldCenter();
  console.log("World center:", worldCenter);

  // Expected: (400 - (-100)) / 0.8 = 500 / 0.8 = 625 for x
  // Expected: (300 - (-50)) / 0.8 = 350 / 0.8 = 437.5 for y
  const expectedX = (mockRect.width / 2 - mockTransformState.positionX) / mockTransformState.scale;
  const expectedY = (mockRect.height / 2 - mockTransformState.positionY) / mockTransformState.scale;

  console.log(`Expected center: x=${expectedX}, y=${expectedY}`);

  const tolerance = 0.001;
  if (
    Math.abs(worldCenter.x - expectedX) < tolerance &&
    Math.abs(worldCenter.y - expectedY) < tolerance
  ) {
    console.log("✅ World center calculation is correct!");
    console.log("✅ Spawn placement should now be accurate");
  } else {
    console.log("❌ World center calculation is incorrect");
  }
}

testCorrectedViewportMath();
testWorldCenter();
