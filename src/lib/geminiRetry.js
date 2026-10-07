// Gemini가 과부하(503)·속도 제한(429)·일시 오류(500)로 실패하면 잠깐 기다렸다가 다시 시도한다.
const RETRYABLE = /\b(429|500|503)\b|overloaded|high demand|unavailable/i;

export async function generateWithRetry(model, prompt, { attempts = 3, baseDelayMs = 1200 } = {}) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (error) {
      lastError = error;
      if (i === attempts - 1 || !RETRYABLE.test(String(error?.message || error))) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (i + 1)));
    }
  }
  throw lastError;
}
