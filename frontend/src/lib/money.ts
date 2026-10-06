const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export function formatMoney(value: number): string {
  return formatter.format(value);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('en-IN');
}
