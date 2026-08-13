export function toggleSelection(
  prev: ReadonlySet<string>,
  id: string,
  selected: boolean,
): ReadonlySet<string> {
  if (selected === prev.has(id)) {
    return prev;
  }
  const next = new Set(prev);
  if (selected) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return next;
}

export function toggleSelectAllVisible(
  prev: ReadonlySet<string>,
  visibleIds: readonly string[],
): ReadonlySet<string> {
  const next = new Set(prev);
  if (visibleIds.length > 0 && visibleIds.every((id) => prev.has(id))) {
    for (const id of visibleIds) {
      next.delete(id);
    }
  } else {
    for (const id of visibleIds) {
      next.add(id);
    }
  }
  return next;
}

export function pruneSelection(
  prev: ReadonlySet<string>,
  validIds: ReadonlySet<string>,
): ReadonlySet<string> {
  const next = new Set<string>();
  let dropped = false;
  for (const id of prev) {
    if (validIds.has(id)) {
      next.add(id);
    } else {
      dropped = true;
    }
  }
  return dropped ? next : prev;
}

export function allVisibleSelected(
  selected: ReadonlySet<string>,
  visibleIds: readonly string[],
): boolean {
  return visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
}
