// SubGuard — Local .ics Calendar Reminder Generator (zero network)

function pad(n) {
  return String(n).padStart(2, '0');
}

function toIcsDate(date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

export function downloadIcsReminder({ title, description, targetDate, daysBefore = 2 }) {
  const remindDate = new Date(targetDate.getTime() - daysBefore * 86400000);
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const uid = `subguard-${Date.now()}-${Math.random().toString(36).slice(2)}@local`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SubGuard//Local Privacy Reminder//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${toIcsDate(remindDate)}`,
    `SUMMARY:${title.replace(/[\r\n]/g, ' ')}`,
    `DESCRIPTION:${description.replace(/[\r\n]/g, '\\n')}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT9H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${title.replace(/[\r\n]/g, ' ')}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SubGuard-${title.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
