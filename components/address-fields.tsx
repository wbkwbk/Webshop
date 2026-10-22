import { Field, controlClass } from "@/components/field";
import { Input } from "@/components/ui/input";
import type { Address } from "@/lib/types";
import { COUNTRIES } from "@/lib/validate";

export function AddressFields({
  values,
  errors,
}: {
  values: Partial<Address>;
  errors?: Record<string, string>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <div className="sm:col-span-6">
        <Field label="Full name" name="name" error={errors?.name}>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            defaultValue={values.name ?? ""}
            aria-invalid={Boolean(errors?.name)}
            className="h-10 bg-background"
          />
        </Field>
      </div>
      <div className="sm:col-span-4">
        <Field label="Street" name="street" error={errors?.street} hint="A street we can send a parcel to. Post boxes are not enough.">
          <Input
            id="street"
            name="street"
            autoComplete="address-line1"
            required
            defaultValue={values.street ?? ""}
            aria-invalid={Boolean(errors?.street)}
            className="h-10 bg-background"
          />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="House number" name="houseNumber" error={errors?.houseNumber}>
          <Input
            id="houseNumber"
            name="houseNumber"
            required
            defaultValue={values.houseNumber ?? ""}
            aria-invalid={Boolean(errors?.houseNumber)}
            className="h-10 bg-background"
          />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Postal code" name="postalCode" error={errors?.postalCode}>
          <Input
            id="postalCode"
            name="postalCode"
            autoComplete="postal-code"
            required
            defaultValue={values.postalCode ?? ""}
            aria-invalid={Boolean(errors?.postalCode)}
            className="h-10 bg-background"
          />
        </Field>
      </div>
      <div className="sm:col-span-4">
        <Field label="City" name="city" error={errors?.city}>
          <Input
            id="city"
            name="city"
            autoComplete="address-level2"
            required
            defaultValue={values.city ?? ""}
            aria-invalid={Boolean(errors?.city)}
            className="h-10 bg-background"
          />
        </Field>
      </div>
      <div className="sm:col-span-6">
        <Field label="Country" name="country" error={errors?.country}>
          <select
            id="country"
            name="country"
            required
            defaultValue={values.country || "CH"}
            aria-invalid={Boolean(errors?.country)}
            className={controlClass}
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}
