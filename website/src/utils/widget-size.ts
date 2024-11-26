export function width(proc: Positionable) {
  return proc.size?.width ?? 50;
}

export function height(proc: Positionable) {
  return proc.size?.height ?? 50;
}