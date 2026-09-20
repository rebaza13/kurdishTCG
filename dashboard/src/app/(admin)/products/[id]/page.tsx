"use client";

import { useParams } from "next/navigation";
import { ProductForm } from "@/components/product-form";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  // useParams hands back the still-encoded segment.
  return <ProductForm productId={decodeURIComponent(id)} />;
}
