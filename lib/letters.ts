import { pieces, formatAddress } from "./format";
import type { Address } from "./types";

export type LetterDraft = {
  subject: string;
  title: string;
  body: string;
  href: string;
};

export function paymentDueLetter(input: {
  name: string;
  productName: string;
  sequence: number;
  quantity: number;
  address: Address;
}): LetterDraft {
  return {
    subject: `Please pay for your ${input.productName}`,
    title: `Payment is open for the ${input.productName}`,
    href: "/checkout/pay",
    body: [
      `Hello ${input.name},`,
      "",
      `At least 100 pieces of the ${input.productName} are reserved. Your share is ${pieces(input.quantity)}.`,
      "",
      "Please pay so production can go ahead. Nothing is made before payment.",
      `We will ship to ${formatAddress(input.address)}.`,
      "",
      "Link: /checkout/pay",
    ].join("\n"),
  };
}

export function paymentReceivedLetter(input: {
  name: string;
  lines: { productName: string; quantity: number }[];
}): LetterDraft {
  const list = input.lines.map((line) => `${pieces(line.quantity)} of ${line.productName}`).join(", ");
  return {
    subject: "Payment received — production can start",
    title: "Payment received",
    href: "/orders",
    body: [
      `Hello ${input.name},`,
      "",
      `We received your payment for ${list}.`,
      "The workshop will produce these pieces and post them to the address on the reservation.",
      "This was a simulated payment. No card was charged.",
      "",
      "Link: /orders",
    ].join("\n"),
  };
}

export function shippedLetter(input: {
  name: string;
  productName: string;
  quantity: number;
  address: Address;
}): LetterDraft {
  return {
    subject: `Your ${input.productName} has shipped`,
    title: `Your ${input.productName} has shipped`,
    href: "/orders",
    body: [
      `Hello ${input.name},`,
      "",
      `${pieces(input.quantity)} of the ${input.productName} ${input.quantity === 1 ? "has" : "have"} left the workshop.`,
      `Destination: ${formatAddress(input.address)}.`,
      "",
      "Link: /orders",
    ].join("\n"),
  };
}

export function welcomeLetter(name: string): LetterDraft {
  return {
    subject: "Welcome to Hundert",
    title: "Welcome to Hundert",
    href: "/",
    body: [
      `Hello ${name},`,
      "",
      "Your account is open. Reserve a piece whenever you like.",
      "You are asked to pay only when 100 pieces of that same product are reserved. We then produce it and ship it to your postal address.",
      "",
      "Link: /",
    ].join("\n"),
  };
}

export function resetLetter(input: { name: string; email: string; token: string }): LetterDraft {
  const href = `/reset-password?token=${input.token}`;
  return {
    subject: "Reset your Hundert password",
    title: "Password reset",
    href,
    body: [
      `Hello ${input.name},`,
      "",
      `A password reset was requested for ${input.email}. The link works for one hour and only once.`,
      "",
      `Link: ${href}`,
      "",
      "If you did not ask for this, you can ignore the letter.",
    ].join("\n"),
  };
}
