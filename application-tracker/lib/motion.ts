// Mirrors the --ease-* tokens in globals.css, for element.animate() calls.
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
export const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)'

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
