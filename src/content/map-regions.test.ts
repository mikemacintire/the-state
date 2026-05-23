import { describe, it, expect } from 'vitest';
import { MAP_REGIONS, centroidOf } from './map-regions';

describe('map-regions centroids', () => {
  it('returns null for an unknown district id', () => {
    expect(centroidOf('atlantis')).toBeNull();
  });

  it('returns a centroid for every known district', () => {
    for (const r of MAP_REGIONS) {
      expect(centroidOf(r.districtId), `no centroid for ${r.districtId}`).not.toBeNull();
    }
  });

  it('places each centroid inside its polygon bounding box', () => {
    for (const r of MAP_REGIONS) {
      const c = centroidOf(r.districtId)!;
      const points = r.points.split(/\s+/).map((p) => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
      });
      const minX = Math.min(...points.map((p) => p.x));
      const maxX = Math.max(...points.map((p) => p.x));
      const minY = Math.min(...points.map((p) => p.y));
      const maxY = Math.max(...points.map((p) => p.y));
      expect(c.x, `${r.districtId} centroid x outside bbox`).toBeGreaterThanOrEqual(minX);
      expect(c.x, `${r.districtId} centroid x outside bbox`).toBeLessThanOrEqual(maxX);
      expect(c.y, `${r.districtId} centroid y outside bbox`).toBeGreaterThanOrEqual(minY);
      expect(c.y, `${r.districtId} centroid y outside bbox`).toBeLessThanOrEqual(maxY);
    }
  });

  it('places the capital centroid at the rectangular polygon center', () => {
    // capital points: 300,195 405,195 405,285 300,285  → center 352.5, 240
    const c = centroidOf('capital')!;
    expect(c.x).toBeCloseTo(352.5, 1);
    expect(c.y).toBeCloseTo(240, 1);
  });
});
