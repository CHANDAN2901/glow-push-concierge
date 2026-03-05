import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.getElementById('main-scroll-container')?.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};
