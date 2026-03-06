import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const scrollAllToTop = () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const container = document.getElementById('main-scroll-container');
      container?.scrollTo({ top: 0, behavior: 'instant' });
      if (container) container.scrollTop = 0;
    };

    // Immediate attempt
    scrollAllToTop();

    scrollAllToTop();
    const intervalId = window.setInterval(scrollAllToTop, 50);
    const stopId = window.setTimeout(() => window.clearInterval(intervalId), 800);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(stopId);
    };
  }, [pathname]);

  return null;
};
