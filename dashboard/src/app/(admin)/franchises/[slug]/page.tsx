"use client";

import { useParams } from "next/navigation";
import { FranchiseForm } from "@/components/franchise-form";

export default function EditFranchisePage() {
  const { slug } = useParams<{ slug: string }>();
  return <FranchiseForm slug={slug} />;
}
