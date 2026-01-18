# Camera API notes

- Streaming starts via `GET http://<ip>/cam.cgi?mode=camcmd&value=recmode` followed by `GET http://<ip>/cam.cgi?mode=startstream&value=49199`.
- State polling: `GET http://<ip>/cam.cgi?mode=getstate`.
- Settings: `GET http://<ip>/cam.cgi?mode=setsetting&type=<type>&value=<value>`.
- Capture still: `GET http://<ip>/cam.cgi?mode=camcmd&value=capture`.
- Video start/stop: `GET http://<ip>/cam.cgi?mode=camcmd&value=video_recstart` / `video_recstop`.
- Sample responses live in data/ for offline reference.
