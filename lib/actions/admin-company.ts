"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { deleteImagesByUrl, imageFileError, removeUploads, uploadImages } from "@/lib/image-upload";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { refreshStorefront } from "@/lib/storefront";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CompanyField =
  | "name"
  | "addressLine"
  | "location"
  | "state"
  | "postalCode"
  | "country"
  | "email"
  | "whatsappNumber"
  | "gstNumber"
  | "about"
  | "logo";

export type AdminCompanyInput = {
  companyId: string;
  name: string;
  addressLine: string;
  location: string;
  state: string;
  postalCode: string;
  country: string;
  email: string;
  whatsappNumber: string;
  gstNumber: string;
  about: string;
  /** A replacement logo; an empty file or none keeps the current logo. */
  logo: File | null;
};

export type AdminCompanyResult = { ok: true } | { ok: false; message: string; fieldErrors?: Partial<Record<CompanyField, string>> };

/**
 * 10 to 15 digits after dropping a leading "00": the storefront's rule
 * (lib/phone.ts), matching the database trigger that then normalizes the
 * stored number (a 10 digit number becomes +91...).
 */
function hasValidPhoneDigitCount(value: string): boolean {
  let digits = value.replace(/[^0-9]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * The directory's country filter matches the stored text exactly, so
 * "india" next to "India" would become a second filter chip. Reuses the
 * spelling another company already has when it matches ignoring case
 * (the storefront canonicalizes against its own country list; this app
 * keeps no copy of that list), otherwise keeps the text with spacing tidied.
 */
async function canonicalCountry(value: string): Promise<string> {
  const tidy = value.trim().replace(/\s+/g, " ");
  const { data } = await supabaseAdmin.from("companies").select("country");
  return (data ?? []).find((row) => row.country.toLowerCase() === tidy.toLowerCase())?.country ?? tidy;
}

/**
 * Edits any company's details, WhatsApp number and, optionally, logo. The
 * status, verified flag and slug stay as they are (links keep working); an
 * admin is trusted, so an approved company stays live. A replaced logo is
 * deleted from R2 after the write succeeds.
 */
export async function updateAdminCompany(input: AdminCompanyInput): Promise<AdminCompanyResult> {
  await requireAdmin();
  if (!UUID_RE.test(input.companyId)) return { ok: false, message: "Invalid company." };

  const v = {
    name: input.name.trim(),
    addressLine: input.addressLine.trim(),
    location: input.location.trim(),
    state: input.state.trim(),
    postalCode: input.postalCode.trim(),
    country: input.country.trim(),
    email: input.email.trim(),
    whatsappNumber: input.whatsappNumber.trim(),
    gstNumber: input.gstNumber.trim(),
    about: input.about.trim(),
  };
  const logo = input.logo && input.logo.size > 0 ? input.logo : null;

  const fieldErrors: Partial<Record<CompanyField, string>> = {};
  if (v.name.length < 2 || v.name.length > 200) fieldErrors.name = "Enter a business name (2 to 200 characters).";
  if (v.addressLine.length > 240) fieldErrors.addressLine = "Address must be under 240 characters.";
  if (v.location.length < 2 || v.location.length > 120) fieldErrors.location = "Enter a city.";
  if (v.state.length > 120) fieldErrors.state = "State must be under 120 characters.";
  if (v.postalCode.length > 12) fieldErrors.postalCode = "Enter a valid PIN code.";
  if (v.country.length < 2 || v.country.length > 120) fieldErrors.country = "Enter a country.";
  if (!EMAIL_RE.test(v.email)) fieldErrors.email = "Enter a valid email address.";
  if (!hasValidPhoneDigitCount(v.whatsappNumber)) {
    fieldErrors.whatsappNumber = "Enter a valid WhatsApp number, with country code if outside India.";
  }
  if (v.gstNumber.length > 20) fieldErrors.gstNumber = "Enter a valid GST number.";
  if (v.about.length > 2000) fieldErrors.about = "About must be under 2000 characters.";
  if (logo) {
    const logoError = imageFileError([logo]);
    if (logoError) fieldErrors.logo = logoError.replace("Images must be", "The logo must be").replace("Each image", "The logo");
  }
  if (Object.keys(fieldErrors).length > 0) return { ok: false, message: "Please check the form.", fieldErrors };

  const { data: company, error: readError } = await supabaseAdmin
    .from("companies")
    .select("id, logo_url")
    .eq("id", input.companyId)
    .maybeSingle();
  if (readError) return { ok: false, message: "Something went wrong. Please try again." };
  if (!company) return { ok: false, message: "This company no longer exists." };

  let newLogoUrl: string | null = null;
  let newLogoKeys: string[] = [];
  if (logo) {
    const upload = await uploadImages("logos", "admin", [logo]);
    if (!upload.ok) return { ok: false, message: "Please check the form.", fieldErrors: { logo: upload.error } };
    newLogoUrl = upload.urls[0];
    newLogoKeys = upload.keys;
  }

  const { error } = await supabaseAdmin
    .from("companies")
    .update({
      name: v.name,
      address_line: v.addressLine || null,
      location: v.location,
      state: v.state || null,
      postal_code: v.postalCode || null,
      country: await canonicalCountry(v.country),
      email: v.email,
      gst_number: v.gstNumber || null,
      about: v.about || null,
      ...(newLogoUrl ? { logo_url: newLogoUrl } : {}),
    })
    .eq("id", company.id);

  if (error) {
    await removeUploads("logos", newLogoKeys);
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  // The database trigger normalizes the number (company_contacts).
  const { error: contactError } = await supabaseAdmin
    .from("company_contacts")
    .upsert({ company_id: company.id, whatsapp_number: v.whatsappNumber }, { onConflict: "company_id" });

  if (newLogoUrl && company.logo_url) await deleteImagesByUrl([company.logo_url]);

  revalidatePath(`/companies/${company.id}`);
  revalidatePath("/companies");
  revalidatePath("/products");

  // The company row changed either way, so refresh before reporting a contact error.
  await refreshStorefront();

  if (contactError) {
    return { ok: false, message: "The details were saved, but the WhatsApp number couldn't be updated. Please try saving again." };
  }
  return { ok: true };
}
