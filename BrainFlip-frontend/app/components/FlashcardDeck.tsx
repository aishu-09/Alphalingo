"use client";

import { useEffect, useState } from "react";
import type { ReviewResult } from "@/app/lib/scheduler";

type Question = {
  id: number;
  question: string;
  answer: string;
};

type FlashcardDeckProps = {
  question: Question;
  title: string;
  subject: string;
  cardNumber: number;
  totalCards: number;
  selectedResult: ReviewResult | null;
  onResult: (result: ReviewResult) => void;
  onNext: () => void;
  nextEnabled: boolean;
  scheduleReason?: string;
};

export default function FlashcardDeck({
  question,
  title,
  subject,
  cardNumber,
  totalCards,
  selectedResult,
  onResult,
  onNext,
  nextEnabled,
  scheduleReason,
}: FlashcardDeckProps) {
  const [flipped, setFlipped] = useState(false);
  const [showReason, setShowReason] = useState(false);

  /*
   * Whenever the current card changes, always start
   * on the question side.
   */
  useEffect(() => {
    setFlipped(false);
  }, [question.id]);

  const handleFlip = () => {
    setFlipped((previous) => !previous);
  };

  const handleResult = (result: ReviewResult) => {
    /*
     * The answer is now being displayed.
     */
    setFlipped(true);

    onResult(result);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          {subject}
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
          {title}
        </h1>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            Card {cardNumber} of {totalCards}
          </span>

          <span className="text-sm font-medium text-zinc-700">
            {Math.round((cardNumber / totalCards) * 100)}%
          </span>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{
              width: `${(cardNumber / totalCards) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="relative cursor-pointer [perspective:1000px]">
        {/* Why am I seeing this card? */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setShowReason((previous) => !previous);
          }}
          className={`absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold transition ${
            showReason
              ? "border-indigo-200 bg-indigo-50 text-indigo-600"
              : "border-zinc-200 bg-white text-zinc-400 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
          }`}
          aria-label="Why am I seeing this card?"
        >
          ?
        </button>

        {/* Explanation popup */}
        {showReason && (
          <div
            className="absolute right-4 top-16 z-30 w-[min(320px,calc(100%-2rem))] rounded-2xl border border-indigo-100 bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
                ?
              </div>

              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  Why am I seeing this card?
                </p>

                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {scheduleReason ??
                    "This card is currently part of your study queue."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Flashcard */}
        <div
          onClick={handleFlip}
          className={`relative min-h-[440px] w-full transition-transform duration-500 [transform-style:preserve-3d] ${
            flipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          {/* Question */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm [backface-visibility:hidden]">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
              ?
            </div>

            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Question
            </span>

            <h2 className="mt-5 max-w-xl text-2xl font-semibold leading-relaxed text-zinc-900">
              {question.question}
            </h2>

            <div className="mt-10 flex items-center gap-2 text-sm text-zinc-400">
              <span>↻</span>
              Click anywhere to reveal
            </div>
          </div>

          {/* Answer */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[2rem] border border-indigo-100 bg-indigo-50 p-10 text-center shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl">
              ✓
            </div>

            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
              Answer
            </span>

            <p className="mt-5 max-w-xl text-xl font-medium leading-relaxed text-zinc-800 sm:text-2xl">
              {question.answer}
            </p>

            <p className="mt-10 text-sm text-zinc-500">
              Click to see the question
            </p>
          </div>
        </div>
      </div>

      {/* Result buttons */}
      <div className="mt-6">
        <p
          className={`mb-3 text-center text-sm font-medium ${
            flipped ? "text-zinc-600" : "text-zinc-400"
          }`}
        >
          {flipped
            ? "How did you do?"
            : "Reveal the answer to record your result"}
        </p>

        <div className="grid grid-cols-3 gap-2">
          {/* KNEW */}
          <button
            type="button"
            disabled={!flipped}
            onClick={(event) => {
              event.stopPropagation();
              handleResult("knew");
            }}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
              selectedResult === "knew"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : flipped
                  ? "border-zinc-200 bg-white text-zinc-600 hover:border-emerald-300 hover:bg-emerald-50"
                  : "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300"
            }`}
          >
            ✓ Knew it
          </button>

          {/* GUESSED */}
          <button
            type="button"
            disabled={!flipped}
            onClick={(event) => {
              event.stopPropagation();
              handleResult("guessed");
            }}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
              selectedResult === "guessed"
                ? "border-amber-500 bg-amber-50 text-amber-700"
                : flipped
                  ? "border-zinc-200 bg-white text-zinc-600 hover:border-amber-300 hover:bg-amber-50"
                  : "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300"
            }`}
          >
            ~ Guessed
          </button>

          {/* FAILED */}
          <button
            type="button"
            disabled={!flipped}
            onClick={(event) => {
              event.stopPropagation();
              handleResult("failed");
            }}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
              selectedResult === "failed"
                ? "border-red-500 bg-red-50 text-red-700"
                : flipped
                  ? "border-zinc-200 bg-white text-zinc-600 hover:border-red-300 hover:bg-red-50"
                  : "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300"
            }`}
          >
            ✕ Failed
          </button>
        </div>
      </div>

      {/* Next */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={!nextEnabled}
          onClick={(event) => {
            event.stopPropagation();
            onNext();
          }}
          className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none"
        >
          Next Card →
        </button>
      </div>
    </div>
  );
}
