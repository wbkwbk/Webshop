import { countryName } from "./validate";
import type { Address } from "./types";

export function formatChf(cents: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
  }).format(cents / 100);
}

export function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Zurich",
  }).format(new Date(iso));
}

export function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/Zurich",
  }).format(new Date(iso));
}

export function zurichDayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function formatAddress(address: Address) {
  return `${address.street} ${address.houseNumber}, ${address.postalCode} ${address.city}, ${countryName(address.country)}`;
}

export function pieces(quantity: number) {
  return quantity === 1 ? "1 piece" : `${quantity} pieces`;
}
