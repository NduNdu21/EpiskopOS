import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getCurrentAndNext, getMe, getMessages, getEvents, getSegments } from "../api";

const formatServiceDate = (event) => {
  if (!event) return null;
  const date = new Date(event.event_date);
  const dayName = date.toLocaleDateString("en-GB", { weekday: "short" });
  const day = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "short" });
  let timeStr = "";
  if (event.start_time) {
    const [h, m] = event.start_time.split(":").map(Number);
    const suffix = h >= 12 ? "pm" : "am";
    const hour = h % 12 === 0 ? 12 : h % 12;
    timeStr = ` · ${hour}:${String(m).padStart(2, "0")}${suffix}`;
  }
  return `${dayName} ${day} ${month}${timeStr}`;
};

const capitalise = (str = "") =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

const TEAM_FROM_ROLE = {
  sound_volunteer: "sound",
  lights_volunteer: "lights",
  media_volunteer: "media",
  worship_volunteer: "worship",
  sound_lead: "sound",
  lights_lead: "lights",
  media_lead: "media",
  worship_lead: "worship",
};

// Returns how many events fall within the current calendar week (Mon–Sun)
const countEventsThisWeek = (events) => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return events.filter((e) => {
    const d = new Date(e.event_date);
    return d >= monday && d <= sunday;
  }).length;
};

const StatCard = ({ label, value, loading }) => (
  <div className="flex flex-col gap-1">
    <p className="text-3xl font-bold text-ink-black">
      {loading ? "—" : value}
    </p>
    <p className="text-xs font-semibold text-ink-black/50 uppercase tracking-widest">
      {label}
    </p>
  </div>
);

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [upNext, setUpNext] = useState(null);
  const [latestBroadcast, setLatestBroadcast] = useState(null);
  const [latestTeamMsg, setLatestTeamMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalMembers, setTotalMembers] = useState(null);
  const [nextSegmentCount, setNextSegmentCount] = useState(null);
  const [eventsThisWeek, setEventsThisWeek] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMe(), getCurrentAndNext()])
      .then(([userData, eventData]) => {
        setUser(userData);
        setUpNext(eventData.upNext);

        const userTeam = TEAM_FROM_ROLE[userData?.role] || null;

        getMessages({ scope: "broadcast" })
          .then((msgs) => {
            if (msgs?.length) setLatestBroadcast(msgs[msgs.length - 1]);
          })
          .catch(() => {});

        if (userTeam) {
          getMessages({ scope: "team", team_target: userTeam })
            .then((msgs) => {
              if (msgs?.length) setLatestTeamMsg(msgs[msgs.length - 1]);
            })
            .catch(() => {});
        }

        // Stats: segment count for next event
        if (eventData.upNext?.id) {
          getSegments(eventData.upNext.id)
            .then((segs) => setNextSegmentCount(segs.length))
            .catch(() => setNextSegmentCount(0));
        } else {
          setNextSegmentCount(0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Stats: total members + events this week
  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE;
    const token = localStorage.getItem("token");

    Promise.all([
      fetch(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      getEvents(),
    ])
      .then(([users, events]) => {
        setTotalMembers(Array.isArray(users) ? users.length : 0);
        setEventsThisWeek(countEventsThisWeek(events));
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const firstName = user?.name?.trim().split(/\s+/)[0];
  const userTeam = TEAM_FROM_ROLE[user?.role] || null;

  return (
    <div className="min-h-screen px-6 pt-6 md:px-10 md:pt-8">

      {/* Desktop two-column grid */}
      <div className="md:grid md:grid-cols-5 md:gap-8">

        {/* ── Left column (3/5) ── */}
        <div className="md:col-span-3 space-y-4">

          {/* Greeting + role badge */}
          <div>
            <h1 className="text-4xl font-bold text-ink-black">
              Hello {firstName}
            </h1>
            {user?.role && (
              <span className="inline-block mt-2 px-3 py-1 rounded-full bg-dark-teal text-beige text-xs font-medium tracking-wide">
                {capitalise(user.role)}
              </span>
            )}
          </div>

          {/* Next Service card */}
          <div className="bg-white/70 rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold text-ink-black/50 uppercase tracking-widest mb-1">
              Next Service
            </p>
            {loading ? (
              <p className="text-ink-black text-lg font-semibold">Loading...</p>
            ) : upNext ? (
              <>
                <p className="text-ink-black text-xl font-bold">{upNext.title}</p>
                <p className="text-ink-black/60 text-sm mt-0.5">
                  {formatServiceDate(upNext)}
                </p>
              </>
            ) : (
              <p className="text-ink-black/60 text-sm">No upcoming services</p>
            )}
          </div>

          {/* Your Assignment card */}
          <div className="bg-white/70 rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold text-ink-black/50 uppercase tracking-widest mb-1">
              Your Assignment
            </p>
            {loading ? (
              <p className="text-ink-black text-lg font-semibold">Loading...</p>
            ) : user?.role && user.role !== "volunteer" ? (
              <>
                <p className="text-ink-black text-xl font-bold">
                  {capitalise(user.role)} Team
                </p>
                <p className="text-ink-black/60 text-sm mt-0.5">
                  {capitalise(user.role)} team member
                </p>
              </>
            ) : (
              <p className="text-ink-black/60 text-sm mt-0.5">No assignment yet</p>
            )}
          </div>

          {/* Stats card — desktop only */}
          <div className="hidden md:block bg-white/70 rounded-2xl px-6 py-5 shadow-sm">
            <p className="text-xs font-semibold text-ink-black/50 uppercase tracking-widest mb-4">
              Overview
            </p>
            <div className="grid grid-cols-3 divide-x divide-white/20">
              <div className="pr-6">
                <StatCard
                  label="Members"
                  value={totalMembers}
                  loading={statsLoading}
                />
              </div>
              <div className="px-6">
                <StatCard
                  label="Segments in next service"
                  value={nextSegmentCount}
                  loading={loading}
                />
              </div>
              <div className="pl-6">
                <StatCard
                  label="Events this week"
                  value={eventsThisWeek}
                  loading={statsLoading}
                />
              </div>
            </div>
          </div>

          {/* Mobile message cards — visible only on mobile, below assignment */}
          <div className="md:hidden space-y-3">
            <Link to="/messages" className="block">
              <div className="bg-ash-grey/20 border border-dark-teal/60 rounded-2xl px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-dark-teal uppercase tracking-widest">
                    Latest Broadcast
                  </p>
                  {latestBroadcast && (
                    <span className="text-[10px] text-dark-teal/80">
                      {formatTime(latestBroadcast.created_at)}
                    </span>
                  )}
                </div>
                {loading ? (
                  <p className="text-ink-black text-sm">Loading...</p>
                ) : latestBroadcast ? (
                  <>
                    <p className="text-ink-black text-sm leading-snug line-clamp-2">
                      {latestBroadcast.content}
                    </p>
                    <p className="text-dark-teal/80 text-xs mt-1">
                      {latestBroadcast.sender_name}
                    </p>
                  </>
                ) : (
                  <p className="text-ink-black/50 text-sm">No broadcasts yet</p>
                )}
              </div>
            </Link>

            {(loading || userTeam) && (
              <Link to="/messages" className="block">
                <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-ink-black/50 uppercase tracking-widest">
                      {userTeam ? `${capitalise(userTeam)} Team` : "Team Messages"}
                    </p>
                    {latestTeamMsg && (
                      <span className="text-[10px] text-ash-grey">
                        {formatTime(latestTeamMsg.created_at)}
                      </span>
                    )}
                  </div>
                  {loading ? (
                    <p className="text-ink-black text-sm">Loading...</p>
                  ) : latestTeamMsg ? (
                    <>
                      <p className="text-ink-black text-sm leading-snug line-clamp-2">
                        {latestTeamMsg.content}
                      </p>
                      <p className="text-ash-grey text-xs mt-1">
                        {latestTeamMsg.sender_name}
                      </p>
                    </>
                  ) : (
                    <p className="text-ink-black/50 text-sm">No team messages yet</p>
                  )}
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* ── Right column (2/5) — desktop only ── */}
        <div className="hidden md:flex md:col-span-2 flex-col gap-4">

          {/* Latest Broadcast */}
          <Link to="/messages" className="block">
            <div className="bg-ash-grey/20 border border-dark-teal/60 rounded-2xl px-5 py-4 hover:bg-ash-grey/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-dark-teal uppercase tracking-widest">
                  Latest Broadcast
                </p>
                {latestBroadcast && (
                  <span className="text-[10px] text-dark-teal/80">
                    {formatTime(latestBroadcast.created_at)}
                  </span>
                )}
              </div>
              {loading ? (
                <p className="text-ink-black text-sm">Loading...</p>
              ) : latestBroadcast ? (
                <>
                  <p className="text-ink-black text-sm leading-snug line-clamp-3">
                    {latestBroadcast.content}
                  </p>
                  <p className="text-dark-teal/80 text-xs mt-1">
                    {latestBroadcast.sender_name}
                  </p>
                </>
              ) : (
                <p className="text-ink-black/50 text-sm">No broadcasts yet</p>
              )}
            </div>
          </Link>

          {/* Latest Team Message */}
          {(loading || userTeam) && (
            <Link to="/messages" className="block">
              <div className="bg-white rounded-2xl px-5 py-4 shadow-sm hover:bg-ash-grey/10 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-ink-black/50 uppercase tracking-widest">
                    {userTeam ? `${capitalise(userTeam)} Team` : "Team Messages"}
                  </p>
                  {latestTeamMsg && (
                    <span className="text-[10px] text-ash-grey">
                      {formatTime(latestTeamMsg.created_at)}
                    </span>
                  )}
                </div>
                {loading ? (
                  <p className="text-ink-black text-sm">Loading...</p>
                ) : latestTeamMsg ? (
                  <>
                    <p className="text-ink-black text-sm leading-snug line-clamp-3">
                      {latestTeamMsg.content}
                    </p>
                    <p className="text-ash-grey text-xs mt-1">
                      {latestTeamMsg.sender_name}
                    </p>
                  </>
                ) : (
                  <p className="text-ink-black/50 text-sm">No team messages yet</p>
                )}
              </div>
            </Link>
          )}

          {/* Filler — links to events page */}
          <Link to="/events" className="block mt-auto">
            <div className="bg-white/50 border border-ash-grey/30 rounded-2xl px-5 py-4 text-center hover:bg-white/80 transition-colors">
              <p className="text-sm font-medium text-ink-black/60">
                View all events →
              </p>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default HomePage;