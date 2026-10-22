export class ShopError extends Error {
  readonly fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ShopError";
    this.fieldErrors = fieldErrors;
  }
}
