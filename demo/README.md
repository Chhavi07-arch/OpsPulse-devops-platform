# OpsPulse demo 🚀

[Watch / download the narrated demo](OpsPulse-Demo-Voiceover.mp4) · [Voiceover MP3](OpsPulse-Voiceover.mp3) · [Subtitles](OpsPulse-Demo.srt) · [PowerPoint](OpsPulse-Mission-Control.pptx) · [Presentation PDF](OpsPulse-Mission-Control.pdf)

A short walkthrough of the running application and its delivery and monitoring tools. The video includes a synthetic English voiceover, visible pointer/click highlights, captions and chapter titles matching the space-and-mint UI. Download the MP4 if your GitHub view does not play it inline.

The current download is **OpsPulse-Demo-Voiceover.mp4**, with English narration in both stereo channels. Open this updated file rather than an older download. For a presentation, download it and open it in QuickTime Player or VLC; turn on the player's speaker control as well as your device volume. The separate MP3 contains the same narration and timing, so you can also check the sound independently.

## Chapters

| Start | What is shown |
|---|---|
| 00:00 | WELCOME TO MISSION CONTROL |
| 00:20 | 01 / THE BIG PICTURE |
| 00:44 | 02 / FIND THE SIGNAL |
| 01:04 | 03 / DECLARE AN INCIDENT |
| 01:23 | 04 / FOLLOW THE RESPONSE |
| 01:47 | 05 / KNOW YOUR SERVICES |
| 02:08 | 06 / A LITTLE LIGHT |
| 02:24 | 07 / KEEP PEOPLE INFORMED |
| 02:49 | 08 / AUTOMATED CHECKS |
| 03:12 | 09 / GIT IS THE SOURCE OF TRUTH |
| 03:35 | 10 / SEE WHAT IS HAPPENING |
| 04:01 | 11 / CHECK THE METRICS SOURCE |
| 04:17 | MISSION COMPLETE |

## Recording notes

- Recorded on 16 October 2026 from the **existing Codespaces minikube cluster**, using private browser access. The app uses PostgreSQL in this environment.
- Actual UI actions create **Demo: checkout response delay**, then move it through Investigating → Identified → Monitoring → Resolved. The resolved example remains in the incident history. Existing incidents and services were retained.
- Includes Overview, incident filtering/search, the declaration form and response timeline, Services and its add form, both themes, the public status/uptime page, GitHub Actions, Argo CD, Grafana and Prometheus backend target health.
- The GitHub Actions chapter shows [successful run 38599535048](https://github.com/Chhavi07-arch/OpsPulse-devops-platform/actions/runs/38599535048), not a newly triggered pipeline. Its archived evidence reports 30 backend tests, 97% coverage and 10 passing jobs.
- Monitoring uses real measurements from the UI workflow and a short batch of 240 read-only API requests. It is a small demo workload, not a production benchmark. A panel can show “No data” when its metric series has not been emitted.
- The voice is **synthetic narration**, not Chhavi’s recorded or cloned voice. Login steps and credentials are excluded from the finished video.
- **No AWS resources were launched for this recording.** The prepared AWS demo remains separate.

Video: **4:42**, 1920 × 1080, H.264 video and stereo AAC-LC audio (48 kHz, 192 kb/s). Narration is normalized to approximately −14 LUFS with peaks below 0 dBFS. The re-export preserves the original visuals and burned-in captions.
