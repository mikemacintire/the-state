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
