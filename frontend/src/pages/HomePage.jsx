import { Link, useLocation } from "react-router-dom";
import { Home, Film, MessageSquare, Users, Menu } from "lucide-react";

const HomePage = () => {
    const location = useLocation();
    const name = localStorage.getItem("name") || "User";

    return (
        <div className="min-h-screen bg-ash-grey flex flex-col">

        </div>
    )
}

export default HomePage;