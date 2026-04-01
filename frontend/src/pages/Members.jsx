import { Link } from "react-router-dom";
import { Home, Film, MessageSquare, Users } from "lucide-react";

const NAV_ITEMS = [
    { label: "Home", icon: Home, path: "/" },
    { label: "Events", icon: Film, path: "/events" },
    { label: "Messages", icon: MessageSquare, path: "/messages" },
    { label: "Members", icon: Users, path: "/members" },
];

const Members = () => {
    return (
        <div className="min-h-screen flex flex-col">
        </div>
    )
}

export default Members;