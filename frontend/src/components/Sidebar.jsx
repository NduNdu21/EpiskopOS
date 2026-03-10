import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Settings, LogOut, X } from "lucide-react";
import { getMe } from "../api";

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (isOpen && !user) {
      getMe()
        .then(setUser)
        .catch(() => setUser(null));
    }
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full px-8 py-10">

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-ink-black"
          >
            <X size={22} />
          </button>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-10 mt-4">
            <div className="w-28 h-28 rounded-full border-2 border-ink-black flex items-center justify-center mb-4">
              <User size={52} strokeWidth={1} className="text-ink-black" />
            </div>
            <h2 className="text-xl font-bold text-ink-black">
              {user?.name || "Loading..."}
            </h2>
            <p className="text-gray-500 capitalize">
              {user?.role || ""}
            </p>
          </div>

          {/* Menu Items */}
          <div className="flex flex-col gap-8">
            <button
              onClick={() => { onClose(); }}
              className="flex items-center gap-4 text-ink-black text-lg hover:opacity-70 transition-opacity"
            >
              <User size={26} strokeWidth={1.5} />
              <span className="font-medium">Profile</span>
            </button>

            <button
              onClick={() => { onClose(); }}
              className="flex items-center gap-4 text-ink-black text-lg hover:opacity-70 transition-opacity"
            >
              <Settings size={26} strokeWidth={1.5} />
              <span className="font-medium">Settings</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-4 text-ink-black text-lg hover:opacity-70 transition-opacity"
            >
              <LogOut size={26} strokeWidth={1.5} />
              <span className="font-medium">Log out</span>
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default Sidebar;