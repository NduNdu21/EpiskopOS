import { useState } from "react";
import { Film, Radio, MessageSquare, X } from "lucide-react";

const STEPS = [
  {
    icon: Film,
    title: "Events",
    description:
      "Plan and manage church services. Build an order of service with timed segments and assign teams to each part.",
  },
  {
    icon: Radio,
    title: "Live Service",
    description:
      "Control the service in real time. Advance through segments, track timing, and keep every team in sync from one screen.",
  },
  {
    icon: MessageSquare,
    title: "Messages",
    description:
      "Communicate with your team. Send a broadcast to everyone or a direct message to a specific team.",
  },
];

export default function WelcomeTour({ onDismiss }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleDismiss = () => {
    localStorage.setItem("episkopos_tour_seen", "1");
    onDismiss();
  };

  return (
    <div className="fixed inset-0 bg-ink-black/60 z-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl overflow-hidden">

        {/* Header row */}
        <div className="flex justify-between items-center px-6 pt-5">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-dark-teal" : "w-1.5 bg-ash-grey/40"
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleDismiss}
            className="text-ash-grey hover:text-ink-black transition-colors"
            aria-label="Skip tour"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <div className="w-14 h-14 rounded-2xl bg-dark-teal/10 flex items-center justify-center mb-5">
            <current.icon size={28} className="text-dark-teal" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-bold text-ink-black mb-2">{current.title}</h2>
          <p className="text-ash-grey text-sm leading-relaxed">{current.description}</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3 rounded-xl border border-ash-grey/40 text-ink-black text-sm font-medium hover:bg-ash-grey/10 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={isLast ? handleDismiss : () => setStep((s) => s + 1)}
            className="flex-1 py-3 rounded-xl bg-dark-teal text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {isLast ? "Get started" : "Next"}
          </button>
        </div>

      </div>
    </div>
  );
}