// Sample data, matching the printed SAMPLE notices in /demo. Used by
// "Use a sample paper" and by every call while the backend URL isn't set.

export const SAMPLE_FIELDS = {
  atlanta: {
    jurisdiction: "atlanta",
    document_type: "dispossessory_affidavit",
    case_number: "26-ED-SAMPLE-0419",
    court: "Magistrate Court of Sample County, Georgia",
    county: "Sample",
    landlord_name: "Peachtree Example Properties LLC",
    tenant_name: "Jordan Sample",
    property_address: "100 Example St SW, Apt 4B, Atlanta, GA 30310",
    reason: "nonpayment",
    amount_claimed: 1850,
    currency: "USD",
    served_on: "2026-10-10",
    notice_date: null,
    vacate_by: null,
  },
  lagos: {
    jurisdiction: "lagos",
    document_type: "quit_notice",
    case_number: null,
    court: null,
    county: null,
    landlord_name: "Chief Example Landlord",
    tenant_name: "Tunde Sample",
    property_address: "Flat 3, 12 Sample Close, Surulere, Lagos",
    reason: "other",
    amount_claimed: null,
    currency: "NGN",
    served_on: null,
    notice_date: "2026-10-01",
    vacate_by: "2026-10-15",
  },
};

export const FAKE_DEFENSES = [
  { id: "paid", text: "I paid the rent, or offered to pay it, and the landlord refused it." },
  { id: "tender", text: "I am offering to pay all rent owed plus court costs (tender)." },
  { id: "not_owed", text: "I do not owe the amount the landlord claims." },
  { id: "repairs", text: "The landlord did not make needed repairs, and this lowered the value of my home." },
  { id: "retaliation", text: "The landlord filed this after I complained about conditions or asked for repairs." },
  { id: "no_relationship", text: "I do not have a landlord-tenant relationship with the plaintiff." },
  { id: "self_help", text: "The landlord locked me out, removed my things, or cut my utilities without a court order." },
  { id: "other", text: "Other reason (write it below)." },
];

export const FAKE_LEGAL_AID = {
  atlanta: [
    { name: "Atlanta Legal Aid Society", type: "legal_aid", website: "https://www.atlantalegalaid.org", phone: null, address: null, verify: true },
    { name: "Georgia Legal Services Program", type: "legal_aid", website: "https://www.glsp.org", phone: null, address: null, verify: true },
    { name: "Atlanta Volunteer Lawyers Foundation - Housing Court Assistance Center", type: "legal_aid", website: "https://avlf.org", phone: null, address: null, verify: true },
  ],
  lagos: [
    { name: "Lagos State Office of the Public Defender", type: "legal_aid", website: null, phone: null, address: null, verify: true },
  ],
};
