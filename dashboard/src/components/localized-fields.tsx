"use client";

import { Field, Input, Textarea } from "@/components/ui";

export const LANGS = [
  { key: "en", label: "English", dir: "ltr" },
  { key: "ar", label: "Arabic", dir: "rtl" },
  { key: "ckb", label: "Kurdish (Sorani)", dir: "rtl" },
] as const;

export type LangKey = (typeof LANGS)[number]["key"];

/**
 * One text in three languages, side by side. Arabic and Sorani inputs are
 * right-to-left. `values` is keyed by language; `onChange` gets (lang, text).
 */
export function LocalizedField({
  label,
  values,
  onChange,
  multiline,
  required,
}: {
  label: string;
  values: Record<LangKey, string>;
  onChange: (lang: LangKey, value: string) => void;
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {LANGS.map(({ key, label: langLabel, dir }) => (
        <Field key={key} label={`${label} — ${langLabel}`} required={required && key === "en"}>
          {multiline ? (
            <Textarea
              dir={dir}
              lang={key === "ckb" ? "ckb" : key}
              value={values[key]}
              onChange={(e) => onChange(key, e.target.value)}
              rows={4}
            />
          ) : (
            <Input
              dir={dir}
              lang={key === "ckb" ? "ckb" : key}
              value={values[key]}
              onChange={(e) => onChange(key, e.target.value)}
              required={required}
            />
          )}
        </Field>
      ))}
    </div>
  );
}
