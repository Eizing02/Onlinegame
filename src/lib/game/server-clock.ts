import "server-only";
/** Serialize the request's clock once; hydration must reuse exactly this anchor. */
export function serverClockAnchor() { return Date.now(); }
