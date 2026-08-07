/**
 * Agent-authored copy, English — written against `messages.id.js`, never the
 * other way round. Where the two disagree in meaning, the Indonesian is right
 * and this file is the bug (design/SCREENS.md).
 *
 * Two conventions worth stating, because they are decisions rather than
 * accidents:
 *
 *  - Rupiah stays rupiah. `Rp 18–22M/mo` is not converted, because the tenant is
 *    billed in rupiah and a converted figure would carry an invented rate.
 *  - Place names, branch names and manager names are not translated. "Bekasi
 *    Timur" is a branch, not a phrase. Only the descriptive tail an agent added
 *    to a candidate site ("· east side") crosses over.
 */
export const en = {
  theme: {
    'antrean-kasir': 'Checkout queues',
    kebersihan: 'Cleanliness',
    'stok-kosong': 'Out of stock',
    parkir: 'Parking',
    'harga-vs-pesaing': 'Price vs competitors',
    'keramahan-staf': 'Staff manner',
  },

  agent: {
    reputation: 'Reputation Agent',
    knowledge: 'Knowledge Agent',
    location: 'Location Agent',
  },

  factor: {
    traffic: 'Foot traffic',
    mix: 'Surrounding category mix',
    competitors: 'Competitor density',
    access: 'Parking availability',
  },

  candidateFactor: {
    traffic: 'Foot traffic',
    mix: 'Category mix',
    competitors: 'Competitors',
    cannibalisation: 'Cannibalisation',
  },

  origin: {
    measured: 'measured',
    surveyed: 'surveyed',
    model: 'modelled',
  },

  ticketStatus: {
    baru: 'New',
    dikerjakan: 'In progress',
    menunggu: 'Waiting',
    selesai: 'Done',
  },

  systemic: {
    reasonSystemic: 'Appears in {count} regions: {regions}.',
    reasonLocal: 'Only in {count} regions ({regions}); the systemic threshold is {threshold}.',
    noRegion: 'none',
    headline: '{theme} is a systemic problem, not a local one',
    detail:
      'Appears in {count} of the {total} regions monitored. Fixing it branch by branch will not be enough — the agent proposes changing the relevant rule in the central SOP.',
  },

  cannibal: {
    verdictNone: 'No own branch to compare against.',
    verdictFlagged:
      'The nearest own branch {outlet} is only {km} km away — some customers would move rather than be added.',
    verdictClear: 'The nearest own branch {outlet} is {km} km away — no competition for customers.',
  },

  scout: {
    request:
      'Find candidate sites for a new branch, at least 1.2 km from our own branches, with high foot traffic.',
    rejectedReason: 'Only {km} km from {outlet} — below the {threshold} km threshold.',
    reasoningNoCompetitors: 'No comparable minimarket within {radius} m.',
    reasoningCompetitors: '{count} comparable competitors within {radius} m.',
    reasoningCannibal:
      'The nearest own branch {outlet} is only {km} km away — some customers would move rather than be added.',
    reasoningClear: 'Our nearest branch {outlet} is {km} km away — no competition for customers.',
    reasoningPricePlay: 'A fit if the strategy is price rather than convenience.',
  },

  candidate: {
    'cibubur-junction': {
      name: 'Cibubur Junction · east side',
      context: 'Offices and two schools within 600 m',
    },
    'kramat-jati': {
      name: 'Kramat Jati · near the market',
      context: 'A daily market with the highest foot traffic of any candidate',
    },
    'duren-sawit': {
      name: 'Duren Sawit · main road',
      context: 'Residential main road, steady flow through the day',
    },
    'pondok-gede': {
      name: 'Pondok Gede · opposite the terminal',
      context: 'Bus terminal and transit area',
    },
    'bekasi-utara': {
      name: 'Bekasi · Jl. Chairil Anwar north',
      context: 'The same stretch as the Bekasi Timur branch, northern side',
    },
  },

  compare: {
    rowLocationScore: 'Location score',
    rowTraffic: 'Foot traffic',
    rowCompetitors: 'Competitors within {radius} m',
    rowNearestOwn: 'Nearest own branch',
    rowVisits: 'Estimated visits/day',
    rowRent: 'Market rent',
    minimarkets: '{count} minimarkets',
    riskCannibalisation: 'cannibalisation risk',
    riskMedium: 'moderate risk',
    riskSafe: 'clear',
    rentUnavailable: 'not available',
    rentRange: 'Rp {low}–{high}M/mo',
    noFactor: 'no factor',
    none: 'none',
    conclusionCannibal:
      'Too close to {outlet} ({km} km). Part of its revenue would come from a branch we already own, so the figures above overstate the growth.',
    conclusionBusyCrowded:
      'Higher volume but a price war is close to certain. Choose this one only if you are ready to compete on price.',
    conclusionStable:
      'Steadier revenue and easier to forecast. Choose this one if the target is margin rather than volume.',
    conclusionMixed:
      'Ahead on {won}; behind on {lost}. The decision depends on the weights you set in Admin.',
  },

  guardrail: {
    summary: 'Guardrails passed {passed}/{total}',
    unsourcedNoClaim: 'No specific claim that would need a source.',
    unsourcedCited: 'The claim is sourced to {pages}.',
    unsourcedFailed: 'The reply states a rule or a figure without a single cited source.',
    personalDataClean: 'No customer personal data in the reply.',
    personalDataFound: 'The reply contains {found}.',
    toneClean: 'Tone follows the guide: acknowledges, concrete, no over-promising.',
    toneFound: 'Tone departs from the guide: {found}.',
    compensationClean: 'No promise of financial compensation.',
    compensationFound: 'The reply promises {found}.',
    pageRef: '{docId} p. {page}',
    and: ' and ',
    personalData: {
      phone: 'a phone number',
      email: 'an email address',
      orderNumber: 'an order number',
      nationalId: 'a national ID number',
      homeAddress: 'a home address',
    },
    tone: {
      blamesCustomer: 'blaming the customer',
      defensive: 'defensiveness',
      undatedPromise: 'a promise with no date',
      internalJargon: 'internal jargon',
    },
  },

  cite: {
    // Kept verbatim in the console so the refusal reads the same either way; the
    // deterministic path and the model both produce the Indonesian sentence, and
    // this is the English reader's rendering of it.
    refusal: 'Not in the documents.',
    reasonBelowThreshold:
      'No passage reached the confidence threshold of {threshold}. The closest was only {best}.',
    reasonModelRefused:
      'The model read the passages that cleared the threshold and judged that none of them answers this question.',
    confidenceHigh: 'high confidence',
    confidenceMedium: 'moderate confidence',
  },

  draft: {
    tone: 'warm, accountable',
    refusal: 'not in the documents',
    reasonNoPassage: 'No SOP passage above the {threshold} threshold for the theme "{theme}".',
    reasonNoTheme: 'The complaint theme could not be identified from the review text.',
  },

  step: {
    reviewsRead: '{count} reviews read',
    themesDetected: '{count} themes detected',
    changePoints: '{count} change points',
    score: 'score {score}',
    passagesKept: '{kept} passages cleared the threshold · {rejected} rejected',
    noOutlet: 'no branch named in the question',
    route: 'intent {intent} → {agents}',
  },

  finding: {
    leadingThemeNetwork: 'across the network',
    leadingThemeAt: 'at {outlet}',
    leadingTheme:
      'The largest complaint theme {where} is {theme}: {count} complaints over 8 weeks, {thisWeek} of them this week',
    leadingThemeRising: ', up {delta}× on a month ago.',
    leadingThemeFlat: '.',
    ratingCurrent: 'Running rating {rating}',
    ratingMoved: ', {direction} {points} points over 8 weeks.',
    ratingDown: 'down',
    ratingUp: 'up',
    ratingFlat: '.',
    passage: '{title} p. {page}: “{text}”',
    locationScore:
      'The location score for {outlet} is {score} out of 100. Biggest drag: {factor} at {value}, with {competitors} competitors within {radius} m',
    locationScoreNew: ', {count} of them new.',
    locationScoreFlat: '.',
  },

  supervisor: {
    leadOutlet: 'For {outlet}, here is what the agents found:',
    leadNetwork: 'Here is what the agents found across the network:',
    caveat: 'Note: {reason} This answer does not yet include that perspective.',
    refusalTitle: 'Not in the documents.',
    refusalBody:
      'The agents found no source that could support an answer to this question, so no answer is given. The question has been recorded as a knowledge gap.',
    sourceReviews: '{count} reviews',
    sourceDocument: '{title} p. {page}',
  },

  action: {
    reportGap: 'Report the knowledge gap',
    createTicketAt: 'Raise a ticket for the {outlet} manager',
    createTicket: 'Raise a follow-up ticket',
    openReviews: 'Open {count} reviews',
    showOnMap: 'Show on the map',
    ticketTitleTheme: 'Follow up {theme} complaints{where}',
    ticketTitleQuestion: 'Follow up: {question}',
    ticketWhere: ' at {outlet}',
  },

  briefing: {
    reviewsReadTitle: 'The Reputation Agent read {count} new reviews',
    reviewsReadDetail:
      '{outlets} branches · {themes} themes detected · {rising} themes up on a month ago',
    repliesTitle: '{count} reviews answered automatically',
    repliesDetail: 'all 3–5 star · {held} held for your approval',
    repliesUnanswerable: '· {count} cannot be replied to: this account does not manage the listing',
    locationSkippedTitle: 'The Location Agent did not run',
    locationSkippedDetail:
      'No Places adapter on this cycle, so branch surroundings were not scanned.',
    locationTitle: 'The Location Agent scanned {count} branch areas',
    locationDetail: '{poi} POIs · {competitors} new competitors found · {pairs} branches at risk of cannibalisation',
    knowledgeTitle: 'The Knowledge Agent checked the document index',
    knowledgeDetail: 'answer coverage {coverage} · {gaps} knowledge gaps reported',
    handoverTitle: 'Briefing handed over',
    handoverClean: 'no tool call failed tonight',
    handoverFailures: '{count} tool calls failed · all retried successfully',

    decisionThemeTitle: '{theme} is getting worse at {outlet}',
    decisionThemeBody:
      'Appears in {thisWeek} reviews this week at {outlet}, up {delta}× on a month ago. {total} complaints in total over 8 weeks. The agent proposes acting on the relevant SOP clause for two weeks, then measuring again.',
    decisionSystemicBody: '{detail} Worst branch: {outlet}.',
    decisionGapTitle: 'The SOP does not answer: {question}',
    decisionGapBody:
      '{occurrences} questions this month could not be answered from the existing documents. Answer coverage is currently {coverage}. The agent proposes adding a clause to the central SOP that closes this gap.',

    evidenceComplaints: '{count} complaints',
    evidenceRising: 'up {delta}×',
    evidenceRegions: '{count} regions',
    evidenceLocal: 'local',
    evidenceSystemic: 'systemic',
    evidenceQuestions: '{count} questions',
    evidenceCoverage: '{coverage} coverage',

    actionApproveTicket: 'Approve & raise a ticket',
    actionReview: 'Examine',
    actionReviewSop: 'See the draft SOP change',
    actionAssignSopOwner: 'Assign to the SOP owner',
    actionReadClause: 'Read the draft clause',

    probeQueue: 'the checkout queue rule during peak hours',
    probeCleanliness: 'the cleanliness standard for the shop floor',
    probeStock: 'the restock procedure for main shelves',
    probeParking: 'what to do when the car park is full',
    probePrice: 'how to handle a price gap against a competitor',
    probeStaff: 'how a complaint about staff manner is handled',
    probeQueueLimit: 'the queue time limit that must be reported',
  },

  admin: {
    modelReasoning: 'Reasoning',
    modelBulk: 'Bulk summarisation',
    modelEndpoint: 'Model endpoint',
    modelRetrieval: 'Retrieval',
    modelRuntime: 'Agent runtime',
    modelApiRuntime: 'API runtime',
    modelSessions: 'Sessions & trace',
    modelSearchIndex: 'Managed index',
    modelManagedRuntime: 'Managed runtime',
    pathDeterministic: 'Deterministic path',
    retrievalKeyword: 'Keyword scoring · packages/core',
    runtimeSupervisor: 'Supervisor · packages/core',
    runtimeLocal: 'Local Node',
    sessionsInMemory: 'In process memory',

    guardrailApproval: '1–2 star replies require human approval',
    guardrailCompensation: 'Forbid promises of financial compensation',
    guardrailConfidence: 'Refuse to answer when the source scores below {threshold}',
    guardrailPersonalData: 'Redact personal data before it reaches the model',

    costModel: 'Model',
    costPlaces: 'Places & Maps',
    costWarehouse: 'BigQuery & Run',

    healthUptime: '30-day uptime',
    healthLastCycle: 'Last overnight cycle',
    healthToolFailures: 'Tool failures, 7 days',
    healthToolFailuresNote: 'all retried successfully',
    healthLastDeploy: 'Last deploy',
    healthLastDeployNote: 'CI green',

    // US-9. Both figures are only valid for branches whose history is complete.
    coverageMedian: 'Median first response',
    coverageWithin: 'Answered within {hours}h',
    coverageHours: '{hours}h',
    coverageNoReplies: 'no replies sent yet',
    coverageCounted: 'across {counted} branches with a complete history',
    coverageExcluded: '{count} branches not counted: {names}',
    coverageExcludedNone: 'every branch counted',
  },

  metric: {
    ratingKicker: 'Network rating',
    ratingNote: 'mean of {count} reviews over 8 weeks',
    unansweredKicker: 'Unanswered',
    unansweredNote: '{held} waiting for your approval',
    repliedKicker: 'Answered automatically',
    repliedNote: 'all 3–5 star, no manual approval',
    attentionKicker: 'Branches needing attention',
    attentionNote: 'of {count} branches · rating below {threshold}',
  },

  mapNote: {
    pairsHeadline: 'Two branches found close together',
    pairsBody:
      '{a} and {b} are only {km} km apart — below the {threshold} km threshold. Some customers move between the two rather than being added. Both catchments have been recalculated.',
    pairsEvidenceKm: '{km} km',
    pairsEvidenceThreshold: '{threshold} km threshold',
    pairsEvidenceCount: '{count} pairs',
    newCompetitorsHeadline: 'New competitors around {outlet}',
    newCompetitorsBody:
      '{count} new competitors have appeared within {radius}. The location score for {outlet} is now {score}, the lowest in the network. Its competitor density factor has fallen to {factor}.',
    evidenceScore: 'score {score}',
    evidenceCompetitors: '{count} competitors',
    evidenceRadius: '{radius} radius',
  },

  ticket: {
    ownerNetwork: 'Ops Excellence',
    ownerExpansion: 'Expansion Team',
    createdByAgent: 'agent',
    surveyTitle: 'Site survey for candidate {candidate}',

    'T-119': { title: 'Audit the drinks shelf restock schedule' },
    'T-121': { title: 'Review motorbike parking capacity at going-home time' },
    'T-118': { title: 'Open a second checkout 17.00–20.00 for 2 weeks' },
    'T-116': { title: 'Replicate the floating-staff pattern from Bogor' },
    'T-120': { title: 'Site survey for candidate Cibubur Junction', impact: 'awaiting budget' },
    'T-114': {
      title: 'Update the SOP for handling queue complaints',
      impact: 'queue complaints down 18% across 5 branches',
    },
    'T-109': {
      title: 'Answer the 63 pending Bogor reviews',
      impact: 'branch rating up 0.2 points',
    },
  },
};
