import asyncio
import time
from collections import deque

import numpy as np
from scipy.signal import welch

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from brainflow_stream import BrainFlowBoardSetup
from brainflow.board_shim import BoardIds

app = FastAPI()

# --- Board setup (single connection) ---
board_id = BoardIds.CYTON_BOARD.value

cyton_board = BrainFlowBoardSetup(
    board_id=board_id,
    name="Board_1",
    serial_port="COM4",  # update for your machine; leave unset to auto-detect
)

cyton_board.setup()

board_info = cyton_board.get_board_info()
sfreq = cyton_board.get_sampling_rate()

window_sec = 1.0
window_samples = int(sfreq * window_sec)

recent_scores = deque(maxlen=4)

# Populated at startup by run_calibration() -- do not use before the server has started
baseline_low = None
baseline_high = None

# "calibration" while run_calibration() is running at startup, "study" once it's done
current_phase = "calibration"


# --- Signal processing ---

def remove_dc_offset(data):
    return data[1:9, :] - np.mean(data[1:9, :], axis=1, keepdims=True)


FRONTAL_CHANNELS = [0, 1]


def compute_band_powers(eeg_data, sfreq, bands=None, nperseg=None):
    """
    Compute band powers from EEG data using Welch's method.

    Parameters
    ----------
    eeg_data : ndarray, shape (n_channels, n_samples)
    sfreq : float
    bands : dict, optional
        Frequency bands as {"band": (low, high)} in Hz. Defaults to standard EEG bands.
    nperseg : int, optional
        Length of each segment for Welch PSD. Defaults to min(1024, n_samples) so this
        doesn't silently misbehave on short windows.

    Returns
    -------
    dict
        {band_name: array of shape (n_channels,)} -- average band power per channel.
    """
    if bands is None:
        bands = {
            "delta": (1, 4),
            "theta": (4, 8),
            "alpha": (8, 12),
            "beta": (12, 30),
            "gamma": (30, 100),
        }
    if nperseg is None:
        nperseg = min(1024, eeg_data.shape[1])

    n_channels = eeg_data.shape[0]
    band_powers = {band: np.zeros(n_channels) for band in bands}

    for ch in range(n_channels):
        freqs, psd = welch(eeg_data[ch], sfreq, nperseg=nperseg)
        for band, (low, high) in bands.items():
            idx = np.logical_and(freqs >= low, freqs <= high)
            band_powers[band][ch] = np.trapezoid(psd[idx], freqs[idx])

    return band_powers


def compute_engagement_index_from_bands(band_powers):
    """Pope's Engagement Index (beta / (alpha + theta)) from an already-computed band_powers dict."""
    beta = np.mean(band_powers["beta"])
    alpha = np.mean(band_powers["alpha"])
    theta = np.mean(band_powers["theta"])
    return beta / (alpha + theta + 1e-8)


def compute_engagement_index(eeg_data, sfreq, channels=FRONTAL_CHANNELS):
    """Convenience wrapper -- computes band powers itself. Used by calibration, where each
    window only needs the engagement score and not the individual bands."""
    band_powers = compute_band_powers(eeg_data[channels, :], sfreq)
    return compute_engagement_index_from_bands(band_powers)


def normalize_engagement(raw_score, baseline_low, baseline_high):
    """Scale a raw engagement index to roughly 0-1 using the user's baseline range."""
    span = max(baseline_high - baseline_low, 1e-8)
    return np.clip((raw_score - baseline_low) / span, 0, 1)


def compute_relative_band_powers(band_powers):
    """Turn absolute per-channel band powers into relative (0-1, sums to ~1 across bands)
    values averaged over channels -- easier for a frontend to display/scale than raw Welch output."""
    means = {band: float(np.mean(powers)) for band, powers in band_powers.items()}
    total = sum(means.values()) + 1e-8
    return {band: round(value / total, 3) for band, value in means.items()}


def estimate_signal_quality(eeg_data, channels=FRONTAL_CHANNELS):
    """Rough heuristic signal quality score (0-1), not a validated metric.
    Flags near-zero variance (flat/disconnected electrode) and very high variance
    (motion/noise artifact) as lower quality."""
    channel_data = eeg_data[channels, :]
    stds = np.std(channel_data, axis=1)

    scores = []
    for std in stds:
        if std < 1:
            scores.append(0.0)
        elif std > 200:
            scores.append(0.3)
        else:
            scores.append(1.0)

    return round(float(np.mean(scores)), 3)


def record_baseline(label, duration_sec=30):
    """Blocking: records engagement index samples for duration_sec seconds and returns them."""
    print(f"Recording {label} baseline for {duration_sec}s...")
    scores = []
    n_windows = int(duration_sec / window_sec)

    for _ in range(n_windows):
        time.sleep(window_sec)
        raw = cyton_board.get_current_board_data(num_samples=window_samples)
        eeg_data = remove_dc_offset(raw)
        scores.append(compute_engagement_index(eeg_data, sfreq))

    print(f"{label} baseline done. Mean: {np.mean(scores):.4f}")
    return scores


def run_calibration():
    """Runs resting + on-task baselines and sets the module-level baseline_low/high."""
    global baseline_low, baseline_high, current_phase
    resting_scores = record_baseline("resting", duration_sec=30)
    ontask_scores = record_baseline("on-task", duration_sec=30)
    baseline_low = float(np.mean(resting_scores))
    baseline_high = float(np.mean(ontask_scores))
    current_phase = "study"
    print(f"Calibration complete: {baseline_low:.4f} (low) -> {baseline_high:.4f} (high)")


async def get_next_reading():
    await asyncio.sleep(window_sec)
    raw = cyton_board.get_current_board_data(num_samples=window_samples)
    eeg_data = remove_dc_offset(raw)

    band_powers = compute_band_powers(eeg_data[FRONTAL_CHANNELS, :], sfreq)
    raw_score = compute_engagement_index_from_bands(band_powers)
    norm_score = normalize_engagement(raw_score, baseline_low, baseline_high)
    recent_scores.append(norm_score)
    smoothed = sum(recent_scores) / len(recent_scores)

    return {
        "timestamp": time.time(),
        "phase": current_phase,
        "signal_quality": estimate_signal_quality(eeg_data),
        "bands": compute_relative_band_powers(band_powers),
        "engagement": round(smoothed, 3),
    }


# --- FastAPI lifecycle ---

@app.on_event("startup")
def startup_event():
    # Blocking on purpose -- the server shouldn't start accepting connections
    # until calibration has produced real baseline_low/baseline_high values.
    run_calibration()


@app.on_event("shutdown")
def shutdown_event():
    cyton_board.stop()  # BrainFlowBoardSetup's stop/release wrapper


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected")
    try:
        while True:
            data = await get_next_reading()
            await websocket.send_json(data)
    except WebSocketDisconnect:
        print("Client disconnected")