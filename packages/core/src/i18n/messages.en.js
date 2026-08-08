/**
 * Agent-authored copy, English — written against `messages.id.js`, never the
 * other way round. Where the two disagree in meaning, the Indonesian is right
 * and this file is the bug (design/SCREENS.md).
 *
 * The register matches the Indonesian: plain words, short sentences, nothing a
 * branch manager would have to look up. A technical term survives only where it
 * names a real mechanism, glossed in plain words with the term once in brackets.
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
    mix: 'Businesses nearby',
    competitors: 'Competitor density',
    access: 'Parking availability',
  },

  candidateFactor: {
    traffic: 'Foot traffic',
    mix: 'Businesses nearby',
    competitors: 'Competitors',
    cannibalisation: 'Taking our own customers',
  },

  origin: {
    measured: 'measured',
    surveyed: 'surveyed',
    model: 'estimated',
  },

  ticketStatus: {
    baru: 'New',
    dikerjakan: 'In progress',
    menunggu: 'Waiting',
    selesai: 'Done',
  },

  systemic: {
    reasonSystemic: 'Appears in {count} regions: {regions}.',
    reasonLocal: 'Only {count} regions so far ({regions}); it counts as network-wide at {threshold}.',
    noRegion: 'none',
    headline: '{theme} is every branch’s problem, not one branch’s',
    detail:
      'Appears in {count} of the {total} regions watched. Fixing it branch by branch will not be enough — the agent proposes changing the rule in the central SOP.',
  },

  cannibal: {
    verdictNone: 'No own branch to compare against.',
    verdictFlagged:
      'The nearest own branch {outlet} is only {km} km away — some of its customers would only move across, not be new.',
    verdictClear: 'The nearest own branch {outlet} is {km} km away — no fight over customers.',
  },

  scout: {
    request:
      'Find possible sites for a new branch, at least 1.2 km from our own branches, with high foot traffic.',
    rejectedReason: 'Only {km} km from {outlet} — under the {threshold} km mark.',
    reasoningNoCompetitors: 'No comparable minimarket within {radius} m.',
    reasoningCompetitors: '{count} comparable competitors within {radius} m.',
    reasoningCannibal:
      'The nearest own branch {outlet} is only {km} km away — some of its customers would only move across, not be new.',
    reasoningClear: 'Our nearest branch {outlet} is {km} km away — no fight over customers.',
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
    riskCannibalisation: 'takes our own customers',
    riskMedium: 'moderate risk',
    riskSafe: 'clear',
    rentUnavailable: 'no data for it',
    rentRange: 'Rp {low}–{high}M/mo',
    noFactor: 'no factor',
    none: 'none',
    conclusionCannibal:
      'Too close to {outlet} ({km} km). Part of its takings would come from a branch we already own, so the figures above look better than they are.',
    conclusionBusyCrowded:
      'Busier, but a price war is close to certain. Choose this one only if you are ready to compete on price.',
    conclusionStable:
      'Steadier takings and easier to predict. Choose this one if you are after margin rather than footfall.',
    conclusionMixed:
      'Ahead on {won}; behind on {lost}. The decision depends on the weights you set in Admin.',
  },

  guardrail: {
    summary: 'Safety checks passed {passed}/{total}',
    unsourcedNoClaim: 'No particular claim that would need a source.',
    unsourcedCited: 'The claim is sourced to {pages}.',
    unsourcedFailed: 'The reply states a rule or a figure without a single source.',
    personalDataClean: 'No customer personal data in the reply.',
    personalDataFound: 'The reply contains {found}.',
    toneClean: 'Tone follows the guide: admits the problem, names a clear action, promises nothing wild.',
    toneFound: 'Tone drifts off the guide: {found}.',
    compensationClean: 'No promise of money back.',
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
      defensive: 'getting defensive',
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
      'No passage reached the {threshold} match mark. The closest was only {best}.',
    reasonModelRefused:
      'The model read the passages that cleared the mark and judged that none of them answers this question.',
    confidenceHigh: 'strong match',
    confidenceMedium: 'moderate match',
  },

  draft: {
    tone: 'warm, accountable',
    refusal: 'not in the documents',
    reasonNoPassage: 'No SOP passage cleared the {threshold} mark for the theme "{theme}".',
    reasonNoTheme: 'The complaint could not be identified from the review text.',
  },

  step: {
    reviewsRead: '{count} reviews read',
    themesDetected: '{count} themes detected',
    changePoints: '{count} change points',
    score: 'score {score}',
    passagesKept: '{kept} passages cleared the mark · {rejected} rejected',
    noOutlet: 'no branch named in the question',
    route: 'intent {intent} → {agents}',
  },

  finding: {
    leadingThemeNetwork: 'across the network',
    leadingThemeAt: 'at {outlet}',
    leadingTheme:
      'The most frequent complaint {where} is {theme}: {count} complaints over 8 weeks, {thisWeek} of them this week',
    leadingThemeRising: ', up {delta}× on a month ago.',
    leadingThemeFlat: '.',
    ratingCurrent: 'Running rating {rating}',
    ratingMoved: ', {direction} {points} points over 8 weeks.',
    ratingDown: 'down',
    ratingUp: 'up',
    ratingFlat: '.',
    passage: '{title} p. {page}: “{text}”',
    locationScore:
      'The location score for {outlet} is {score} out of 100. What holds it back most: {factor} at {value}, with {competitors} competitors within {radius} m',
    locationScoreNew: ', {count} of them new.',
    locationScoreFlat: '.',
  },

  supervisor: {
    leadOutlet: 'For {outlet}, here is what the agents found:',
    leadNetwork: 'Here is what the agents found across the network:',
    caveat: 'Note: {reason} This answer does not take that into account yet.',
    refusalTitle: 'Not in the documents.',
    refusalBody:
      'The agents found no source at all to answer this question, so no answer is given. The question has been recorded as a knowledge gap.',
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
    repliesUnanswerable: '· {count} cannot be replied to yet: this account does not manage the Google page',
    locationSkippedTitle: 'The Location Agent did not run',
    locationSkippedDetail:
      'No connection to Places tonight, so branch surroundings were not scanned.',
    locationTitle: 'The Location Agent scanned {count} branch areas',
    locationDetail: '{poi} nearby places · {competitors} new competitors found · {pairs} branches at risk of taking their own customers',
    knowledgeTitle: 'The Knowledge Agent checked the document list',
    knowledgeDetail: 'questions answered {coverage} · {gaps} knowledge gaps reported',
    handoverTitle: 'Briefing handed over',
    handoverClean: 'no step failed tonight',
    handoverFailures: '{count} steps failed · all retried successfully',

    decisionThemeTitle: '{theme} is getting worse at {outlet}',
    decisionThemeBody:
      'Appears in {thisWeek} reviews this week at {outlet}, up {delta}× on a month ago. {total} complaints in total over 8 weeks. The agent proposes acting on the relevant SOP clause for two weeks, then measuring again.',
    decisionSystemicBody: '{detail} Worst branch: {outlet}.',
    decisionGapTitle: 'The SOP does not answer: {question}',
    decisionGapBody:
      '{occurrences} questions this month could not be answered from the documents we have. Only {coverage} of questions get an answer right now. The agent proposes adding a clause to the central SOP that closes this gap.',

    evidenceComplaints: '{count} complaints',
    evidenceRising: 'up {delta}×',
    evidenceRegions: '{count} regions',
    evidenceLocal: 'one region',
    evidenceSystemic: 'network-wide',
    evidenceQuestions: '{count} questions',
    evidenceCoverage: '{coverage} answered',

    actionApproveTicket: 'Approve & raise a ticket',
    actionReview: 'Check it first',
    actionReviewSop: 'See the draft SOP change',
    actionAssignSopOwner: 'Assign to the SOP owner',
    actionReadClause: 'Read the draft clause',

    probeQueue: 'the checkout queue rule during peak hours',
    probeCleanliness: 'the cleanliness standard for the shop floor',
    probeStock: 'how to restock the main shelves',
    probeParking: 'what to do when the car park is full',
    probePrice: 'what to do when a competitor’s price is different',
    probeStaff: 'how to handle a complaint about staff manner',
    probeQueueLimit: 'the queue time limit that must be reported',
  },

  admin: {
    modelReasoning: 'Reasoning',
    modelBulk: 'Bulk summarising',
    modelEndpoint: 'Model address',
    modelRetrieval: 'Document search',
    modelRuntime: 'Where the agents run',
    modelApiRuntime: 'Where the API runs',
    modelSessions: 'Sessions & step records',
    modelSearchIndex: 'Managed search index',
    modelManagedRuntime: 'Managed agent host',
    pathDeterministic: 'Fixed rules, no AI',
    retrievalKeyword: 'Keyword matching · packages/core',
    runtimeSupervisor: 'Supervisor · packages/core',
    runtimeLocal: 'Local Node',
    sessionsInMemory: 'Held in memory',

    guardrailApproval: '1–2 star replies must be approved by a person',
    guardrailCompensation: 'Forbid promises of money back',
    guardrailConfidence: 'Refuse to answer when the source is below {threshold}',
    guardrailPersonalData: 'Strip personal data before it reaches the model',

    costModel: 'Model',
    costPlaces: 'Places & Maps',
    costWarehouse: 'BigQuery & Run',

    healthUptime: '30-day uptime',
    healthLastCycle: 'Last overnight cycle',
    healthToolFailures: 'Failed steps, 7 days',
    healthToolFailuresNote: 'all retried successfully',
    healthLastDeploy: 'Last deploy',
    healthLastDeployNote: 'CI green',

    // US-9. Both figures are only valid for branches whose history is complete.
    coverageMedian: 'First reply time · median',
    coverageWithin: 'Answered within {hours}h',
    coverageHours: '{hours}h',
    coverageNoReplies: 'no replies sent yet',
    coverageCounted: 'across {counted} branches with a complete history',
    coverageExcluded: '{count} branches not counted: {names}',
    coverageExcludedNone: 'every branch counted',
  },

  metric: {
    ratingKicker: 'Network rating',
    ratingNote: 'average of {count} reviews over 8 weeks',
    unansweredKicker: 'Unanswered',
    unansweredNote: '{held} waiting for your approval',
    repliedKicker: 'Answered automatically',
    repliedNote: 'all 3–5 star, no manual approval',
    attentionKicker: 'Branches needing attention',
    attentionNote: 'of {count} branches · rating below {threshold}',
  },

  mapNote: {
    pairsHeadline: 'Two branches sit too close together',
    pairsBody:
      '{a} and {b} are only {km} km apart — under the {threshold} km mark. Some customers only move between the two rather than being new. Both catchment areas have been recalculated.',
    pairsEvidenceKm: '{km} km',
    pairsEvidenceThreshold: '{threshold} km mark',
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
    surveyTitle: 'Site survey for {candidate}',

    'T-119': { title: 'Audit the drinks shelf restock schedule' },
    'T-121': { title: 'Review motorbike parking capacity at going-home time' },
    'T-118': { title: 'Open a second checkout 17.00–20.00 for 2 weeks' },
    'T-116': { title: 'Copy the floating-staff pattern from Bogor' },
    'T-120': { title: 'Site survey for Cibubur Junction', impact: 'awaiting budget' },
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
