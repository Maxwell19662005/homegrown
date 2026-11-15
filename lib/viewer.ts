import 'server-only';
import { getUser } from './auth';
import { findNeighborhood } from './neighborhoods';

/** The neighborhood to show results for: ?n= wins, then the user's saved one, then the default. */
export async function viewerNeighborhood(n?: string) {
  const user = await getUser();
  return { user, hood: findNeighborhood(n || user?.neighborhood) };
}
