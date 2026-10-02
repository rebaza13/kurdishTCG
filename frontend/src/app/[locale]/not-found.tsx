import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/empty-state";

export default async function LocaleNotFound() {
  const t = await getTranslations("states");
  return (
    <div className="mx-auto max-w-[640px] px-4 py-16 md:py-24">
      <EmptyState
        title={t("notFoundTitle")}
        body={t("notFoundBody")}
        action={{ href: "/", label: t("goHome") }}
        secondary={{ href: "/franchises", label: t("browseFranchises") }}
      />
    </div>
  );
}
