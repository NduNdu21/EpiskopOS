import { useEffect, useState, useRef, useMemo } from "react";
import { getLiveEvent, getSegments, nextSegment, prevSegment, endService, getMessages } from "../api";
import { getSocket } from "../socket";

// Format seconds into mm:ss, or h:mm:ss once it runs past an hour
const formatTime = (totalSeconds) => {
  const abs = Math.abs(totalSeconds);
  const h = Math.floor(abs / 3600);
  const m = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
  const s = String(abs % 60).padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

//Helper for live service display
const normaliseSegments = (segs) =>
  segs.map((seg) => ({
    ...seg,
    teams: Array.isArray(seg.teams)
      ? seg.teams
      : seg.teams
        ? seg.teams.replace(/[{}]/g, "").split(",").map((t) => t.trim()).filter(Boolean)
        : [],
  }));

// Decode the JWT payload defensively — a malformed or tampered token
// should never crash the component render.
const decodeToken = (token) => {
  if (!token) return {};
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return {};
  }
};

const Live = () => {
  const [event, setEvent] = useState(null);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [stageMode, setStageMode] = useState(false);
  const [messages, setMessages] = useState([]);
  const timerRef = useRef(null);
  const stageRef = useRef(null);

  // Parsed once per token value rather than re-parsed on every render.
  const payload = useMemo(() => decodeToken(localStorage.getItem("token")), []);
  const isAdmin = payload.role === "admin";

  const currentIndex = event?.current_segment_index ?? 0;
  const activeSegment = segments[currentIndex] || null;
  const upcomingSegments = segments.slice(currentIndex + 1);
  const completedSegments = segments.slice(0, currentIndex);
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

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

  // Fetch broadcast messages for the live event
  useEffect(() => {
    if (!event) {
      setMessages([]);
      return;
    }
    getMessages({ scope: "broadcast", event_id: event.id })
      .then(setMessages)
      .catch(() => {});
  }, [event, event?.id]);

  // Socket.IO — join room and listen for updates.
  // Depends only on event?.id, not the whole event object, so a socket
  // update that replaces `event` doesn't tear down and re-register these
  // listeners (which was causing join/leave spam on every update).
  useEffect(() => {
    const eventId = event?.id;
    if (!eventId) return;

    const socket = getSocket();
    socket.emit("join_service", eventId);

    const handleServiceUpdate = async ({ type, event: updatedEvent }) => {
      setEvent(updatedEvent);

      if (type === "GO_LIVE") {
        const segs = await getSegments(updatedEvent.id);
        setSegments(normaliseSegments(segs));
      }

      if (type === "END_SERVICE") {
        setEvent(null);
        setSegments([]);
      }
    };

    const handleNewMessage = (msg) => {
      if (msg.scope === "broadcast" && msg.event_id === eventId) {
        setMessages((prev) => [...prev, msg].slice(-20));
      }
    };

    socket.on("service_update", handleServiceUpdate);
    socket.on("new_message", handleNewMessage);

    return () => {
      socket.emit("leave_service", eventId);
      // Pass the exact handler reference — socket.off(event) with no
      // handler wipes out every listener on that event name, which is
      // dangerous if the socket is a shared singleton used elsewhere.
      socket.off("service_update", handleServiceUpdate);
      socket.off("new_message", handleNewMessage);
    };
  }, [event?.id]);

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
        // No duration — count up (positive number = elapsed)
        setSecondsLeft(elapsedSeconds);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => clearInterval(timerRef.current);
  }, [event?.segment_started_at, event?.current_segment_index, activeSegment?.id]);

  // Exit stage mode if the browser drops fullscreen (Esc key etc.)
  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) setStageMode(false);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const enterStageMode = async () => {
    setStageMode(true);
    try {
      await stageRef.current?.requestFullscreen?.();
    } catch {
      // Fullscreen can be blocked/unsupported (notably iOS Safari on
      // non-video elements) — stage mode still renders in-page either way.
    }
  };

  const exitStageMode = async () => {
    if (document.fullscreenElement) {
      // eslint-disable-next-line no-empty
      try { await document.exitFullscreen(); } catch {}
    }
    setStageMode(false);
  };

  const handleNext = async () => {
    if (!event || actionLoading) return;
    setActionLoading(true);
    try {
      await nextSegment(event.id);
      setError(null);
    } catch {
      setError("Failed to advance segment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrev = async () => {
    if (!event || actionLoading) return;
    setActionLoading(true);
    try {
      await prevSegment(event.id);
      setError(null);
    } catch {
      setError("Failed to go back.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!event || actionLoading) return;
    const confirmed = window.confirm("End the service? This will close the live session for everyone.");
    if (!confirmed) return;
    setActionLoading(true);
    try {
      await endService(event.id);
      setError(null);
    } catch {
      setError("Failed to end service.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="items-center gap-3">
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
    <div className="min-h-screen bg-beige pb-28">

      {/* Header */}
      <div className="px-5 pt-4 pb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-xs font-semibold tracking-widest text-red-400 uppercase">Live</span>
          </div>
          <button
            onClick={enterStageMode}
            className="text-xs font-semibold tracking-widest uppercase text-dark-teal/70 border border-dark-teal/20 rounded-full px-3 py-1.5"
          >
            Stage Mode
          </button>
        </div>
        <h1 className="text-dark-teal text-xl font-bold tracking-tight">{event.title}</h1>
        <p className="text-dark-teal/80 text-sm mt-0.5">
          {new Date(event.event_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          {event.started_at && (
            <> · Started {new Date(event.started_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</>
          )}
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
                <span className="text-xs font-semibold tracking-widest uppercase text-white/60">Now</span>

                {/* Timer */}
                {secondsLeft !== null && (
                  <span className={`text-sm font-bold tabular-nums rounded-full px-3 py-0.5 ${isOvertime
                    ? "bg-red-500/30 text-red-300"
                    : "bg-white/10 text-white"
                    }`}>
                    {isOvertime
                      ? `${formatTime(secondsLeft)} over`
                      : isElapsed
                        ? `${formatTime(secondsLeft)} elapsed`
                        : formatTime(secondsLeft)
                    }
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-bold tracking-tight leading-snug">{activeSegment.title}</h2>
              {activeSegment.description && (
                <p className="mt-2 text-white/70 text-sm leading-relaxed">{activeSegment.description}</p>
              )}
              {activeSegment.teams?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {activeSegment.teams.map((team) => (
                    <span key={team} className="text-xs bg-white/15 rounded-full px-3 py-1 text-white/90 font-medium">
                      {team}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-dark-teal/10 border border-dark-teal/20 px-5 py-8 text-center">
            <p className="text-ash-grey text-sm">Service is live — waiting for first segment.</p>
          </div>
        )}

        {/* Admin controls */}
        {isAdmin && (
          <div className="rounded-2xl border border-ash-grey bg-white px-4 py-4">
            <p className="text-xs font-semibold tracking-widest uppercase text-dark-teal/80 mb-3">Controls</p>
            <div className="flex gap-3">
              <button
                onClick={handlePrev}
                disabled={actionLoading || currentIndex === 0}
                className="flex-1 py-3 rounded-xl bg-ash-grey text-ink-black text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
              >
                ← Prev
              </button>
              <button
                onClick={handleNext}
                disabled={actionLoading || currentIndex >= segments.length - 1}
                className="flex-1 py-3 rounded-xl bg-dark-teal text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
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
        <div className="text-xs font-semibold tracking-widest uppercase text-dark-teal/80 px-1">
          {currentIndex + 1} / {segments.length} segments
        </div>

        {/* Upcoming segments */}
        {upcomingSegments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-widest uppercase text-dark-teal/80 px-1">Up next</p>
            {upcomingSegments.map((seg, idx) => (
              <div key={seg.id} className="rounded-2xl bg-ash-grey-pale border border-ash-grey/30 px-4 py-3.5 flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-sage/40 flex items-center justify-center text-xs font-bold text-ink-black/60 shrink-0">
                  {currentIndex + idx + 2}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-black truncate">{seg.title}</p>
                  {seg.duration_minutes && (
                    <p className="text-xs text-dark-teal/80 mt-0.5">{seg.duration_minutes} min</p>
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

      {/* Stage mode overlay */}
      {stageMode && (
        <div ref={stageRef} className="fixed inset-0 z-50 bg-ink-black text-off-white flex flex-col">
          <div className="flex items-center justify-between px-6 pt-5">
            <span className="text-xs font-semibold tracking-widest uppercase text-white/40">
              {currentIndex + 1} / {segments.length}
            </span>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <button
                    onClick={handlePrev}
                    disabled={actionLoading || currentIndex === 0}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold disabled:opacity-30"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={actionLoading || currentIndex >= segments.length - 1}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold disabled:opacity-30"
                  >
                    Next →
                  </button>
                </>
              )}
              <button
                onClick={exitStageMode}
                className="px-3 py-1.5 rounded-lg border border-white/20 text-white/70 text-xs font-semibold"
              >
                Exit
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {secondsLeft !== null ? (
              <span
                className={`font-black tabular-nums leading-none ${isOvertime ? "text-red-400" : "text-beige"}`}
                style={{ fontSize: "min(28vw, 260px)" }}
              >
                {isOvertime ? `+${formatTime(secondsLeft)}` : formatTime(secondsLeft)}
              </span>
            ) : (
              <span className="text-white/30 text-2xl font-semibold">No timer set</span>
            )}
          </div>

          <div className="px-8 pb-6 text-center">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-beige">
              {activeSegment?.title || "—"}
            </h2>
          </div>

          <div className="border-t border-white/10 bg-black/30 px-8 py-5 min-h-[4.5rem] flex items-center justify-center">
            {latestMessage ? (
              <p className="text-white/80 text-base text-center">
                <span className="font-semibold text-white/50">{latestMessage.sender_name}: </span>
                {latestMessage.content}
              </p>
            ) : (
              <p className="text-white/30 text-sm">No messages</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Live;