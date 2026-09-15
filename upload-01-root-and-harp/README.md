# FOA-Rec-RTF listening samples

Supplementary listening examples for FOA-Rec-RTF: three HARP and three SurrRoom examples, with dry speech, ground-truth and predicted binaural speech, and four-channel RIR comparisons.

## Publish with GitHub Pages

In this repository, open **Settings → Pages**. Choose **Deploy from a branch**, then **main** and **/(root)**, and save. The landing page is `index.html` in the repository root. No build or backend is required. Keep `.nojekyll` in the repository.

All resource paths are relative and support a project URL such as `https://USERNAME.github.io/foa-rec-rtf-listening/`. The `#harp` and `#surrroom` anchors remain available.

## Preview locally

Run `python -m http.server 8000` in this directory and open `http://localhost:8000/`.

## Materials

The published WAV and plot files retain the original bytes. GT and Predicted audio share a playback position and paired gain. The current audio consists of existing 4-second excerpts from longer speech convolutions. These excerpts do not contain the complete post-speech tail and do not demonstrate reuse with unseen speech. The page includes these interpretation notes.

The selection policy, case IDs, speech IDs, audio hashes, and plot settings are in `selection.json`. The displayed decay-to-minus-20-dB measure is not a fitted T60 estimate.

This repository contains the public listening showcase. The separate participant study and response database are hosted independently.
