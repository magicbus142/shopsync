import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  Users as UsersIcon,
  Shield,
  FileText,
  BarChart3,
  Megaphone,
  CreditCard
} from 'lucide-react'

// Bottom nav items — 4 core items for clean mobile UX
const BOTTOM_NAV = [
  { icon: LayoutDashboard, label: "Home", href: "/dashboard" },
  { icon: Package, label: "Inventory", href: "/dashboard/inventory" },
  { icon: Receipt, label: "Transactions", href: "/dashboard/transactions" },
  { icon: UsersIcon, label: "Workers", href: "/dashboard/workers" },
];

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Package, label: "Inventory", href: "/dashboard/inventory" },
  { icon: UsersIcon, label: "Workers", href: "/dashboard/workers" },
  { icon: Receipt, label: "Transactions", href: "/dashboard/transactions" },
  { icon: FileText, label: "Invoice", href: "/dashboard/invoice" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

export default function DashboardLayout({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [shopName, setShopName] = useState("ShopSync");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuthAndFetchProfile = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          navigate("/login", { replace: true });
          return;
        }

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("shop_name")
            .eq("id", user.id)
            .maybeSingle();
          if (profile?.shop_name) setShopName(profile.shop_name);

          const ADMIN_EMAILS = ["swamy@magicbus142.com"];
          setIsAdmin(ADMIN_EMAILS.includes(user.email));
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        navigate("/login", { replace: true });
      } finally {
        setLoadingRole(false);
      }
    };
    checkAuthAndFetchProfile();
  }, [navigate]);

  const isAdminPath = location.pathname.startsWith('/admin');
  let menuItems = [];

  if (isAdminPath) {
    menuItems = [
      { icon: Shield, label: "Platform Overview", href: "/admin" },
      { icon: LayoutDashboard, label: "Back to My Shop", href: "/dashboard" }
    ];
  } else {
    menuItems = [...SIDEBAR_ITEMS];
    if (isAdmin) {
      menuItems.push({ icon: Shield, label: "Platform Admin", href: "/admin" });
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex text-foreground transition-colors duration-300">
      {/* ── MOBILE TOP HEADER ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 z-50 bg-card/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow shadow-primary/30">
            <span className="font-bold text-sm">{shopName.charAt(0).toUpperCase()}</span>
          </div>
          <span className="font-bold text-foreground truncate max-w-[160px] text-sm">{shopName}</span>
        </div>
        {/* Settings icon on the right — opens slide-over */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          aria-label="More options"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ── MOBILE SLIDE-OVER (Invoice + Settings + Logout) ── */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="md:hidden fixed top-14 right-0 w-56 z-50 bg-card border border-border rounded-bl-2xl shadow-2xl p-4 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200">
            <Link to="/dashboard/invoice" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-sm font-medium" onClick={() => setIsOpen(false)}>
              <FileText className="w-4 h-4" />
              Invoice
            </Link>
            <Link to="/dashboard/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-sm font-medium" onClick={() => setIsOpen(false)}>
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            {isAdmin && (
              <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-sm font-medium" onClick={() => setIsOpen(false)}>
                <Shield className="w-4 h-4" />
                Platform Admin
              </Link>
            )}
            <div className="border-t border-border mt-1 pt-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 transition-all text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex sticky top-0 h-screen w-64 bg-card border-r border-border p-6 flex-col z-40">
        <div className="mb-8 px-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 flex-shrink-0">
              <span className="font-bold text-lg">{shopName.charAt(0).toUpperCase()}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight break-words">
              {shopName}
            </h1>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto py-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 mt-auto border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-x-hidden bg-background pt-14 pb-20 md:pt-0 md:pb-0 md:p-8">
        <div className="max-w-7xl mx-auto p-4 md:p-0 space-y-6 md:space-y-8">
          {children || <Outlet />}
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around px-1 py-1 safe-area-inset-bottom">
          {BOTTOM_NAV.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-2 px-1 relative group"
              >
                {/* Active indicator pill */}
                {isActive && (
                  <span className="absolute top-1 inset-x-2 h-0.5 rounded-full bg-primary" />
                )}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-110"
                    : "text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
                }`}>
                  <item.icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                </div>
                <span className={`text-[10px] font-semibold tracking-wide transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
