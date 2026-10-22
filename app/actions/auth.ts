"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { failure, readStrings, type ActionState } from "@/lib/form";
import { safeNext } from "@/lib/live";
import { clearSession, createSession, readSessionUser } from "@/lib/session";
import {
  authenticate,
  registerUser,
  requestPasswordReset,
  resetPassword,
  saveAddress,
} from "@/lib/shop";
import type { Address } from "@/lib/types";

const addressKeys = ["name", "street", "houseNumber", "postalCode", "city", "country"];

function addressFrom(values: Record<string, string>): Address {
  return {
    name: values.name ?? "",
    street: values.street ?? "",
    houseNumber: values.houseNumber ?? "",
    postalCode: values.postalCode ?? "",
    city: values.city ?? "",
    country: values.country ?? "",
  };
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = readStrings(formData, [...addressKeys, "email", "password", "confirm", "next"]);
  if (values.password !== values.confirm) {
    return {
      formError: "The two passwords do not match.",
      fieldErrors: { confirm: "The two passwords do not match." },
      values,
    };
  }
  try {
    const user = registerUser(getDb(), { ...addressFrom(values), email: values.email, password: values.password });
    await createSession(user.id);
  } catch (error) {
    return failure(error, values);
  }
  redirect(safeNext(values.next));
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = readStrings(formData, ["email", "password", "next"]);
  const user = authenticate(getDb(), values.email, values.password);
  if (!user) {
    return { formError: "Those details do not match an account.", values };
  }
  await createSession(user.id);
  redirect(safeNext(values.next));
}

export async function forgotAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = readStrings(formData, ["email"]);
  requestPasswordReset(getDb(), values.email);
  redirect("/forgot-password?sent=1");
}

export async function resetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = readStrings(formData, ["token", "password", "confirm"]);
  if (values.password !== values.confirm) {
    return {
      formError: "The two passwords do not match.",
      fieldErrors: { confirm: "The two passwords do not match." },
      values,
    };
  }
  try {
    const userId = resetPassword(getDb(), values.token, values.password);
    await createSession(userId);
  } catch (error) {
    return failure(error, values);
  }
  redirect("/account?reset=1");
}

export async function signOutAction() {
  await clearSession();
  redirect("/");
}

export async function saveAddressAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await readSessionUser();
  if (!user) redirect("/login?next=/account");
  const values = readStrings(formData, addressKeys);
  try {
    saveAddress(getDb(), user.id, addressFrom(values));
  } catch (error) {
    return failure(error, values);
  }
  refresh();
  return { ok: "Postal address saved. Reservations from here on use this address.", values };
}
