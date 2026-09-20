"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import FlashcardDeck from "@/app/components/FlashcardDeck";
import EEGChart, { EEGPoint } from "@/app/components/EEGChart";
import SchedulingQueue from "@/app/components/SchedulingQueue";

import {
  calculateNextInterval,
  getCognitiveState,
  getThetaBetaRatio,
  getDifficulty,
  getReasonForReview,
  type CardSchedule,
  type ReviewResult,
  type CognitiveState,
} from "@/app/lib/scheduler";

type Question = {
  id: number;
  question: string;
  answer: string;
};

type EEGData = {
  timestamp: number;
  phase: string;
  signal_quality: number;
  bands: {
    delta: number;
    theta: number;
    alpha: number;
    beta: number;
    gamma: number;
  };
  engagement: number;
};

type StudySessionProps = {
  questions: Question[];
  title: string;
  subject: string;
};

type QueueItem = {
  question: Question;
  schedule: CardSchedule;
};

const EEG_WINDOW_SIZE = 20;

export default function StudySession({
  questions,
  title,
  subject,
}: StudySessionProps) {
  const [brainView, setBrainView] = useState(true);

  const [eegData, setEegData] = useState<EEGData | null>(null);

  const [connected, setConnected] = useState(false);

  const [chartData, setChartData] = useState<EEGPoint[]>([]);

  /*
   * Rolling EEG buffer.
   *
   * This stays in browser memory and is used to calculate
   * a representative EEG state when the user answers.
   */
  const eegBuffer = useRef<EEGData[]>([]);

  /*
   * Scheduler state.
   */
  const [schedule, setSchedule] = useState<Record<number, CardSchedule>>(() => {
    const initial: Record<number, CardSchedule> = {};

    questions.forEach((question) => {
      initial[question.id] = {
        cardId: question.id,
        intervalSeconds: 0,
        nextReview: Date.now(),
        reviewCount: 0,
      };
    });

    return initial;
  });

  /*
   * Current card selected by the scheduler.
   */
  const [currentCardId, setCurrentCardId] = useState(questions[0]?.id ?? 0);

  /*
   * The answer selected for the current card.
   */
  const [selectedResult, setSelectedResult] = useState<ReviewResult | null>(
    null,
  );

  /*
   * Force the queue countdown to update every second.
   */
  const [, setQueueTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setQueueTick((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  /*
   * EEG WebSocket
   */
  useEffect(() => {
    const ws = new WebSocket("ws://127.0.0.1:8000/ws");

    ws.onopen = () => {
      console.log("EEG connected");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: EEGData = JSON.parse(event.data);

        setEegData(data);

        /*
         * Maintain rolling EEG window.
         */
        eegBuffer.current = [...eegBuffer.current, data].slice(
          -EEG_WINDOW_SIZE,
        );

        /*
         * Chart data.
         */
        setChartData((previous) => {
          const next = [
            ...previous,
            {
              time: new Date(data.timestamp * 1000).toLocaleTimeString([], {
                minute: "2-digit",
                second: "2-digit",
              }),
              engagement: data.engagement,
            },
          ];

          return next.slice(-30);
        });
      } catch (error) {
        console.error("Invalid EEG data", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error", error);

      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  /*
   * Calculate a representative EEG snapshot
   * from the rolling window.
   */
  const getEEGSnapshot = (): EEGData => {
    const buffer = eegBuffer.current;

    if (buffer.length === 0 && eegData) {
      return eegData;
    }

    if (buffer.length === 0) {
      return {
        timestamp: Date.now() / 1000,
        phase: "study",
        signal_quality: 0,
        bands: {
          delta: 0,
          theta: 0,
          alpha: 0,
          beta: 0,
          gamma: 0,
        },
        engagement: 0,
      };
    }

    const average = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;

    return {
      timestamp: buffer[buffer.length - 1].timestamp,

      phase: buffer[buffer.length - 1].phase,

      signal_quality: average(buffer.map((item) => item.signal_quality)),

      bands: {
        delta: average(buffer.map((item) => item.bands.delta)),

        theta: average(buffer.map((item) => item.bands.theta)),

        alpha: average(buffer.map((item) => item.bands.alpha)),

        beta: average(buffer.map((item) => item.bands.beta)),

        gamma: average(buffer.map((item) => item.bands.gamma)),
      },

      engagement: average(buffer.map((item) => item.engagement)),
    };
  };

  /*
   * User selects Knew / Guessed / Failed.
   *
   * This is the key scheduling function.
   */
  const handleAnswer = (result: ReviewResult) => {
    const eeg = getEEGSnapshot();
    const currentSchedule = schedule[currentCardId];

    const thetaBetaRatio = getThetaBetaRatio(eeg.bands.theta, eeg.bands.beta);

    const cognitiveState = getCognitiveState(
      eeg.bands.theta,
      eeg.bands.beta,
      eeg.signal_quality,
    );

    const newInterval = calculateNextInterval({
      result,
      engagement: eeg.engagement,
      theta: eeg.bands.theta,
      alpha: eeg.bands.alpha,
      beta: eeg.bands.beta,
      signalQuality: eeg.signal_quality,
      previousInterval: currentSchedule?.intervalSeconds ?? 0,
    });

    const nextReview = Date.now() + newInterval * 1000;

    const updatedSchedule: CardSchedule = {
      cardId: currentCardId,
      result,

      engagement: eeg.engagement,

      theta: eeg.bands.theta,
      alpha: eeg.bands.alpha,
      beta: eeg.bands.beta,

      signalQuality: eeg.signal_quality,

      thetaBetaRatio,
      cognitiveState,

      intervalSeconds: newInterval,
      nextReview,

      reviewCount: (currentSchedule?.reviewCount ?? 0) + 1,
    };

    setSchedule((previous) => ({
      ...previous,
      [currentCardId]: updatedSchedule,
    }));

    setSelectedResult(result);

    console.log("Card scheduled:", {
      cardId: currentCardId,
      result,

      eeg: {
        engagement: eeg.engagement,
        theta: eeg.bands.theta,
        alpha: eeg.bands.alpha,
        beta: eeg.bands.beta,
        signalQuality: eeg.signal_quality,
      },

      thetaBetaRatio,
      cognitiveState,

      intervalSeconds: newInterval,
      nextReview,
    });
  };

  /*
   * Choose the next card.
   *
   * We look at the runtime scheduling state rather
   * than using the original JSON order.
   */
  const selectNextCard = () => {
    const now = Date.now();

    const currentEEG = getEEGSnapshot();

    const cognitiveState = getCognitiveState(
      currentEEG.bands.theta,
      currentEEG.bands.beta,
      currentEEG.signal_quality,
    );

    const candidates = questions
      .filter((question) => question.id !== currentCardId)
      .map((question) => ({
        question,
        schedule: schedule[question.id],
        difficulty: getDifficulty(question, schedule[question.id]),
      }));

    /*
     * During elevated cognitive load:
     *
     * Prefer:
     *   easy → medium → hard
     *
     * During peak:
     *
     * Prefer:
     *   hard → medium → easy
     */
    if (cognitiveState === "elevated-load") {
      const difficultyRank = {
        easy: 0,
        medium: 1,
        hard: 2,
      };

      candidates.sort((a, b) => {
        const difficultyDifference =
          difficultyRank[a.difficulty] - difficultyRank[b.difficulty];

        if (difficultyDifference !== 0) {
          return difficultyDifference;
        }

        return a.schedule.nextReview - b.schedule.nextReview;
      });
    } else if (cognitiveState === "peak") {
      const difficultyRank = {
        hard: 0,
        medium: 1,
        easy: 2,
      };

      candidates.sort((a, b) => {
        const difficultyDifference =
          difficultyRank[a.difficulty] - difficultyRank[b.difficulty];

        if (difficultyDifference !== 0) {
          return difficultyDifference;
        }

        return a.schedule.nextReview - b.schedule.nextReview;
      });
    } else {
      /*
       * Normal state:
       * Standard SRS ordering.
       */
      candidates.sort((a, b) => a.schedule.nextReview - b.schedule.nextReview);
    }

    /*
     * Prefer cards that are actually due.
     */
    const dueCards = candidates.filter(
      (item) => item.schedule.nextReview <= now,
    );

    let selected;

    if (dueCards.length > 0) {
      selected = dueCards[0];
    } else {
      selected = candidates[0];
    }

    if (selected) {
      setCurrentCardId(selected.question.id);
    }

    setSelectedResult(null);

    /*
     * Start a fresh EEG thinking window
     * for the new card.
     */
    eegBuffer.current = [];

    console.log("Next card selected:", {
      cognitiveState,
      selectedCard: selected?.question.id,
      difficulty: selected?.difficulty,
    });
  };

  /*
   * Build queue data.
   */
  const queueItems: QueueItem[] = useMemo(() => {
    return questions
      .map((question) => ({
        question,
        schedule: schedule[question.id],
      }))
      .sort((a, b) => a.schedule.nextReview - b.schedule.nextReview);
  }, [questions, schedule]);

  const currentQuestion =
    questions.find((question) => question.id === currentCardId) ?? questions[0];

  if (!currentQuestion) {
    return null;
  }

  const currentSchedule = schedule[currentCardId];

 

  const currentCognitiveState: CognitiveState | null = eegData
    ? getCognitiveState(
        eegData.bands.theta,
        eegData.bands.beta,
        eegData.signal_quality,
      )
    : null;

  const currentThetaBetaRatio = eegData
    ? getThetaBetaRatio(eegData.bands.theta, eegData.bands.beta)
    : null;

    const scheduleReason = getReasonForReview(
  currentSchedule?.result,
  currentSchedule?.engagement,
  currentSchedule?.cognitiveState,
  currentSchedule?.thetaBetaRatio
);

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              <span>Study</span>
              <span>/</span>
              <span>{subject}</span>
              <span>/</span>
              <span className="font-medium text-zinc-800">{title}</span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? "animate-pulse bg-emerald-500" : "bg-zinc-300"
                }`}
              />

              <span className="text-xs text-zinc-400">
                {connected
                  ? "EEG connection active"
                  : "Waiting for EEG connection"}
              </span>
            </div>
          </div>

          {/* Brain toggle */}
          <button
            type="button"
            onClick={() => setBrainView((previous) => !previous)}
            className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
              brainView
                ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:shadow-sm"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                brainView ? "bg-indigo-600 text-white" : "bg-zinc-100"
              }`}
            >
              🧠
            </span>

            <span>{brainView ? "Hide Brain View" : "Show Brain View"}</span>

            <span
              className={`h-5 w-9 rounded-full p-0.5 transition ${
                brainView ? "bg-indigo-600" : "bg-zinc-300"
              }`}
            >
              <span
                className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  brainView ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </span>
          </button>
        </div>

        {/* Main study area */}
        <div
          className={`grid gap-6 ${
            brainView ? "lg:grid-cols-[1.15fr_0.85fr]" : "grid-cols-1"
          }`}
        >
          <FlashcardDeck
  question={currentQuestion}
  title={title}
  subject={subject}
  cardNumber={
    questions.findIndex(
      (question) => question.id === currentCardId
    ) + 1
  }
  totalCards={questions.length}
  selectedResult={selectedResult}
  onResult={handleAnswer}
  onNext={selectNextCard}
  nextEnabled={selectedResult !== null}
  scheduleReason={scheduleReason}
/>



          {/* Brain */}
          {brainView && (
            <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
              <EEGChart
                data={chartData}
                connected={connected}
                currentEngagement={eegData?.engagement}
                bands={eegData?.bands}
              />

              {eegData && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <p className="text-xs text-zinc-400">Signal quality</p>

                    <p className="mt-1 text-lg font-bold text-zinc-900">
                      {(eegData.signal_quality * 100).toFixed(0)}%
                    </p>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{
                          width: `${Math.min(
                            Math.max(eegData.signal_quality * 100, 0),
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <p className="text-xs text-zinc-400">Current phase</p>

                    <p className="mt-1 text-lg font-bold capitalize text-zinc-900">
                      {eegData.phase}
                    </p>

                    <p className="mt-1 text-xs text-zinc-400">Live session</p>
                  </div>
                </div>
              )}
            </aside>
          )}

          {eegData && (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400">
                    EEG-derived cognitive state
                  </p>

                  <p className="mt-1 text-lg font-bold capitalize text-zinc-900">
                    {currentCognitiveState?.replace("-", " ")}
                  </p>
                </div>

                <div className="rounded-xl bg-zinc-50 px-3 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400">
                    Theta / Beta
                  </p>

                  <p className="mt-1 text-sm font-bold text-zinc-800">
                    {currentThetaBetaRatio?.toFixed(2)}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-zinc-500">
                {currentCognitiveState === "peak"
                  ? "The current EEG-derived pattern allows BrainFlip to prioritize more challenging material."
                  : currentCognitiveState === "elevated-load"
                    ? "The current EEG-derived pattern temporarily favors easier review material."
                    : "BrainFlip is using the normal scheduling queue."}
              </p>
            </div>
          )}
        </div>

        {/* Scheduling Queue */}
        <SchedulingQueue
          items={queueItems}
          currentCardId={currentQuestion.id}
        />

        {/* Session footer */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-400">
          <span className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "animate-pulse bg-emerald-500" : "bg-zinc-300"
              }`}
            />

            {connected
              ? "Receiving live EEG data"
              : "Waiting for EEG connection"}
          </span>

          <span>•</span>

          <span>Demo scheduling mode</span>

          {currentSchedule?.reviewCount > 0 && (
            <>
              <span>•</span>

              <span>
                Card reviewed {currentSchedule.reviewCount} time
                {currentSchedule.reviewCount === 1 ? "" : "s"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
