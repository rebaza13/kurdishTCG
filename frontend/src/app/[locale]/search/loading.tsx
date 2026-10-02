import { useTranslations } from "next-intl";
import { CardGridSkeleton, LoadingLive } from "@/components/skeletons";

export default function Loading() {
  const t = useTranslations("states");
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-10 md:py-10">
      <LoadingLive label={t("loading")} />
      <div className="kt-skel mb-6" style={{ height: "44px", maxWidth: "560px" }} aria-hidden />
      <CardGridSkeleton count={12} />
    </div>
  );
}
