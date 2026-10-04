/**
 * A resource's value, or `fallback` once its request has failed. Angular's
 * `resource.value()` throws after a failed request, and a throw inside a
 * computed() or template stops the whole screen from updating — buttons go dead
 * and the page freezes on whatever it showed last. The failure itself is shown
 * as a toast by the API feedback interceptor.
 */
export function settled<T>(
  resource: { hasValue(): boolean; value(): T; error(): unknown },
  fallback: T,
): T {
  return resource.error() ? fallback : resource.value();
}
