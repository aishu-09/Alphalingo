"use client";

import type { CardSchedule, ReviewResult } from "@/app/lib/scheduler";
import { getReasonForReview } from "@/app/lib/scheduler";

type Question = {
  id: number;
  question: string;
  answer: string;
};

type QueueItem = {
  question: Question;
  schedule: CardSchedule;
};

type SchedulingQueueProps = {
  items: QueueItem[];
  currentCardId: number;
};

function formatTime(seconds: number) {
  if (seconds <= 0) {
    return "Due now";
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function getResultLabel(result?: ReviewResult) {
  switch (result) {
    case "knew":
      return "Knew it";

    case "guessed":
      return "Guessed";

    case "failed":
      return "Failed";

    default:
      return "Not reviewed";
  }
}

function getResultStyle(result?: ReviewResult) {
  switch (result) {
    case "knew":
      return "bg-emerald-50 text-emerald-700";

    case "guessed":
      return "bg-amber-50 text-amber-700";

    case "failed":
      return "bg-red-50 text-red-700";

    default:
      return "bg-zinc-100 text-zinc-500";
  }
}

export default function SchedulingQueue({
  items,
  currentCardId,
}: SchedulingQueueProps) {
  const currentItem = items.find((item) => item.question.id === currentCardId);

  const now = Date.now();

  return (
    <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>

            <h2 className="font-semibold text-zinc-900">Scheduling Queue</h2>
          </div>

          <p className="mt-1 text-xs text-zinc-500">
            Cards are ordered by their dynamically calculated next-review time.
          </p>
        </div>

        <div className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600">
          {items.length} cards
        </div>
      </div>

      {/* Queue */}
      <div className="mt-5 space-y-2">
        {items.map((item, index) => {
          const secondsUntilReview = Math.max(
            0,
            Math.ceil((item.schedule.nextReview - now) / 1000),
          );

          const isCurrent = item.question.id === currentCardId;

          const isDue = item.schedule.nextReview <= now;

          return (
            <div
              key={item.question.id}
              className={`rounded-2xl border p-4 transition ${
                isCurrent
                  ? "border-indigo-200 bg-indigo-50/60"
                  : "border-zinc-100 bg-zinc-50/60"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Position */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                    isCurrent
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-zinc-400"
                  }`}
                >
                  {index + 1}
                </div>

                {/* Card */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-800">
                    {item.question.question}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {isCurrent && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
                        Current
                      </span>
                    )}

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getResultStyle(
                        item.schedule.result,
                      )}`}
                    >
                      {getResultLabel(item.schedule.result)}
                    </span>

                    {item.schedule.reviewCount > 0 && (
                      <span className="text-[10px] text-zinc-400">
                        {item.schedule.reviewCount} review
                        {item.schedule.reviewCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Next review */}
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-bold ${
                      isDue ? "text-indigo-600" : "text-zinc-700"
                    }`}
                  >
                    {isDue ? "Due now" : formatTime(secondsUntilReview)}
                  </p>

                  {item.schedule.intervalSeconds > 0 && (
                    <p className="mt-0.5 text-[10px] text-zinc-400">
                      interval {formatTime(item.schedule.intervalSeconds)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Why this card */}
      {currentItem && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/50">
          <details>
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-indigo-700">
              Why am I seeing this card?
            </summary>

            <div className="border-t border-indigo-100 px-4 py-4">
              <p className="text-sm leading-6 text-zinc-700">
                {getReasonForReview(
                  currentItem.schedule.result,
                  currentItem.schedule.engagement,
                  currentItem.schedule.cognitiveState,
                  currentItem.schedule.thetaBetaRatio,
                )}
              </p>

              {currentItem.schedule.result && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Info
                    label="Result"
                    value={getResultLabel(currentItem.schedule.result)}
                  />

                  <Info
                    label="EEG engagement"
                    value={
                      currentItem.schedule.engagement !== undefined
                        ? currentItem.schedule.engagement.toFixed(2)
                        : "—"
                    }
                  />

                  <Info
                    label="Last interval"
                    value={formatTime(currentItem.schedule.intervalSeconds)}
                  />

                  <Info
                    label="Reviews"
                    value={String(currentItem.schedule.reviewCount)}
                  />

                  <Info
                    label="Theta / Beta"
                    value={
                      currentItem.schedule.thetaBetaRatio !== undefined
                        ? currentItem.schedule.thetaBetaRatio.toFixed(2)
                        : "—"
                    }
                  />

                  <Info
                    label="Cognitive state"
                    value={
                      currentItem.schedule.cognitiveState
                        ?.replace("-", " ")
                        .replace(/\b\w/g, (char) => char.toUpperCase()) ?? "—"
                    }
                  />
                </div>
              )}

              {!currentItem.schedule.result && (
                <p className="mt-3 text-xs text-zinc-500">
                  This card has not been reviewed yet, so it starts in the
                  initial learning queue.
                </p>
              )}
            </div>
          </details>
        </div>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-zinc-800">{value}</p>
    </div>
  );
}
