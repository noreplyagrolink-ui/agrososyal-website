import { AnimatePresence } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";
import PageTransition from "./PageTransition";

import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Verify from "@/pages/Verify";
import Verification from "@/pages/Verification";
import Ads from "@/pages/Ads";
import AdsPost from "@/pages/AdsPost";
import Privacy from "@/pages/Privacy";
import Loading from "@/pages/Loading";
import Choose from "@/pages/Choose";
import NotFound from "@/pages/NotFound";

const wrap = (node: React.ReactNode) => <PageTransition>{node}</PageTransition>;

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={wrap(<Index />)} />
        <Route path="/auth" element={wrap(<Auth />)} />
        <Route path="/loading" element={wrap(<Loading />)} />
        <Route path="/choose" element={wrap(<Choose />)} />
        <Route path="/verify" element={wrap(<Verify />)} />
        <Route path="/verification" element={wrap(<Verification />)} />
        <Route path="/ads" element={wrap(<Ads />)} />
        <Route path="/ads-post" element={wrap(<AdsPost />)} />
        <Route path="/privacy" element={wrap(<Privacy />)} />
        <Route path="*" element={wrap(<NotFound />)} />
      </Routes>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;

