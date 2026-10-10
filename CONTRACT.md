# 7 Days — API contract (for Mo's frontend)

Base URL: the Render backend. All requests/responses are JSON unless noted.
Nothing is stored server-side. Keep the confirmed `fields` in React state and
send them with every call.

## Screen flow → endpoint

| Screen | Call |
|---|---|
| 1. Snap the paper | `POST /read-notice` |
| 2. Confirm fields (tenant edits every field) | none — local state |
| 3. Countdown + cards | `POST /check` |
| 4. Listen (EN / ES / Pidgin) | `POST /explain` → send `text` to existing `POST /speak` |
| 5. Start your answer | `GET /defenses`, then `POST /answer` (returns PDF) |
| 6. Where to go | `GET /legal-aid?jurisdiction=atlanta` |

---

## `POST /read-notice`
multipart form, field `photo` (jpeg/png, ≤ 8 MB)

```json
{
  "fields": {
    "jurisdiction": "atlanta",
    "document_type": "dispossessory_affidavit",
    "case_number": "26-ED-SAMPLE-0419",
    "court": "Magistrate Court of Sample County, Georgia",
    "county": "Sample",
    "landlord_name": "Peachtree Example Properties LLC",
    "tenant_name": "Jordan Sample",
    "property_address": "100 Example St SW, Apt 4B, Atlanta, GA 30310",
    "reason": "nonpayment",
    "amount_claimed": 1850.0,
    "currency": "USD",
    "served_on": "2026-10-10",
    "notice_date": null,
    "vacate_by": null
  },
  "unclear": ["served_on"],
  "source": "gemini",          // "gemini" | "manual" | "demo"
  "note": "Check every field against your paper before continuing."
}
```
- Highlight every key in `unclear` in amber on the confirm screen.
- If `source` is `"manual"`, the photo couldn't be read: show empty fields to type in.
- **Never** go to the countdown until the tenant has tapped "These are correct".

## `POST /check`
```json
{
  "fields": { ...confirmed fields... },
  "extras": {
    "monthly_rent": 1100,          // optional, Atlanta: enables "amount looks high"
    "locked_out": false,           // optional yes/no question
    "utilities_cut": false,        // optional yes/no question
    "rent_period": "yearly"        // Lagos only: weekly|monthly|quarterly|half_yearly|yearly
  }
}
```
Atlanta response:
```json
{
  "jurisdiction": "atlanta",
  "deadline": {
    "served_on": "2026-10-10",
    "seventh_day": "2026-10-17",
    "deadline": "2026-10-19",
    "deadline_time": "5:00 PM",
    "deadline_label": "Monday, October 19, 2026",
    "days_left": 8,
    "status": "open",              // "open" | "due_today" | "missed"
    "moved": true,
    "moved_reason": "Day 7 (Sat Oct 17) is Saturday, so the deadline moves to the next business day.",
    "holiday_list_verified": true
  },
  "cards": [
    {"id": "deadline_moved", "level": "info", "title": "...", "body": "..."},
    {"id": "pay_to_end", "level": "amber", "title": "...", "body": "..."}
  ]
}
```
Big countdown: `days_left` + "days left" and `"Answer by " + deadline_label + ", " + deadline_time`.
Card colors: `red` > `amber` > `info`. Show red first.

Lagos response: `{"jurisdiction": "lagos", "notice_check": {"ok": false, "given_days": 14, "required_days": 180, "verified": false}, "cards": [...]}`

## `POST /explain`
Same body as `/check` plus `"lang": "en" | "es" | "pcm"` (Atlanta: en/es; Lagos: en/pcm).
```json
{"lang": "en", "text": "This paper is an eviction case filed by ..."}
```
Show the text on screen too (captions), then send `text` to `/speak`.

## `GET /defenses`
```json
[{"id": "paid", "text": "I paid the rent, or offered to pay it, and the landlord refused it."}, ...]
```
Show as checkboxes, **all unchecked**. The tenant ticks their own. Never pre-tick.

## `POST /answer` → `application/pdf`
```json
{
  "fields": { ... },
  "extras": { ... },
  "tenant": {"name": null, "address": null, "phone": "404-555-0100"},
  "selected_defenses": ["tender"],
  "own_words": ""
}
```
Returns the PDF bytes (Atlanta: answer draft; Lagos: reply letter). Download or share with the Web Share API.
Unknown defense id → 422.

## `GET /legal-aid?jurisdiction=atlanta`
`{"places": [{"name", "type", "website", "phone", "address", "verify"}], "note": "..."}`
Fill in phones/addresses in `backend/data/legal_aid.json` after checking each org's own site.

## Must-show text (every result screen footer)
"This is information, not legal advice. Free help: Atlanta Legal Aid."
