export const Vec2 = {
  distSq: (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  },
  dist: (x1, y1, x2, y2) => {
    return Math.sqrt(Vec2.distSq(x1, y1, x2, y2));
  },
  normalize: (x, y) => {
    const len = Math.sqrt(x * x + y * y);
    if (len > 0) return [x / len, y / len];
    return [0, 0];
  },
  lerp: (x1, y1, x2, y2, t) => {
    return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
  },
};
