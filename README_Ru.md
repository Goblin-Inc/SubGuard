<p align="center">
  <a href="https://goblin-inc.github.io/SubGuard/"><img src="https://img.shields.io/badge/🚀_Демо-Запустить_SubGuard-10b981?style=for-the-badge&labelColor=090b10" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/Приватность-0_байт_в_сеть-34d399?style=for-the-badge&labelColor=090b10" alt="Zero Upload" />
  <img src="https://img.shields.io/badge/Зависимости-Zero-38bdf8?style=for-the-badge&labelColor=090b10" alt="Zero Dependencies" />
  <a href="README.md"><img src="https://img.shields.io/badge/🇬🇧_EN-English_README-f59e0b?style=for-the-badge&labelColor=090b10" alt="English README" /></a>
</p>

---

# SubGuard

**SubGuard** — приватный **100% локальный** детектор скрытых подписок и утечек денег, который работает прямо в браузере без бэкенда и без загрузки выписок в облако.

Перетащи выписку из банка (`CSV` / `PDF`), вставь скопированные строки через `Ctrl + V` или веди список вручную — SubGuard найдёт регулярные списания, тихие подорожания, двойные списания, триал-ловушки и микро-утечки.

> **Доказуемая приватность:** в `index.html` прописан жёсткий `Content-Security-Policy: connect-src 'none'`. Открой DevTools → Network — сетевых запросов ровно **0**.

---

## ✨ Возможности

- **🔒 Zero-Upload и работа офлайн (PWA)** — чистый Vanilla JS, без сторонних библиотек и CDN, работает даже с выключенным интернетом.
- **📄 Клиентский парсер (`CSV` / `PDF` / `Ctrl+V`)** — авто-определение разделителей, кодировок UTF-8 и Windows-1251 (Т-Банк, Сбер, Альфа, Revolut), валюты (`₽ / $ / €`) и колонок с ручной корректировкой.
- **🚨 Радар ловушек и аномалий:**
  - **Тихие подорожания** (`+20%` к первому списанию)
  - **Двойные списания** (повторное списание за ≤3 дня)
  - **Триал-ловушки** (тестовое списание `1 ₽ / $1` + генерация `.ics`-напоминания в календарь)
- **🧮 Симулятор отмены и прогноз на 12 месяцев** — отмечай ненужные подписки и сразу смотри экономию за год, наглядный график и эквивалент экономии.
- **📖 Cancel Playbook** — встроенная локальная база прямых ссылок и лайфхаков по отмене (Яндекс Плюс, Adobe, Spotify, ChatGPT, Telegram Premium, Discord, iCloud, Ozon и др.).
- **🧾 Чек утечек (`PNG` / `SVG`)** — стильная карточка для шеринга в Telegram/X с тумблером **«Скрыть точные суммы (••••)»**.
- **✍️ Ручной режим (`localStorage`)** — добавляй и храни свои подписки локально даже без выписки.

---

## 🚀 Быстрый старт

```bash
git clone https://github.com/Goblin-Inc/SubGuard.git
cd SubGuard
python -m http.server 8080
# Открой http://localhost:8080
```

---

## 📄 Лицензия
MIT © [Goblin-Inc](https://github.com/Goblin-Inc)
