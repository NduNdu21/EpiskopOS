import { useEffect, useState } from "react";
import { getMe } from "../api";
import { User } from "lucide-react";

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMe()
            .then(data => {
                setUser(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-dark-teal to-ash-grey">
                <p className="text-beige text-lg">Loading profile...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-dark-teal to-ash-grey p-6 md:p-12">
            <div className="max-w-2xl mx-auto bg-white/10 border border-beige/20 rounded-3xl p-8 md:p-12 mt-10 shadow-xl">
                <h1 className="text-3xl font-bold text-beige mb-8 tracking-tight">Your Profile</h1>
                
                <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
                    <div className="w-32 h-32 rounded-full bg-beige/10 border-2 border-beige flex items-center justify-center shrink-0">
                        <User size={64} className="text-beige" />
                    </div>
                    <div className="text-center md:text-left">
                        <h2 className="text-2xl font-semibold text-beige">{user?.name || "Unknown User"}</h2>
                        <p className="text-beige/70 mt-1 capitalize text-lg">{user?.role || "No Role Assigned"}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-black/20 p-5 rounded-2xl">
                        <p className="text-sm text-beige/60 uppercase tracking-wider mb-1">Email Address</p>
                        <p className="text-beige text-lg">{user?.email}</p>
                    </div>
                    <div className="bg-black/20 p-5 rounded-2xl">
                        <p className="text-sm text-beige/60 uppercase tracking-wider mb-1">Account Status</p>
                        <p className="text-beige text-lg capitalize">{user?.status || "Active"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;