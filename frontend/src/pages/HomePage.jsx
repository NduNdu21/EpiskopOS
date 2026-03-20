import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Film, MessageSquare, Users, Menu } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { getCurrentAndNext, getMe } from "../api";

const NAV_ITEMS = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Events", icon: Film, path: "/events" },
  { label: "Messages", icon: MessageSquare, path: "/messages" },
  { label: "Members", icon: Users, path: "/members" },
];

// Formats event_date + start_time into "Sun 22 Mar · 10:00am"
const formatServiceDate = (event) => {
  if (!event) return null;
  const date = new Date(event.event_date);
  const dayName = date.toLocaleDateString("en-GB", { weekday: "short" });
  const day = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "short" });

  let timeStr = "";
  if (event.start_time) {
    const [h, m] = event.start_time.split(":").map(Number);
    const suffix = h >= 12 ? "pm" : "am";
    const hour = h % 12 === 0 ? 12 : h % 12;
    timeStr = ` · ${hour}:${String(m).padStart(2, "0")}${suffix}`;
  }

  return `${dayName} ${day} ${month}${timeStr}`;
};

// Capitalises first letter of a string
const capitalise = (str = "") =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

const HomePage = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [user, setUser] = useState(null);
  const [upNext, setUpNext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMe(), getCurrentAndNext()])
      .then(([userData, eventData]) => {
        setUser(userData);
        setUpNext(eventData.upNext);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <div className="min-h-screen bg-ash-grey flex flex-col">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <button className="text-ink-black" onClick={() => setSidebarOpen(true)}>
          <Menu size={28} />
        </button>
        <h2 className="text-lg font-semibold text-ink-black">EpiskopOS</h2>
        <div className="w-7"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pt-6 pb-24 overflow-y-auto space-y-3">

        {/* Greeting + role badge */}
        <div>
          <h1 className="text-4xl font-bold text-ink-black">
            Hello {firstName}
          </h1>
          {user?.role && (
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-dark-teal text-beige text-xs font-medium tracking-wide">
              {capitalise(user.role)}
            </span>
          )}
        </div>

        {/* Next Service card */}
        <div className="bg-white/70 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold text-ink-black/50 uppercase tracking-widest mb-1">
            Next Service
          </p>
          {loading ? (
            <p className="text-ink-black text-lg font-semibold">Loading...</p>
          ) : upNext ? (
            <>
              <p className="text-ink-black text-xl font-bold">{upNext.title}</p>
              <p className="text-ink-black/60 text-sm mt-0.5">
                {formatServiceDate(upNext)}
              </p>
            </>
          ) : (
            <p className="text-ink-black/60 text-sm">No upcoming services</p>
          )}
        </div>

        {/* Your Assignment card */}
        <div className="bg-white/70 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold text-ink-black/50 uppercase tracking-widest mb-1">
            Your Assignment
          </p>
          {loading ? (
            <p className="text-ink-black text-lg font-semibold">Loading...</p>
          ) : user?.role && user.role !== "volunteer" ? (
            <>
              <p className="text-ink-black text-xl font-bold">
                {capitalise(user.role)} Team
              </p>
              <p className="text-ink-black/60 text-sm mt-0.5">
                {capitalise(user.role)} team member
              </p>
            </>
          ) : (
            <p className="text-ink-black/60 text-sm mt-0.5">No assignment yet</p>
          )}
        </div>

        {/* Messages card */}
        <Link to="/messages" className="block mt-1">
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ink-black/50 uppercase tracking-widest mb-1">
                Messages
              </p>
              <p className="text-ink-black text-lg font-semibold">
                {loading
                  ? "Loading..."
                  : user?.unread_count > 0
                    ? `${user.unread_count} unread`
                    : "All caught up"}
              </p>
            </div>
            {!loading && user?.unread_count > 0 && (
              <div className="w-9 h-9 rounded-full bg-dark-teal flex items-center justify-center flex-shrink-0">
                <span className="text-beige text-sm font-bold">
                  {user.unread_count}
                </span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Nav bar bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center px-4 py-3">
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={label}
              to={path}
              className={`flex flex-col items-center gap-1 ${isActive ? "text-dark-teal" : "text-ink-black"
                }`}
            >
              <Icon size={26} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default HomePage;
