"use client";

import Dashboard from "./components/Dashboard";
import { useWebSocket } from "./hooks/useWebSocket";

export default function Home() {
  const { data, connected } = useWebSocket("ws://localhost:8000/ws");

  return (
    <main className="min-h-screen bg-[#f7f7f8] text-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl shadow-sm">
              🧠
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                BrainFlip
              </h1>
              <p className="text-xs text-zinc-500">
                Smarter study, backed by your brain
              </p>
            </div>
          </div>

          {/* Connection Status */}
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium ${
              connected
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-600"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-green-500" : "bg-red-500"
              }`}
            />

            {connected ? "EEG Connected" : "EEG Disconnected"}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {/* Welcome */}
        <section className="mb-10">
          <p className="mb-2 text-sm font-medium text-indigo-600">
            STUDY SESSION
          </p>

          <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
            Welcome back 👋
          </h2>

          <p className="mt-2 max-w-2xl text-zinc-500">
            Monitor your study activity and understand how your brain responds
            throughout each session.
          </p>
        </section>

        {/* Connection Banner */}
        {!connected && (
          <div className="mb-8 flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
              ⚡
            </div>

            <div>
              <h3 className="font-semibold text-amber-900">
                Waiting for EEG connection
              </h3>

              <p className="mt-1 text-sm text-amber-700">
                Connect your EEG device and start the backend server to begin
                receiving live data.
              </p>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {data ? (
          <section className="space-y-6">
            <Dashboard />
          </section>
        ) : (
          <section className="rounded-3xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
              🧠
            </div>

            <h3 className="mt-5 text-xl font-semibold text-zinc-900">
              Preparing your study session
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              BrainFlip is waiting for EEG data. Once your headset is connected,
              your study analytics will appear here.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
              <span className="text-sm text-zinc-400">
                Listening for EEG data...
              </span>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-12 border-t border-zinc-200 pt-6">
          <div className="flex flex-col justify-between gap-3 text-xs text-zinc-400 sm:flex-row">
            <p>
              BrainFlip · EEG-powered study analytics
            </p>

            <p>
              Your study data stays private.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}

