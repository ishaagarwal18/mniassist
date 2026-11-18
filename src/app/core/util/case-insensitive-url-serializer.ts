import { DefaultUrlSerializer, Routes, UrlSegmentGroup, UrlTree } from '@angular/router';

/** Every static (non-parameter) path segment declared in the route config, lowercased. */
export function collectStaticSegments(routes: Routes, into = new Set<string>()): Set<string> {
  for (const route of routes) {
    for (const part of (route.path ?? '').split('/')) {
      if (part && !part.startsWith(':') && part !== '**') into.add(part.toLowerCase());
    }
    if (route.children) collectStaticSegments(route.children, into);
  }
  return into;
}

/**
 * Router paths are case-sensitive, so "/Channels" showed "Page not found".
 * Lowercases only segments that match a known route segment, so ids, tokens
 * and other parameters keep their case.
 */
export class CaseInsensitiveUrlSerializer extends DefaultUrlSerializer {
  constructor(private readonly known: Set<string>) {
    super();
  }

  override parse(url: string): UrlTree {
    const tree = super.parse(url);
    this.fix(tree.root);
    return tree;
  }

  private fix(group: UrlSegmentGroup): void {
    for (const segment of group.segments) {
      const lower = segment.path.toLowerCase();
      if (lower !== segment.path && this.known.has(lower)) segment.path = lower;
    }
    for (const child of Object.values(group.children)) this.fix(child);
  }
}
