"use client";

import { useState } from "react";
import { assertWritten, errorMessage, getSupabase } from "@/lib/supabase";
import { useQuery } from "@/lib/use-query";
import { Button, Card, Field, Input, Notice, PageHeader, Spinner } from "@/components/ui";

interface Settings {
  whatsapp_number: string | null;
  contact_email: string | null;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp_number ?? "");
  const [email, setEmail] = useState(initial.contact_email ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const { data, error } = await getSupabase()
        .from("settings")
        .update({
          whatsapp_number: whatsapp.trim() || null,
          contact_email: email.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", true)
        .select("id");
      if (error) throw error;
      assertWritten(data, "Settings");
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      {error && <Notice>{error}</Notice>}
      {saved && <Notice tone="success">Saved.</Notice>}
      <Card className="flex flex-col gap-4 p-4">
        <Field label="WhatsApp number" hint="International format, e.g. +9647501234567">
          <Input
            type="tel"
            dir="ltr"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </Field>
        <Field label="Contact email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </Card>
      <div>
        <Button type="submit" variant="primary" loading={saving}>
          Save settings
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const { data, error } = useQuery(async () => {
    const { data, error } = await getSupabase()
      .from("settings")
      .select("whatsapp_number,contact_email")
      .eq("id", true)
      .maybeSingle();
    if (error) throw error;
    return (data as Settings | null) ?? { whatsapp_number: null, contact_email: null };
  }, []);

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Shop-wide details used by the storefront. Prices are in Iraqi dinars (IQD)."
      />
      {data ? <SettingsForm initial={data} /> : error ? <Notice>{error}</Notice> : <Spinner />}
    </>
  );
}
