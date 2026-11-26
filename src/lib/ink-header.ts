import { create } from "zustand";

/** Height of the fixed site header, in CSS pixels (`h-14`). */
const HEADER_HEIGHT = 56;

/**
 * Whether the home page's ink band is still under the fixed header, so the header takes the same
 * ink and the two read as one. It starts true, so the server draws the home page's header in ink
 * before any script runs; other pages never read it.
 */
export const useInkHeader = create<{ under: boolean }>(() => ({ under: true }));

/**
 * Follows the elements marked `data-ink-top` (the ink band at the top of the home page) while the
 * page scrolls, and returns a cleanup that resets the store. For `useEffect`.
 */
export function watchInkTop(): () => void {
  const update = () => {
    const marks = document.querySelectorAll("[data-ink-top]");
    const last = marks[marks.length - 1];
    useInkHeader.setState({
      under: !!last && last.getBoundingClientRect().bottom > HEADER_HEIGHT,
    });
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  return () => {
    window.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
    useInkHeader.setState({ under: true });
  };
}
