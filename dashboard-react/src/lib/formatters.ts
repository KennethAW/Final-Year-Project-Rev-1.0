export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatCurrency(value: number, decimals = 2): string {
  return `$${value.toFixed(decimals)}`;
}

export function formatRatio(value: number, decimals = 3): string {
  return value.toFixed(decimals);
}

export function formatNumber(value: number, decimals = 4): string {
  return value.toFixed(decimals);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function modelDisplayName(model: string): string {
  const names: Record<string, string> = {
    xgboost: "XGBoost",
    lstm: "LSTM",
    tft: "TFT",
    patchtst: "PatchTST",
  };
  return names[model] ?? model.toUpperCase();
}
