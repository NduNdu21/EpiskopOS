import { useState } from "react";
import { Menu } from "lucide-react";
import NavBar from "./NavBar";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <button className="text-ink-black" onClick={() => setSidebarOpen(true)}>
          <Menu size={28} />
        </button>
        <h2 className="text-lg font-semibold text-ink-black">EpiskopOS</h2>
        <div className="w-7"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {children}
      </div>

      <NavBar />
    </div>
  );
}