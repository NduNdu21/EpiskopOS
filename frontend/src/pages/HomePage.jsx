import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Film, MessageSquare, Users, Menu } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { getCurrentAndNext } from "../api";

//Mock data
const UPDATES = [
  { team: "Sound team", message: "Can we get the drums higher please!!" },
  { team: "Projection team", message: "Lyrics on the board are slow" },
  { team: "Pastor", message: "Are the message slides ready?" },
];

const NAV_ITEMS = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Events", icon: Film, path: "/events" },
  { label: "Messages", icon: MessageSquare, path: "/messages" },
  { label: "Members", icon: Users, path: "/members" },
];

const HomePage = () => {
  const location = useLocation();
  const name = localStorage.getItem("name");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [onNow, setOnNow] = useState(null);
  const [upNext, setUpNext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentAndNext()
      .then((data) => {
        setOnNow(data.onNow);
        setUpNext(data.upNext);
      })
      .catch(() => {
        setOnNow(null);
        setUpNext(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Helper to format event display
  const formatEvent = (event) => {
  if (!event) return null;
  const date = new Date(event.event_date);
  const now = new Date();
  const diffMs = date - now;
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  let timeLabel;
  if (diffDays >= 1) {
    timeLabel = `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  } else {
    timeLabel = `${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  }

  return `${event.title} - ${timeLabel}`;
};

  return (
    <div className="min-h-screen bg-ash-grey flex flex-col">

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <button className="text-ink-black" onClick={() => setSidebarOpen(true)}>
          <Menu size={28} />
        </button>
        <h2 className="text-lg font-semibold text-ink-black">Summary</h2>
        <div className="w-7"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pt-6 pb-20 overflow-y-auto">
        <h1 className="text-4xl font-light text-ink-black mb-8">
          Hello {name}
        </h1>

        <h2 className="text-2xl font-light text-ink-black">On now:</h2>
        <div className="bg-beige rounded-2xl px-6 py-5 mb-6 shadow-sm">
          <p className="text-ink-black text-lg font-semibold text-center">
            {loading
              ? "Loading..."
              : onNow
              ? formatEvent(onNow)
              : "Nothing on right now"}
          </p>
        </div>

        <h2 className="text-xl font-light text-ink-black">Up next:</h2>
        <div className="bg-beige/70 rounded-3xl px-6 py-5 mb-10 shadow-sm w-4/5">
          <p className="text-ink-black text-lg font-semibold text-center">
            {loading
              ? "Loading..."
              : upNext
              ? formatEvent(upNext)
              : "No upcoming events"}
          </p>
        </div>

        <div className="bg-white rounded-3xl px-6 py-5 shadow-sm">
          <h3 className="text-xl font-semibold text-ink-black mb-3">
            Lastest Updates:
          </h3>
          <div className="divide-y divide-gray-200">
            {UPDATES.map((update, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-4"
              >
                <div>
                  <p className="text-ink-black font-semibold text-sm">
                    {update.team}
                  </p>
                  <p className="text-gray-500 text-sm mt-0.5">
                    {update.message}
                  </p>
                </div>
                <div className="w-4 h-4 rounded-full bg-gray-300 ml-4 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nav bar bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center px-4 py-3">
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={label}
              to={path}
              className={`flex flex-col items-center gap-1 ${
                isActive ? "text-dark-teal" : "text-ink-black"
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
