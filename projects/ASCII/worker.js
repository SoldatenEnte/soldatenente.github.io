const ASCII_CHAR_RAMP = ` .:-=+*#%@`;
let charWidth, charHeight;

const PALETTE = [
  { r: 0, g: 0, b: 0 },
  { r: 0, g: 48, b: 12 },
  { r: 0, g: 82, b: 24 },
  { r: 15, g: 110, b: 35 },
  { r: 30, g: 135, b: 45 },
  { r: 45, g: 158, b: 55 },
  { r: 60, g: 180, b: 65 },
  { r: 80, g: 205, b: 80 },
  { r: 100, g: 228, b: 95 },
  { r: 125, g: 240, b: 110 },
  { r: 150, g: 250, b: 125 },
  { r: 175, g: 255, b: 140 },
  { r: 200, g: 255, b: 155 },
  { r: 220, g: 255, b: 175 },
  { r: 240, g: 255, b: 200 },
  { r: 255, g: 255, b: 225 },
];

const LUM_R = 306;
const LUM_G = 601;
const LUM_B = 117;
const LUMINANCE_TO_CHAR_LUT = new Array(256);

function generateLuminanceMap() {
  const RAMP_LAST_INDEX = ASCII_CHAR_RAMP.length - 1;
  for (let lum = 0; lum < 256; lum++) {
    const charIndex = Math.floor((lum / 255) * RAMP_LAST_INDEX);
    LUMINANCE_TO_CHAR_LUT[lum] = ASCII_CHAR_RAMP[charIndex];
  }
}
generateLuminanceMap();

function findNearestColor(r, g, b) {
  let nearestColor = PALETTE[0];
  let minDistanceSquared = Infinity;

  for (const color of PALETTE) {
    const dr = r - color.r;
    const dg = g - color.g;
    const db = b - color.b;
    const distanceSquared = dr * dr + dg * dg + db * db;

    if (distanceSquared < minDistanceSquared) {
      minDistanceSquared = distanceSquared;
      nearestColor = color;
    }
  }
  return nearestColor;
}

const processFrame = (e) => {
  const { imageData, config } = e.data;
  const { width, height, isColorEnabled, saturation, brightness } = config;
  const frameData = imageData.data;
  let lines;
  let colorBatches;

  if (isColorEnabled) {
    colorBatches = {};
    for (let y = 0; y < height; y++) {
      const lineChunks = {};
      let lastColor = null;
      let currentChunkText = "";
      let currentChunkX = 0;

      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        let r = frameData[i],
          g = frameData[i + 1],
          b = frameData[i + 2];
        const lum = (r * LUM_R + g * LUM_G + b * LUM_B) >> 10;

        r = Math.min(255, r * brightness);
        g = Math.min(255, g * brightness);
        b = Math.min(255, b * brightness);

        if (saturation !== 1) {
          r = Math.min(255, lum + (r - lum) * saturation);
          g = Math.min(255, lum + (g - lum) * saturation);
          b = Math.min(255, lum + (b - lum) * saturation);
        }

        const nearestPaletteColor = findNearestColor(r, g, b);
        const currentColor = `rgb(${nearestPaletteColor.r},${nearestPaletteColor.g},${nearestPaletteColor.b})`;
        const char = LUMINANCE_TO_CHAR_LUT[lum];

        if (lastColor === null) {
          lastColor = currentColor;
          currentChunkX = x;
        }

        if (currentColor === lastColor) {
          currentChunkText += char;
        } else {
          if (currentChunkText.trim() !== "") {
            if (!lineChunks[lastColor]) lineChunks[lastColor] = [];
            lineChunks[lastColor].push({
              x: currentChunkX,
              text: currentChunkText,
            });
          }
          lastColor = currentColor;
          currentChunkText = char;
          currentChunkX = x;
        }
      }
      if (currentChunkText.trim() !== "") {
        if (!lineChunks[lastColor]) lineChunks[lastColor] = [];
        lineChunks[lastColor].push({
          x: currentChunkX,
          text: currentChunkText,
        });
      }

      for (const color in lineChunks) {
        if (!colorBatches[color]) colorBatches[color] = [];
        for (const chunk of lineChunks[color]) {
          colorBatches[color].push({
            x: chunk.x * charWidth,
            y: y * charHeight + charHeight,
            text: chunk.text,
          });
        }
      }
    }
  } else {
    lines = new Array(height);
    for (let y = 0; y < height; y++) {
      let line = "";
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const lum =
          (frameData[i] * LUM_R +
            frameData[i + 1] * LUM_G +
            frameData[i + 2] * LUM_B) >>
          10;
        line += LUMINANCE_TO_CHAR_LUT[lum];
      }
      lines[y] = line;
    }
  }

  self.postMessage({
    type: "frame",
    data: { isColor: isColorEnabled, lines, colorBatches, charHeight },
  });
};

self.onmessage = (e) => {
  switch (e.data.type) {
    case "processFrame":
      processFrame(e);
      break;
    case "updateDimensions":
      charWidth = e.data.config.charWidth;
      charHeight = e.data.config.charHeight;
      break;
  }
};
