/**
 * Simple Dijkstra shortest path over the directed Node/Edge route graph.
 * The graph is small (a single building's walkable network), so no
 * priority-queue library is needed — see spec section 3.1.
 */
function shortestPath(edges, fromNodeId, toNodeId) {
  const adjacency = new Map();
  for (const edge of edges) {
    if (!adjacency.has(edge.from_node_id)) adjacency.set(edge.from_node_id, []);
    adjacency.get(edge.from_node_id).push(edge);
  }

  const distances = new Map([[fromNodeId, 0]]);
  const previousEdge = new Map();
  const visited = new Set();
  const unvisited = new Set([fromNodeId]);

  while (unvisited.size > 0) {
    let currentId = null;
    let currentDist = Infinity;
    for (const id of unvisited) {
      const d = distances.get(id) ?? Infinity;
      if (d < currentDist) {
        currentDist = d;
        currentId = id;
      }
    }
    if (currentId === null) break;
    unvisited.delete(currentId);
    visited.add(currentId);

    if (currentId === toNodeId) break;

    const neighbors = adjacency.get(currentId) || [];
    for (const edge of neighbors) {
      if (visited.has(edge.to_node_id)) continue;
      const candidate = currentDist + edge.distance_meters;
      const known = distances.get(edge.to_node_id) ?? Infinity;
      if (candidate < known) {
        distances.set(edge.to_node_id, candidate);
        previousEdge.set(edge.to_node_id, edge);
        unvisited.add(edge.to_node_id);
      }
    }
  }

  if (!distances.has(toNodeId)) {
    return null;
  }

  const path = [];
  let cursor = toNodeId;
  while (cursor !== fromNodeId) {
    const edge = previousEdge.get(cursor);
    if (!edge) return null;
    path.unshift(edge);
    cursor = edge.from_node_id;
  }

  return {
    totalDistanceMeters: distances.get(toNodeId),
    edges: path,
  };
}

module.exports = { shortestPath };
