export async function getRiftbound(path, signal) {
  const response = await fetch(`/api/riftbound/${path}`, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Riftbound is unavailable right now. Please try again.');
  }
  return response.json();
}

export function money(value) {
  return value === null || value === undefined ? 'Unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
}

export function priceAge(date, now = Date.now()) {
  if (!date) return 'Prices not available';
  const days = Math.floor((now - Date.parse(`${date}T00:00:00Z`)) / 86400000);
  return `${days >= 2 ? 'Stale · ' : ''}Prices as of ${date} UTC`;
}
