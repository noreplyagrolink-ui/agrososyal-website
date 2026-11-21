import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import PageLoader from "./PageLoader";

/**
 * Shows the Lottie loader briefly between route changes.
 * Keeps it short (~450ms) so it feels like a snappy transition,
 * not a blocking spinner.
 */
const RouteTransitionLoader = () => {
  const location = useLocation();
  const [show, setShow] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // Profil sayfaları kendi iskelet yüklemesini gösterir; çark üstüne binmesin.
    const p = location.pathname;
    if (p === "/profile" || p.startsWith("/user/")) { setShow(false); return; }
    setShow(true);
    const t = window.setTimeout(() => setShow(false), 450);
    return () => window.clearTimeout(t);
  }, [location.pathname]);

  if (!show) return null;
  return <PageLoader fullscreen size={160} />;
};

export default RouteTransitionLoader;

