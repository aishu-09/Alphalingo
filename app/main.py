import asyncio
import random
import time

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()


def generate_eeg_data():
    return {
        "timestamp": time.time(),

        "phase": "study",

        "signal_quality": round(random.uniform(0.85, 1.0), 3),

        "bands": {
            "delta": round(random.uniform(0.10, 0.30), 3),
            "theta": round(random.uniform(0.20, 0.50), 3),
            "alpha": round(random.uniform(0.30, 0.70), 3),
            "beta": round(random.uniform(0.20, 0.60), 3),
            "gamma": round(random.uniform(0.05, 0.20), 3),
        },

        "engagement": round(random.uniform(0.40, 0.90), 3),
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    print("Client connected")

    try:
        while True:

            eeg_data = generate_eeg_data()

            await websocket.send_json(eeg_data)

            print(eeg_data)

            await asyncio.sleep(0.5)

    except WebSocketDisconnect:
        print("Client disconnected")