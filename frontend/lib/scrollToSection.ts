/** HashRouter-safe in-page scroll (avoid hijacking the route hash). */
export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: "start" });
}
