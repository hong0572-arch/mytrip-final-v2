/**
 * Premium Feature Management for Timmy AI
 * Controls feature access levels and daily usage limits.
 */

export const FEATURE_FLAGS = {
  // Free features
  ai_chat: {
    premium: false,
    dailyLimit: 30,
    label: { ko: 'AI 채팅', en: 'AI Chat' },
  },
  packing_assistant: {
    premium: false,
    dailyLimit: 10,
    label: { ko: '짐싸기 도우미', en: 'Packing Assistant' },
  },
  safety_info: {
    premium: false,
    dailyLimit: null, // unlimited
    label: { ko: '안전 정보', en: 'Safety Info' },
  },
  ai_memory: {
    premium: false,
    maxItems: 10,
    label: { ko: 'AI 메모리', en: 'AI Memory' },
  },

  // Premium features
  ai_chat_unlimited: {
    premium: true,
    dailyLimit: null,
    label: { ko: '무제한 AI 채팅', en: 'Unlimited AI Chat' },
  },
  camera_translation: {
    premium: true,
    trialCount: 3,
    label: { ko: '카메라 번역', en: 'Camera Translation' },
  },
  ai_memory_unlimited: {
    premium: true,
    maxItems: null,
    label: { ko: '무제한 메모리', en: 'Unlimited Memory' },
  },
  weather_adjustment: {
    premium: true,
    label: { ko: '날씨 기반 일정 조정', en: 'Weather-Based Adjustment' },
  },
  ai_diary: {
    premium: true,
    label: { ko: 'AI 여행 일기', en: 'AI Travel Diary' },
  },
};

/**
 * Check if a feature is available for the user
 * @param {string} featureKey - Feature key from FEATURE_FLAGS
 * @param {object} user - User object with isPremium flag
 * @param {number} todayUsage - Number of times used today
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkFeatureAccess(featureKey, user = {}, todayUsage = 0) {
  const feature = FEATURE_FLAGS[featureKey];
  if (!feature) return { allowed: false, reason: 'Unknown feature' };

  // Premium feature check
  if (feature.premium && !user.isPremium) {
    return {
      allowed: false,
      reason: 'premium_required',
      label: feature.label,
    };
  }

  // Daily limit check
  if (feature.dailyLimit && todayUsage >= feature.dailyLimit && !user.isPremium) {
    return {
      allowed: false,
      reason: 'daily_limit_reached',
      limit: feature.dailyLimit,
      label: feature.label,
    };
  }

  return { allowed: true };
}

/**
 * Get today's date string for usage tracking key
 * @returns {string} YYYY-MM-DD format
 */
export function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}
