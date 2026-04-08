/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Home, Film, MessageSquare, Users, Radio } from "lucide-react";
import NavBar from "./NavBar";
import Sidebar from "./Sidebar";
import { getLiveEvent } from "../api";
import { getSocket } from "../socket";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkLive = async () => {
      try {
        const liveEvent = await getLiveEvent();
        setIsLive(!!liveEvent);
      } catch {
        setIsLive(false);
      }
    };
    checkLive();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join_general");

    socket.on("service_update", ({ type }) => {
      if (type === "GO_LIVE") setIsLive(true);
      if (type === "END_SERVICE") setIsLive(false);
    });

    return () => socket.off("service_update");
  }, []);

  const NAV_ITEMS = [
    { label: "Home", icon: Home, path: "/" },
    { label: "Events", icon: Film, path: "/events" },
    ...(isLive ? [{ label: "Live", icon: Radio, path: "/live" }] : []),
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "Members", icon: Users, path: "/members" },
  ];

  return (
    <div className="min-h-screen bg-beige flex flex-col">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile header — hidden on desktop */}
      <div className="flex md:hidden items-center justify-between px-6 pt-6 pb-6 flex-shrink-0 bg-off-white">
        <button className="text-ink-black" onClick={() => setSidebarOpen(true)}>
          <Menu size={28} />
        </button>
        <h2 className="text-lg font-semibold text-ink-black">EpiskopOS</h2>
        <div className="w-7"></div>
      </div>

      {/* Desktop top nav — hidden on mobile */}
      <nav className="hidden md:flex items-center justify-between px-10 py-4 bg-off-white border-b border-ash-grey/30 flex-shrink-0">
        {/* Logo */}
        <span className="text-xl font-bold text-ink-black tracking-tight">EpiskopOS</span>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={label}
                to={path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors relative ${
                  isActive
                    ? "bg-dark-teal text-white"
                    : "text-ink-black hover:bg-ash-grey/20"
                }`}
              >
                <div className="relative">
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 1.5} />
                  {label === "Live" && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                  )}
                </div>
                {label}
              </Link>
            );
          })}
        </div>

        {/* Profile / settings trigger */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-2 text-sm text-ink-black hover:opacity-70 transition-opacity font-medium"
        >
          <div className="w-8 h-8 rounded-full bg-dark-teal/10 border border-dark-teal/20 flex items-center justify-center">
            <Users size={16} className="text-dark-teal" />
          </div>
          Profile
        </button>
      </nav>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        {children}
      </div>

      {/* Bottom nav — mobile only, receives isLive as prop */}
      <NavBar isLive={isLive} />
    </div>
  );
}