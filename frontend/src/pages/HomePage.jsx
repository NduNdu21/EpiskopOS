import { Link, useLocation } from "react-router-dom";
import { Home, Film, MessageSquare, Users, Menu } from "lucide-react";

//Mock data
const ON_NOW = { title: "Dancing Stars", duration: "15 min" };
const UP_NEXT = { title: "ALC", duration: "6 min" };
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
    const name = localStorage.getItem("name") || "User";

    return (
        <div className="min-h-screen bg-ash-grey flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
                <button className="text-ink-black"><Menu size={28} /></button>
                <h2 className="text-lg font-semibold text-ink-black">Summary</h2>
                <div className="w-7"></div>
            </div>
        </div>
    )
}

export default HomePage;