import { useTranslations } from "next-intl";
import { CardGridSkeleton, HeadingSkeleton, LoadingLive } from "@/components/skeletons";

/** Fallback for any page under [locale] without its own loading.tsx. */
export default function Loading() {
  const t = useTranslations("states");
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-10 md:py-14">
      <LoadingLive label={t("loading")} />
      <HeadingSkeleton />
      <CardGridSkeleton count={8} />
    </div>
  );
}
