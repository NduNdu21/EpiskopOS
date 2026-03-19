import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Home, Film, MessageSquare, Users } from "lucide-react";
import Sidebar from "../components/Sidebar";

const NAV_ITEMS = [
    { label: "Home", icon: Home, path: "/" },
    { label: "Events", icon: Film, path: "/events" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "Members", icon: Users, path: "/members" },
];

const Members = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col">
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <button className="text-ink-black" onClick={() => setSidebarOpen(true)}>
                    <Menu size={26} />
                </button>
                <h1 className="text-lg font-bold text-ink-black">EpiskopOS</h1>
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
    )
}

export default Members;