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

const formatDateTime = (ts) => {
  const d = new Date(ts);
  return `${d.toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  })} · ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
};

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
    <p className="text-3xl md:text-4xl font-bold text-white">
      {loading ? "—" : value}
    </p>
    <p className="text-[10px] md:text-xs font-semibold text-white/60 uppercase tracking-widest">
      {label}
    </p>
  </div>
);

// Defined outside HomePage to avoid recreating on every render
const BroadcastCard = ({ clamp, loading, message }) => (
  <div className="bg-ash-grey/20 border border-dark-teal/60 rounded-2xl px-5 py-4 md:px-6 md:py-5 hover:bg-ash-grey/30 transition-colors">
    <div className="flex items-center justify-between mb-2 md:mb-3">
      <p className="text-xs md:text-sm font-semibold text-dark-teal uppercase tracking-widest">
        Latest Broadcast
      </p>
      {message && (
        <span className="text-[10px] md:text-xs text-dark-teal/80">
          {formatDateTime(message.created_at)}
        </span>
      )}
    </div>
    {loading ? (
      <p className="text-ink-black text-sm md:text-base">Loading...</p>
    ) : message ? (
      <>
        <p className={`text-ink-black text-sm md:text-base leading-snug line-clamp-${clamp}`}>
          {message.content}
        </p>
        <p className="text-dark-teal/80 text-xs md:text-sm mt-1 md:mt-2">
          {message.sender_name}
        </p>
      </>
    ) : (
      <p className="text-ink-black/50 text-sm md:text-base">No broadcasts yet</p>
    )}
  </div>
);

const TeamCard = ({ clamp, loading, message, userTeam }) => (
  <div className="bg-white rounded-2xl px-5 py-4 md:px-6 md:py-5 shadow-sm hover:bg-ash-grey/10 transition-colors">
    <div className="flex items-center justify-between mb-2 md:mb-3">
      <p className="text-xs md:text-sm font-semibold text-ink-black/50 uppercase tracking-widest">
        {userTeam ? `${capitalise(userTeam)} Team` : "Team Messages"}
      </p>
      {message && (
        <span className="text-[10px] md:text-xs text-ash-grey">
          {formatDateTime(message.created_at)}
        </span>
      )}
    </div>
    {loading ? (
      <p className="text-ink-black text-sm md:text-base">Loading...</p>
    ) : message ? (
      <>
        <p className={`text-ink-black text-sm md:text-base leading-snug line-clamp-${clamp}`}>
          {message.content}
        </p>
        <p className="text-ash-grey text-xs md:text-sm mt-1 md:mt-2">
          {message.sender_name}
        </p>
      </>
    ) : (
      <p className="text-ink-black/50 text-sm md:text-base">No team messages yet</p>
    )}
  </div>
);

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [upNext, setUpNext] = useState(null);
  const [latestBroadcast, setLatestBroadcast] = useState(null);
  const [latestTeamMsg, setLatestTeamMsg] = useState(null);
  const [loading, setLoading] = useState(true);

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
          .catch(() => { });

        if (userTeam) {
          getMessages({ scope: "team", team_target: userTeam })
            .then((msgs) => {
              if (msgs?.length) setLatestTeamMsg(msgs[msgs.length - 1]);
            })
            .catch(() => { });
        }

        if (eventData.upNext?.id) {
          getSegments(eventData.upNext.id)
            .then((segs) => setNextSegmentCount(segs.length))
            .catch(() => setNextSegmentCount(0));
        } else {
          setNextSegmentCount(0);
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

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
      .catch(() => { })
      .finally(() => setStatsLoading(false));
  }, []);

  const firstName = user?.name?.trim().split(/\s+/)[0];
  const userTeam = TEAM_FROM_ROLE[user?.role] || null;

  return (
    <div className="min-h-screen px-6 pt-6 md:px-10 md:pt-8">

      {/* Greeting + role badge */}
      <div className="mb-6 md:mb-10 space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold text-ink-black">
          Hello {firstName}
        </h1>
        {user?.role && (
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-dark-teal text-beige text-xs md:text-sm font-medium tracking-wide">
            {capitalise(user.role)}
          </span>
        )}
      </div>

      <div className="md:grid md:grid-cols-5 md:gap-8">

        {/* ── Left column (3/5) ── */}
        <div className="md:col-span-3 space-y-4 md:space-y-5">

          {/* Stats card — desktop only */}
          <div className="hidden md:block bg-dark-teal h-64 rounded-2xl px-6 py-6 shadow-sm">
            <p className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-5">
              Overview
            </p>
            <div className="grid grid-cols-3 divide-x h-4/5 divide-white/20">
              <div className="pr-6">
                <StatCard label="Members" value={totalMembers} loading={statsLoading} />
              </div>
              <div className="px-6">
                <StatCard label="Segments in next service" value={nextSegmentCount} loading={loading} />
              </div>
              <div className="pl-6">
                <StatCard label="Events this week" value={eventsThisWeek} loading={statsLoading} />
              </div>
            </div>
          </div>

          {/* Next Service card */}
          <div className="bg-white/70 rounded-2xl px-5 py-4 md:px-6 md:py-5 shadow-sm">
            <p className="text-xs md:text-sm font-semibold text-ink-black/50 uppercase tracking-widest mb-1 md:mb-2">
              Next Service
            </p>
            {loading ? (
              <p className="text-ink-black text-lg md:text-xl font-semibold">Loading...</p>
            ) : upNext ? (
              <>
                <p className="text-ink-black text-xl md:text-2xl font-bold">{upNext.title}</p>
                <p className="text-ink-black/60 text-sm md:text-base mt-0.5 md:mt-1">
                  {formatServiceDate(upNext)}
                </p>
                {upNext.location && (
                  <p className="text-ink-black/50 text-sm md:text-base mt-0.5">
                    📍 {upNext.location}
                  </p>
                )}
                {upNext.duration_hours && (
                  <p className="text-ink-black/50 text-sm md:text-base mt-0.5">
                    ⏱ {upNext.duration_hours} hour(s)
                  </p>
                )}
              </>
            ) : (
              <p className="text-ink-black/60 text-sm md:text-base">No upcoming services</p>
            )}
          </div>

          {/* Your Assignment card */}
          <div className="bg-white/70 rounded-2xl px-5 py-4 md:px-6 md:py-5 shadow-sm">
            <p className="text-xs md:text-sm font-semibold text-ink-black/50 uppercase tracking-widest mb-1 md:mb-2">
              Your Assignment
            </p>
            {loading ? (
              <p className="text-ink-black text-lg md:text-xl font-semibold">Loading...</p>
            ) : user?.role && user.role !== "volunteer" ? (
              <>
                <p className="text-ink-black text-xl md:text-2xl font-bold">
                  {capitalise(user.role)} Team
                </p>
                <p className="text-ink-black/60 text-sm md:text-base mt-0.5 md:mt-1">
                  {capitalise(user.role)} team member
                </p>
                {upNext && (
                  <p className="text-ink-black/50 text-sm md:text-base mt-0.5">
                    Next up: {upNext.title}
                  </p>
                )}
              </>
            ) : (
              <p className="text-ink-black/60 text-sm md:text-base mt-0.5">No assignment yet</p>
            )}
          </div>

          {/* Mobile message cards */}
          <div className="md:hidden space-y-3 pb-6">
            <Link to="/messages" className="block">
              <BroadcastCard clamp={2} loading={loading} message={latestBroadcast} />
            </Link>
            {(loading || userTeam) && (
              <Link to="/messages" className="block">
                <TeamCard clamp={2} loading={loading} message={latestTeamMsg} userTeam={userTeam} />
              </Link>
            )}
          </div>
        </div>

        {/* ── Right column (2/5) — desktop only ── */}
        <div className="hidden md:flex md:col-span-2 flex-col gap-4">
          <Link to="/messages" className="block">
            <BroadcastCard clamp={4} loading={loading} message={latestBroadcast} />
          </Link>
          {(loading || userTeam) && (
            <Link to="/messages" className="block">
              <TeamCard clamp={4} loading={loading} message={latestTeamMsg} userTeam={userTeam} />
            </Link>
          )}
          <Link to="/events" className="block mt-auto">
            <div className="bg-white/50 border border-ash-grey/30 rounded-2xl px-6 py-5 text-center hover:bg-white/80 transition-colors">
              <p className="text-sm md:text-base font-medium text-ink-black/60">
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