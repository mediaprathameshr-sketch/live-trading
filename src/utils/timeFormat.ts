export function formatUnixToCsvTime(ts: number | null): string {
    if (ts === null) return '—';

    const date = new Date(ts * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');

    const day = pad(date.getUTCDate());
    const month = pad(date.getUTCMonth() + 1);
    const year = date.getUTCFullYear();
    const hour = pad(date.getUTCHours());
    const minute = pad(date.getUTCMinutes());

    return `${day}-${month}-${year} ${hour}:${minute}`;
}
