// App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import Header from "./components/Header.jsx";
import Home from "./components/pages/Home.jsx";
import Signup from "./components/pages/Signup";
import Login from "./components/pages/Login";
import About from "./components/pages/About";
import Services from "./components/pages/Services";
import Contact from "./components/pages/Contact";
import UserForm from "./components/pages/UserForm";
import Dashboard from "./components/pages/Dashboard";
import PaymentVerify from "./components/pages/PaymentVerify";
import AddVehicle from "./components/pages/AddVehicle";
import "@fortawesome/fontawesome-free/css/all.min.css";
import TermsOfUse from "./components/pages/TermsOfUse.jsx";
import PrivacyPolicy from "./components/pages/PrivacyPolicy.jsx";
import Footer from "./components/Footer";
import ForgotPassword from "./components/ForgotPassword.jsx";
import ResetPassword from "./components/pages/ResetPassword.jsx";
import AcceptInvite from "./components/pages/staff/AcceptInvite.jsx";
import StaffLogin from "./components/pages/staff/StaffLogin.jsx";
import SuperAdminDashboard from "./components/pages/staff/SuperAdminDashboard.jsx";
import ContactAgentDashboard from "./components/pages/staff/ContactAgentDashboard.jsx";
import FieldAgentDashboard from "./components/pages/staff/FieldAgentDashboard.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import './App.css';

// Pages that have their own nav — suppress the global Header & Footer
const APP_PAGES = [
  "/dashboard",
  "/services",
  "/add-vehicle",
  "/payment/verify",
  "/reset-password",
  "/forgot-password",
  "/staff",
];

function Layout() {
  const location = useLocation();
  const isAppPage = APP_PAGES.some((p) => location.pathname.startsWith(p));
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(
    !!localStorage.getItem("careal_token")
  );

  // Re-check auth whenever the route changes (handles login/logout navigation)
  useEffect(() => {
    setIsUserLoggedIn(!!localStorage.getItem("careal_token"));
  }, [location.pathname]);

  return (
    <>
      <ScrollToTop />
      {!isAppPage && <Header />}
      <Routes>
        <Route path="/"                    element={<Home />} />
        <Route path="/signup"              element={<Signup />} />
        <Route path="/login"               element={<Login />} />
        <Route path="/about"               element={<About />} />
        <Route path="/services"            element={<Services />} />
        <Route path="/contact"             element={<Contact />} />
        <Route path="/user-form"           element={<UserForm />} />
        <Route path="/dashboard"           element={<Dashboard />} />
        <Route path="/add-vehicle"         element={<AddVehicle />} />
        <Route path="/payment/verify"      element={<PaymentVerify />} />
        <Route path="/terms-of-use"        element={<TermsOfUse />} />
        <Route path="/privacy-policy"      element={<PrivacyPolicy />} />
        <Route path="/forgot-password"     element={<ForgotPassword />} />
        <Route path="/reset-password"      element={<ResetPassword />} />
        <Route path="/staff/accept-invite" element={<AcceptInvite />} />
        <Route path="/staff/login"         element={<StaffLogin />} />
        <Route path="/staff/super-admin"   element={<SuperAdminDashboard />} />
        <Route path="/staff/contact-agent" element={<ContactAgentDashboard />} />
        <Route path="/staff/field-agent"   element={<FieldAgentDashboard />} />
      </Routes>
      {isUserLoggedIn && <ChatWidget />}
      {!isAppPage && <Footer />}
    </>
  );
}

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;