"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState, useState } from "react";
import { joinWaitlist } from "@/app/actions/waitlist";
import { buttonClass } from "@/components/ui/button";
import { COUNTRIES, PROFILES } from "@/lib/site";
import type { WaitlistState } from "@/lib/waitlist";

const initialState: WaitlistState = { status: "idle" };

const inputClass =
  "h-12 w-full rounded-xl border border-white/20 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-primary-light aria-[invalid=true]:border-amber-400";
const labelClass = "mb-1.5 block text-sm font-semibold text-white";
const errorClass = "mt-1.5 text-sm font-medium text-amber-200";

export function WaitlistForm() {
  const [state, formAction, pending] = useActionState(joinWaitlist, initialState);
  const [values, setValues] = useState({ country: "SN", countryCode: "221", phone: "", profile: "", email: "" });

  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-2xl bg-white/10 p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-primary-light" aria-hidden="true" />
        <p className="text-lg font-bold text-white">
          {state.already
            ? "Vous êtes déjà inscrit — on vous prévient au lancement."
            : "C’est noté ! On vous écrit sur WhatsApp au lancement."}
        </p>
      </div>
    );
  }

  const errors = state.status === "invalid" ? state.fieldErrors : {};
  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [field]: e.target.value }));

  const onCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = COUNTRIES.find((c) => c.code === e.target.value);
    setValues((v) => ({ ...v, country: e.target.value, countryCode: country?.dial || v.countryCode }));
  };

  return (
    <form action={formAction} noValidate className="grid gap-4">
      <div>
        <label htmlFor="wl-country" className={labelClass}>
          Pays
        </label>
        <select
          id="wl-country"
          name="country"
          value={values.country}
          onChange={onCountryChange}
          aria-invalid={Boolean(errors.country)}
          aria-describedby={errors.country ? "wl-country-error" : undefined}
          className={inputClass}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.country && (
          <p id="wl-country-error" className={errorClass}>
            {errors.country}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="wl-phone" className={labelClass}>
          Numéro WhatsApp
        </label>
        <div className="flex gap-2">
          <div className="relative w-24 shrink-0">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">+</span>
            <input
              name="countryCode"
              aria-label="Indicatif pays"
              inputMode="numeric"
              value={values.countryCode}
              onChange={set("countryCode")}
              aria-invalid={Boolean(errors.countryCode)}
              aria-describedby={errors.countryCode ? "wl-code-error" : undefined}
              className={`${inputClass} pl-6`}
            />
          </div>
          <input
            id="wl-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="77 123 45 67"
            value={values.phone}
            onChange={set("phone")}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "wl-phone-error" : undefined}
            className={inputClass}
          />
        </div>
        {errors.countryCode && (
          <p id="wl-code-error" className={errorClass}>
            {errors.countryCode}
          </p>
        )}
        {errors.phone && (
          <p id="wl-phone-error" className={errorClass}>
            {errors.phone}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="wl-profile" className={labelClass}>
          Vous êtes
        </label>
        <select
          id="wl-profile"
          name="profile"
          value={values.profile}
          onChange={set("profile")}
          aria-invalid={Boolean(errors.profile)}
          aria-describedby={errors.profile ? "wl-profile-error" : undefined}
          className={inputClass}
        >
          <option value="" disabled>
            Choisissez votre profil
          </option>
          {PROFILES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {errors.profile && (
          <p id="wl-profile-error" className={errorClass}>
            {errors.profile}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="wl-email" className={labelClass}>
          Email <span className="font-normal text-white/60">(facultatif)</span>
        </label>
        <input
          id="wl-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          value={values.email}
          onChange={set("email")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "wl-email-error" : undefined}
          className={inputClass}
        />
        {errors.email && (
          <p id="wl-email-error" className={errorClass}>
            {errors.email}
          </p>
        )}
      </div>

      <div className="hidden" aria-hidden="true">
        <label htmlFor="wl-website">Site web</label>
        <input id="wl-website" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <button type="submit" disabled={pending} className={buttonClass("light", "md", "mt-2 w-full")}>
        {pending ? "Inscription…" : "Je m’inscris"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="rounded-xl bg-amber-400/15 p-3 text-sm font-medium text-amber-100">
          Un souci technique, réessayez dans un instant ou écrivez-nous sur WhatsApp.
        </p>
      )}
    </form>
  );
}
