export type Locale = 'ko' | 'en' | 'ja' | 'zh';

const TRANSLATIONS: Record<string, Record<Locale, string>> = {
  // Navigation
  'nav.daily': { ko: '오늘의 운세', en: 'Daily Fortune', ja: '今日の運勢', zh: '今日运势' },
  'nav.weekly': { ko: '주간 리뷰', en: 'Weekly Review', ja: '週間レビュー', zh: '周报' },
  'nav.monthly': { ko: '월간 전략', en: 'Monthly Strategy', ja: '月間戦略', zh: '月报' },
  'nav.lifetime': { ko: '인생 총운', en: 'Lifetime', ja: '人生総運', zh: '人生总运' },
  'nav.history': { ko: '분석 기록', en: 'History', ja: '履歴', zh: '历史' },
  'nav.vibeHistory': { ko: 'Vibe 기록', en: 'Vibe Log', ja: 'Vibe記録', zh: 'Vibe记录' },
  'nav.settings': { ko: '설정', en: 'Settings', ja: '設定', zh: '设置' },

  // Five Elements (Korean original + bilingual)
  'element.wood': { ko: '목(木)', en: 'Wood (木)', ja: '木', zh: '木' },
  'element.fire': { ko: '화(火)', en: 'Fire (火)', ja: '火', zh: '火' },
  'element.earth': { ko: '토(土)', en: 'Earth (土)', ja: '土', zh: '土' },
  'element.metal': { ko: '금(金)', en: 'Metal (金)', ja: '金', zh: '金' },
  'element.water': { ko: '수(水)', en: 'Water (水)', ja: '水', zh: '水' },

  // Heavenly Stems (keep original Chinese)
  'stem.甲': { ko: '甲', en: '甲 (Jiǎ)', ja: '甲', zh: '甲' },
  'stem.乙': { ko: '乙', en: '乙 (Yǐ)', ja: '乙', zh: '乙' },
  'stem.丙': { ko: '丙', en: '丙 (Bǐng)', ja: '丙', zh: '丙' },
  'stem.丁': { ko: '丁', en: '丁 (Dīng)', ja: '丁', zh: '丁' },
  'stem.戊': { ko: '戊', en: '戊 (Wù)', ja: '戊', zh: '戊' },
  'stem.己': { ko: '己', en: '己 (Jǐ)', ja: '己', zh: '己' },
  'stem.庚': { ko: '庚', en: '庚 (Gēng)', ja: '庚', zh: '庚' },
  'stem.辛': { ko: '辛', en: '辛 (Xīn)', ja: '辛', zh: '辛' },
  'stem.壬': { ko: '壬', en: '壬 (Rén)', ja: '壬', zh: '壬' },
  'stem.癸': { ko: '癸', en: '癸 (Guǐ)', ja: '癸', zh: '癸' },

  // Concepts (translate)
  'concept.sangsaeng': { ko: '상생', en: 'Generating', ja: '相生', zh: '相生' },
  'concept.sanggeuk': { ko: '상극', en: 'Overcoming', ja: '相克', zh: '相克' },
  'concept.bihwa': { ko: '비화', en: 'Peer', ja: '比和', zh: '比和' },

  // Common UI
  'ui.loading': { ko: '분석 중...', en: 'Analyzing...', ja: '分析中...', zh: '分析中...' },
  'ui.error': { ko: '오류가 발생했습니다', en: 'An error occurred', ja: 'エラーが発生しました', zh: '发生错误' },
  'ui.retry': { ko: '다시 시도', en: 'Retry', ja: '再試行', zh: '重试' },
  'ui.refresh': { ko: '새로고침', en: 'Refresh', ja: '更新', zh: '刷新' },

  // Disclaimer
  'disclaimer.general': { ko: '이 서비스는 오락 및 자기 성찰 목적으로 제공됩니다.', en: 'This service is provided for entertainment and self-reflection purposes.', ja: 'このサービスは娯楽・自己省察目的で提供されます。', zh: '本服务仅供娱乐和自我反思之用。' },
};

let currentLocale: Locale = 'ko';

export function setLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof window !== 'undefined') {
    localStorage.setItem('app-locale', locale);
  }
}

export function getLocale(): Locale {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('app-locale') as Locale;
    if (stored && ['ko', 'en', 'ja', 'zh'].includes(stored)) {
      currentLocale = stored;
    }
  }
  return currentLocale;
}

export function t(key: string, locale?: Locale): string {
  const l = locale || currentLocale;
  return TRANSLATIONS[key]?.[l] || TRANSLATIONS[key]?.['ko'] || key;
}
