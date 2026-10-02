import { useTranslations } from "next-intl";
import { CardGridSkeleton, LoadingLive } from "@/components/skeletons";

export default function Loading() {
  const t = useTranslations("states");
  return (
    <div>
      <LoadingLive label={t("loading")} />
      <div className="kt-skel" style={{ height: "148px", borderRadius: 0 }} aria-hidden />
      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-10 md:py-10">
        <CardGridSkeleton count={8} />
      </div>
    </div>
  );
}
