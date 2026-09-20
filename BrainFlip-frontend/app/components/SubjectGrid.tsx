"use client";

import Link from "next/link";

import computerScience from "@/app/data/computer-science.json";
import mathematics from "@/app/data/mathematics.json";
import biology from "@/app/data/biology.json";
import history from "@/app/data/history.json";

const subjects = [
  computerScience,
  mathematics,
  biology,
  history,
];

export default function SubjectGrid() {
  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wider text-indigo-600">
          Study Library
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
          What do you want to study?
        </h1>

        <p className="mt-2 text-zinc-500">
          Choose a subject to explore your flashcard decks.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {subjects.map((subject) => (
          <Link
            key={subject.subject}
            href={`/study/${subject.subject
              .toLowerCase()
              .replace(/\s+/g, "-")}`}
            className="group"
          >
            <div className="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-3xl transition-transform duration-200 group-hover:scale-110">
                {subject.icon}
              </div>

              <h2 className="mt-6 text-xl font-semibold text-zinc-900">
                {subject.subject}
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Explore {subject.decks.length} study decks
              </p>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-600">
                  View decks
                </span>

                <span className="text-zinc-400 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}