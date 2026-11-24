// SubGuard — Local Cancel Playbook Database (zero network required)
export const CANCEL_PLAYBOOK = [
  {
    match: ['spotify'],
    name: 'Spotify',
    url: 'https://www.spotify.com/account/subscription/change/',
    difficulty: 'easy',
    tip_ru: 'В мобильном приложении отменить нельзя — открывай именно веб-версию → Аккаунт → Ваш план → Отменить Premium.',
    tip_en: 'Cannot cancel inside the iOS/Android app — open the web account page → Your Plan → Cancel Premium.'
  },
  {
    match: ['yandex plus', 'яндекс плюс', 'yandex.plus', 'ya plus', 'kinopoisk', 'кинопоиск'],
    name: 'Яндекс Плюс',
    url: 'https://plus.yandex.ru/my',
    difficulty: 'dark',
    tip_ru: 'Яндекс покажет 3–4 экрана с «подарками» и скидками — листай вниз и жми «Отменить подписку» до самого конца, пока не придёт подтверждение.',
    tip_en: 'Scroll past multiple retention offer screens until final confirmation appears.'
  },
  {
    match: ['chatgpt', 'openai'],
    name: 'ChatGPT Plus / OpenAI',
    url: 'https://chatgpt.com/#settings/Subscription',
    difficulty: 'easy',
    tip_ru: 'Настройки → Подписка → Manage → Cancel plan. Доступ сохранится до конца оплаченного периода.',
    tip_en: 'Settings → Subscription → Manage → Cancel plan. Access remains until period end.'
  },
  {
    match: ['claude', 'anthropic'],
    name: 'Claude Pro',
    url: 'https://claude.ai/settings/billing',
    difficulty: 'easy',
    tip_ru: 'Settings → Billing → Cancel subscription. Отменяется в 2 клика без скрытых экранов.',
    tip_en: 'Settings → Billing → Cancel subscription. Clean 2-click cancellation.'
  },
  {
    match: ['adobe', 'creative cloud'],
    name: 'Adobe Creative Cloud',
    url: 'https://account.adobe.com/plans',
    difficulty: 'dark',
    tip_ru: 'Лайфхак: если Adobe требует штраф за досрочную отмену годового плана — смени план на самый дешёвый, а затем отмени его в течение 14 дней с полным возвратом.',
    tip_en: 'Pro tip: if Adobe charges an early termination fee, switch to a cheaper plan first, then cancel within the 14-day full refund window.'
  },
  {
    match: ['netflix'],
    name: 'Netflix',
    url: 'https://www.netflix.com/cancelplan',
    difficulty: 'easy',
    tip_ru: 'Прямая ссылка ведёт сразу на кнопку «Завершить отмену». Профили хранятся ещё 10 месяцев.',
    tip_en: 'Direct link takes you straight to Finish Cancellation. Profiles are kept for 10 months.'
  },
  {
    match: ['telegram', 'tg premium'],
    name: 'Telegram Premium',
    url: 'https://t.me/PremiumBot',
    difficulty: 'easy',
    tip_ru: 'Если оплачивал через @PremiumBot — напиши ему /stop. Если через Apple/Google — отменяй в подписках стора.',
    tip_en: 'If billed via @PremiumBot, send /stop. Otherwise cancel inside Apple App Store or Google Play subscriptions.'
  },
  {
    match: ['discord', 'nitro'],
    name: 'Discord Nitro',
    url: 'https://discord.com/channels/@me',
    difficulty: 'medium',
    tip_ru: 'Настройки пользователя → Подписки → Отменить. Discord предложит «паузу» — жми именно полную отмену.',
    tip_en: 'User Settings → Subscriptions → Cancel. Decline the pause offer to fully cancel.'
  },
  {
    match: ['apple', 'icloud', 'app store'],
    name: 'Apple / iCloud+',
    url: 'https://apps.apple.com/account/subscriptions',
    difficulty: 'easy',
    tip_ru: 'На iPhone: Настройки → [Твоё имя] → Подписки. Для iCloud+: Настройки → iCloud → Управление хранилищем → Сменить план → Бесплатный.',
    tip_en: 'Open Settings → Apple ID → Subscriptions, or use the direct App Store subscriptions link.'
  },
  {
    match: ['youtube', 'google one', 'google play'],
    name: 'YouTube / Google One',
    url: 'https://myaccount.google.com/subscriptions',
    difficulty: 'easy',
    tip_ru: 'Все подписки Google собраны на одной странице — выбери нужную и нажми «Управление → Отменить».',
    tip_en: 'All Google subscriptions live on one page — select the item and click Manage → Cancel.'
  },
  {
    match: ['vk', 'вк музыка', 'vk combo'],
    name: 'VK Музыка / Combo',
    url: 'https://id.vk.com/account/#/subscriptions',
    difficulty: 'medium',
    tip_ru: 'VK ID → Подписки → выбери сервис → Отключить автопродление.',
    tip_en: 'VK ID → Subscriptions → select plan → Disable auto-renewal.'
  },
  {
    match: ['ozon', 'озон'],
    name: 'Ozon Premium',
    url: 'https://www.ozon.ru/my/premium',
    difficulty: 'medium',
    tip_ru: 'Личный кабинет → Ozon Premium → Управление подпиской → Отключить автопродление.',
    tip_en: 'Account → Ozon Premium → Manage subscription → Turn off auto-renewal.'
  },
  {
    match: ['t-bank', 'tinkoff', 'тинькофф', 'т-банк pro', 'tinkoff pro'],
    name: 'Т-Банк Pro / Premium',
    url: 'https://www.tbank.ru/mybank/',
    difficulty: 'easy',
    tip_ru: 'В приложении: Профиль → Подписка Pro → Отключить продление.',
    tip_en: 'In the T-Bank app: Profile → Pro Subscription → Disable renewal.'
  },
  {
    match: ['notion'],
    name: 'Notion',
    url: 'https://www.notion.so/',
    difficulty: 'easy',
    tip_ru: 'Settings & Members → Billing → Change Plan → Downgrade to Free.',
    tip_en: 'Settings & Members → Billing → Change Plan → Downgrade to Free.'
  },
  {
    match: ['github', 'copilot'],
    name: 'GitHub Pro / Copilot',
    url: 'https://github.com/settings/billing/plans',
    difficulty: 'easy',
    tip_ru: 'GitHub → Settings → Billing and plans → Plans and usage → Cancel.',
    tip_en: 'GitHub → Settings → Billing and plans → Cancel.'
  },
  {
    match: ['xbox', 'game pass', 'microsoft 365'],
    name: 'Microsoft / Game Pass',
    url: 'https://account.microsoft.com/services',
    difficulty: 'medium',
    tip_ru: 'Нажми «Управление» напротив подписки → «Отменить подписку» (можно выбрать «Отключить повторяющееся выставление счетов»).',
    tip_en: 'Click Manage next to the subscription → Turn off recurring billing or Cancel.'
  },
  {
    match: ['hetzner', 'digitalocean', 'timeweb', 'selectel', 'vps', 'vultr'],
    name: 'Cloud / VPS Server',
    url: '',
    difficulty: 'medium',
    tip_ru: 'Не забудь удалить не только сервер, но и привязанные диски/снапшоты/статические IP — за них часто продолжают списывать.',
    tip_en: 'Delete attached volumes, snapshots, and floating IPs too — providers keep billing for idle resources.'
  },
  {
    match: ['world class', 'ddx', 'fitmost', 'fitness', 'gym', 'фитнес'],
    name: 'Фитнес / Gym',
    url: '',
    difficulty: 'dark',
    tip_ru: 'Проверь договор: многие клубы требуют письменное заявление или отмену в приложении минимум за 5–14 дней до даты списания.',
    tip_en: 'Check contract terms: many gyms require notice 5–14 days before the billing date.'
  },
  {
    match: ['amazon prime', 'amzn', 'prime video'],
    name: 'Amazon Prime',
    url: 'https://www.amazon.com/mc',
    difficulty: 'dark',
    tip_ru: 'Amazon покажет 3 экрана удержания с кнопкой «Напомнить позже» — нажимай именно «End Membership» до финального подтверждения.',
    tip_en: 'Amazon shows 3 retention screens — click "End Membership" all the way to the final confirmation.'
  },
  {
    match: ['disney', 'disney+'],
    name: 'Disney+',
    url: 'https://www.disneyplus.com/account',
    difficulty: 'easy',
    tip_ru: 'Account → Subscription → выбери план → Cancel Subscription.',
    tip_en: 'Account → Subscription → select your plan → Cancel Subscription.'
  },
  {
    match: ['hulu'],
    name: 'Hulu',
    url: 'https://secure.hulu.com/account',
    difficulty: 'medium',
    tip_ru: 'Account → Your Subscription → Cancel. Не соглашайся на «Pause», если хочешь отключить полностью.',
    tip_en: 'Account → Your Subscription → Cancel. Skip the Pause offer for full cancellation.'
  },
  {
    match: ['patreon'],
    name: 'Patreon',
    url: 'https://www.patreon.com/settings/memberships',
    difficulty: 'easy',
    tip_ru: 'Settings → Memberships → выбери автора → Cancel membership.',
    tip_en: 'Settings → Memberships → select creator → Cancel membership.'
  },
  {
    match: ['nordvpn', 'expressvpn', 'surfshark'],
    name: 'VPN Service',
    url: '',
    difficulty: 'medium',
    tip_ru: 'Отключи автопродление в разделе Billing — многие VPN продлевают годовой план по полной цене без скидки.',
    tip_en: 'Disable auto-renewal under Billing — many VPNs renew annual plans at full non-promo price.'
  },
  {
    match: ['dropbox'],
    name: 'Dropbox',
    url: 'https://www.dropbox.com/account/plan',
    difficulty: 'easy',
    tip_ru: 'Account → Plan → Cancel plan (файлы не удаляются, просто останавливается синхронизация сверх лимита).',
    tip_en: 'Account → Plan → Cancel plan (files remain safe; sync pauses if over free quota).'
  },
  {
    match: ['cursor', 'midjourney'],
    name: 'AI Dev / Creative Tool',
    url: '',
    difficulty: 'easy',
    tip_ru: 'Зайди в Billing / Manage Subscription в личном кабинете (обычно через Stripe Billing Portal) и нажми Cancel plan.',
    tip_en: 'Open Billing / Manage Subscription (usually Stripe Billing Portal) and click Cancel plan.'
  }
];

export function findPlaybook(merchantName) {
  const lower = merchantName.toLowerCase();
  return CANCEL_PLAYBOOK.find(entry =>
    entry.match.some(keyword => lower.includes(keyword))
  ) || null;
}
