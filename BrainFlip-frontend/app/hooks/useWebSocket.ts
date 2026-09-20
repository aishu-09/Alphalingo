"use client";

import { useEffect, useState } from "react";

export type EEGData = {
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

export function useWebSocket(url: string) {
  const [data, setData] = useState<EEGData | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const parsedData: EEGData = JSON.parse(event.data);

        // Validate the expected EEG structure
        if (
          typeof parsedData.timestamp !== "number" ||
          typeof parsedData.engagement !== "number" ||
          typeof parsedData.signal_quality !== "number" ||
          !parsedData.bands
        ) {
          console.error("Invalid EEG data structure:", parsedData);
          return;
        }

        setData(parsedData);
      } catch (error) {
        console.error("Invalid WebSocket message:", event.data);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnected(false);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  return {
    data,
    connected,
  };
}