import BankTransferAdminPage from "./BankTransferAdminPage";
import { requireAdminContext } from "@/lib/api/auth";
import { listBankTransferReviews } from "@/lib/payments/db";

export default async function BankTransferAdminRoute() {
  const { context } = await requireAdminContext({
    allowedRoles: ["super_admin", "finance_admin", "operations_admin"],
  });
  const reviews = await listBankTransferReviews({ statuses: ["pending"] });

  return <BankTransferAdminPage initialReviews={reviews} capabilities={context.capabilities} />;
}
