/**
 * Console copy, English — written against `messages.id.js`, never the other way
 * round. Where the two disagree in meaning the Indonesian is right and this file
 * is the bug (design/SCREENS.md).
 *
 * Conventions, all deliberate:
 *
 *  - Branch, tenant, manager and place names are never translated. "Bekasi
 *    Timur" is a branch; "Nusa Retail" is a company.
 *  - Rupiah stays rupiah, and `Rp` stays `Rp`. The tenant is billed in rupiah.
 *  - Times stay in the Indonesian 24-hour form the operation runs on — "23.00",
 *    "06.00 WIB" — because those are shift times a branch works to, not
 *    formatting.
 *  - Screen titles read as English titles rather than as transliterations:
 *    "Briefing Pagi" is "Morning Briefing", not "Morning Briefing Pagi".
 */
export const en = {
  shell: {
    tagline: 'Local Ops Intelligence',
    screenCount: '14 screens',
    navLabel: 'Screen navigation',
    bottomNavLabel: 'Main navigation',
    kicker: 'Screen {number}',
    runAgent: 'Run agent',
    noTenant: 'No tenant yet',
    pickTenant: 'Choose a tenant on screen 01',
    tenantMeta: '{count} branches · {area}',
    footPrototype: 'Design prototype · sample data',
    footLastCycle: 'Last agent cycle 06.00 WIB',
    languageLabel: 'Console language',
    languageId: 'ID',
    languageEn: 'EN',
    languageIdFull: 'Bahasa Indonesia',
    languageEnFull: 'English',
    themeLabel: 'Console theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeLightFull: 'Light theme',
    themeDarkFull: 'Dark theme',
  },

  bottomNav: {
    briefing: 'Briefing',
    peta: 'Map',
    review: 'Reviews',
    chat: 'Agent',
  },

  role: {
    admin: 'Admin',
    manager: 'Area Manager',
    viewer: 'Viewer',
  },

  phase: {
    P0: 'P0 · Foundation',
    P1: 'P1 · Reputation',
    P2: 'P2 · Knowledge',
    P3: 'P3 · Location',
    P4: 'P4 · Orchestration',
    P5: 'P5 · Hardening',
  },

  screen: {
    masuk: {
      railLabel: 'Sign in',
      title: 'Sign in & choose a tenant',
      subtitle: 'Tenant and role separation is visible from the first screen.',
    },
    briefing: {
      railLabel: 'Morning Briefing',
      title: 'Morning Briefing',
      subtitle: "Last night's agent cycle, filtered down to the decisions you need to make.",
    },
    peta: {
      railLabel: 'Network map',
      title: 'Branch network map',
      subtitle: 'Location scores and reputation health for 42 branches on one surface.',
    },
    cabang: {
      railLabel: 'Branch detail',
      title: 'Branch detail',
      subtitle: 'One branch: rating trend, complaint themes, and its surroundings.',
    },
    review: {
      railLabel: 'Review inbox',
      title: 'Review inbox',
      subtitle: 'Automatic triage: priority, theme, and reply drafts awaiting approval.',
    },
    draft: {
      railLabel: 'AI reply draft',
      title: 'AI reply draft',
      subtitle: 'A reply that follows the SOP, with its sources cited and guardrails checked.',
    },
    tema: {
      railLabel: 'Theme analysis',
      title: 'Theme & sentiment analysis',
      subtitle:
        'Complaint themes × branches over time — separating a local problem from a systemic one.',
    },
    'site-scout': {
      railLabel: 'Site Scout',
      title: 'Site Scout',
      subtitle: 'Candidate sites for a new branch, scored and reasoned by the Location Agent.',
    },
    bandingkan: {
      railLabel: 'Compare sites',
      title: 'Compare sites',
      subtitle: 'Two candidates head to head, factor by factor.',
    },
    chat: {
      railLabel: 'Agent chat',
      title: 'Agent chat',
      subtitle:
        'One question in plain language, answered across three agents — with the execution trace.',
    },
    pengetahuan: {
      railLabel: 'Knowledge centre',
      title: 'Knowledge centre',
      subtitle: 'Documents, index status, and the knowledge gaps that need closing.',
    },
    jawaban: {
      railLabel: 'Cited answer',
      title: 'Cited answer',
      subtitle: 'A branch staff question answered with the SOP page quoted.',
    },
    tindakan: {
      railLabel: 'Action board',
      title: 'Action board',
      subtitle: 'Insights closed out into work that actually got done.',
    },
    admin: {
      railLabel: 'Admin & cost',
      title: 'Admin: models, guardrails, cost',
      subtitle: 'Production-readiness evidence a judge can check rather than take on trust.',
    },
  },

  state: {
    loadingDefault: 'The agent is reading the data…',
    emptyDefault: 'Nothing here yet',
    emptyAction: 'Check now',
    errorDefault: 'The request failed',
    retry: 'Try again',
    viewLog: 'View log',
    permissionDefault: 'Permission needed',
    connect: 'Connect account',
    readOnlyConnect:
      'Your role is read-only. Ask a tenant admin to connect the account.',
  },

  // US-9. What LOKUS is permitted to do with a branch's Google listing.
  listing: {
    thisBranch: 'this branch',
    levelManaged: 'Listing managed',
    levelPublic: 'Public listing',
    levelAbsent: 'No listing',

    publicTitle: 'This account does not manage the listing',
    publicDescription:
      'LOKUS can read {outlet}’s reviews through Places, but cannot reply to them. A reply can only be sent from the account that manages the listing.',
    connect: 'Connect listing',
    ceilingNote:
      'Google shows at most {count} reviews for an unclaimed listing. That is the API ceiling, not this branch’s review count.',

    absentTitle: 'This branch is not on Google Maps',
    absentDescription:
      'There is no listing to read or reply to. Add {outlet} to Google Business Profile first — connecting an account will not make one appear.',

    cannotReply: 'No reply is available for this branch',
    coverageExcluded:
      '{count} branches are not counted: their review history is capped or absent.',
  },

  common: {
    sampleData: 'sample data',
    readOnlyApproveReply:
      'Your role is read-only. Replies are approved by a manager or an admin.',
    readOnlyApproveDecision:
      'Your role is read-only. Decisions are approved by a manager or an admin.',
    ticketFailed: 'The ticket could not be created.',
    ticketCreated: 'Ticket {id} created for {owner}.',
    ticketCreatedWithDue: 'Ticket {id} created · owner {owner} · due {due}.',
    surveyed: ' · surveyed',
    measured: ' · measured',
    fromPlaces: ' · from Places',
    page: 'p. {page}',
    score: 'score {score}',
    stars: '{rating} out of 5 stars',
    passed: 'passed',
    failed: 'failed',
  },

  chart: {
    ratingLabel: 'Weekly mean rating over {weeks} weeks, from {from} to {to}',
    eventLabel: '{day} · {name} opened',
    pointLabel: 'Week {week} · {date} · rating {rating} from {reviews} reviews',
  },

  placeholder: {
    title: 'This screen is not built yet',
    description: '{subtitle} The panels fill in during phase {phase}.',
  },

  masuk: {
    signInBy: 'by EBCO',
    intro: 'Sign in with your work account. Branch access follows your role in the organisation.',
    google: 'Continue with Google Workspace',
    connecting: 'Connecting…',
    or: 'or',
    emailLabel: 'Work email',
    emailPlaceholder: 'name@company.co.id',
    sendLink: 'Send a sign-in link',
    sending: 'Sending…',
    linkSent: 'A sign-in link has been sent to {email}. Check your inbox.',
    signInFailed: 'Sign-in failed. Try again.',
    note: 'Protected by your organisation’s SSO. LOKUS does not store passwords.',

    tenantsKicker: 'After signing in · choose a tenant',
    tenantsLoading: 'Loading your tenants and roles…',
    tenantsEmptyTitle: 'No tenants yet',
    tenantsEmptyDescription:
      'Your account is not linked to any tenant. Ask an organisation admin to add you.',
    tenantsErrorTitle: 'The tenant list could not be loaded',
    tenantsErrorRetry: '{message} This screen does not retry automatically.',
    tenantsErrorFallback: 'The session service is not responding. This screen does not retry automatically.',
    tenantsPermissionTitle: 'This account has not been granted tenant access',
    tenantsPermissionDescription:
      'LOKUS needs a tenant membership before it can show any branches. Contact your organisation admin.',
    tenantOpenFailed: 'That tenant could not be opened.',
    tenantNote:
      'Tenant and role separation is shown from the very first screen — that is real evidence of multi-tenant readiness, not a claim on a slide.',

    rowLabel: 'Open {name}, role {role}',
    rowMeta: '{count} branches · {segment} · role: {role}',
    tagLastOpened: 'Last opened',
    tagTrial: 'Trial · {days} days',
    tagReadOnly: 'Read only',
  },

  briefing: {
    kicker: 'Morning briefing · {date}',
    kickerPlain: 'Morning briefing',
    title: 'Overnight across your network',
    meta: '{start} → {end} · {reviews} reviews read · Rp {cost}',
    loading: 'The agent is assembling last night’s briefing…',
    emptyTitle: 'No briefing yet',
    emptyDescription:
      'The next agent cycle runs tonight at 23.00 and the briefing is ready before 06.00.',
    errorTitle: 'The briefing could not be loaded',
    errorFallback: 'Last night’s cycle is not responding.',
    decisionTag: 'Decision {rank}',
    decisionMeta: '{time} · {agent}',
  },

  peta: {
    layerScore: 'Location score',
    layerReputation: 'Reputation health',
    layerCompetitors: 'Competitor density',
    layersLabel: 'Map layers',

    kicker: 'Network map',
    metaSubset: '{shown} of {declared} branches are in the sample dataset',
    metaAll: '{count} branches',
    metaPoi: '{count} POIs analysed',
    loading: 'The Location Agent is scanning the branch areas…',
    emptyTitle: 'No branches to map yet',
    emptyDescription: 'This tenant has no registered branches.',
    errorTitle: 'The map could not be loaded',
    errorFallback: 'The location service is not responding.',

    legendOutlet: 'Own branch',
    legendCompetitor: 'Competitor',
    legendRadius: '1 km radius',

    scoresKicker: 'Sorted by · lowest score',
    scoresLoading: 'Calculating location scores…',
    scoresEmpty: 'No scores yet',
    scoresError: 'The scores could not be loaded',
    openDetail: 'Open {name} detail',

    noteKicker: 'Location agent note',
    noteLoading: 'The agent is writing up its note…',
    noteEmptyTitle: 'Nothing found',
    noteEmptyDescription: 'No branches sit close together and no new competitors appeared this week.',
    noteError: 'The note could not be loaded',

    factorsKicker: 'Score factors · {name}',

    fieldLabel: 'Map of {outlets} branches and {competitors} competitors',
    competitorTitle: '{name} · opened {date} · {distance} m',
    competitorTitleNoDate: '{name} · {distance} m',
    outletLabel: '{name}, score {score}',
    labelRatingUnavailable: 'rating not available',
    labelRating: 'rating {rating}',
    labelCompetitors: '{count} competitors',
    labelCompetitorsNew: '{count} competitors · {new} new',
    labelScore: 'score {score}',
  },

  radiusMap: {
    label: '{name} with {count} competitors within a {radius} m radius',
    competitorTitle: '{name} · {distance} m · opened {date}',
    competitorTitleNoDate: '{name} · {distance} m',
  },

  sparkline: {
    label: '{weeks}-week trend, latest value {last}',
  },

  cabang: {
    pickerLabel: 'Choose a branch',
    kicker: '{code} · opened {month}',
    kickerPlain: 'Branch',
    loading: 'Gathering the branch data…',
    emptyTitle: 'Branch not found',
    emptyDescription: 'This branch does not exist, or it does not belong to the active tenant.',
    errorTitle: 'The branch detail could not be loaded',
    errorFallback: 'The branch service is not responding.',
    meta: '{address} · Manager: {manager}',

    ratingKicker: 'Rating',
    ratingNote: '{delta} vs the previous {weeks} weeks',
    locationScoreKicker: 'Location score',
    locationScoreNote: 'ranked {rank} of {of}',

    trendKicker: 'Rating, {weeks} weeks',
    trendKickerPlain: 'Rating',
    trendMeta: '{count} reviews · latest week {rating}',
    trendLoading: 'Calculating the weekly means…',
    trendEmpty: 'No reviews to plot yet',
    trendError: 'The chart could not be loaded',
    trendNote:
      '{weeks} weeks is the whole span of reviews that exist — not 12. The larger points are weeks that moved by {threshold} or more.',
    eventOpened: '{name} opened {day}, {distance} m away.',
    eventMoved: 'That week the rating moved {from} → {to} ({delta}).',
    eventNotEnough: 'There were not enough reviews that week to compare.',
    eventCaveat: 'Both happened in the same week; no causal link has been tested.',
    noEvent:
      'No competitor opening was recorded within {radius} m over these {weeks} weeks, so there is no event line to draw.',

    themesKicker: 'Complaint themes · {weeks} weeks',
    themesKickerPlain: 'Complaint themes',
    themesMeta: '{count} classified complaints',
    themesLoading: 'Clustering the complaints…',
    themesEmptyTitle: 'No classified complaints',
    themesEmptyDescription: 'No review of 3 stars or fewer matches any theme.',
    themesError: 'The themes could not be loaded',
    themesNote:
      'The percentages are a share of this branch’s {complaints} complaints, not of all {reviews} reviews.',

    nearbyKicker: 'Around the branch',
    nearbyLoading: 'Scanning the radius…',
    nearbyEmpty: 'No surroundings data yet',
    nearbyError: 'The surroundings map could not be loaded',
    nearbyNote: '{km} km radius · {total} competitors · {fresh} new',

    factorsKicker: 'Location score factors',
    factorsLoading: 'Calculating the factors…',
    factorsEmpty: 'No factors yet',
    factorsError: 'The factors could not be loaded',
    crossSignal:
      '{factor} is the weakest score factor ({value}) and also complaint theme number {rank} ({count} complaints) — two different signals pointing at the same thing.',

    openQueue: 'Open {count} unanswered reviews',
    askAgent: 'Ask the agent about this branch',
  },

  review: {
    bucketNeedsAction: 'Needs action',
    bucketDraftReady: 'Draft ready',
    bucketSent: 'Sent',
    filterLabel: 'Filter reviews',
    listLabel: 'Review list',

    kicker: '{count} {bucket}',
    metaPriority: 'in priority order',
    metaNeedsConnection: '{count} waiting on a listing connection',
    loading: 'The agent is reading the latest reviews…',
    emptyTitle: 'No new reviews',
    emptyDescription:
      'Every review this week has been answered. The agent checks again tonight at 23.00.',
    errorTitle: 'The inbox could not be loaded',
    errorFallback: 'The review service is not responding.',
    hint: '↑ ↓ move · ⏎ approve & next · E edit',

    previewKicker: 'Review · {outlet}',
    previewKickerPlain: 'Review',
    previewLoading: 'Preparing the reply draft…',
    previewEmptyTitle: 'Select a review',
    previewEmptyDescription: 'Its detail and draft will appear here.',
    previewErrorTitle: 'The detail could not be loaded',
    reviewMeta: 'Google · {author} · {relative}',

    sent: 'Already sent',
    approveAndSend: 'Approve & send ⏎',
    editText: 'Edit the text',
    makeTicket: 'Raise a ticket',
    dismiss: 'Dismiss',
    replySent: 'The reply was sent and the approval recorded.',

    demoTag: 'demo',
    reviewMetaDemo: 'Added in the demo · {author} · {relative}',
    addOpen: '+ Add a review (demo)',
    addKicker: 'Add a review · demo',
    addNote:
      'A review written here joins the queue like any other — clustered by theme, drafted a reply, held to the same rules. One difference: it is tagged as demo, because it did not come from Google.',
    addOutletLabel: 'Branch',
    addRatingLabel: 'Stars',
    addAuthorLabel: 'Author name',
    addAuthorPlaceholder: 'Guest',
    addTextLabel: 'Review text',
    addTextPlaceholder: 'Write a complaint or a compliment the way a customer would on Google Maps.',
    addSubmit: 'Add',
    addWorking: 'Adding…',
    addClose: 'Close',
    addReceipt: 'Review {id} joined the queue. Its reply draft is ready.',
    addFailed: 'The review could not be added.',
    replyFailed: 'The reply could not be sent.',
    guardrailNotRun: 'Guardrails have not run yet',
    remaining: '{count} left in this queue',

    draftKicker: 'Reply draft',
    draftTone: 'tone: {tone}',
    draftRefusal: 'Not in the documents.',
    draftRefusalReason: 'The agent found no SOP clause close enough to answer from.',
    draftRefusalNote: 'The question has been recorded as a knowledge gap.',
  },

  draft: {
    checkUnsourced: 'No unsourced claim',
    checkPersonalData: 'No personal data',
    checkTone: 'Tone follows the guide',
    checkCompensation: 'No compensation promised',

    sourceKicker: 'Originating review',
    loading: 'The agent is drafting the reply…',
    emptyTitle: 'No draft waiting',
    emptyDescription:
      'Every review this week has been answered. The agent checks again tonight at 23.00.',
    errorTitle: 'The draft could not be loaded',
    errorFallback: 'The draft service is not responding.',

    reviewMeta: 'Google · {outlet} · {relative}',
    draftTag: 'Reply draft',
    draftTone: 'Gemini · tone: {tone}',
    refusedTag: 'The agent refused to answer',
    refusal: 'Not in the documents.',

    approveAndSend: 'Approve & send',
    sent: 'Already sent',
    editText: 'Edit the text',
    regenerate: 'Ask for another version',
    reject: 'Reject',
    sentReceipt: 'The reply was sent. The approver and the time are on record.',
    sendFailed: 'The reply could not be sent.',
    approvalNote:
      'A reply is never sent automatically. Human approval is required for every 1–2 star review — the rule is set on the Admin screen.',
    backToInbox: '← Back to the inbox',

    sourcesKicker: 'Grounded in',
    sourcesLoading: 'Fetching the SOP passages…',
    sourcesEmpty: 'No sources yet',
    sourcesError: 'The sources could not be loaded',
    noSources: 'This draft rests on no document, so there is nothing to cite.',

    guardrailKicker: 'Guardrail checks',
    guardrailLoading: 'Running the checks…',
    guardrailEmpty: 'Not checked yet',
    guardrailError: 'The checks failed',
  },

  tema: {
    kicker: 'Complaint themes × branches',
    title: 'Theme matrix, last 8 weeks',
    meta: '{reviews} reviews analysed · {sources} citations',
    loading: 'The agent is clustering themes from the review text…',
    emptyTitle: 'No themes detected yet',
    emptyDescription:
      'There are no complaints in this 8-week window. The agent checks again tonight at 23.00.',
    errorTitle: 'The theme analysis could not be loaded',
    errorFallback: 'The analytics service is not responding.',

    caption: 'Complaint review counts per theme and branch over the last eight weeks',
    colTheme: 'Complaint theme',
    colTrend: '8-week trend',
    colSystemic: 'Systemic',
    regions: '{count} regions',
    local: 'local',
    sparklineLabel: '{theme}: 8-week trend, {count} this week',

    findingKicker: 'Agent finding · network priority',
    findingLoading: 'Assessing the spread across regions…',
    findingEmpty: 'No systemic finding',
    findingError: 'The finding could not be loaded',
    findingComplaints: '{count} complaints',
    findingWorst: 'worst: {name}',
    noSystemic: 'No theme reaches 4 regions. Every complaint is still local.',

    sentimentKicker: 'Network sentiment · 8 weeks',
    sentimentLoading: 'Calculating the share of negative reviews…',
    sentimentEmpty: 'No sentiment data yet',
    sentimentError: 'The sentiment could not be loaded',
    sentimentBarLabel: 'Week {week}: {share} negative',
    sentimentNote: 'Share of negative reviews per week · {first} → {last}',

    practiceKicker: 'Good practice detected',
    practiceLoading: 'Looking for a branch to compare against…',
    practiceEmpty: 'No comparison branch yet',
    practiceError: 'The comparison could not be loaded',
    practiceDescription:
      'The branch with the fewest “{theme}” complaints in the network ({count} over 8 weeks). The agent suggests studying how it works so it can be copied to the weakest branch.',
    practiceCaveat:
      'This suggestion rests on comparing complaint counts, not on field interviews — verify before replicating.',
  },

  scout: {
    kicker: 'Request to the Location Agent',
    loading: 'The Location Agent is scoring candidate sites…',
    emptyTitle: 'No candidate passed',
    emptyDescription:
      'Every site considered sits below the 1.2 km distance threshold from an existing branch.',
    errorTitle: 'Site Scout could not be loaded',
    errorFallback: 'The location service is not responding.',

    statPoi: 'POIs analysed',
    statPassed: 'Passed the filter',
    statRecommended: 'Recommended',
    rank: 'Rank {rank}',
    compare: 'Compare',
    raiseSurvey: 'Raise a survey ticket',
    surveyTitle: 'Site survey for candidate {name}',
    ownerExpansion: 'Expansion Team',

    rejectedKicker: 'Rejected by the filter',
    rejectedNote:
      'These sites did not score badly — their scores are good. They were rejected for sitting too close to one of our own branches, so some of their customers would only be moving.',
    foot: 'Competitor density is counted from Places within the radius shown; distance between our own branches comes from geographic calculation. Foot traffic and category mix are still survey inputs — marked as such on every row. All four factor weights can be changed in Admin.',
  },

  compare: {
    kicker: 'Compare candidates',
    meta: '{count} factors',
    loading: 'The Location Agent is comparing the candidates…',
    emptyTitle: 'No candidates to compare yet',
    emptyDescription: 'Pick two candidates from Site Scout.',
    emptyAction: 'Open Site Scout',
    errorTitle: 'The comparison could not be loaded',
    errorFallback: 'The location service is not responding.',

    caption: 'Comparison of {a} and {b}, factor by factor',
    colFactor: 'Factor',
    colA: 'Candidate A · recommended',
    colB: 'Candidate B',
    conclusion: 'Agent conclusion',

    raiseSurvey: 'Request a survey of {name}',
    swap: 'Change candidates',
    askAgent: 'Ask the agent: “what if the target is volume?”',
    footMeasured: 'measured',
    footSurveyed: 'Surveyed',
    footModel: 'Modelled',
    foot: 'Rows marked {measured} are calculated from Places and geographic distance. {surveyed} comes from field data we do not fully hold yet. {model} is an estimate: visits/day ≈ traffic score × {perPoint}, divided by 1 + competitors × {weight}, with a ±{band} band. A modelled figure is not a measurement.',
  },

  chat: {
    intro:
      'Ask anything about a branch, a review, or the SOP. Every answer carries its execution trace, its sources, and its cost.',
    answerLabel: 'Agent answer',
    agents: 'Supervisor → {agents}',
    answerMeta: '{steps} steps · {seconds} s · Rp {cost}',
    noSources: 'No source supports this answer, so the agent refused to give one.',
    working: 'The agent is working on “{question}”…',
    failed: 'The agent did not answer.',
    inputLabel: 'Question for the agent',
    inputPlaceholder: 'Ask anything about a branch, a review, a site, or the SOP…',
    send: 'Send',
    actionsLabel: 'Actions for this answer',
    ticketOwnerFallback: 'the ops team',

    traceLabel: 'Execution trace',
    traceKicker: 'Full execution trace',
    traceMeta: 'run {id}',
    traceEmptyTitle: 'No trace yet',
    traceEmptyDescription: 'Ask one question; every agent step will be recorded here.',
    traceResults: '{count} results',
    openTrace: 'Open the full trace in Cloud Trace →',
    ticketCreatedWithDue: 'Ticket {id} created for {owner} · due {due}.',

    costKicker: 'Cost of this conversation',
    costEmptyTitle: 'No cost yet',
    costEmptyDescription: 'Cost is counted per answer.',
    costNote:
      '{answers} answers · {steps} tool steps. The tenant’s hard budget ceiling is set on the Admin screen.',

    suggestion1: 'Summarise this week’s complaints',
    suggestion2: 'Why did the Bekasi Timur rating fall this month?',
    suggestion3: 'What does the SOP say about refunds?',
  },

  kb: {
    indexIndexed: 'Indexed',
    indexProcessing: 'Processing',
    indexAwaitingReview: 'Awaiting review',
    indexExcluded: 'Excluded',
    indexQueued: 'Queued',

    metricDocsKicker: 'Documents indexed',
    metricDocsNote: '{chunks} chunks · from {documents} documents',
    metricCoverageKicker: 'Answer coverage',
    metricCoverageNote: '{answered} of {probed} themes staff ask about',
    metricUnansweredKicker: 'Unanswered questions',
    metricUnansweredNote: '{count} gaps after clustering',
    metricEmbeddingKicker: 'Embedding model',
    metricEmbeddingNote: '{dimensions} dim · {chunkTokens}-token chunks · {overlapTokens} overlap',

    docsKicker: 'Documents',
    docsLoading: 'Reading the document index…',
    docsEmptyTitle: 'No documents yet',
    docsEmptyDescription: 'Upload your first SOP to begin.',
    docsErrorTitle: 'The index could not be loaded',
    docsErrorFallback: 'The knowledge service is not responding.',

    colDocument: 'Document',
    colType: 'Type',
    colPages: 'Pages',
    colChunks: 'Chunks',
    colIndexState: 'Index state',
    colUpdated: 'Updated',
    docsNote:
      'Only documents marked {indexed} can be cited by an agent. Drafts awaiting review and excluded documents never appear in an answer.',

    gapsKicker: 'Knowledge gaps',
    gapsLoading: 'Clustering the unanswered questions…',
    gapsEmptyTitle: 'No gaps recorded yet',
    gapsEmptyDescription:
      'Every time the agent refuses to answer, the question appears here with a proposed clause.',
    gapsError: 'The gaps could not be loaded',
    gapDescription:
      '{occurrences} questions from {people} people could not be answered from the existing documents.',
    gapPeopleUnknown: 'several',
    clauseKicker: 'Proposed clause · draft',
    clauseKickerForeign: 'Proposed clause · draft (Indonesian, for the SOP)',
    sendToOwner: 'Send to the SOP owner',
    editClause: 'Edit the draft',
    clauseSent: 'The draft clause for "{theme}" was sent to the SOP owner.',
    noClause: 'No clause proposed yet — this question has only come up once.',
    clauseNote:
      'The clause above is {draft}, not a rule already in force. Nothing enters the SOP without its owner’s approval.',
    clauseNoteEmphasis: 'a draft for a human to review',

    uploadKicker: 'Upload a document',
    dropzone: 'Drop a .txt or .md file here, or paste its text below',
    dropzoneNote: 'chunked at {chunkTokens} tokens with {overlapTokens} overlap',
    uploadDropActive: 'Release to read the file',
    uploadTitleLabel: 'Document title',
    uploadTitlePlaceholder: 'Counter Service SOP v5',
    uploadTextLabel: 'Document text',
    uploadTextPlaceholder:
      'Paste the SOP text here. One clause per paragraph reads best to the search.',
    uploadSubmit: 'Index document',
    uploadWorking: 'Indexing…',
    uploadReceipt:
      '“{title}” indexed — {chunks} chunks, {pages} pages. The agents can cite it now.',
    uploadReceiptRestricted:
      '“{title}” stored as {chunks} chunks but not indexed. No agent will cite it until it is reviewed.',
    uploadUnsupported:
      'This console can only read text files (.txt or .md). For a PDF, paste its text into the box below.',
    uploadFailed: 'The document could not be indexed.',
    uploadReadOnly: 'Your role is read-only. Adding a document is done by a manager or an admin.',
    reset: 'Restore the sample data',
    resetDone: 'Back to the sample data. Every document and review added this session is gone.',
    restrictLabel: 'Restrict to the Admin role',
    restrictNote:
      'A restricted document is still stored but is not indexed for general answers.',
    seeExample: 'See a worked cited answer →',
  },

  answer: {
    defaultQuestion:
      'A customer wants a refund on an opened promotional item. Is that allowed, and on what conditions?',
    askedByChannel: 'via WhatsApp',
    questionMeta: '{name} · {outlet} · {channel}',

    kickerAnswered: 'Knowledge Agent answer',
    kicker: 'Knowledge Agent',
    meta: '{sources} sources · {confidence} · {origin}',
    originGenerated: 'written by {model}, passed the citation check',
    originQuoted: 'quoted verbatim from the SOP',
    loading: 'The agent is looking for the relevant clause…',
    emptyTitle: 'No question yet',
    errorTitle: 'The answer could not be loaded',
    errorFallback: 'The knowledge service is not responding.',

    sendWhatsApp: 'Send to {name} on WhatsApp',
    saveFaq: 'Save as an FAQ',
    wrongAnswer: 'This answer is wrong',
    refusedNote:
      'The question has been recorded as a knowledge gap. No answer was invented.',
    seeGaps: 'See the knowledge gaps →',

    inputLabel: 'Branch staff question',
    inputPlaceholder: 'Ask anything the SOP covers…',
    ask: 'Ask',
    foot: 'The agent refuses to answer when the source similarity score falls below {threshold} — in that case it says “not in the documents” and records the question as a knowledge gap. No answer is ever invented.',

    sourcesKicker: 'Sources',
    sourcesLoading: 'Fetching the passages…',
    sourcesEmpty: 'No sources yet',
    sourcesError: 'The sources could not be loaded',
    openPage: 'Open page {page} →',
    rejectedNote: 'Chunks considered but not used: {count} · all below the {threshold} threshold.',
    noSources:
      'No passage cleared the threshold, so there is no source to show. {count} chunks were considered and all were rejected.',
  },

  board: {
    filterAll: 'All',
    filterFromAgent: 'From an agent',
    filterMine: 'Mine',
    filterLabel: 'Filter tickets',

    stats: 'Mean time to close a ticket: {average} · SLA {sla} days',
    statsNone: 'no ticket closed yet',
    statsDays: '{days} days',

    kicker: 'Action board',
    loading: 'Loading tickets from agent insights…',
    emptyTitle: 'No tickets yet',
    emptyDescription:
      'Approve a decision on the Morning Briefing or an answer in Agent chat, and its ticket appears here.',
    emptyAction: 'Open the Morning Briefing',
    errorTitle: 'The board could not be loaded',
    errorFallback: 'The ticket service is not responding.',

    noOwner: 'no owner yet',
    closedIn: 'closed in {days} days',
    dueAt: 'due {date}',
    source: 'from {source} · {id}',
    sourceBriefing: 'a briefing decision',
    sourceAgent: 'an agent answer',
    foot: 'Every ticket keeps a link to the insight that produced it and records its impact once closed. That is what lets LOKUS prove its value with numbers rather than with stories.',
  },

  admin: {
    modelsKicker: 'Models & infrastructure',
    modelsLoading: 'Reading the runtime configuration…',
    modelsEmpty: 'Configuration unavailable',
    modelsError: 'The configuration could not be loaded',
    modelsNote:
      'Models are chosen per task rather than one model for everything — Flash for bulk work, the reasoning model only for diagnosis.',

    guardrailsKicker: 'Guardrails & human control',
    guardrailsLoading: 'Reading the guardrail policy…',
    guardrailsEmpty: 'No guardrails yet',
    guardrailsError: 'The guardrails could not be loaded',
    enforcedIn: 'enforced in {file}',
    on: 'on',
    off: 'off',
    thresholdNote:
      'Minimum confidence threshold: {threshold} — below it the agent answers “not in the documents”.',

    costKicker: 'Cost per tenant · this month',
    costLoading: 'Calculating budget usage…',
    costEmpty: 'No cost recorded yet',
    costError: 'The cost could not be loaded',
    costNote:
      '{used}% of the {ceiling} hard ceiling. Above {degrade}%, the agents drop to Flash mode and send an alert.',

    coverageKicker: 'Response measurement coverage',
    coverageLoading: 'Computing measurement coverage…',
    coverageEmpty: 'Nothing to measure yet',
    coverageError: 'The coverage figures could not be loaded',
    coverageNote:
      'Both figures above are computed only over branches with a complete review history. A public listing shows five reviews Google picked, and a branch with no listing shows none — including either would make these numbers look better than what was measured.',

    evalKicker: 'Agent evaluation',
    evalTitle: 'Golden set results',
    evalMeta: '{cases} cases · run on every deploy',
    evalLoading: 'Reading the evaluation report…',
    evalEmpty: 'No evaluation results yet',
    evalError: 'The evaluation results could not be loaded',
    colMetric: 'Metric',
    colScore: 'Score',
    colThreshold: 'Threshold',
    colStatus: 'Status',
    evalNote: 'Report generated {at} by {runner}. CI blocks the merge if a single threshold fails.',

    healthKicker: 'Operational health',
    healthLoading: 'Reading the operational status…',
    healthEmpty: 'No operational data yet',
    healthError: 'The status could not be loaded',
    errorFallback: 'The admin service is not responding.',
  },

  error: {
    TENANT_FORBIDDEN: 'Your account has no membership in this tenant.',
    ROLE_FORBIDDEN: 'Your role is not allowed to do this.',
    AUTH_TENANT_CLAIM_MISSING: 'Your token does not carry a tenant claim yet.',
    AUTH_TOKEN_MISSING: 'You are not signed in.',
    TENANT_REQUIRED: 'This request does not name a tenant.',
    PERMISSION_REQUIRED: 'LOKUS has not been granted the permission it needs.',
    NOT_IMPLEMENTED: 'This part is not connected yet.',
    ALREADY_APPROVED: 'This decision has already been approved and is already a ticket.',
    APPROVER_REQUIRED: 'An approval must name who approved it.',
    DECISION_REQUIRED: 'That decision was not recognised.',
    SOURCE_REQUIRED: 'A ticket must link back to the insight it came from.',
    TITLE_REQUIRED: 'A ticket must have a title.',
    NOT_FOUND: 'The requested record was not found for this tenant.',
    OUTLET_NOT_FOUND: 'That branch was not found for this tenant.',
    CANDIDATE_NOT_FOUND: 'That candidate was not found to compare.',
    SAME_CANDIDATE: 'Choose two different candidates.',
    BUDGET_EXCEEDED: 'This tenant’s budget for the month is spent.',
    BUCKET_INVALID: 'That review filter is not recognised.',
    QUESTION_REQUIRED: 'Write the question first.',
    INTERNAL: 'Something went wrong on the server.',
  },
};
