"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export type EEGPoint = {
  time: string;
  engagement: number;
};

type Bands = {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
};

type EEGChartProps = {
  data: EEGPoint[];
  connected: boolean;
  currentEngagement?: number;
  bands?: Bands;
};

export default function EEGChart({
  data,
  connected,
  currentEngagement,
  bands,
}: EEGChartProps) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>

            <h2 className="font-semibold text-zinc-900">
              Brain Activity
            </h2>
          </div>

          <p className="mt-1 text-xs text-zinc-500">
            Live EEG-derived activity during this study
          </p>
        </div>

        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
            connected
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              connected
                ? "animate-pulse bg-emerald-500"
                : "bg-red-500"
            }`}
          />

          {connected ? "Live" : "Offline"}
        </div>
      </div>

      {/* Engagement */}
      <div className="mt-6 rounded-2xl bg-zinc-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            EEG-derived engagement
          </p>

          <span className="text-xs text-zinc-400">
            Live
          </span>
        </div>

        <div className="mt-1 flex items-end gap-2">
          <span className="text-3xl font-bold tracking-tight text-zinc-900">
            {currentEngagement !== undefined
              ? currentEngagement.toFixed(2)
              : "--"}
          </span>
        </div>

        {currentEngagement !== undefined && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{
                width: `${Math.min(
                  Math.max(currentEngagement * 100, 0),
                  100
                )}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="mt-5 h-60 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 10,
                right: 5,
                left: -20,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="#f1f1f1"
              />

              <XAxis
                dataKey="time"
                tick={{
                  fontSize: 10,
                  fill: "#a1a1aa",
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                domain={[0, 1]}
                ticks={[0, 0.5, 1]}
                tick={{
                  fontSize: 10,
                  fill: "#a1a1aa",
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e4e4e7",
                  boxShadow:
                    "0 8px 30px rgba(0,0,0,0.08)",
                  backgroundColor: "#ffffff",
                  fontSize: "12px",
                }}
                formatter={(value) => [
                  Number(value).toFixed(2),
                  "Engagement",
                ]}
              />

              <Line
                type="monotone"
                dataKey="engagement"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: "#ffffff",
                }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-zinc-200">
            <div className="text-center">
              <div className="text-2xl">📡</div>

              <p className="mt-2 text-sm font-medium text-zinc-600">
                Waiting for EEG data
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                Brain activity will appear here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* EEG bands */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <BandMetric
          label="Theta"
          value={bands?.theta}
        />

        <BandMetric
          label="Alpha"
          value={bands?.alpha}
        />

        <BandMetric
          label="Beta"
          value={bands?.beta}
        />
      </div>

      <p className="mt-4 text-[10px] leading-4 text-zinc-400">
        EEG-derived metrics are experimental indicators of
        activity patterns and are not a direct measurement of
        attention or distraction.
      </p>
    </div>
  );
}

function BandMetric({
  label,
  value,
}: {
  label: string;
  value?: number;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 p-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-zinc-700">
        {value !== undefined ? value.toFixed(2) : "—"}
      </p>
    </div>
  );
}