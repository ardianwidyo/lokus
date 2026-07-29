import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom implements no layout, so scrollIntoView is missing. The list uses it to
// keep the keyboard selection visible; stubbing it keeps that real behaviour
// out of the way of assertions rather than removing it from the component.
Element.prototype.scrollIntoView ??= () => {};

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});
