export { DEMO_NOW, TREND_WEEKS, relativeLabel, weekIndexOf, weekStart } from './domain/clock.js';
export { OUTLETS, findOutlet, outletsForTenant, regionCount } from './domain/outlets.js';
export { THEMES, THEME_IDS, findTheme, themeLabel } from './domain/themes.js';

export { GBP_TOOL_NAMES, GbpError, createGoogleGbpAdapter, createSeededGbpAdapter } from './adapters/gbp.js';

export { COMPLAINT_MATRIX, TARGET_RATING, generateReviews } from './seed/reviews.js';

export { isGrounded, toolResult } from './lib/toolResult.js';
export { TenantScopeError, assertTenant, scopeToTenant } from './lib/tenantScope.js';
