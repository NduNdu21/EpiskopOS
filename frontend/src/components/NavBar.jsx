import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Film, MessageSquare, Users, Radio } from "lucide-react";
import { getLiveEvent } from "../api";
import { getSocket } from "../socket";

export default function NavBar() {
  const location = useLocation();
  const [isLive, setIsLive] = useState(false);

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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center px-4 py-3">
      {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
        const isActive = location.pathname === path;
        return (
          <Link
            key={label}
            to={path}
            className={`flex flex-col items-center gap-1 relative ${
              isActive ? "text-dark-teal" : "text-ink-black"
            }`}
          >
            <div className="relative">
              <Icon size={26} strokeWidth={isActive ? 2.5 : 1.5} />
              {label === "Live" && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </div>
            <span className="text-xs font-medium">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}