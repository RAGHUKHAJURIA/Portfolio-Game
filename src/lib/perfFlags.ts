/** Diagnostic A/B switches; ordinary visits cannot disable game systems. */
export function perfFlag(name: string) {
  const query = new URLSearchParams(window.location.search)
  return query.has('debug') && query.get('perf')?.split(',').includes(name) === true
}
