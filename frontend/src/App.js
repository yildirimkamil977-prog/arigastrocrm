import "@/App.css";
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Products from "./pages/Products";
import Quotes from "./pages/Quotes";
import QuoteForm from "./pages/QuoteForm";
import QuoteView from "./pages/QuoteView";
import Settings from "./pages/Settings";
import Users from "./pages/Users";

function Protected({ children, adminOnly = false }) {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Protected><Dashboard /></Protected>} />
            <Route path="/musteriler" element={<Protected><Customers /></Protected>} />
            <Route path="/musteriler/:id" element={<Protected><CustomerDetail /></Protected>} />
            <Route path="/urunler" element={<Protected><Products /></Protected>} />
            <Route path="/teklifler" element={<Protected><Quotes /></Protected>} />
            <Route path="/teklifler/yeni" element={<Protected><QuoteForm /></Protected>} />
            <Route path="/teklifler/:id" element={<Protected><QuoteView /></Protected>} />
            <Route path="/teklifler/:id/duzenle" element={<Protected><QuoteForm /></Protected>} />
            <Route path="/ayarlar" element={<Protected adminOnly><Settings /></Protected>} />
            <Route path="/kullanicilar" element={<Protected adminOnly><Users /></Protected>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
