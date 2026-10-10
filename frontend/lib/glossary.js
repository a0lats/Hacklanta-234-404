// Legal words, in plain language. Written by the team, NOT made by AI, so the
// meaning never changes from one tap to the next. Tap a word to read it and
// hear it read aloud (/speak).
//
// NEEDS REVIEW: Spanish by a native speaker; Pidgin by Olu. Lagos meanings
// follow the Lagos State Tenancy Law 2011 and are still being confirmed.

export const GLOSSARY = {
  atlanta: [
    {
      id: "dispossessory",
      en: ["Dispossessory", "The court case a landlord files to take back the home. It is not an eviction yet. Only a judge can order you out."],
      es: ["Dispossessory (demanda de desalojo)", "El caso que el propietario presenta en la corte para recuperar la vivienda. Todavía no es un desalojo. Solo un juez puede ordenar que se vaya."],
    },
    {
      id: "served",
      en: ["Served", "The day the sheriff or marshal handed you the paper or left it at your door. Your 7 days are counted from this day."],
      es: ["Entregado (served)", "El día en que el sheriff o alguacil le dio el papel o lo dejó en su puerta. Sus 7 días se cuentan desde ese día."],
    },
    {
      id: "answer",
      en: ["Answer", "Your written reply to the court. If you file it on time, the court sets a hearing so you can tell your side."],
      es: ["Respuesta (answer)", "Su respuesta por escrito a la corte. Si la presenta a tiempo, la corte fija una audiencia para que cuente su versión."],
    },
    {
      id: "hearing",
      en: ["Hearing", "A meeting in court where a judge listens to you and your landlord before deciding."],
      es: ["Audiencia (hearing)", "Una cita en la corte donde un juez escucha a usted y a su propietario antes de decidir."],
    },
    {
      id: "default",
      en: ["Default", "If you don't file an answer in time, the landlord can win without a hearing. That is called a default."],
      es: ["Rebeldía (default)", "Si no presenta una respuesta a tiempo, el propietario puede ganar sin audiencia. Eso se llama rebeldía."],
    },
    {
      id: "writ",
      en: ["Writ of possession", "The court order that lets the sheriff or marshal remove you and your things. It only comes after a judge rules for the landlord."],
      es: ["Orden de posesión (writ of possession)", "La orden de la corte que permite al sheriff o alguacil sacarlo a usted y sus cosas. Solo llega después de que un juez decide a favor del propietario."],
    },
    {
      id: "tender",
      en: ["Tender", "Offering to pay all the rent you owe plus court costs. In a case about unpaid rent, this may end the case. There are limits on how often you can use it."],
      es: ["Oferta de pago (tender)", "Ofrecer pagar toda la renta que debe más los costos de la corte. En un caso por renta no pagada, esto puede terminar el caso. Hay límites en cuántas veces se puede usar."],
    },
    {
      id: "magistrate",
      en: ["Magistrate Court", "The county court that hears most eviction cases in Georgia. Its clerk can answer questions about filing."],
      es: ["Corte Magistrada (Magistrate Court)", "La corte del condado que ve la mayoría de los casos de desalojo en Georgia. Su secretario puede responder preguntas sobre cómo presentar papeles."],
    },
  ],
  lagos: [
    {
      id: "quit_notice",
      en: ["Quit notice", "The first paper. It tells you the date your landlord wants you to leave. It is not a court order."],
      pcm: ["Quit notice", "Na the first paper. E talk the date wey landlord want make you comot. E no be court order."],
    },
    {
      id: "owners_intention",
      en: ["Notice of owner's intention", "The second paper, after the quit notice runs out. It says the landlord will go to court in 7 days to get the home back."],
      pcm: ["Notice of owner's intention", "Na the second paper, after the quit notice don finish. E talk say landlord go go court for 7 days time to collect the house back."],
    },
    {
      id: "tenancy_agreement",
      en: ["Tenancy agreement", "The paper you signed when you rented. If it sets its own notice period, that may apply instead of the minimums in this app."],
      pcm: ["Tenancy agreement", "The paper wey you sign when you rent the house. If e talk how long notice suppose be, na dat one fit apply, no be the minimum wey dey dis app."],
    },
    {
      id: "yearly_tenant",
      en: ["Yearly tenant", "You pay rent once a year. If your agreement doesn't say otherwise, you are owed at least 6 months' notice."],
      pcm: ["Yearly tenant", "You dey pay rent once every year. If your agreement no talk otherwise, dem suppose give you at least 6 months notice."],
    },
    {
      id: "tenant_at_will",
      en: ["Tenant at will", "Someone renting with no fixed period, often with no written agreement. The notice can be as short as one week."],
      pcm: ["Tenant at will", "Person wey dey rent without fixed time, many times without written agreement. The notice fit short reach one week."],
    },
    {
      id: "court_order",
      en: ["Court order", "A decision by a judge. In Lagos, only a court order, carried out by court officials, can remove you from your home."],
      pcm: ["Court order", "Na decision from judge. For Lagos, na only court order, wey court people carry come, fit remove you from your house."],
    },
    {
      id: "self_help",
      en: ["Self-help eviction", "When a landlord forces you out without going to court: changing locks, removing doors or the roof, throwing out your things, or sending people to threaten you. This is an offence in Lagos."],
      pcm: ["Self-help eviction", "When landlord force you comot without court: change lock, remove door or roof, throw your things outside, or send people come threaten you. Na offence for Lagos."],
    },
  ],
};

// Returns [{ id, word, meaning }] for the chosen place and language.
export function legalWords(place, lang) {
  return (GLOSSARY[place] || []).map((g) => {
    const [word, meaning] = g[lang] || g.en;
    return { id: g.id, word, meaning };
  });
}
