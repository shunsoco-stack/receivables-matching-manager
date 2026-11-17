import { InvoiceWorkspace } from "@/components/invoice-workspace";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const { customer } = await searchParams;
  return <InvoiceWorkspace key={customer ?? "all"} initialCustomer={customer ?? ""} />;
}
