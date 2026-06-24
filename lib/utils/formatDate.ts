export function formatDate(dateStr: string, locale = 'en-GB') {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateRange(from: string, to: string) {
  return `${formatDate(from)} – ${formatDate(to)}`;
}

export function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function fromDateString(str: string): Date {
  return new Date(str + 'T00:00:00');
}
