import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, Component, ReactNode } from "react";

import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import FeedPage from "./pages/FeedPage";
import CreatePostPage from "./pages/CreatePostPage";
import ProfilePage from "./pages/ProfilePage";
import ChatPage from "./pages/ChatPage";
import NotificationsPage from "./pages/NotificationsPage";
import SearchPage from "./pages/SearchPage";
import NotFound from "./pages/NotFound";
import UserProfilePage from "./pages/UserProfilePage";
import FollowListPage from "./pages/FollowListPage";
import SettingsPage from "./pages/SettingsPage";
import CalculatorPage from "./pages/CalculatorPage";
import { OMNI_AI_URL } from "./lib/omni";
const OmniRedirect = () => { window.location.replace(OMNI_AI_URL); return null; };
import StorePage from "./pages/StorePage";
import AcilYardimPage from "./pages/AcilYardimPage";
import TarlaTakipPage from "./pages/TarlaTakipPage";
import TarimFiyatlariPage from "./pages/TarimFiyatlariPage";
import WeatherPage from "./pages/WeatherPage";
import CommunitiesPage from "./pages/CommunitiesPage";
import CommunityDetailPage from "./pages/CommunityDetailPage";
import FarmbookPage from "./pages/FarmbookPage";
import SipSakAgroPage from "./pages/SipSakAgroPage";
import FeaturesPage from "./pages/FeaturesPage";
import LiveListPage from "./pages/LiveListPage";
import LiveStreamPage from "./pages/LiveStreamPage";
import ReelsPage from "./pages/ReelsPage";

import { WelcomeModal } from "./components/WelcomeModal";
import RouteTransitionLoader from "./components/RouteTransitionLoader";

import { preventClickjacking, addConsoleWarning } from "./lib/security";
import { LanguageProvider } from "./contexts/LanguageContext";

/* ✅ BURAYI EKLE */
import { CallProvider } from "./contexts/CallContext";

// ─────────────────────────────────────────────
// Error Boundary
// ─────────────────────────────────────────────

interface EBState {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);

    this.state = {
      hasError: false,
      message: "",
    };
  }

  static getDerivedStateFromError(err: Error): EBState {
    return {
      hasError: true,
      message: err?.message || "Bilinmeyen hata",
    };
  }

  componentDidCatch(err: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-background">
          <div className="text-4xl">⚠️</div>

          <p className="text-lg font-semibold text-foreground">
            Bir şeyler ters gitti
          </p>

          <p className="text-sm text-muted-foreground max-w-sm">
            {this.state.message}
          </p>

          <button
            onClick={() => {
              this.setState({
                hasError: false,
                message: "",
              });

              window.location.reload();
            }}
            className="mt-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
          >
            Sayfayı yenile
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const queryClient = new QueryClient();

// 🔧 DÜZELTİLDİ: api.ts'deki apiFetch artık window.location.href = login YAPMIYOR.
// Bunun yerine "agrolink:unauthorized" custom event fırlatıyor.
// Bu bileşen BrowserRouter içinde olduğu için useNavigate() çalışır →
// health-check ekranı gösterilmez, sayfa reload olmaz.
function UnauthorizedListener() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = () => {
      navigate("/login", { replace: true });
    };
    window.addEventListener("agrolink:unauthorized", handler);
    return () => window.removeEventListener("agrolink:unauthorized", handler);
  }, [navigate]);
  return null;
}

const App = () => {
  useEffect(() => {
    preventClickjacking();
    addConsoleWarning();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>

        {/* ✅ BURAYI EKLE */}
        <CallProvider>

          <TooltipProvider>
            <Toaster />
            <Sonner />

            <BrowserRouter basename="/agrolink">
              <UnauthorizedListener />
              <ErrorBoundary>

                <WelcomeModal />
                <RouteTransitionLoader />


                <Routes>
                  <Route path="/" element={<Index />} />

                  <Route path="/login" element={<LoginPage />} />

                  <Route
                    path="/feed"
                    element={
                      <ErrorBoundary>
                        <FeedPage />
                      </ErrorBoundary>
                    }
                  />

                  <Route path="/create" element={<CreatePostPage />} />

                  <Route path="/profile" element={<ProfilePage />} />

                  <Route path="/chat" element={<ChatPage />} />

                  <Route
                    path="/notifications"
                    element={<NotificationsPage />}
                  />

                  <Route path="/search" element={<SearchPage />} />

                  <Route path="/settings" element={<SettingsPage />} />

                  <Route path="/user/:id" element={<UserProfilePage />} />

                  <Route
                    path="/user/:id/connections"
                    element={<FollowListPage />}
                  />

                  <Route
                    path="/calculator"
                    element={<CalculatorPage />}
                  />

                  <Route path="/ai" element={<OmniRedirect />} />

                  <Route path="/store" element={<StorePage />} />

                  <Route
                    path="/acil-yardim"
                    element={<AcilYardimPage />}
                  />

                  <Route
                    path="/tarla-takip"
                    element={<TarlaTakipPage />}
                  />

                  <Route
                    path="/fiyatlar"
                    element={<TarimFiyatlariPage />}
                  />

                  <Route path="/hava" element={<WeatherPage />} />

                  <Route path="/weather" element={<WeatherPage />} />

                  <Route path="/communities" element={<CommunitiesPage />} />
                  <Route path="/communities/:slugOrId" element={<CommunityDetailPage />} />

                  <Route path="/farmbook" element={<FarmbookPage />} />
                  <Route path="/sip-sak-agro" element={<SipSakAgroPage />} />

                  <Route path="/features" element={<FeaturesPage />} />

                  <Route path="/live" element={<LiveListPage />} />
                  <Route path="/live/:id" element={<LiveStreamPage />} />

                  {/* 🎬 Reels — ayrı sayfa, ayrı endpoint (/api/reels), sadece video */}
                  <Route
                    path="/reels"
                    element={
                      <ErrorBoundary>
                        <ReelsPage />
                      </ErrorBoundary>
                    }
                  />

                  <Route path="*" element={<NotFound />} />
                </Routes>

              </ErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>

        </CallProvider>

      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;





