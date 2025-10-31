import { requireAdminContext } from "@/lib/api/auth";
import ProductSuggestionsClient from "./ProductSuggestionsClient";

export default async function ProductSuggestionsPage() {
  await requireAdminContext();

  return <ProductSuggestionsClient />;
}
