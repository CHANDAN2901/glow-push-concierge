import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import { I18nProvider } from "@/components/I18nProvider";
import Header from "@/components/Header";
import Landing from "./pages/Landing";
import MarketingLanding from "./pages/MarketingLanding";
import ClientHome from "./pages/ClientHome";
import ArtistDashboard from "./pages/ArtistDashboard";
import Pricing from "./pages/Pricing";
import Auth from "./pages/Auth";
import SuperAdmin from "./pages/SuperAdmin";

import DigitalCard from "./pages/DigitalCard";
import HealthDeclarationPage from "./pages/HealthDeclarationPage";
import FormLinkResolver from "./pages/FormLinkResolver";
import AftercareEditorPage from "./components/admin/AftercareEditor";
import TimelineEditorPage from "./components/admin/TimelineEditor";
import TimelineContentEditorPage from "./components/admin/TimelineContentEditor";
import TimelineSettings from "./pages/TimelineSettings";
import DebugTest from "./pages/DebugTest";
import ResetPassword from "./pages/ResetPassword";
import ClientProfile from "./pages/ClientProfile";
import NotFound from "./pages/NotFound";
import FaqPage from "./pages/FaqPage";
import FaqManager from "./pages/FaqManager";
import Legal from "./pages/Legal";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import PaymentHistory from "./pages/PaymentHistory";
import DevSwitcher from "./components/DevSwitcher";
import CookieConsentBanner from "./components/CookieConsentBanner";
import ImpersonationBanner from "./components/ImpersonationBanner";
import FeedbackFAB from "./components/FeedbackFAB";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Header />
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<MarketingLanding />} />
              <Route path="/c/:clientId" element={<ClientHome />} />
              <Route path="/client" element={<ClientHome />} />
              <Route path="/artist" element={<ArtistDashboard />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/auth" element={<Auth />} />
              
              <Route path="/digital-card" element={<DigitalCard />} />
              <Route path="/health-declaration" element={<HealthDeclarationPage />} />
              <Route path="/admin/aftercare" element={<AftercareEditorPage />} />
              <Route path="/admin/timeline" element={<TimelineEditorPage />} />
              <Route path="/admin/timeline-content" element={<TimelineContentEditorPage />} />
              <Route path="/admin/timeline-settings" element={<ProtectedRoute featureId="healing_timeline"><TimelineSettings /></ProtectedRoute>} />
              <Route path="/admin/faq" element={<FaqPage />} />
              <Route path="/admin/faq-manager" element={<FaqManager />} />
              <Route path="/super-admin" element={<SuperAdmin />} />
              <Route path="/debug-test" element={<DebugTest />} />
              <Route path="/client-profile" element={<ClientProfile />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/payment-history" element={<PaymentHistory />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
          <DevSwitcher />
          <ImpersonationBanner />
          <CookieConsentBanner />
          <FeedbackFAB />
        </BrowserRouter>
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
