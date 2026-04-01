import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getCurrentAndNext, getMe, getMessages } from "../api";

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

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [upNext, setUpNext] = useState(null);
  const [latestBroadcast, setLatestBroadcast] = useState(null);
  const [latestTeamMsg, setLatestTeamMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMe(), getCurrentAndNext()])
      .then(([userData, eventData]) => {
        setUser(userData);
        setUpNext(eventData.upNext);

        const userTeam = TEAM_FROM_ROLE[userData?.role] || null;

        // Fetch latest broadcast
        getMessages({ scope: "broadcast" })
          .then((msgs) => {
            if (msgs?.length) setLatestBroadcast(msgs[msgs.length - 1]);
          })
          .catch(() => {});

        // Fetch latest team message if user has a team
        if (userTeam) {
          getMessages({ scope: "team", team_target: userTeam })
            .then((msgs) => {
              if (msgs?.length) setLatestTeamMsg(msgs[msgs.length - 1]);
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.name?.trim().split(/\s+/)[0];
  const userTeam = TEAM_FROM_ROLE[user?.role] || null;

  return (
    <div className="min-h-screen px-6 pt-6 space-y-3">
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

        {/* Latest Broadcast */}
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

        {/* Latest Team Message — only shown if user has a team */}
        {(loading || userTeam) && (
          <Link to="/messages" className="block">
            <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-ink-black/50 uppercase tracking-widest">
                  {userTeam
                    ? `${capitalise(userTeam)} Team`
                    : "Team Messages"}
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
                <p className="text-ink-black/50 text-sm">
                  No team messages yet
                </p>
              )}
            </div>
          </Link>
        )}
    </div>
  );
};

export default HomePage;