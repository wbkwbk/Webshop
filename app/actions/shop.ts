"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { ShopError } from "@/lib/errors";
import { failure, readStrings, type ActionState } from "@/lib/form";
import { safeNext } from "@/lib/live";
import { readSessionUser } from "@/lib/session";
import { addToCart, markAllPaidShipped, markShipped, payReservations, reserveCart, saveAddress, setCartQuantity } from "@/lib/shop";
import type { Address } from "@/lib/types";

export async function addToCartAction(formData: FormData) {
  const returnTo = safeNext(formData.get("returnTo") ?? "/");
  const user = await readSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  const productId = String(formData.get("productId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  try {
    addToCart(getDb(), user.id, productId, Number.isFinite(quantity) ? quantity : 1);
  } catch (error) {
    if (error instanceof ShopError) {
      redirect(`${returnTo}?notice=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  refresh();
}

export async function setCartQuantityAction(formData: FormData) {
  const user = await readSessionUser();
  if (!user) redirect("/login?next=/cart");
  const productId = String(formData.get("productId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  setCartQuantity(getDb(), user.id, productId, Number.isFinite(quantity) ? quantity : 0);
  refresh();
}

export async function reserveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await readSessionUser();
  if (!user) redirect("/login?next=/checkout");
  const values = readStrings(formData, ["name", "street", "houseNumber", "postalCode", "city", "country"]);
  const address: Address = {
    name: values.name,
    street: values.street,
    houseNumber: values.houseNumber,
    postalCode: values.postalCode,
    city: values.city,
    country: values.country,
  };
  try {
    saveAddress(getDb(), user.id, address);
    const result = reserveCart(getDb(), user.id);
    const flag = result.openedProduction ? "ready=1" : result.payable ? "pay=1" : "reserved=1";
    redirect(`/orders/${result.orderId}?${flag}`);
  } catch (error) {
    return failure(error, values);
  }
}

export async function payAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await readSessionUser();
  if (!user) redirect("/login?next=/checkout/pay");
  const values = readStrings(formData, ["cardName", "cardNumber", "expiry", "cvc"]);
  const ids = formData.getAll("reservationId").map((value) => String(value));
  try {
    const result = payReservations(getDb(), user.id, ids, {
      name: values.cardName,
      number: values.cardNumber,
      expiry: values.expiry,
      cvc: values.cvc,
    });
    redirect(`/orders?paid=1&total=${result.totalCents}`);
  } catch (error) {
    return failure(error, values);
  }
}

export async function shipAction(formData: FormData) {
  const user = await readSessionUser();
  if (!user || user.role !== "admin") redirect("/");
  const productId = String(formData.get("productId") ?? "");
  const requested = safeNext(formData.get("returnTo"));
  const back = requested.startsWith("/admin") ? requested : productId ? `/admin/products/${productId}` : "/admin";
  try {
    if (formData.get("all") === "1") {
      const count = markAllPaidShipped(getDb(), productId);
      if (count === 0) redirect(`${back}?notice=${encodeURIComponent("Nothing paid is waiting to ship.")}`);
    } else {
      markShipped(getDb(), String(formData.get("id") ?? ""));
    }
  } catch (error) {
    if (error instanceof ShopError) {
      redirect(`${back}?notice=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  refresh();
}
