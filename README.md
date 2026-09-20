# BrainFlip

A flashcard study app that reads real-time EEG (via an OpenBCI Cyton board) to measure a user's engagement while they study, and uses that signal to decide which cards come back sooner.

### Why?

Traditional spaced-repetition apps schedule reviews based only on whether you got a card right, not whether you were actually paying attention when you saw it. We compute a live engagement index from frontal EEG activity and feed it into the scheduling logic, so a "correct" answer given while zoned out doesn't get the same trust as one given while actually focused.

### App Structure

BrainFlip-frontend\app\lib\scheduler.ts: contains the main algorithm logic

engagement-server/engagement_server.py: connects to the Cyton board (via brainflow_stream.py), runs a resting + on-task baseline calibration once at startup, then continuously pulls a fresh ~1-second window of EEG data