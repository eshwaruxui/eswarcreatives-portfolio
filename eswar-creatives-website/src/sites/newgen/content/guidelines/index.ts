// NEWGEN brand guideline content, extracted from the v0.1 print copy
// (docs/Claude outputs). One item per rule; ids are the book's decimal
// addresses and never change. The schema mirrors the portal guidelines
// module so the same data can later feed a portal lens without rework.
//
// Deliberate divergences from the print copy (see the build 1 prompt doc):
// ruby settled at #B01F2F on 11 Sep 2026, the 0.4 ruby row records it,
// 9.1 carries the v0.1-web edition row, 0.2 and 0.3 are live navigation.

import rulesData from './rules.json';
import navData from './nav.json';
import symbolsData from './symbols.json';

export type GuidelineRule = {
  id: string; // decimal address, "2-7"; "A-1" for the annexe
  part: string; // "02"; "0A" for the annexe
  title: string; // sentence case, from the book
  summary?: string | null;
  content_type: 'document' | 'image' | 'link';
  body: string; // sanitised book HTML for this rule
  status: 'published';
  visibility: 'public'; // everything in v1 is public, ISCL annexe included
  tags: string[];
  sort_order: number;
  version: string; // "0.1-web.1"
  provisional?: string | null; // provisional tag text, when the book carries one
};

export type GuidelinePart = {
  num: string; // "00".."09", "A"
  label: string;
  color: string;
};

export type GuidelineTask = {
  task: string;
  refs: string; // as printed, "A.3 to A.5"
  ids: string[]; // resolved rule ids
};

export const guidelineRules = rulesData as GuidelineRule[];

export const guidelineParts = (navData as { parts: GuidelinePart[] }).parts;

export const taskIndex = (navData as { taskIndex: GuidelineTask[] }).taskIndex;

export const contentsIntro = (navData as { contentsIntro: string }).contentsIntro;
export const findItFastIntro = (navData as { findItFastIntro: string }).findItFastIntro;

// The mark / lockup / wordmark <symbol> defs from the book, injected once
// per page so <use href="#mark"> resolves inside rule bodies.
export const brandSymbolsHtml = (symbolsData as { html: string }).html;

export function rulesForPart(partNum: string): GuidelineRule[] {
  const part = partNum === 'A' ? '0A' : partNum;
  return guidelineRules.filter((r) => r.part === part);
}

/** "2-7" renders as "2.7" wherever an address is shown. */
export function addressOf(rule: Pick<GuidelineRule, 'id'>): string {
  return rule.id.replace('-', '.');
}
