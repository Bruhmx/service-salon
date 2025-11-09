import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FloatingNav } from "@/components/FloatingNav";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import ServiceProviderDashboard from "./pages/ServiceProviderDashboard";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Renting from "./pages/Renting";
import ProviderDetail from "./pages/ProviderDetail";
import NotFound from "./pages/NotFound";
import AdminServices from "./pages/admin/Services";
import AdminProducts from "./pages/admin/Products";
import AdminRenting from "./pages/admin/Renting";
import AdminReviews from "./pages/admin/Reviews";
import AdminUsers from "./pages/admin/Users";
import AdminContent from "./pages/admin/Content";
import AdminHomepage from "./pages/admin/Homepage";
import AdminOrders from "./pages/admin/Orders";
import ProviderServices from "./pages/provider/Services";
import ProviderProducts from "./pages/provider/Products";
import ProviderEquipment from "./pages/provider/Equipment";
import ProviderOrders from "./pages/provider/Orders";
import ProviderBookings from "./pages/provider/Bookings";
import ProviderRentals from "./pages/provider/Rentals";
import ProviderSettings from "./pages/provider/Settings";
import ProviderChat from "./pages/provider/Chat";
import CustomerMe from "./pages/CustomerMe";
import CustomerChats from "./pages/CustomerChats";
import Chat from "./pages/Chat";
import PurchaseHistory from "./pages/PurchaseHistory";
import ProviderRegister from "./pages/ProviderRegister";
import SupportChat from "./pages/SupportChat";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <FloatingNav />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/content" element={<AdminContent />} />
            <Route path="/admin/homepage" element={<AdminHomepage />} />
            <Route path="/admin/services" element={<AdminServices />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/renting" element={<AdminRenting />} />
            <Route path="/admin/reviews" element={<AdminReviews />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/provider/register" element={<ProviderRegister />} />
            <Route path="/provider/dashboard" element={<ServiceProviderDashboard />} />
            <Route path="/provider/services" element={<ProviderServices />} />
            <Route path="/provider/products" element={<ProviderProducts />} />
            <Route path="/provider/equipment" element={<ProviderEquipment />} />
            <Route path="/provider/orders" element={<ProviderOrders />} />
            <Route path="/provider/bookings" element={<ProviderBookings />} />
            <Route path="/provider/rentals" element={<ProviderRentals />} />
            <Route path="/provider/settings" element={<ProviderSettings />} />
            <Route path="/provider/chat" element={<ProviderChat />} />
            <Route path="/products" element={<Products />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/renting" element={<Renting />} />
            <Route path="/me" element={<CustomerMe />} />
            <Route path="/purchase-history" element={<PurchaseHistory />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chats" element={<CustomerChats />} />
            <Route path="/support-chat" element={<SupportChat />} />
            <Route path="/provider/:id" element={<ProviderDetail />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
