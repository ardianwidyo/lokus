import { describe, expect, it } from 'vitest';

import { normaliseBase, stripBase, withBase } from '../src/app/basePath.js';

/**
 * GitHub Pages serves a project site from /<repo>/, Cloud Run serves from the
 * domain root. These are the only two shapes that matter, and getting the
 * second one wrong is invisible in development — where the base is always "/"
 * — and breaks every link in production.
 */
describe('base path', () => {
  describe('normaliseBase', () => {
    it('treats the domain root as no prefix at all', () => {
      expect(normaliseBase('/')).toBe('');
      expect(normaliseBase('')).toBe('');
      expect(normaliseBase(undefined)).toBe('');
    });

    it('drops the trailing slash so paths concatenate cleanly', () => {
      expect(normaliseBase('/lokus/')).toBe('/lokus');
      expect(normaliseBase('/lokus')).toBe('/lokus');
    });
  });

  describe('stripBase', () => {
    it('is the identity at the domain root', () => {
      expect(stripBase('/briefing', '')).toBe('/briefing');
    });

    it('removes the mount point so screens.js paths still match', () => {
      expect(stripBase('/lokus/briefing', '/lokus')).toBe('/briefing');
    });

    it('maps the bare mount point to the root, not to an empty string', () => {
      // "" matches no screen, so the router would fall through to the default
      // for a URL that is really the app's own front door.
      expect(stripBase('/lokus', '/lokus')).toBe('/');
      expect(stripBase('/lokus/', '/lokus')).toBe('/');
    });

    it('leaves a path that does not start with the base alone', () => {
      expect(stripBase('/other/briefing', '/lokus')).toBe('/other/briefing');
    });
  });

  describe('withBase', () => {
    it('is the identity at the domain root', () => {
      expect(withBase('/briefing', '')).toBe('/briefing');
    });

    it('prefixes the mount point for the address bar', () => {
      expect(withBase('/briefing', '/lokus')).toBe('/lokus/briefing');
    });

    it('round-trips with stripBase for every screen path', async () => {
      const { SCREENS } = await import('../src/app/screens.js');

      for (const screen of SCREENS) {
        expect(stripBase(withBase(screen.path, '/lokus'), '/lokus')).toBe(screen.path);
      }
    });
  });
});
