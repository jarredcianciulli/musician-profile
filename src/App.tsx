import React, { useCallback, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Trial from "./pages/Trial";
import IntroSplash, { shouldPlayIntro } from "./components/brand/IntroSplash";
import { BookingProvider } from "./context/BookingContext";

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
    <BookingProvider>
      <div className="App min-h-screen flex flex-col bg-paper">
        {showIntro && <IntroSplash onComplete={finishIntro} />}

        <div
          className={`flex flex-col min-h-screen flex-grow transition-opacity duration-500 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          <Navbar visible={ready} />
          <main className="flex-grow">{children}</main>
          <Footer />
        </div>
      </div>
    </BookingProvider>
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
        <Route path="/trial" element={<Trial />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App;
