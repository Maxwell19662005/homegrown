export type Neighborhood = { name: string; borough: string; lat: number; lng: number };

export const NEIGHBORHOODS: Neighborhood[] = [
  { name: 'Astoria', borough: 'Queens', lat: 40.7644, lng: -73.9235 },
  { name: 'Bed-Stuy', borough: 'Brooklyn', lat: 40.6872, lng: -73.9418 },
  { name: 'Bushwick', borough: 'Brooklyn', lat: 40.6944, lng: -73.9213 },
  { name: 'Crown Heights', borough: 'Brooklyn', lat: 40.6694, lng: -73.9422 },
  { name: 'Flatbush', borough: 'Brooklyn', lat: 40.6409, lng: -73.9624 },
  { name: 'Flushing', borough: 'Queens', lat: 40.7675, lng: -73.8331 },
  { name: 'Forest Hills', borough: 'Queens', lat: 40.7181, lng: -73.8448 },
  { name: 'Greenpoint', borough: 'Brooklyn', lat: 40.7305, lng: -73.9515 },
  { name: 'Harlem', borough: 'Manhattan', lat: 40.8116, lng: -73.9465 },
  { name: 'Jackson Heights', borough: 'Queens', lat: 40.7557, lng: -73.8831 },
  { name: 'Long Island City', borough: 'Queens', lat: 40.7447, lng: -73.9485 },
  { name: 'Maspeth', borough: 'Queens', lat: 40.723, lng: -73.9126 },
  { name: 'Mott Haven', borough: 'Bronx', lat: 40.8091, lng: -73.9229 },
  { name: 'Park Slope', borough: 'Brooklyn', lat: 40.671, lng: -73.9814 },
  { name: 'Ridgewood', borough: 'Queens', lat: 40.7043, lng: -73.9018 },
  { name: 'St. George', borough: 'Staten Island', lat: 40.6437, lng: -74.0736 },
  { name: 'Sunnyside', borough: 'Queens', lat: 40.7433, lng: -73.9196 },
  { name: 'Sunset Park', borough: 'Brooklyn', lat: 40.6455, lng: -74.0124 },
  { name: 'Washington Heights', borough: 'Manhattan', lat: 40.8417, lng: -73.9394 },
  { name: 'Williamsburg', borough: 'Brooklyn', lat: 40.7081, lng: -73.9571 },
];

export const DEFAULT_NEIGHBORHOOD = 'Ridgewood';

export function findNeighborhood(name?: string | null): Neighborhood {
  return NEIGHBORHOODS.find((n) => n.name === name) ?? NEIGHBORHOODS.find((n) => n.name === DEFAULT_NEIGHBORHOOD)!;
}

export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Listings are shown at an approximate point near the seller's neighborhood, never their address.
export function fuzzyPoint(n: Neighborhood): { lat: number; lng: number } {
  const j = () => (Math.random() - 0.5) * 0.012;
  return { lat: n.lat + j(), lng: n.lng + j() };
}
