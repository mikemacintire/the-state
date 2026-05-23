/**
 * Click-target polygons for each district, drawn in the SVG viewBox space
 * `0 0 800 600` (matching the natural aspect of `public/map.png`). The
 * coordinates roughly trace the regions visible on the map; they overlap
 * a little at borders but each click resolves to the topmost match.
 *
 * Polygons are author-eyeballed for v1 — close enough to feel right
 * without each click pixel-perfect. Tightening them is a polish pass.
 */
export interface MapRegion {
  districtId: string;
  /** SVG polygon points: "x,y x,y x,y ..." */
  points: string;
}

export const MAP_REGIONS: readonly MapRegion[] = [
  // Northmark Highlands — the mountains across the top.
  { districtId: 'frontier', points: '180,40 540,40 580,160 140,160' },
  // Border Outpost — far western star-fort.
  { districtId: 'garrison', points: '20,180 120,180 120,300 20,300' },
  // The Farmlands — patchwork hedgerow west.
  { districtId: 'farmland', points: '120,170 240,170 260,340 100,360' },
  // Oldtown — small octagonal walled town just west of the Capital.
  { districtId: 'oldtown', points: '240,210 310,210 310,265 240,265' },
  // The Capital — center-walled-city.
  { districtId: 'capital', points: '300,195 405,195 405,285 300,285' },
  // Industrial District — gridded factories east of the Capital.
  { districtId: 'industrial', points: '410,180 555,180 555,290 410,290' },
  // Eastport Harbor — coastal harbor.
  { districtId: 'port', points: '555,210 730,210 730,340 555,340' },
  // Riverside Campus — south-central.
  { districtId: 'university', points: '405,295 545,295 545,385 405,385' },
  // Southgate Quarter — sprawling lower-density south.
  { districtId: 'outerwards', points: '180,330 405,330 405,495 180,495' },
];

function computeCentroid(pointsStr: string): { x: number; y: number } {
  const pts = pointsStr.split(/\s+/).filter(Boolean).map((p) => {
    const [x, y] = p.split(',').map(Number);
    return { x, y };
  });
  const x = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
  const y = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
  return { x, y };
}

const CENTROIDS: Record<string, { x: number; y: number }> = Object.fromEntries(
  MAP_REGIONS.map((r) => [r.districtId, computeCentroid(r.points)]),
);

/**
 * Returns the centroid (mean of polygon vertices) of the named district in
 * SVG viewBox coordinates (0..800, 0..600). Used by the spatial event
 * surface to position callouts and the floating crisis modal. Mean-of-
 * vertices is not the true geometric centroid for non-uniform polygons,
 * but the regions are author-eyeballed rectangles where the two converge.
 */
export function centroidOf(districtId: string): { x: number; y: number } | null {
  return CENTROIDS[districtId] ?? null;
}
