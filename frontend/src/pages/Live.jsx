import { useEffect, useState, useRef } from "react";
import { getLiveEvent, getSegments, nextSegment, prevSegment, endService } from "../api";
import { getSocket } from "../socket";

// Format seconds into mm:ss or shows elapsed if no duration
const formatTime = (seconds) => {
  const abs = Math.abs(seconds);
  const m = String(Math.floor(abs / 60)).padStart(2, "0");
  const s = String(abs % 60).padStart(2, "0");
  return seconds < 0 ? `+${m}:${s}` : `${m}:${s}`;
};

//Helper for live service display
const normaliseSegments = (segs) =>
  segs.map((seg) => ({
    ...seg,
    teams: Array.isArray(seg.teams)
      ? seg.teams
      : seg.teams
      ? seg.teams.replace(/[{}]/g, "").split(",").filter(Boolean)
      : [],
  }));

const Live = () => {
  const [event, setEvent] = useState(null);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const timerRef = useRef(null);

  const token = localStorage.getItem("token");
  const payload = token ? JSON.parse(atob(token.split(".")[1])) : {};
  const isAdmin = payload.role === "admin";

  const currentIndex = event?.current_segment_index ?? 0;
  const activeSegment = segments[currentIndex] || null;
  const upcomingSegments = segments.slice(currentIndex + 1);
  const completedSegments = segments.slice(0, currentIndex);

  // Timer display logic
  const isOvertime = secondsLeft !== null && activeSegment?.duration_minutes && secondsLeft < 0;
  const isElapsed = secondsLeft !== null && !activeSegment?.duration_minutes;

  // Fetch live event + segments
  useEffect(() => {
    const init = async () => {
      try {
        const liveEvent = await getLiveEvent();
        if (!liveEvent) {
          setLoading(false);
          return;
        }
        setEvent(liveEvent);
        const segs = await getSegments(liveEvent.id);
        setSegments(normaliseSegments(segs));
      } catch (err) {
        setError(err.message || "Failed to load live service.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Socket.IO — join room and listen for updates
  useEffect(() => {
    if (!event) return;

    const socket = getSocket();
    socket.emit("join_service", event.id);

    socket.on("service_update", async ({ type, event: updatedEvent }) => {
      setEvent(updatedEvent);

      if (type === "GO_LIVE") {
        const segs = await getSegments(updatedEvent.id);
        setSegments(normaliseSegments(segs));
      }

      if (type === "END_SERVICE") {
        setEvent(null);
        setSegments([]);
      }
    });

    return () => {
      socket.emit("leave_service", event.id);
      socket.off("service_update");
    };
  }, [event]);

  // Countdown timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (!event?.segment_started_at || !activeSegment) {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const startedAt = new Date(event.segment_started_at).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startedAt) / 1000);

      if (activeSegment.duration_minutes) {
        const totalSeconds = activeSegment.duration_minutes * 60;
        setSecondsLeft(totalSeconds - elapsedSeconds);
      } else {
        // No duration — show elapsed time as positive count-up
        setSecondsLeft(-elapsedSeconds);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => clearInterval(timerRef.current);
  }, [event?.segment_started_at, event?.current_segment_index, activeSegment]);

  const handleNext = async () => {
    if (!event || actionLoading) return;
    setActionLoading(true);
    try { await nextSegment(event.id); }
    catch { setError("Failed to advance segment."); }
    finally { setActionLoading(false); }
  };

  const handlePrev = async () => {
    if (!event || actionLoading) return;
    setActionLoading(true);
    try { await prevSegment(event.id); }
    catch { setError("Failed to go back."); }
    finally { setActionLoading(false); }
  };

  const handleEnd = async () => {
    if (!event || actionLoading) return;
    const confirmed = window.confirm("End the service? This will close the live session for everyone.");
    if (!confirmed) return;
    setActionLoading(true);
    try { await endService(event.id); }
    catch { setError("Failed to end service."); }
    finally { setActionLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-off-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-dark-teal border-t-transparent animate-spin" />
          <p className="text-sm text-ash-grey font-medium tracking-wide">Checking for live service…</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-off-white flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-12 h-12 rounded-full bg-ash-grey/20 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-ash-grey" />
        </div>
        <h2 className="text-ink-black text-lg font-semibold tracking-tight">No live service right now</h2>
        <p className="text-ash-grey text-sm text-center max-w-xs">
          This tab will update automatically when a service goes live.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-off-white pb-28">

      {/* Header */}
      <div className="bg-dark-teal px-5 pt-12 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-xs font-semibold tracking-widest text-red-400 uppercase">Live</span>
        </div>
        <h1 className="text-off-white text-xl font-bold tracking-tight">{event.title}</h1>
        <p className="text-off-white/60 text-sm mt-0.5">
          {new Date(event.event_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <div className="px-4 py-5 space-y-5">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Active segment */}
        {activeSegment ? (
          <div className="rounded-2xl bg-dark-teal text-off-white shadow-lg overflow-hidden">
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-off-white/60">Now</span>

                {/* Timer */}
                {secondsLeft !== null && (
                  <span className={`text-sm font-bold tabular-nums rounded-full px-3 py-0.5 ${isOvertime
                    ? "bg-red-500/30 text-red-300"
                    : isElapsed
                      ? "bg-off-white/10 text-off-white/70"
                      : "bg-off-white/10 text-off-white"
                    }`}>
                    {isElapsed
                      ? `${formatTime(secondsLeft)} elapsed`
                      : isOvertime
                        ? `${formatTime(secondsLeft)} over`
                        : formatTime(secondsLeft)
                    }
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold tracking-tight leading-snug">{activeSegment.title}</h2>
              {activeSegment.description && (
                <p className="mt-2 text-off-white/70 text-sm leading-relaxed">{activeSegment.description}</p>
              )}
              {activeSegment.teams?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {activeSegment.teams.map((team) => (
                    <span key={team} className="text-xs bg-off-white/15 rounded-full px-3 py-1 text-off-white/90 font-medium">
                      {team}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="h-1 bg-off-white/10">
              <div
                className="h-1 bg-off-white/40 transition-all duration-500"
                style={{ width: `${segments.length > 1 ? (currentIndex / (segments.length - 1)) * 100 : 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-dark-teal/10 border border-dark-teal/20 px-5 py-8 text-center">
            <p className="text-ash-grey text-sm">Service is live — waiting for first segment.</p>
          </div>
        )}

        {/* Admin controls */}
        {isAdmin && (
          <div className="rounded-2xl border border-ash-grey/20 bg-white px-4 py-4">
            <p className="text-xs font-semibold tracking-widest uppercase text-ash-grey mb-3">Controls</p>
            <div className="flex gap-3">
              <button
                onClick={handlePrev}
                disabled={actionLoading || currentIndex === 0}
                className="flex-1 py-3 rounded-xl bg-sage-pale text-ink-black text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
              >
                ← Prev
              </button>
              <button
                onClick={handleNext}
                disabled={actionLoading || currentIndex >= segments.length - 1}
                className="flex-1 py-3 rounded-xl bg-dark-teal text-off-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
              >
                Next →
              </button>
            </div>
            <button
              onClick={handleEnd}
              disabled={actionLoading}
              className="w-full mt-3 py-3 rounded-xl border border-red-200 text-red-500 text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
            >
              End Service
            </button>
          </div>
        )}

        {/* Segment counter */}
        <div className="text-xs font-semibold tracking-widest uppercase text-ash-grey px-1">
          {currentIndex + 1} / {segments.length} segments
        </div>

        {/* Upcoming segments */}
        {upcomingSegments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-widest uppercase text-ash-grey px-1">Up next</p>
            {upcomingSegments.map((seg, idx) => (
              <div key={seg.id} className="rounded-2xl bg-sage-pale border border-sage/30 px-4 py-3.5 flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-sage/40 flex items-center justify-center text-xs font-bold text-ink-black/60 shrink-0">
                  {currentIndex + idx + 2}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-black truncate">{seg.title}</p>
                  {seg.duration_minutes && (
                    <p className="text-xs text-ash-grey mt-0.5">{seg.duration_minutes} min</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed segments */}
        {completedSegments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-widest uppercase text-ash-grey px-1">Completed</p>
            {completedSegments.map((seg) => (
              <div key={seg.id} className="rounded-2xl bg-ash-grey/8 border border-ash-grey/15 px-4 py-3 flex items-center gap-3 opacity-50">
                <span className="w-4 h-4 rounded-full border border-ash-grey/40 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-ash-grey" fill="none" viewBox="0 0 10 10">
                    <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className="text-sm text-ash-grey line-through">{seg.title}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default Live;