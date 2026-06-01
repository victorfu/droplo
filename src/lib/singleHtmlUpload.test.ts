import { describe, expect, it } from 'vitest';
import { createSingleHtmlEntry } from './singleHtmlUpload';

describe('createSingleHtmlEntry', () => {
  it('maps any single .html file name to index.html', () => {
    const file = new File(['<main>Hello</main>'], 'landing-page.html', {
      type: 'text/html',
    });

    expect(createSingleHtmlEntry(file)).toEqual({
      path: 'index.html',
      file,
    });
  });

  it('maps any single .htm file name to index.html', () => {
    const file = new File(['<main>Hello</main>'], 'prototype.htm');

    expect(createSingleHtmlEntry(file)).toEqual({
      path: 'index.html',
      file,
    });
  });

  it('maps a text/html file to index.html even without an html extension', () => {
    const file = new File(['<main>Hello</main>'], 'landing-page', {
      type: 'text/html',
    });

    expect(createSingleHtmlEntry(file)).toEqual({
      path: 'index.html',
      file,
    });
  });

  it('does not map non-HTML files', () => {
    const file = new File(['body { color: red; }'], 'styles.css', {
      type: 'text/css',
    });

    expect(createSingleHtmlEntry(file)).toBeNull();
  });
});
