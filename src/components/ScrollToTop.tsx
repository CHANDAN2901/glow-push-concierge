import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const scrollMainContainerToTop = () => {
      const container = document.getElementById('main-scroll-container');
      container?.scrollTo({ top: 0, behavior: 'instant' });
      if (container) container.scrollTop = 0;
    };

    // Immediate attempt (exact requested pattern)
    document.getElementById('main-scroll-container')?.scrollTo({ top: 0, behavior: 'instant' });

    // Retry loop to beat delayed render / POP restoration timing
    scrollMainContainerToTop();
    const intervalId = window.setInterval(scrollMainContainerToTop, 50);
    const stopId = window.setTimeout(() => window.clearInterval(intervalId), 800);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(stopId);
    };
  }, [pathname]);

  return null;
};
