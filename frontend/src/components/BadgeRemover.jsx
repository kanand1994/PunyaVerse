import { useEffect } from "react";

/** Removes any third-party floating badges injected outside our React tree. */
export default function BadgeRemover() {
  useEffect(() => {
    const kill = () => {
      const ids = ["emergent-badge"];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
    };
    kill();
    const observer = new MutationObserver(kill);
    observer.observe(document.body, { childList: true, subtree: false });
    return () => observer.disconnect();
  }, []);
  return null;
}
