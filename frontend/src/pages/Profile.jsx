import { useEffect, useState } from "react";
import { getMe, updateProfile } from "../api";
import { User, Pencil, CheckCircle, AlertCircle, X } from "lucide-react";

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: "", email: "" });
    const [status, setStatus] = useState({ saving: false, error: "", success: "" });

    useEffect(() => {
        getMe()
            .then(data => {
                setUser(data);
                setForm({ name: data.name || "", email: data.email || "" });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const startEditing = () => {
        setForm({ name: user?.name || "", email: user?.email || "" });
        setStatus({ saving: false, error: "", success: "" });
        setEditing(true);
    };

    const cancelEditing = () => {
        setEditing(false);
        setStatus({ saving: false, error: "", success: "" });
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim()) {
            setStatus({ saving: false, error: "Name and email are required", success: "" });
            return;
        }
        setStatus({ saving: true, error: "", success: "" });
        try {
            const updated = await updateProfile({ name: form.name.trim(), email: form.email.trim() });
            setUser(updated);
            setStatus({ saving: false, error: "", success: "Profile updated" });
            setEditing(false);
        } catch (err) {
            setStatus({ saving: false, error: err.message || "Failed to update profile", success: "" });
        }
    };

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
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-beige tracking-tight">Your Profile</h1>
                    {!editing && (
                        <button
                            onClick={startEditing}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/20 hover:bg-black/30 text-beige text-sm font-medium transition-colors"
                        >
                            <Pencil size={16} />
                            Edit
                        </button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
                    <div className="w-32 h-32 rounded-full bg-beige/10 border-2 border-beige flex items-center justify-center shrink-0">
                        <User size={64} className="text-beige" />
                    </div>
                    <div className="text-center md:text-left">
                        <h2 className="text-2xl font-semibold text-beige">{user?.name || "Unknown User"}</h2>
                        <p className="text-beige/70 mt-1 capitalize text-lg">{user?.role || "No Role Assigned"}</p>
                    </div>
                </div>

                {editing ? (
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="bg-black/20 p-5 rounded-2xl">
                            <label className="text-sm text-beige/60 uppercase tracking-wider mb-2 block">Name</label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                                className="w-full bg-transparent text-beige text-lg border-b border-beige/30 focus:outline-none focus:border-beige pb-1"
                            />
                        </div>
                        <div className="bg-black/20 p-5 rounded-2xl">
                            <label className="text-sm text-beige/60 uppercase tracking-wider mb-2 block">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                required
                                className="w-full bg-transparent text-beige text-lg border-b border-beige/30 focus:outline-none focus:border-beige pb-1"
                            />
                        </div>

                        {status.error && (
                            <div className="flex items-center gap-2 text-red-300 text-sm">
                                <AlertCircle size={16} />
                                <span>{status.error}</span>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={status.saving}
                                className="px-8 py-3 bg-teal-700 hover:bg-teal-600 disabled:bg-teal-900 disabled:cursor-not-allowed text-beige font-medium rounded-xl transition-colors"
                            >
                                {status.saving ? "Saving..." : "Save Changes"}
                            </button>
                            <button
                                type="button"
                                onClick={cancelEditing}
                                className="flex items-center gap-2 px-6 py-3 bg-black/20 hover:bg-black/30 text-beige font-medium rounded-xl transition-colors"
                            >
                                <X size={16} />
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-black/20 p-5 rounded-2xl">
                            <p className="text-sm text-beige/60 uppercase tracking-wider mb-1">Email Address</p>
                            <p className="text-beige text-lg">{user?.email}</p>
                        </div>
                        <div className="bg-black/20 p-5 rounded-2xl">
                            <p className="text-sm text-beige/60 uppercase tracking-wider mb-1">Account Status</p>
                            <p className="text-beige text-lg capitalize">{user?.status || "Active"}</p>
                        </div>
                        {status.success && (
                            <div className="flex items-center gap-2 text-green-300 text-sm">
                                <CheckCircle size={16} />
                                <span>{status.success}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;