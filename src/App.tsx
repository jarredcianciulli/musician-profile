import React, { useCallback, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import IntroSplash, { shouldPlayIntro } from "./components/brand/IntroSplash";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant" as ScrollBehavior,
    });
  }, [pathname]);

  return null;
}

function PublicShell({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState(() => shouldPlayIntro());
  const [ready, setReady] = useState(() => !shouldPlayIntro());

  const finishIntro = useCallback(() => {
    setShowIntro(false);
    setReady(true);
  }, []);

  return (
    <div className="App min-h-screen flex flex-col bg-paper">
      {showIntro && <IntroSplash onComplete={finishIntro} />}

      <motion.div
        className="flex flex-col min-h-screen flex-grow"
        initial={false}
        animate={{
          opacity: ready ? 1 : 0,
          y: ready ? 0 : 12,
        }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <Navbar visible={ready} />
        <main className="flex-grow">{children}</main>
        <Footer />
      </motion.div>
    </div>
  );
}

function App() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <PublicShell>
              <Home />
            </PublicShell>
          }
        />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App;
