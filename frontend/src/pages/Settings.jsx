import { useState } from "react";
import { Lock } from "lucide-react";

const Settings = () => {
    const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

    const handleChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handlePasswordUpdate = (e) => {
        e.preventDefault();
        // API call to update password will go here
        alert("Password update logic to be connected.");
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-dark-teal to-ash-grey p-6 md:p-12">
            <div className="max-w-2xl mx-auto bg-white/10 border border-beige/20 rounded-3xl p-8 md:p-12 mt-10 shadow-xl">
                <h1 className="text-3xl font-bold text-beige mb-8 tracking-tight">Settings</h1>

                <section className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <Lock className="text-beige" size={24} />
                        <h2 className="text-xl font-semibold text-beige">Security</h2>
                    </div>

                    <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-4">
                        <input
                            type="password"
                            name="current"
                            placeholder="Current Password"
                            value={passwords.current}
                            onChange={handleChange}
                            className="w-full px-5 py-4 rounded-xl text-beige text-md placeholder-beige/60 bg-black/20 border border-beige/30 focus:outline-none focus:border-beige transition-colors"
                        />
                        <input
                            type="password"
                            name="new"
                            placeholder="New Password"
                            value={passwords.new}
                            onChange={handleChange}
                            className="w-full px-5 py-4 rounded-xl text-beige text-md placeholder-beige/60 bg-black/20 border border-beige/30 focus:outline-none focus:border-beige transition-colors"
                        />
                        <input
                            type="password"
                            name="confirm"
                            placeholder="Confirm New Password"
                            value={passwords.confirm}
                            onChange={handleChange}
                            className="w-full px-5 py-4 rounded-xl text-beige text-md placeholder-beige/60 bg-black/20 border border-beige/30 focus:outline-none focus:border-beige transition-colors"
                        />
                        <button
                            type="submit"
                            className="mt-2 w-full md:w-auto self-start px-8 py-3 bg-teal-700 hover:bg-teal-600 text-beige font-medium rounded-xl transition-colors"
                        >
                            Update Password
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default Settings;