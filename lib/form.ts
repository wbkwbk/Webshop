import { ShopError } from "./errors";

export type ActionState = {
  formError?: string;
  ok?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export const emptyState: ActionState = {};

export function readStrings(formData: FormData, keys: string[]) {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    values[key] = typeof value === "string" ? value : "";
  }
  return values;
}

export function failure(error: unknown, values?: Record<string, string>): ActionState {
  if (error instanceof ShopError) {
    return { formError: error.message, fieldErrors: error.fieldErrors, values };
  }
  throw error;
}
