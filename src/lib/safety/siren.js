'use client';
// 사이렌(웹 오디오) + 진동. 같은 페이지에서 하나만 울린다.
let ctx = null;
let osc = null;
let timer = null;

export function vibrate(count = 1) {
  try { navigator.vibrate?.(Array(count).fill([200, 100]).flat()); } catch {}
}

export function startSiren({ type = 'square', low = 750, high = 1200, volume = 1 } = {}) {
  if (ctx) return true;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
    osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = volume;
    osc.type = type;
    osc.frequency.value = low;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    let up = false;
    timer = setInterval(() => {
      osc?.frequency.setValueAtTime(up ? low : high, ctx.currentTime);
      up = !up;
      vibrate(1);
    }, 300);
    return true;
  } catch {
    stopSiren();
    return false;
  }
}

export function stopSiren() {
  clearInterval(timer);
  timer = null;
  try { osc?.stop(); } catch {}
  try { ctx?.close(); } catch {}
  osc = null;
  ctx = null;
}

export const sirenPlaying = () => Boolean(ctx);
