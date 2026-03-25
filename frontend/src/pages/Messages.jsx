import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "../components/Sidebar";

const Messages = () => {
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
        </div>
    )
}

export default Messages;