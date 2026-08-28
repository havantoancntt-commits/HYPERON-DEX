import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) return "$0.00";
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(decimals)}M`;
  }
  if (value >= 1_000) {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }
  if (value < 0.0001 && value > 0) {
    return `$${value.toExponential(4)}`;
  }
  if (value < 1 && value > 0) {
    return `$${value.toFixed(4)}`;
  }
  return `$${value.toFixed(decimals)}`;
}

export function formatCrypto(value: number, decimals: number = 4): string {
  if (value === undefined || value === null || isNaN(value)) return "0";
  if (value === 0) return "0.00";
  if (value < 0.000001) return value.toExponential(4);
  if (value < 0.001) return value.toFixed(6);
  if (value < 1) return value.toFixed(4);
  return value.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

export function formatPercent(value: number): string {
  if (value === undefined || value === null || isNaN(value)) return "0.00%";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return "";
  if (address.length < 10) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
