import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import WalletPage from "./pages/WalletPage";
import ScorePage from "./pages/ScorePage";
import P2PLending from "./pages/P2PLending";
import SMEHub from "./pages/SMEHub";
import Crowdfunding from "./pages/Crowdfunding";
import AdminPortal from "./pages/AdminPortal";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MFIMarketplace from "./pages/MFIMarketplace";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import EcoCashUpload from "./pages/EcoCashUpload";
import FIPortal from "./pages/FIPortal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
            <Route path="/score" element={<ProtectedRoute><ScorePage /></ProtectedRoute>} />
            <Route path="/p2p" element={<ProtectedRoute><P2PLending /></ProtectedRoute>} />
            <Route path="/sme" element={<ProtectedRoute><SMEHub /></ProtectedRoute>} />
            <Route path="/crowdfunding" element={<ProtectedRoute><Crowdfunding /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPortal /></ProtectedRoute>} />
            <Route path="/mfi" element={<ProtectedRoute><MFIMarketplace /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/ecocash-upload" element={<ProtectedRoute><EcoCashUpload /></ProtectedRoute>} />
            <Route path="/fi-portal" element={<ProtectedRoute><FIPortal /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
