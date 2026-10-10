// Fake data shaped exactly like the team's API contract.
// The screens use this until each real endpoint is ready (see lib/api.js).

// The 3 required shots, in order.
export const SHOTS = ["leak_point", "pipe_condition", "wide"];

// POST /check-photo responses (Travis), one per shot type
export const FAKE_CHECKS = {
  leak_point: {
    shot_type: "leak_point",
    usable: true,
    reason: "Leak point clearly visible",
    damage_seen: "Rust and a split along the pipe seam; oil pooling below",
    boxes: [{ label: "corrosion", box: [320, 410, 560, 690] }],
    needs_expert_review: true,
  },
  pipe_condition: {
    shot_type: "pipe_condition",
    usable: true,
    reason: "Pipe surface visible along its length",
    damage_seen: "Heavy rust and flaking coating",
    boxes: [{ label: "corrosion", box: [250, 150, 700, 520] }],
    needs_expert_review: true,
  },
  wide: {
    shot_type: "wide",
    usable: true,
    reason: "Spill area visible",
    damage_seen: "Oil sheen across the water and mangrove roots",
    boxes: [{ label: "oil", box: [420, 80, 900, 920] }],
    needs_expert_review: false,
  },
};

// POST /read-report response (Jade)
export const FAKE_REPORT = {
  date: "2026-03-12",
  location: "Kpean, Khana LGA, Rivers State",
  cause: "Sabotage",
  volume_barrels: 20,
  area: "0.2 hectares",
  signed_by: ["Operator", "NOSDRA"],
  lines: {
    date: "Date of incident: 12 March 2026",
    location: "Location: Kpean, Khana LGA, Rivers State",
    cause: "Cause of spill: third-party interference (sabotage)",
    volume_barrels: "Estimated quantity spilled: 20 barrels",
    area: "Area impacted: 0.2 hectares",
  },
};

// POST /compare response (Jade): top 3, most severe first
export const FAKE_COMPARE = {
  mismatches: [
    {
      title: "Dates don't match",
      official_says: "Spill started 12 March",
      evidence_shows: "First photo taken 9 March",
      report_line: "date",
      severity: "high",
      plain_english: "Your photos show oil 3 days before the official start date.",
      pidgin: "Your picture show say oil don dey there 3 days before dem own date.",
    },
    {
      title: "Signs of corrosion",
      official_says: "Cause: sabotage",
      evidence_shows: "Rust and a split along the pipe seam",
      report_line: "cause",
      severity: "high",
      plain_english: "Your photos show signs of corrosion. An expert should review whether the cause was sabotage.",
      pidgin: "Your picture show say di pipe don rust. Make expert check whether na really sabotage.",
    },
    {
      title: "Spill looks bigger",
      official_says: "20 barrels over 0.2 hectares",
      evidence_shows: "Oil across the water and mangroves",
      report_line: "volume_barrels",
      severity: "medium",
      plain_english: "The wide shot shows oil over a larger area than the report describes. Expert review recommended.",
      pidgin: "Di wide picture show say di oil spread pass wetin di report talk. Make expert check am.",
    },
  ],
};

// POST /letter response (Jade)
export const FAKE_LETTER = {
  letter_text: `To: The Director General, NOSDRA

Subject: Request for review of the Joint Investigation report, Kpean, Khana LGA, Rivers State (12 March 2026)

Dear Sir/Madam,

We write as members of the Kpean community to request an independent review of the investigation report for the oil spill recorded on 12 March 2026.

Photographs taken by a community monitor raise three concerns for expert review:

1. Timing. Our first photograph of oil at the site was taken on 9 March 2026, three days before the reported start date.
2. Cause. The report records sabotage. Our photographs show rust and a split along the pipe seam, which should be assessed for corrosion.
3. Extent. The report records 20 barrels over 0.2 hectares. Our wide photograph shows oil across the water and mangrove roots beyond that area.

Each photograph's digital fingerprint (SHA-256), time and location are listed with this letter so that the files can be verified.

We request a re-inspection with independent experts present.

Yours faithfully,
Community monitor, Kpean`,
  pidgin_summary:
    "We don check di official report. Our picture show say oil don dey before di date wey dem write, di pipe don rust, and di oil spread pass wetin dem talk. We dey ask NOSDRA make dem come check am again with independent expert.",
};

// Sample case: time, GPS and fingerprint for each sample photo.
// Saturday: replace hash with the real SHA-256 of each sample file in /public/sample/.
export const SAMPLE_META = {
  leak_point: { taken_at: "2026-03-09T07:42:00+01:00", gps: [4.6521, 7.2645], hash: "9f2c41ab..." },
  pipe_condition: { taken_at: "2026-03-09T07:45:00+01:00", gps: [4.6522, 7.2647], hash: "b71e09cd..." },
  wide: { taken_at: "2026-03-09T07:49:00+01:00", gps: [4.6518, 7.2641], hash: "4c8d2e10..." },
};
