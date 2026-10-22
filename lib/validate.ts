import type { Address, CardDetails } from "./types";

export type FieldErrors = Record<string, string>;

export type ValidateResult<T> =
  | { ok: true; value: T }
  | { ok: false; fieldErrors: FieldErrors; formError: string };

type Country = {
  code: string;
  name: string;
  postal: RegExp;
  hint: string;
};

export const COUNTRIES: Country[] = [
  { code: "CH", name: "Switzerland", postal: /^[1-9]\d{3}$/, hint: "8004" },
  { code: "LI", name: "Liechtenstein", postal: /^[1-9]\d{3}$/, hint: "9490" },
  { code: "DE", name: "Germany", postal: /^\d{5}$/, hint: "10115" },
  { code: "AT", name: "Austria", postal: /^[1-9]\d{3}$/, hint: "1010" },
  { code: "FR", name: "France", postal: /^\d{5}$/, hint: "75001" },
  { code: "IT", name: "Italy", postal: /^\d{5}$/, hint: "20121" },
  { code: "NL", name: "Netherlands", postal: /^\d{4}\s?[A-Z]{2}$/, hint: "1012 AB" },
  { code: "BE", name: "Belgium", postal: /^[1-9]\d{3}$/, hint: "1000" },
  { code: "LU", name: "Luxembourg", postal: /^[1-9]\d{3}$/, hint: "1234" },
  { code: "GB", name: "United Kingdom", postal: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/, hint: "SW1A 1AA" },
  { code: "IE", name: "Ireland", postal: /^[A-Z]\d{2}\s?[A-Z0-9]{4}$/, hint: "D02 AF30" },
  { code: "ES", name: "Spain", postal: /^\d{5}$/, hint: "28001" },
  { code: "PT", name: "Portugal", postal: /^\d{4}-\d{3}$/, hint: "1100-148" },
  { code: "DK", name: "Denmark", postal: /^\d{4}$/, hint: "1050" },
  { code: "SE", name: "Sweden", postal: /^\d{3}\s?\d{2}$/, hint: "111 22" },
  { code: "NO", name: "Norway", postal: /^\d{4}$/, hint: "0150" },
  { code: "FI", name: "Finland", postal: /^\d{5}$/, hint: "00100" },
  { code: "PL", name: "Poland", postal: /^\d{2}-\d{3}$/, hint: "00-001" },
  { code: "CZ", name: "Czechia", postal: /^\d{3}\s?\d{2}$/, hint: "110 00" },
  { code: "US", name: "United States", postal: /^\d{5}(-\d{4})?$/, hint: "10001" },
  { code: "CA", name: "Canada", postal: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/, hint: "K1A 0B1" },
];

const PLACEHOLDERS = new Set([
  "test",
  "asdf",
  "qwerty",
  "xxx",
  "none",
  "n/a",
  "na",
  "fake",
  "nowhere",
  "abc",
  "foo",
  "bar",
  "null",
  "unknown",
]);

const PO_BOX =
  /\b(p\.?\s*o\.?\s*box|postfach|case\s+postale|postbus|apartado|bo[iî]te\s+postale|postboks)\b/i;

const NAME_PATTERN = /^[\p{L}][\p{L}\p{M}\s.'’-]{1,79}$/u;
const CITY_PATTERN = /^[\p{L}][\p{L}\p{M}\s.'’-]{1,59}$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function countryName(code: string) {
  return COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isPlaceholder(value: string) {
  return PLACEHOLDERS.has(value.toLowerCase().replace(/\.$/, ""));
}

export function normalizePostal(country: string, postal: string) {
  return clean(postal).toUpperCase();
}

export function validateEmail(email: string): ValidateResult<string> {
  const value = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(value) || value.length > 120) {
    return {
      ok: false,
      formError: "Enter a real email address.",
      fieldErrors: { email: "Enter a real email address." },
    };
  }
  return { ok: true, value };
}

export function validatePassword(password: string): ValidateResult<string> {
  if (password.length < 8 || password.length > 80) {
    return {
      ok: false,
      formError: "Use a password of at least 8 characters.",
      fieldErrors: { password: "Use at least 8 characters." },
    };
  }
  return { ok: true, value: password };
}

export function validateAddress(input: Address): ValidateResult<Address> {
  const fieldErrors: FieldErrors = {};
  const name = clean(input.name);
  const street = clean(input.street);
  const houseNumber = clean(input.houseNumber);
  const city = clean(input.city);
  const country = input.country.trim().toUpperCase();
  const countryRule = COUNTRIES.find((item) => item.code === country);
  const postalCode = normalizePostal(country, input.postalCode);

  if (!NAME_PATTERN.test(name) || isPlaceholder(name)) {
    fieldErrors.name = "Enter the name that should appear on the parcel.";
  }
  if (street.length < 3 || street.length > 80 || !/\p{L}/u.test(street) || isPlaceholder(street)) {
    fieldErrors.street = "Enter the street name.";
  } else if (PO_BOX.test(street)) {
    fieldErrors.street = "We ship to a street address, not a post box.";
  }
  if (!/^[0-9][0-9A-Za-z/-]{0,11}$/.test(houseNumber)) {
    fieldErrors.houseNumber = "Enter a house number, such as 12 or 12a.";
  }
  if (!countryRule) {
    fieldErrors.country = "Choose a country we can post to.";
  } else if (!countryRule.postal.test(postalCode)) {
    fieldErrors.postalCode = `Use a ${countryRule.name} postal code, such as ${countryRule.hint}.`;
  }
  if (!CITY_PATTERN.test(city) || isPlaceholder(city)) {
    fieldErrors.city = "Enter the town or city.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors,
      formError: "We need a postal address we can actually ship to.",
    };
  }

  return {
    ok: true,
    value: { name, street, houseNumber, postalCode, city, country },
  };
}

function luhnOk(digits: string) {
  let sum = 0;
  let alternate = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = digits.charCodeAt(index) - 48;
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function validateCard(input: CardDetails, now = new Date()): ValidateResult<CardDetails> {
  const fieldErrors: FieldErrors = {};
  const name = clean(input.name);
  const number = input.number.replace(/\s+/g, "");
  const expiry = clean(input.expiry);
  const cvc = input.cvc.trim();

  if (name.length < 2 || name.length > 80) {
    fieldErrors.cardName = "Enter the name on the card.";
  }
  if (!/^\d{13,19}$/.test(number) || !luhnOk(number)) {
    fieldErrors.cardNumber = "Enter a valid card number. The test card is 4242 4242 4242 4242.";
  }
  const match = expiry.match(/^(0[1-9]|1[0-2])\s*\/\s*(\d{2}|\d{4})$/);
  if (!match) {
    fieldErrors.expiry = "Use an expiry like 12/28.";
  } else {
    const month = Number(match[1]);
    const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
    const end = new Date(Date.UTC(year, month, 1));
    if (end.getTime() <= now.getTime()) {
      fieldErrors.expiry = "This card is expired.";
    }
  }
  if (!/^\d{3,4}$/.test(cvc)) {
    fieldErrors.cvc = "Enter the 3-digit security code.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors,
      formError: "The payment details do not check out. Nothing was charged.",
    };
  }

  return { ok: true, value: { name, number, expiry, cvc } };
}
