import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import AftercareEditorPage from "./components/admin/AftercareEditor";
import TimelineEditorPage from "./components/admin/TimelineEditor";
import TimelineContentEditorPage from "./components/admin/TimelineContentEditor";
import TimelineSettings from "./pages/TimelineSettings";
import DebugTest from "./pages/DebugTest";
import ResetPassword from "./pages/ResetPassword";
import ClientProfile from "./pages/ClientProfile";
import NotFound from "./pages/NotFound";
import FaqPage from "./pages/FaqPage";
import Legal from "./pages/Legal";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import DevSwitcher from "./components/DevSwitcher";
import AppFooter from "./components/AppFooter";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Header />
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<ArtistDashboard />} />
              <Route path="/marketing" element={<MarketingLanding />} />
              <Route path="/home" element={<Landing />} />
              <Route path="/client" element={<ClientHome />} />
              <Route path="/artist" element={<ArtistDashboard />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/auth" element={<Auth />} />
              
              <Route path="/digital-card" element={<DigitalCard />} />
              <Route path="/health-declaration" element={<HealthDeclarationPage />} />
              <Route path="/client-form" element={<HealthDeclarationPage />} />
              <Route path="/declaration" element={<HealthDeclarationPage />} />
              <Route path="/admin/aftercare" element={<AftercareEditorPage />} />
              <Route path="/admin/timeline" element={<TimelineEditorPage />} />
              <Route path="/admin/timeline-content" element={<TimelineContentEditorPage />} />
              <Route path="/admin/timeline-settings" element={<TimelineSettings />} />
              <Route path="/admin/faq" element={<FaqPage />} />
              <Route path="/super-admin" element={<SuperAdmin />} />
              <Route path="/debug-test" element={<DebugTest />} />
              <Route path="/client-profile" element={<ClientProfile />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
          <AppFooter />
          <DevSwitcher />
        </BrowserRouter>
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
