import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    const dashboardScrollContainer = document.getElementById("artist-dashboard-scroll-container");
    if (dashboardScrollContainer) {
      dashboardScrollContainer.scrollTop = 0;
      requestAnimationFrame(() => {
        dashboardScrollContainer.scrollTop = 0;
      });
    }
  }, [pathname, search]);

  return null;
};
