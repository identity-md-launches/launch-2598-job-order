/* Intro once, then an in-player segment loop. Markers alone do not control playback. */
(() => {
  'use strict';
  const mark = document.getElementById('mark');
  const video = document.getElementById('fallback');
  const status = document.getElementById('status');
  const pause = document.getElementById('pause');
  const mode = document.getElementById('mode');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let usingVideo = false;
  let paused = false;
  let ready = false;
  let playingIntro = false;
  const animation = window.lottie.loadAnimation({
    container: mark,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    path: '../deliverables/siphon-wheel.json',
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
  });
  function showStatus(message) { status.textContent = message; }
  function startLottie() {
    if (!ready) return;
    paused = false;
    pause.textContent = 'Pause';
    animation.loop = false;
    if (motion.matches) {
      playingIntro = false;
      // Reset any existing segment before seeking an absolute composition frame.
      animation.resetSegments(true);
      animation.goToAndStop(120, true);
      paused = true;
      pause.textContent = 'Play';
      showStatus('Reduced motion · static, fully primed mark');
      return;
    }
    playingIntro = true;
    animation.playSegments([0, 120], true);
    showStatus('Lottie · one-time priming intro');
  }
  animation.addEventListener('DOMLoaded', () => {
    ready = true;
    if (!usingVideo) startLottie();
  });
  animation.addEventListener('complete', () => {
    if (!playingIntro || usingVideo) return;
    playingIntro = false;
    animation.loop = true;
    animation.playSegments([120, 360], true);
    showStatus('Lottie · seamless steady-state loop');
  });
  animation.addEventListener('data_failed', () => {
    showStatus('Could not load Lottie. Use the MP4 fallback or serve this folder over HTTP.');
  });
  function startVideo() {
    paused = false;
    pause.textContent = 'Pause';
    video.loop = false;
    video.src = '../deliverables/siphon-wheel.mp4';
    if (motion.matches) {
      video.removeAttribute('src');
      video.load();
      paused = true;
      pause.textContent = 'Play';
      showStatus('Reduced motion · static poster');
      return;
    }
    video.play().catch(() => { paused = true; pause.textContent = 'Play'; });
    showStatus('MP4 · one-time intro, then the separate four-second loop');
  }
  video.addEventListener('ended', () => {
    if (!usingVideo) return;
    video.src = '../deliverables/siphon-wheel-loop.mp4';
    video.loop = true;
    video.play().catch(() => {});
    showStatus('MP4 · steady-state loop');
  });
  document.getElementById('replay').addEventListener('click', () => usingVideo ? startVideo() : startLottie());
  pause.addEventListener('click', () => {
    if (usingVideo) {
      if (paused) {
        if (!video.getAttribute('src')) {
          video.src = '../deliverables/siphon-wheel-loop.mp4';
          video.loop = true;
        }
        video.play().catch(() => {});
      } else video.pause();
    } else {
      if (!ready) return;
      if (paused) {
        if (motion.matches) { animation.loop = true; playingIntro = false; animation.playSegments([120, 360], true); }
        else animation.play();
      } else animation.pause();
    }
    paused = !paused;
    pause.textContent = paused ? 'Play' : 'Pause';
  });
  mode.addEventListener('click', () => {
    usingVideo = !usingVideo;
    mark.style.display = usingVideo ? 'none' : 'block';
    video.style.display = usingVideo ? 'block' : 'none';
    mode.textContent = usingVideo ? 'Show Lottie' : 'Show MP4 fallback';
    if (usingVideo) { animation.pause(); startVideo(); }
    else { video.pause(); startLottie(); }
  });
  motion.addEventListener('change', () => usingVideo ? startVideo() : startLottie());
})();
