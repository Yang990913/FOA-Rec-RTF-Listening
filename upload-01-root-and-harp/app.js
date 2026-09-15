"use strict";

const allAudio = [...document.querySelectorAll("audio")];
let requestNumber = 0;
let sharedVolume = 1;
let sharedMuted = false;

function pauseAll(except = null) {
  allAudio.forEach(audio => { if (audio !== except) audio.pause(); });
}

document.querySelector("#pause-all").addEventListener("click", () => {
  requestNumber++;
  pauseAll();
});

allAudio.forEach(audio => {
  // Native player volume controls must not introduce different GT/pred gains.
  audio.addEventListener("volumechange", () => {
    if (audio.volume === sharedVolume && audio.muted === sharedMuted) return;
    sharedVolume = audio.volume;
    sharedMuted = audio.muted;
    allAudio.forEach(other => {
      if (other.volume !== sharedVolume) other.volume = sharedVolume;
      if (other.muted !== sharedMuted) other.muted = sharedMuted;
    });
  });
  audio.addEventListener("ratechange", () => {
    allAudio.forEach(other => {
      if (other.playbackRate !== audio.playbackRate) other.playbackRate = audio.playbackRate;
    });
  });
});

document.querySelectorAll(".sample").forEach(card => {
  const audio = Object.fromEntries([...card.querySelectorAll("audio")].map(a => [a.dataset.role, a]));
  const pair = [audio.gt, audio.pred];
  let authority = null;
  let position = 0;
  const pendingSeek = new Map();
  const cachedSources = new Map();
  const needsCache = target => /^https?:$/.test(location.protocol) && !target.dataset.cached;
  let channel = "W";
  let windowMode = "early";
  const status = card.querySelector(".playback-status");

  function showError(message) { status.textContent = message; }
  function paintPlayback() {
    Object.values(audio).forEach(a => a.closest(".player").classList.toggle("is-playing", !a.paused));
  }
  function syncPosition(target) {
    if (authority === target) return;
    let next = authority ? (pendingSeek.get(authority) ?? authority.currentTime) : position;
    if (authority?.ended || (Number.isFinite(target.duration) && next >= target.duration)) next = 0;
    position = next;
    authority = target;
    // Some browsers reset currentTime while the first WAV header is loading.
    // Retain the requested position until loadedmetadata, before audio starts.
    if (target.readyState < 1) pendingSeek.set(target, next);
    else if (Math.abs(target.currentTime - next) > .025) target.currentTime = next;
  }
  async function prepareAudio(target) {
    if (!needsCache(target)) return;
    if (!cachedSources.has(target)) {
      const source = target.src;
      const loading = fetch(source).then(response => {
        if (!response.ok) throw new Error(`Audio request failed: ${response.status}`);
        return response.blob();
      }).then(blob => {
        // A complete local Blob is seekable even when a static host ignores
        // Range requests. The original WAV bytes and gain remain unchanged.
        target.dataset.cached = "true";
        target.src = URL.createObjectURL(blob);
      }).catch(error => {
        cachedSources.delete(target);
        throw error;
      });
      cachedSources.set(target, loading);
    }
    await cachedSources.get(target);
  }
  async function play(target) {
    const request = ++requestNumber;
    pauseAll(target);
    if (pair.includes(target)) syncPosition(target);
    const desired = target.ended ? 0 : (pendingSeek.get(target) ?? target.currentTime);
    status.textContent = needsCache(target) ? "Loading audio…" : "";
    try {
      await prepareAudio(target);
      if (request !== requestNumber) return;
      if (pair.includes(target)) {
        if (target.readyState < 1) pendingSeek.set(target, desired);
        else target.currentTime = desired;
      }
      status.textContent = "";
      await target.play();
    } catch (error) {
      if (request === requestNumber && error.name !== "AbortError") {
        showError("Audio could not play. Try the native player or download the WAV file.");
      }
    }
  }
  Object.values(audio).forEach(a => {
    a.addEventListener("play", () => {
      if (a.paused) return; // Ignore a superseded play event during rapid switching.
      if (needsCache(a)) {
        a.pause();
        play(a);
        return;
      }
      requestNumber++; // Native controls also supersede pending audio loads.
      // Covers native controls as well as the explicit A/B switch buttons.
      pauseAll(a);
      if (pair.includes(a)) syncPosition(a);
      status.textContent = "";
      paintPlayback();
    });
    a.addEventListener("loadedmetadata", () => {
      if (pendingSeek.has(a)) {
        if (authority === a) a.currentTime = pendingSeek.get(a);
        pendingSeek.delete(a);
      }
    });
    a.addEventListener("pause", paintPlayback);
    a.addEventListener("ended", paintPlayback);
    a.addEventListener("seeking", () => {
      if (pair.includes(a)) {
        // An explicit seek, even while paused, defines the next A/B position.
        authority = a;
        position = a.currentTime;
      }
    });
    a.addEventListener("error", () => showError("This audio file could not be loaded. Use its Download WAV link to check the file."));
  });
  card.querySelectorAll("[data-switch]").forEach(button => {
    button.addEventListener("click", () => play(audio[button.dataset.switch]));
  });
  card.querySelector(".restart").addEventListener("click", () => {
    requestNumber++;
    pair.forEach(a => { a.pause(); a.currentTime = 0; });
    pendingSeek.clear();
    authority = null;
    position = 0;
    paintPlayback();
  });

  function updatePlots() {
    card.querySelectorAll(".channel-name").forEach(el => { el.textContent = channel; });
    card.querySelector(".window-name").textContent = windowMode === "early" ? "Early · −8 to +80 ms" : "Full response · 2 s";
    card.querySelectorAll("[data-plot]").forEach(img => {
      const kind = img.dataset.plot;
      const suffix = kind === "wave" ? windowMode : kind;
      img.src = `${card.dataset.plots}/${channel}_${suffix}.png`;
      img.alt = kind === "wave" ? `${channel} channel: GT and Predicted waveform overlay, ${windowMode} window` : `${kind === "gt" ? "GT" : "Predicted"} ${channel} RIR spectrogram, fixed time, frequency and color scales`;
    });
  }
  card.querySelector(".rir").addEventListener("toggle", event => {
    if (event.target.open) updatePlots();
  });
  card.querySelectorAll("[data-channel]").forEach(button => {
    button.addEventListener("click", () => {
      channel = button.dataset.channel;
      card.querySelectorAll("[data-channel]").forEach(b => b.setAttribute("aria-pressed", String(b === button)));
      updatePlots();
    });
  });
  card.querySelectorAll("[data-window]").forEach(button => {
    button.addEventListener("click", () => {
      windowMode = button.dataset.window;
      card.querySelectorAll("[data-window]").forEach(b => b.setAttribute("aria-pressed", String(b === button)));
      updatePlots();
    });
  });
});
