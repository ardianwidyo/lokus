/**
 * Console copy, English — written against `messages.id.js`, never the other way
 * round. Where the two disagree in meaning the Indonesian is right and this file
 * is the bug (design/SCREENS.md).
 *
 * The register matches the Indonesian: everyday words, short sentences, active
 * voice. A technical term appears only where it names a real feature, and then
 * it is glossed in plain words with the term once in brackets — "safety checks
 * (guardrails)" — so a reader understands it and a reviewer can still trace it.
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
    navLabel: 'Switch screen',
    bottomNavLabel: 'Main menu',
    kicker: 'Screen {number}',
    runAgent: 'Run agent',
    noTenant: 'No company chosen yet',
    pickTenant: 'Choose a company on screen 01',
    tenantMeta: '{count} branches · {area}',
    footPrototype: 'Design prototype · sample data',
    footLastCycle: 'Agents last worked 06.00 WIB',
    languageLabel: 'Display language',
    languageId: 'ID',
    languageEn: 'EN',
    languageIdFull: 'Bahasa Indonesia',
    languageEnFull: 'English',
    themeLabel: 'Display colours',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeLightFull: 'Light display',
    themeDarkFull: 'Dark display',
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
      title: 'Sign in & choose a company',
      subtitle: 'Every company keeps its own data, and your role decides what opens.',
    },
    briefing: {
      railLabel: 'Morning Briefing',
      title: 'Morning Briefing',
      subtitle: "Last night's agent work, boiled down to the decisions you need to make.",
    },
    peta: {
      railLabel: 'Network map',
      title: 'Branch network map',
      subtitle: 'Location scores and reputation health for 42 branches on one screen.',
    },
    cabang: {
      railLabel: 'Branch detail',
      title: 'Branch detail',
      subtitle: 'One branch: how the rating moved, which complaints keep coming, and what sits nearby.',
    },
    review: {
      railLabel: 'Review inbox',
      title: 'Review inbox',
      subtitle: 'Reviews sorted for you: what is urgent, what the complaint is, and the reply drafts waiting on you.',
    },
    draft: {
      railLabel: 'AI reply draft',
      title: 'AI reply draft',
      subtitle: 'A reply that follows the SOP, with its sources and its safety checks shown.',
    },
    tema: {
      railLabel: 'Theme analysis',
      title: 'Theme & sentiment analysis',
      subtitle:
        'Complaints per branch week by week — telling one branch’s problem apart from every branch’s problem.',
    },
    'site-scout': {
      railLabel: 'Site Scout',
      title: 'Site Scout',
      subtitle: 'Possible sites for a new branch, scored and reasoned by the Location Agent.',
    },
    bandingkan: {
      railLabel: 'Compare sites',
      title: 'Compare sites',
      subtitle: 'Two possible sites head to head, one factor at a time.',
    },
    chat: {
      railLabel: 'Agent chat',
      title: 'Agent chat',
      subtitle:
        'Ask in plain words, get an answer from three agents at once — with the steps they took.',
    },
    pengetahuan: {
      railLabel: 'Knowledge centre',
      title: 'Knowledge centre',
      subtitle: 'Documents, how far they have been read, and the questions the SOP does not answer.',
    },
    jawaban: {
      railLabel: 'Sourced answer',
      title: 'Sourced answer',
      subtitle: 'A branch staff question answered, with the SOP page it came from.',
    },
    tindakan: {
      railLabel: 'Action board',
      title: 'Action board',
      subtitle: 'Agent findings turned into work that actually got finished.',
    },
    admin: {
      railLabel: 'Admin & cost',
      title: 'Admin: models, safety checks, cost',
      subtitle: 'Readiness evidence you can check yourself, not just a claim.',
    },
  },

  state: {
    loadingDefault: 'The agent is reading the data…',
    emptyDefault: 'Nothing here yet',
    emptyAction: 'Check now',
    errorDefault: 'Could not fetch the data',
    retry: 'Try again',
    viewLog: 'View the error log',
    permissionDefault: 'Permission needed',
    connect: 'Connect account',
    readOnlyConnect:
      'Your role can only look. Ask a company admin to connect the account.',
  },

  // US-9. What LOKUS is permitted to do with a branch's Google listing.
  listing: {
    thisBranch: 'this branch',
    levelManaged: 'Google page managed',
    levelPublic: 'Google page public',
    levelAbsent: 'Not on Google yet',

    publicTitle: 'This account does not manage this branch’s Google page',
    publicDescription:
      'LOKUS can read {outlet}’s reviews through Places, but cannot reply to them. A reply can only be sent from the account that holds the branch’s Google page (its listing).',
    connect: 'Connect the Google page',
    ceilingNote:
      'For a page nobody has claimed, Google shows at most {count} reviews. That is Google’s limit, not this branch’s review count.',

    absentTitle: 'This branch is not on Google Maps',
    absentDescription:
      'There is nothing to read and nothing to reply to. Add {outlet} to Google Business Profile first — connecting an account will not make one appear.',

    cannotReply: 'This branch cannot be replied to yet',
    coverageExcluded:
      '{count} branches are not counted: their review history is capped or absent.',
  },

  common: {
    sampleData: 'sample data',
    readOnlyApproveReply:
      'Your role can only look. Replies are approved by a manager or an admin.',
    readOnlyApproveDecision:
      'Your role can only look. Decisions are approved by a manager or an admin.',
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
    ratingLabel: 'Average rating each week over {weeks} weeks, from {from} to {to}',
    eventLabel: '{day} · {name} opened',
    pointLabel: 'Week {week} · {date} · rating {rating} from {reviews} reviews',
  },

  placeholder: {
    title: 'This screen is not built yet',
    description: '{subtitle} Its contents arrive in phase {phase}.',
  },

  masuk: {
    signInBy: 'by EBCO',
    intro: 'Sign in with your work account. Which branches open depends on your role at work.',
    google: 'Continue with Google Workspace',
    connecting: 'Connecting…',
    or: 'or',
    emailLabel: 'Work email',
    emailPlaceholder: 'name@company.co.id',
    sendLink: 'Send a sign-in link',
    sending: 'Sending…',
    linkSent: 'A sign-in link has been sent to {email}. Check your inbox.',
    signInFailed: 'Sign-in failed. Try again.',
    note: 'You sign in through your work account (SSO). LOKUS does not store your password.',

    tenantsKicker: 'After signing in · choose a company',
    tenantsLoading: 'Fetching your companies and roles…',
    tenantsEmptyTitle: 'No companies yet',
    tenantsEmptyDescription:
      'Your account is not linked to any company. Ask an admin at work to add you.',
    tenantsErrorTitle: 'The company list could not be fetched',
    tenantsErrorRetry: '{message} This screen does not retry on its own.',
    tenantsErrorFallback: 'The session service is not responding. This screen does not retry on its own.',
    tenantsPermissionTitle: 'This account has not been given access to any company',
    tenantsPermissionDescription:
      'LOKUS needs you listed under a company before it can show any branches. Contact an admin at work.',
    tenantOpenFailed: 'That company could not be opened.',
    tenantNote:
      'Each company’s data is kept apart (one tenant each), and your role decides what opens — visible from the very first screen, not just promised on a slide.',

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
    emptyDescription:
      'The agents work again tonight at 23.00, and the briefing is ready before 06.00.',
    emptyTitle: 'No briefing yet',
    errorTitle: 'The briefing could not be shown',
    errorFallback: 'Last night’s results could not be fetched.',
    decisionTag: 'Decision {rank}',
    decisionMeta: '{time} · {agent}',
  },

  peta: {
    layerScore: 'Location score',
    layerReputation: 'Reputation health',
    layerCompetitors: 'Competitor density',
    layersLabel: 'Map layers',

    kicker: 'Network map',
    metaSubset: '{shown} of {declared} branches are in the sample data',
    metaAll: '{count} branches',
    metaPoi: '{count} nearby places checked',
    loading: 'The Location Agent is scanning the branch areas…',
    emptyTitle: 'No branches to map yet',
    emptyDescription: 'This company has no registered branches.',
    errorTitle: 'The map could not be shown',
    errorFallback: 'The location service is not responding.',

    legendOutlet: 'Own branch',
    legendCompetitor: 'Competitor',
    legendRadius: '1 km radius',

    scoresKicker: 'Lowest score first',
    scoresLoading: 'Calculating location scores…',
    scoresEmpty: 'No scores yet',
    scoresError: 'The scores could not be shown',
    openDetail: 'Open {name} detail',

    noteKicker: 'Location agent note',
    noteLoading: 'The agent is writing up its note…',
    noteEmptyTitle: 'Nothing found',
    noteEmptyDescription: 'No branches sit too close together, and no new competitors appeared this week.',
    noteError: 'The note could not be shown',

    factorsKicker: 'Score factors · {name}',

    fieldLabel: 'Map of {outlets} branches and {competitors} competitors',
    competitorTitle: '{name} · opened {date} · {distance} m',
    competitorTitleNoDate: '{name} · {distance} m',
    outletLabel: '{name}, score {score}',
    labelRatingUnavailable: 'no rating yet',
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
    label: '{weeks}-week trend, latest figure {last}',
  },

  cabang: {
    pickerLabel: 'Choose a branch',
    kicker: '{code} · opened {month}',
    kickerPlain: 'Branch',
    loading: 'Gathering the branch data…',
    emptyTitle: 'Branch not found',
    emptyDescription: 'This branch does not exist, or it does not belong to the company you have open.',
    errorTitle: 'The branch detail could not be shown',
    errorFallback: 'The branch service is not responding.',
    meta: '{address} · Manager: {manager}',

    ratingKicker: 'Rating',
    ratingNote: '{delta} against the previous {weeks} weeks',
    locationScoreKicker: 'Location score',
    locationScoreNote: 'ranked {rank} of {of}',

    trendKicker: 'Rating, {weeks} weeks',
    trendKickerPlain: 'Rating',
    trendMeta: '{count} reviews · latest week {rating}',
    trendLoading: 'Calculating the weekly averages…',
    trendEmpty: 'No reviews to plot yet',
    trendError: 'The chart could not be shown',
    trendNote:
      'These {weeks} weeks are every review there is — not 12. The bigger points mark weeks that moved by {threshold} or more.',
    eventOpened: '{name} opened {day}, {distance} m away.',
    eventMoved: 'That week the rating moved {from} → {to} ({delta}).',
    eventNotEnough: 'There were too few reviews that week to compare.',
    eventCaveat: 'Both happened in the same week. One need not have caused the other — that has not been tested.',
    noEvent:
      'No competitor was recorded opening within {radius} m over these {weeks} weeks, so there is no event line to draw.',

    themesKicker: 'Complaint themes · {weeks} weeks',
    themesKickerPlain: 'Complaint themes',
    themesMeta: '{count} complaints grouped',
    themesLoading: 'Grouping the complaints…',
    themesEmptyTitle: 'No complaints grouped yet',
    themesEmptyDescription: 'No review of 3 stars or fewer matches any theme.',
    themesError: 'The themes could not be shown',
    themesNote:
      'The percentages come from this branch’s {complaints} complaints, not from all {reviews} reviews.',

    nearbyKicker: 'Around the branch',
    nearbyLoading: 'Scanning the radius…',
    nearbyEmpty: 'No surroundings data yet',
    nearbyError: 'The surroundings map could not be shown',
    nearbyNote: '{km} km radius · {total} competitors · {fresh} new',

    factorsKicker: 'Location score factors',
    factorsLoading: 'Calculating the factors…',
    factorsEmpty: 'No factors yet',
    factorsError: 'The factors could not be shown',
    crossSignal:
      '{factor} is the weakest score factor ({value}) and also complaint number {rank} ({count} complaints) — two different things pointing at the same problem.',

    openQueue: 'See {count} reviews that have no reply',
    askAgent: 'Ask the agent about this branch',
  },

  review: {
    bucketNeedsAction: 'Needs action',
    bucketDraftReady: 'Draft ready',
    bucketSent: 'Sent',
    bucketAdded: 'Added (demo)',
    filterLabel: 'Filter reviews',
    listLabel: 'Review list',

    kicker: '{count} {bucket}',
    metaPriority: 'most urgent first',
    metaNeedsConnection: '{count} waiting on a Google page connection',
    loading: 'The agent is reading the latest reviews…',
    emptyTitle: 'No new reviews',
    emptyDescription:
      'Every review this week has a reply. The agent checks again tonight at 23.00.',
    addedEmptyTitle: 'You have not added a review yet',
    addedEmptyDescription:
      'This section holds only the reviews you wrote yourself this session. Use [+ Add a review (demo)] below the list to hand the agents something they have never seen.',
    errorTitle: 'The inbox could not be shown',
    errorFallback: 'The review service is not responding.',
    hint: '↑ ↓ move · ⏎ approve & next · E edit',

    previewKicker: 'Review · {outlet}',
    previewKickerPlain: 'Review',
    previewLoading: 'Preparing the reply draft…',
    previewEmptyTitle: 'Select a review',
    previewEmptyDescription: 'Its detail and reply draft appear here.',
    previewErrorTitle: 'The detail could not be shown',
    reviewMeta: 'Google · {author} · {relative}',

    sent: 'Already sent',
    approveAndSend: 'Approve & send ⏎',
    editText: 'Edit the text',
    makeTicket: 'Raise a ticket',
    dismiss: 'Dismiss',
    replySent: 'The reply was sent, and your approval is on record.',

    demoTag: 'demo',
    reviewMetaDemo: 'Added in the demo · {author} · {relative}',
    addOpen: '+ Add a review (demo)',
    addKicker: 'Add a review · demo',
    addNote:
      'A review you write here joins the queue like any other — grouped by theme, given a reply draft, held to the same rules. One difference: it carries a demo tag, because it did not come from Google.',
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
    guardrailNotRun: 'Safety checks have not run yet',
    remaining: '{count} left in this queue',

    draftKicker: 'Reply draft',
    draftTone: 'tone: {tone}',
    draftRefusal: 'Not in the documents.',
    draftRefusalReason: 'The agent found no SOP clause close enough to answer from.',
    draftRefusalNote: 'The question has been recorded as a knowledge gap.',
  },

  draft: {
    checkUnsourced: 'No claim without a source',
    checkPersonalData: 'No personal data',
    checkTone: 'Tone follows the guide',
    checkCompensation: 'No compensation promised',

    sourceKicker: 'The review it answers',
    loading: 'The agent is drafting the reply…',
    emptyTitle: 'No draft waiting',
    emptyDescription:
      'Every review this week has a reply. The agent checks again tonight at 23.00.',
    errorTitle: 'The draft could not be shown',
    errorFallback: 'The draft service is not responding.',

    reviewMeta: 'Google · {outlet} · {relative}',
    draftTag: 'Reply draft',
    draftTone: 'Gemini · tone: {tone}',
    refusedTag: 'The agent chose not to answer',
    refusal: 'Not in the documents.',

    approveAndSend: 'Approve & send',
    sent: 'Already sent',
    editText: 'Edit the text',
    regenerate: 'Ask for another version',
    reject: 'Reject',
    sentReceipt: 'The reply was sent. Who approved it and when are on record.',
    sendFailed: 'The reply could not be sent.',
    approvalNote:
      'A reply is never sent automatically. A 1–2 star review must be approved by a person first — the rule is set on the Admin screen.',
    backToInbox: '← Back to the inbox',

    sourcesKicker: 'Taken from',
    sourcesLoading: 'Fetching the SOP passages…',
    sourcesEmpty: 'No sources yet',
    sourcesError: 'The sources could not be shown',
    noSources: 'This draft takes nothing from any document, so there is nothing to quote.',

    guardrailKicker: 'Safety checks',
    guardrailLoading: 'Running the checks…',
    guardrailEmpty: 'Not checked yet',
    guardrailError: 'The checks failed',
  },

  tema: {
    kicker: 'Complaint themes × branches',
    title: 'Theme matrix, last 8 weeks',
    meta: '{reviews} reviews read · {sources} sources quoted',
    loading: 'The agent is grouping themes from the review text…',
    emptyTitle: 'No themes detected yet',
    emptyDescription:
      'There are no complaints in the last 8 weeks. The agent checks again tonight at 23.00.',
    errorTitle: 'The theme analysis could not be shown',
    errorFallback: 'The analytics service is not responding.',

    caption: 'Complaint review counts per theme and branch over the last eight weeks',
    colTheme: 'Complaint theme',
    colTrend: '8-week trend',
    colSystemic: 'Network-wide',
    regions: '{count} regions',
    local: 'one region',
    sparklineLabel: '{theme}: 8-week trend, {count} this week',

    findingKicker: 'Agent finding · network priority',
    findingLoading: 'Assessing the spread across regions…',
    findingEmpty: 'No network-wide problem',
    findingError: 'The finding could not be shown',
    findingComplaints: '{count} complaints',
    findingWorst: 'worst: {name}',
    noSystemic: 'No complaint reaches 4 regions. Each one is still a single branch’s problem.',

    sentimentKicker: 'Network sentiment · 8 weeks',
    sentimentLoading: 'Calculating the share of negative reviews…',
    sentimentEmpty: 'No sentiment data yet',
    sentimentError: 'The sentiment could not be shown',
    sentimentBarLabel: 'Week {week}: {share} negative',
    sentimentNote: 'Share of negative reviews each week · {first} → {last}',

    practiceKicker: 'Good practice detected',
    practiceLoading: 'Looking for a branch to compare against…',
    practiceEmpty: 'No comparison branch yet',
    practiceError: 'The comparison could not be shown',
    practiceDescription:
      'The branch with the fewest “{theme}” complaints in the network ({count} over 8 weeks). The agent suggests studying how it works, then copying that to the weakest branch.',
    practiceCaveat:
      'This suggestion only compares complaint counts; nobody went out to look — check before copying it.',
  },

  scout: {
    kicker: 'Request to the Location Agent',
    loading: 'The Location Agent is scoring possible sites…',
    emptyTitle: 'No site passed',
    emptyDescription:
      'Every site looked at sits less than 1.2 km from a branch we already have.',
    errorTitle: 'Site Scout could not be shown',
    errorFallback: 'The location service is not responding.',

    statPoi: 'Nearby places checked',
    statPassed: 'Passed the filter',
    statRecommended: 'Recommended',
    rank: 'Rank {rank}',
    compare: 'Compare',
    raiseSurvey: 'Raise a survey ticket',
    surveyTitle: 'Site survey for {name}',
    ownerExpansion: 'Expansion Team',

    rejectedKicker: 'Rejected by the filter',
    rejectedNote:
      'These sites are not bad — their scores are good. They were rejected for sitting too close to one of our own branches, so some of their customers would only be moving, not new.',
    foot: 'Competitor density is counted from Places data within the radius shown; the distance between our own branches comes from map calculation. Foot traffic and the mix of businesses nearby still come from surveys — marked on every row. You can change all four factor weights in Admin.',
  },

  compare: {
    kicker: 'Compare possible sites',
    meta: '{count} factors',
    loading: 'The Location Agent is comparing the sites…',
    emptyTitle: 'No sites to compare yet',
    emptyDescription: 'Pick two sites from Site Scout.',
    emptyAction: 'Open Site Scout',
    errorTitle: 'The comparison could not be shown',
    errorFallback: 'The location service is not responding.',

    caption: 'Comparison of {a} and {b}, factor by factor',
    colFactor: 'Factor',
    colA: 'Site A · recommended',
    colB: 'Site B',
    conclusion: 'Agent conclusion',

    raiseSurvey: 'Request a survey of {name}',
    swap: 'Change sites',
    askAgent: 'Ask the agent: “what if we chase volume?”',
    footMeasured: 'measured',
    footSurveyed: 'Surveyed',
    footModel: 'Estimated',
    foot: 'Rows marked {measured} are worked out from Places data and real distance. {surveyed} comes from field surveys whose data we do not fully hold. {model} is a rough calculation: visits/day ≈ traffic score × {perPoint}, divided by 1 + competitors × {weight}, give or take {band}. An estimate is not a measurement.',
  },

  chat: {
    intro:
      'Ask anything about a branch, a review, or the SOP. Every answer comes with the steps taken, the sources, and the cost.',
    answerLabel: 'Agent answer',
    agents: 'Supervisor → {agents}',
    answerMeta: '{steps} steps · {seconds} s · Rp {cost}',
    noSources: 'No source supports this answer, so the agent chose not to give one.',
    working: 'The agent is working on “{question}”…',
    failed: 'The agent did not answer.',
    inputLabel: 'Question for the agent',
    inputPlaceholder: 'Ask anything about a branch, a review, a site, or the SOP…',
    send: 'Send',
    actionsLabel: 'Actions for this answer',
    ticketOwnerFallback: 'the ops team',

    traceLabel: 'Steps the agent took',
    traceKicker: 'Steps the agent took, in full',
    traceMeta: 'run {id}',
    traceEmptyTitle: 'No steps recorded yet',
    traceEmptyDescription: 'Ask one question; every step the agent takes is recorded here.',
    traceResults: '{count} results',
    openTrace: 'Open the full record in Cloud Trace →',
    ticketCreatedWithDue: 'Ticket {id} created for {owner} · due {due}.',

    costKicker: 'Cost of this conversation',
    costEmptyTitle: 'No cost yet',
    costEmptyDescription: 'Cost is counted per answer.',
    costNote:
      '{answers} answers · {steps} steps. Each company’s spending cap is set on the Admin screen.',

    suggestion1: 'Summarise this week’s complaints',
    suggestion2: 'Why did the Bekasi Timur rating fall this month?',
    suggestion3: 'What does the SOP say about refunds?',
  },

  kb: {
    indexIndexed: 'Read',
    indexProcessing: 'Being processed',
    indexAwaitingReview: 'Waiting to be reviewed',
    indexExcluded: 'Not in use',
    indexQueued: 'Queued',

    metricDocsKicker: 'Documents read',
    metricDocsNote: '{chunks} chunks · from {documents} documents',
    metricCoverageKicker: 'Questions answered',
    metricCoverageNote: '{answered} of {probed} things staff usually ask',
    metricUnansweredKicker: 'Unanswered questions',
    metricUnansweredNote: '{count} gaps after grouping',
    metricEmbeddingKicker: 'Document-reading model (embedding)',
    metricEmbeddingNote: '{dimensions} dimensions · cut every {chunkTokens} tokens · {overlapTokens} overlap',

    docsKicker: 'Documents',
    docsLoading: 'Reading the document list…',
    docsEmptyTitle: 'No documents yet',
    docsEmptyDescription: 'Upload your first SOP to begin.',
    docsErrorTitle: 'The document list could not be shown',
    docsErrorFallback: 'The knowledge service is not responding.',

    colDocument: 'Document',
    colType: 'Type',
    colPages: 'Pages',
    colChunks: 'Chunks',
    colIndexState: 'Status',
    colUpdated: 'Updated',
    docsNote:
      'Only documents marked {indexed} may be quoted by an agent. Drafts waiting to be reviewed and documents not in use never appear in an answer.',
    demoTag: 'demo',

    docContentKicker: 'Document contents · {title}',
    docContentKickerPlain: 'Document contents',
    docContentChunks: '{count} chunks read',
    docContentMeta: '{type} · {pages} pages · updated {updated}',
    docContentLoading: 'Fetching the document chunks…',
    docContentEmptyTitle: 'No document opened yet',
    docContentEmptyDescription:
      'Press a document name in the table to see the chunks actually read from it — not the file you uploaded, but what the agents read.',
    docContentErrorTitle: 'The document contents could not be shown',
    docContentErrorFallback: 'The knowledge service is not responding.',
    docContentNoChunks:
      'This document is listed but produced no chunks, so there is nothing in it to quote.',
    docContentNotRetrievable:
      'The chunks below are stored but are not in the search yet. No agent will quote them until the status changes.',
    chunkMeta: 'p. {page} · {tokens} tokens',
    docRestrictedTitle: 'This document’s contents are restricted',
    docRestrictedDescription:
      '“{title}” is marked for Admins only, so its contents are not shown here. The row stays so you know the document exists and can ask an admin for it.',

    gapsKicker: 'Knowledge gaps',
    gapsLoading: 'Grouping the unanswered questions…',
    gapsEmptyTitle: 'No gaps recorded yet',
    gapsEmptyDescription:
      'Every time an agent cannot answer, the question appears here with a proposed clause.',
    gapsError: 'The gaps could not be shown',
    gapDescription:
      '{occurrences} questions from {people} people could not be answered from the documents we have.',
    gapPeopleUnknown: 'several',
    clauseKicker: 'Proposed clause · draft',
    clauseKickerForeign: 'Proposed clause · draft (Indonesian, for the SOP)',
    sendToOwner: 'Send to the SOP owner',
    editClause: 'Edit the draft',
    clauseSent: 'The draft clause for "{theme}" was sent to the SOP owner.',
    noClause: 'No clause proposed yet — this question has only come up once.',
    clauseNote:
      'The clause above is still {draft}, not a rule already in force. Nothing enters the SOP without its owner’s approval.',
    clauseNoteEmphasis: 'a draft for a person to review',

    uploadKicker: 'Upload a document',
    dropzone: 'Drop a .txt or .md file here, or paste its text below',
    dropzoneNote: 'cut every {chunkTokens} tokens, {overlapTokens} overlap',
    uploadDropActive: 'Release to read the file',
    uploadTitleLabel: 'Document title',
    uploadTitlePlaceholder: 'Counter Service SOP v5',
    uploadTextLabel: 'Document text',
    uploadTextPlaceholder:
      'Paste the SOP text here. One clause per paragraph is the easiest to search.',
    uploadSubmit: 'Process document',
    uploadWorking: 'Processing…',
    uploadReceipt:
      '“{title}” has been read — {chunks} chunks, {pages} pages. The agents can quote it now.',
    uploadReceiptRestricted:
      '“{title}” stored as {chunks} chunks but not in the search yet. No agent will quote it until it is reviewed.',
    uploadUnsupported:
      'This console can only read text files (.txt or .md). For a PDF, copy its text into the box below.',
    uploadFailed: 'The document could not be processed.',
    uploadReadOnly: 'Your role can only look. Adding a document is done by a manager or an admin.',
    reset: 'Restore the sample data',
    resetDone: 'Back to the sample data. Every document and review added this session is gone.',
    restrictLabel: 'Restrict to Admins only',
    restrictNote:
      'A restricted document is still stored, but it is not used to answer general questions.',
    seeExample: 'See a worked sourced answer →',
  },

  answer: {
    defaultQuestion:
      'A customer wants a refund on an opened promotional item. Is that allowed, and on what conditions?',
    askedByChannel: 'via WhatsApp',
    questionMeta: '{name} · {outlet} · {channel}',

    kickerAnswered: 'Knowledge Agent answer',
    kicker: 'Knowledge Agent',
    meta: '{sources} sources · {confidence} · {origin}',
    originGenerated: 'written by {model}, its sources checked',
    originQuoted: 'quoted word for word from the SOP',
    loading: 'The agent is looking for a clause that fits…',
    emptyTitle: 'No question yet',
    errorTitle: 'The answer could not be shown',
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
    foot: 'If the source match falls below {threshold}, the agent chooses not to answer: it says “not in the documents” and records the question as a knowledge gap. No answer is ever invented.',

    sourcesKicker: 'Sources',
    sourcesLoading: 'Fetching the passages…',
    sourcesEmpty: 'No sources yet',
    sourcesError: 'The sources could not be shown',
    openPage: 'Open page {page} →',
    rejectedNote: 'Chunks looked at but not used: {count} · all below the {threshold} mark.',
    noSources:
      'No passage cleared the match mark, so there is no source to show. {count} chunks were looked at and all were rejected.',
  },

  board: {
    filterAll: 'All',
    filterFromAgent: 'From an agent',
    filterMine: 'Mine',
    filterLabel: 'Filter tickets',

    stats: 'Average time to finish a ticket: {average} · target {sla} days',
    statsNone: 'no ticket finished yet',
    statsDays: '{days} days',

    kicker: 'Action board',
    loading: 'Fetching tickets from agent findings…',
    emptyTitle: 'No tickets yet',
    emptyDescription:
      'Approve a decision on the Morning Briefing or an answer in Agent chat, and its ticket appears here.',
    emptyAction: 'Open the Morning Briefing',
    errorTitle: 'The board could not be shown',
    errorFallback: 'The ticket service is not responding.',

    noOwner: 'no owner yet',
    closedIn: 'finished in {days} days',
    dueAt: 'due {date}',
    source: 'from {source} · {id}',
    sourceBriefing: 'a briefing decision',
    sourceAgent: 'an agent answer',
    foot: 'Every ticket keeps a link to the finding that set it off, and records the result once it closes. That is what lets LOKUS prove its worth with numbers rather than stories.',
  },

  admin: {
    modelsKicker: 'Models & infrastructure',
    modelsLoading: 'Reading the running configuration…',
    modelsEmpty: 'Configuration unavailable',
    modelsError: 'The configuration could not be shown',
    notConnected: 'not connected',

    reasoningKicker: 'How the agent thinks',
    reasoningLoading: 'Reading the available options…',
    reasoningEmpty: 'Not available in sample mode',
    reasoningEmptyBody:
      'This console runs everything in the browser, so there is no server holding credentials to choose between. Run it through the API if you want to change this.',
    reasoningError: 'How the agent thinks could not be read',
    reasoningForbidden: 'Only an Admin may see this',
    reasoningFailed: 'The option could not be changed',
    reasoningLocked:
      'Locked on this process. Set LOKUS_REASONING_SWITCHABLE=true to open it — this choice applies to the whole process, not per company.',
    reasoningMutable:
      'Takes effect from the next question, no restart needed. This choice applies to the whole process, not per company.',
    pathUnavailable: 'not set up',
    path: {
      deterministic: 'Fixed rules (deterministic)',
      vertex: 'Vertex AI',
      apikey: 'API key (AI Studio)',
    },
    modelsNote:
      'Read from the running process, not from a fixed list. Models are chosen to fit the job — Flash for bulk work, the reasoning model only for diagnosis. Rows marked [not connected] are in the design but no code calls them yet.',

    guardrailsKicker: 'Safety checks & human control',
    guardrailsLoading: 'Reading the safety rules…',
    guardrailsEmpty: 'No safety checks yet',
    guardrailsError: 'The safety checks could not be shown',
    enforcedIn: 'set in {file}',
    on: 'on',
    off: 'off',
    thresholdNote:
      'Minimum source match: {threshold}. Below that the agent answers “not in the documents”.',

    costKicker: 'Cost per company · this month',
    costLoading: 'Calculating budget usage…',
    costEmpty: 'No cost recorded yet',
    costError: 'The cost could not be shown',
    costNote:
      '{used}% of the {ceiling} cap. Past {degrade}%, the agents move to the cheaper model (Flash) and send an alert.',

    coverageKicker: 'Response measurement coverage',
    coverageLoading: 'Computing measurement coverage…',
    coverageEmpty: 'Nothing to measure yet',
    coverageError: 'The coverage figures could not be shown',
    coverageNote:
      'Both figures above count only branches whose review history is complete. A public Google page shows five reviews Google picked, and a branch with no Google page shows none — counting either would make these numbers look better than they really are.',

    evalKicker: 'Agent evaluation',
    evalTitle: 'Golden set results',
    evalMeta: '{cases} cases · run on every deploy',
    evalLoading: 'Reading the evaluation report…',
    evalEmpty: 'No evaluation results yet',
    evalError: 'The evaluation results could not be shown',
    colMetric: 'What is measured',
    colScore: 'Score',
    colThreshold: 'Minimum',
    colStatus: 'Status',
    evalNote: 'Report produced {at} by {runner}. If a single minimum is missed, the code does not ship.',

    healthKicker: 'Operational health',
    healthLoading: 'Reading the operational status…',
    healthEmpty: 'No operational data yet',
    healthError: 'The status could not be shown',
    errorFallback: 'The admin service is not responding.',
  },

  error: {
    TENANT_FORBIDDEN: 'Your account is not listed under this company.',
    ROLE_FORBIDDEN: 'Your role is not allowed to do this.',
    AUTH_TENANT_CLAIM_MISSING: 'Your session does not say which company. Try signing in again.',
    AUTH_TOKEN_MISSING: 'You are not signed in.',
    TENANT_REQUIRED: 'This request does not say which company.',
    PERMISSION_REQUIRED: 'LOKUS has not been granted the permission it needs.',
    NOT_IMPLEMENTED: 'This part is not connected yet.',
    ALREADY_APPROVED: 'This decision has already been approved and is already a ticket.',
    APPROVER_REQUIRED: 'An approval must say who approved it.',
    DECISION_REQUIRED: 'That decision was not recognised.',
    SOURCE_REQUIRED: 'A ticket must link back to the finding it came from.',
    TITLE_REQUIRED: 'A ticket must have a title.',
    NOT_FOUND: 'The record you asked for is not in this company.',
    OUTLET_NOT_FOUND: 'That branch is not in this company.',
    CANDIDATE_NOT_FOUND: 'That site was not found to compare.',
    SAME_CANDIDATE: 'Choose two different sites.',
    BUDGET_EXCEEDED: 'This company’s budget for the month is spent.',
    BUCKET_INVALID: 'That review filter is not recognised.',
    QUESTION_REQUIRED: 'Write the question first.',
    INTERNAL: 'Something went wrong on the server.',
  },
};
