import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getCompanyById } from "@/lib/supabase/queries/companies";
import { CompanyEditForm } from "@/components/company-edit-form";

type Props = {
  params: Promise<{ id: string }>;
};

/** Edit any company's details, WhatsApp number and logo; its status stays as it is. */
export default async function EditCompanyPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const company = await getCompanyById(id);
  if (!company) notFound();

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <Link href={`/companies/${company.id}`} className="text-xs font-medium text-[#5B6B57] hover:underline">
          &larr; {company.name}
        </Link>
        <h2 className="text-xl font-semibold text-[#1A1F1A]">Edit {company.name}</h2>
        <p className="text-sm text-[#5B6B57]">
          Saving keeps the company&apos;s status ({company.status}). Use Hide on the company page to take it off the site.
        </p>
      </div>

      <CompanyEditForm
        companyId={company.id}
        values={{
          name: company.name,
          addressLine: company.addressLine ?? "",
          location: company.location ?? "",
          state: company.state ?? "",
          postalCode: company.postalCode ?? "",
          country: company.country,
          email: company.email,
          whatsappNumber: company.whatsappNumber ?? "",
          gstNumber: company.gstNumber ?? "",
          about: company.about ?? "",
          logoUrl: company.logoUrl,
        }}
      />
    </main>
  );
}
