import { useEffect, useState } from 'react';
import { getMe } from '../api';

const ROLE_LABELS = {
    admin: 'Admin',
    sound: 'Sound',
    lighting: 'Light',
    media: 'Media',
};

const ROLE_COLORS = {
    admin: 'bg-dark-teal text-off-white',
    sound: 'bg-air-force-blue text-off-white',
    lighting: 'bg-ash-grey text-ink-black',
    media: 'bg-beige text-ink-black',
};

const API = import.meta.env.VITE_API_BASE;

async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });
    if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
    return res;
}

export default function Members() {
    const [me, setMe] = useState(null);
    const isAdmin = me?.role === 'admin';

    const [users, setUsers] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [liveEventId, setLiveEventId] = useState(null);
    const [filterRole, setFilterRole] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null); // user id to confirm

    useEffect(() => {
        fetchAll();
    }, []);

    async function fetchAll() {
        setLoading(true);
        try {
            const uRes = await apiFetch('/users');
            const uData = await uRes.json();
            const meData = await getMe();
            setUsers(uData);
            setMe(meData);

            const eRes = await apiFetch('/events/live');
            if (eRes.ok && eRes.headers.get('content-type')?.includes('application/json')) {
                const liveEvent = await eRes.json();
                if (liveEvent?.id) {
                    setLiveEventId(liveEvent.id);
                    const aRes = await apiFetch(`/attendance?event_id=${liveEvent.id}`);
                    if (aRes.ok) setAttendance(await aRes.json());
                }
            }
        } catch (err) {
            console.error('fetchAll failed:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleRoleChange(userId, newRole) {
        const res = await apiFetch(`/users/${userId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role: newRole }),
        });
        if (res.ok) {
            const updated = await res.json();
            setUsers(prev =>
                prev.map(u => (u.id === updated.id ? { ...u, role: updated.role } : u))
            );
        }
    }

    async function handleDelete(userId) {
        const res = await apiFetch(`/users/${userId}`, { method: 'DELETE' });
        if (res.ok) {
            setUsers(prev => prev.filter(u => u.id !== userId));
            setConfirmDelete(null);
        }
    }

    async function handleAttendance(userId, present) {
        if (!liveEventId) return;
        const res = await apiFetch('/attendance', {
            method: 'POST',
            body: JSON.stringify({ event_id: liveEventId, user_id: userId, present }),
        });
        if (res.ok) {
            setAttendance(prev => ({ ...prev, [userId]: present }));
        }
    }

    // group users by role for admin view
    const grouped = users.reduce((acc, u) => {
        const r = u.role; 
        if (!acc[r]) acc[r] = [];
        acc[r].push(u);
        return acc;
    }, {});

    const roleOrder = ['admin', 'sound', 'lighting', 'media'];

    const filteredRoles =
        filterRole === 'all' ? roleOrder : roleOrder.filter(r => r === filterRole);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-ash-grey">
                Loading members...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64 text-red-500">{error}</div>

        );
    }

    return (
        <>
            <div className="px-4 pt-6 pb-28 max-w-lg mx-auto">
                <h1 className="text-2xl font-bold text-ink-black mb-1">Members</h1>
                {liveEventId && isAdmin && (
                    <p className="text-sm text-dark-teal font-medium mb-4">
                        ● Live service — attendance tracking active
                    </p>
                )}

                {/* Filter — admin only */}
                {isAdmin && (
                    <div className="flex gap-2 mb-6 flex-wrap">
                        {['all', ...roleOrder].map(r => (
                            <button
                                key={r}
                                onClick={() => setFilterRole(r)}
                                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${filterRole === r
                                    ? 'bg-dark-teal text-off-white border-dark-teal'
                                    : 'bg-off-white text-ink-black border-ash-grey'
                                    }`}
                            >
                                {r === 'all' ? 'All' : ROLE_LABELS[r]}
                            </button>
                        ))}
                    </div>
                )}

                {/* Groups */}
                {isAdmin ? (
                    filteredRoles.map(role => {
                        const group = grouped[role] || [];
                        if (group.length === 0) return null;
                        return (
                            <div key={role} className="mb-8">
                                <h2 className="text-xs font-semibold uppercase tracking-widest text-ash-grey mb-3">
                                    {ROLE_LABELS[role]}s
                                </h2>
                                <div className="flex flex-col gap-3">
                                    {group.map(user => (
                                        <UserCard
                                            key={user.id}
                                            user={user}
                                            isAdmin={isAdmin}
                                            isSelf={user.id === me?.id}
                                            liveEventId={liveEventId}
                                            present={attendance[user.id]}
                                            onRoleChange={handleRoleChange}
                                            onDelete={() => setConfirmDelete(user.id)}
                                            onAttendance={handleAttendance}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    // Volunteer view — flat list, own team only
                    <div className="flex flex-col gap-3">
                        {users.map(user => (
                            <UserCard
                                key={user.id}
                                user={user}
                                isAdmin={false}
                                isSelf={user.id === me?.id}
                                liveEventId={null}
                                present={undefined}
                                onRoleChange={null}
                                onDelete={null}
                                onAttendance={null}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Delete confirmation modal */}
            {
                confirmDelete && (
                    <div className="fixed inset-0 bg-ink-black/50 flex items-center justify-center z-50 px-6">
                        <div className="bg-off-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                            <h3 className="text-lg font-bold text-ink-black mb-2">Remove member?</h3>
                            <p className="text-sm text-ash-grey mb-6">
                                This will permanently remove this user from EpiskopOS. This cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="flex-1 py-2 rounded-xl border border-ash-grey text-ink-black text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(confirmDelete)}
                                    className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>);
}

function UserCard({
    user,
    isAdmin,
    isSelf,
    liveEventId,
    present,
    onRoleChange,
    onDelete,
    onAttendance,
}) {
    const initials = user.name
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-ash-grey-pale flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-air-force-blue flex items-center justify-center text-off-white text-sm font-bold shrink-0">
                {initials}
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-black truncate">
                    {user.name} {isSelf && <span className="text-ash-grey font-normal">(you)</span>}
                </p>
                {isAdmin ? (
                    <select
                        value={user.role}
                        onChange={e => onRoleChange(user.id, e.target.value)}
                        className="mt-1 text-xs border border-ash-grey rounded-lg px-2 py-1 bg-off-white text-ink-black"
                    >
                        <option value="admin">Admin</option>
                        <option value="sound">Sound</option>
                        <option value="lighting">Lighting</option>
                        <option value="media">Media</option>
                    </select>
                ) : (
                    <span
                        className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role]}`}
                    >
                        {ROLE_LABELS[user.role]}
                    </span>
                )}
            </div>

            {/* Attendance toggle — admin + live event only */}
            {isAdmin && liveEventId && (
                <button
                    onClick={() => onAttendance(user.id, !present)}
                    className={`shrink-0 text-xs px-3 py-1 rounded-full font-medium border transition-colors ${present
                        ? 'bg-dark-teal text-off-white border-dark-teal'
                        : 'bg-off-white text-ash-grey border-ash-grey'
                        }`}
                >
                    {present ? 'Present' : 'Absent'}
                </button>
            )}

            {/* Delete — admin only, not self */}
            {isAdmin && !isSelf && (
                <button
                    onClick={onDelete}
                    className="shrink-0 text-red-400 hover:text-red-600 text-lg leading-none ml-1"
                    aria-label="Remove user"
                >
                    ×
                </button>
            )}
        </div>
    );
}