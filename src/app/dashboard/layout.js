"use client";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Home, 
  Settings, 
  Menu, 
  TruckIcon, 
  MapPin, 
  ClipboardList, 
  User, 
  LogOut 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext"

const SidebarItem = ({ icon: Icon, href, label, isActive }) => {

  return (
    <Link href={href} className={cn(
      "flex items-center space-x-3 py-3 px-4 rounded-lg transition-all", 
      isActive ? "bg-opacity-10  text-white font-medium" : "text-gray-300 hover:bg-opacity-5 hover:bg-white"
    )}>
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </Link>
  );
};

const Sidebar = ({ activePath = "/dashboard" }) => {
  const { logout } = useAuth();
  const navItems = [
    { icon: Home, href: "/dashboard", label: "Dashboard" },
    { icon: TruckIcon, href: "/dashboard/trips", label: "My Trips" },
    { icon: MapPin, href: "/locations", label: "Locations" },
    { icon: ClipboardList, href: "/logs", label: "Daily Logs" },
    { icon: User, href: "/profile", label: "Profile" },
    { icon: Settings, href: "/settings", label: "Settings" },
  ];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#084152" }}>
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <TruckIcon className="w-8 h-8 text-white" />
          <h2 className="text-xl font-bold text-white">TruckTrack</h2>
        </div>
      </div>
      
      <nav className="flex-1 px-3 py-2">
        <div className="space-y-1">
          {navItems.map((item) => (
            <SidebarItem
              key={item.href}
              icon={item.icon}
              href={item.href}
              label={item.label}
              isActive={activePath === item.href}
            />
          ))}
        </div>
      </nav>
      
      <div className="p-4 border-t border-opacity-10 border-white">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-opacity-5 hover:bg-white px-4"
          onClick={logout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default function DashboardLayout({ children }) {

  
  const [activePath, setActivePath] = useState("/dashboard");
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            className="md:hidden fixed top-4 left-4 z-50"
            style={{ color: "#084152" }}
          >
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="left" 
          className="p-0 w-64"
          style={{ backgroundColor: "#084152" }}
        >
          <Sidebar activePath={activePath} />
        </SheetContent>
      </Sheet>
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 h-screen">
        <Sidebar activePath={activePath} />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm py-4 px-6">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold" style={{ color: "#084152" }}>Dashboard</h1>
            <div className="flex items-center space-x-4">
              <Button 
               
                
                variant="outline" 
                className="border-2"
                style={{ borderColor: "#F94961", color: "#F94961" }}
              >
                 <Link href="/dashboard/new">New Trip</Link>
              </Button>
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}