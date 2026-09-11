import { useState, useRef, useEffect, useCallback, type DragEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getBrowserFingerprint } from '../../lib/fingerprint'
import { landingImages } from '../../lib/landingImages'
import { usePersistence } from '../../store/PersistenceContext'
import { addDemoListing } from '../../lib/demoStore'
import { saveAppraisalResult } from '../../lib/appraisalSession'
import { colors as c, fonts as f } from '../../lib/tokens'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ACCEPT_IMAGES = 'image/jpeg,image/png,image/heic,image/webp'
const FILE_INPUT_ID = 'ti-file-input'

type ApiUsageState = {
  used: number
  limit: number
  remaining: number
  is_limited: boolean
}

type SampleKey = 'chair' | 'camera' | 'sneakers' | 'record'

type SampleData = {
  title: string
  category: string
  name: string
  sub: string
  match: number
  low: number
  high: number
  median: number
  ask: number
  conf: number
  label: string
  n: number
  time: number
  attrs: string[]
  comps: [string, string][]
}

const SAMPLES: Record<SampleKey, SampleData> = {
  chair: {
    title: 'Walnut lounge chair & ottoman',
    category: 'Furniture',
    name: 'Walnut <em>lounge chair</em>',
    sub: 'Herman Miller · c. 1963 · 94% match',
    match: 94,
    low: 2850,
    high: 3420,
    median: 3120,
    ask: 2950,
    conf: 87,
    label: 'High',
    n: 142,
    time: 2.4,
    attrs: ['Mid-century', 'Walnut veneer', 'Aniline leather', 'Authenticated'],
    comps: [
      ['$3,200', 'eBay'],
      ['$2,950', 'Chairish'],
      ['$3,420', '1stDibs'],
      ['$2,890', 'Mercari'],
    ],
  },
  camera: {
    title: 'Leica M6 rangefinder',
    category: 'Electronics',
    name: 'Leica <em>M6</em> rangefinder',
    sub: 'Black paint · 1988 · 96% match',
    match: 96,
    low: 3600,
    high: 4250,
    median: 3940,
    ask: 3850,
    conf: 91,
    label: 'High',
    n: 88,
    time: 1.9,
    attrs: ['35mm', 'Black paint', 'M-mount', 'Collector grade'],
    comps: [
      ['$4,100', 'eBay'],
      ['$3,800', 'KEH'],
      ['$4,250', 'Leica'],
      ['$3,750', 'Mercari'],
    ],
  },
  sneakers: {
    title: 'Air Jordan 1 Chicago',
    category: 'Sneakers',
    name: 'Air Jordan 1 <em>Chicago</em>',
    sub: '2015 retro · size 10.5 · 98% match',
    match: 98,
    low: 620,
    high: 840,
    median: 730,
    ask: 690,
    conf: 82,
    label: 'High',
    n: 214,
    time: 1.4,
    attrs: ['Size 10.5', 'OG colorway', 'Deadstock', 'Authenticated'],
    comps: [
      ['$760', 'StockX'],
      ['$690', 'GOAT'],
      ['$840', 'eBay'],
      ['$620', 'Grailed'],
    ],
  },
  record: {
    title: 'Kind of Blue — first press',
    category: 'Collectibles',
    name: '<em>Kind of Blue</em> LP',
    sub: 'Columbia 1959 · 1st press · 89% match',
    match: 89,
    low: 1200,
    high: 1450,
    median: 1320,
    ask: 1280,
    conf: 76,
    label: 'Medium',
    n: 38,
    time: 2.1,
    attrs: ['6-eye label', 'Mono', 'VG+', 'First press'],
    comps: [
      ['$1,400', 'Discogs'],
      ['$1,250', 'eBay'],
      ['$1,450', 'Popsike'],
      ['$1,200', 'Reverb'],
    ],
  },
}

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair']

const DEMO_SEQUENCE_MS = [200, 600, 1400, 200]

const css = `
  .ti-root * { box-sizing: border-box; }
  .ti-root {
    background: ${c.parchment};
    padding: 140px 0;
    font-family: ${f.sans};
  }
  .ti-container {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 48px;
  }
  .ti-head {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: end;
    margin-bottom: 32px;
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.8s cubic-bezier(0.23, 1, 0.32, 1), transform 0.8s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .ti-head.vis { opacity: 1; transform: none; }
  .ti-eyebrow {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-weight: 400;
    color: ${c.bark};
    margin: 0 0 0 0;
  }
  .ti-headline {
    font-family: ${f.serif};
    font-weight: 300;
    line-height: 1.08;
    letter-spacing: -0.01em;
    color: ${c.ink};
    margin: 20px 0 0;
    font-size: clamp(38px, 4.4vw, 60px);
    text-wrap: balance;
  }
  .ti-headline em { font-style: italic; color: ${c.terracotta}; font-weight: 400; }
  .ti-lede {
    font-family: ${f.sans};
    font-weight: 300;
    font-size: 17px;
    line-height: 1.55;
    color: ${c.sage};
    max-width: 52ch;
    margin: 0;
    text-wrap: pretty;
  }
  /* usage meter */
  .ti-usage {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
    margin-bottom: 16px;
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.75s cubic-bezier(0.23, 1, 0.32, 1) 0.05s, transform 0.75s cubic-bezier(0.23, 1, 0.32, 1) 0.05s;
  }
  .ti-usage.vis { opacity: 1; transform: none; }
  .ti-usage .u-lab {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${c.bark};
  }
  .ti-usage .u-lab b { color: ${c.terracotta}; font-weight: 500; }
  .ti-usage .u-meter { flex: 1; min-width: 160px; max-width: 320px; }
  .ti-usage .u-track { height: 4px; background: ${c.mist}; position: relative; overflow: hidden; }
  .ti-usage .u-track i {
    position: absolute;
    inset: 0;
    background: ${c.forest};
    transform-origin: left center;
    transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .ti-app {
    background: ${c.chalk};
    border: 0.5px solid ${c.mist};
    display: grid;
    grid-template-columns: 1fr 1.3fr;
    min-height: 520px;
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.75s cubic-bezier(0.23, 1, 0.32, 1) 0.1s, transform 0.75s cubic-bezier(0.23, 1, 0.32, 1) 0.1s;
  }
  .ti-app.vis { opacity: 1; transform: none; }
  .ti-left {
    padding: 40px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    border-right: 0.5px solid ${c.mist};
  }
  .ti-dropzone {
    border: 0.75px dashed ${c.bark};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.16s cubic-bezier(0.23, 1, 0.32, 1);
    padding: 36px 20px;
    background: ${c.parchment};
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.bark};
  }
  @media (hover: hover) and (pointer: fine) {
    .ti-dropzone:hover { border-color: ${c.terracotta}; color: ${c.terracotta}; background: #F4EEE3; }
    .ti-dropzone:hover .g { transform: rotate(90deg); }
    .ti-dropzone--limited:hover { border-color: ${c.bark}; color: ${c.bark}; background: transparent; }
    .ti-dropzone--limited:hover .g { transform: none; }
  }
  .ti-dropzone:active { transform: scale(0.98); }
  .ti-dropzone:focus-visible { outline: 2px solid ${c.terracotta}; outline-offset: 2px; }
  .ti-dropzone--limited { opacity: 0.55; cursor: not-allowed; }
  .ti-dropzone--limited:active { transform: none; }
  .ti-dropzone .g {
    font-family: ${f.serif};
    font-size: 48px;
    color: ${c.terracotta};
    font-weight: 300;
    line-height: 1;
    transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .ti-upload-hint {
    font-family: ${f.mono};
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: ${c.sage};
    margin-top: 4px;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    transition: color 0.15s ease;
  }
  .ti-upload-hint:hover { color: ${c.terracotta}; }
  .ti-upload-hint[disabled] { opacity: 0.45; cursor: not-allowed; text-decoration: none; }
  .ti-samples { display: flex; flex-direction: column; gap: 8px; }
  .ti-samples .ti-sample-eyebrow {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.bark};
    margin: 0 0 6px;
  }
  .ti-sample {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    border: 0.5px solid ${c.mist};
    cursor: pointer;
    transition: border-color 0.18s ease, background 0.18s ease, transform 0.16s cubic-bezier(0.23, 1, 0.32, 1);
    background: ${c.chalk};
    text-align: left;
  }
  @media (hover: hover) and (pointer: fine) {
    .ti-sample:hover { border-color: ${c.terracotta}; background: #FFF8F1; transform: translateX(3px); }
    .ti-sample:hover .sm-thumb img { transform: scale(1.06); }
  }
  .ti-sample:active { transform: scale(0.97); }
  .ti-sample.active { border-color: ${c.terracotta}; background: #FFF8F1; }
  .ti-sample .sm-thumb {
    width: 44px;
    height: 44px;
    background: ${c.parchment};
    flex: 0 0 44px;
    border: 0.5px solid ${c.mist};
    overflow: hidden;
  }
  .ti-sample .sm-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .ti-sample .sm-name { font-family: ${f.serif}; font-size: 15px; color: ${c.ink}; }
  .ti-sample .sm-type {
    font-family: ${f.mono};
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${c.bark};
    margin-top: 2px;
  }
  .ti-right {
    padding: 40px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    background: linear-gradient(180deg, ${c.chalk}, #FBF6EA);
    position: relative;
    overflow: hidden;
    min-height: 320px;
  }
  @keyframes ti-panel-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: none; }
  }
  .ti-empty {
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    gap: 18px;
    animation: ti-panel-in 0.4s cubic-bezier(0.23, 1, 0.32, 1) both;
  }
  .ti-empty .e-dash {
    font-family: ${f.serif};
    font-size: 48px;
    color: ${c.mist};
    font-weight: 300;
  }
  .ti-empty .e-title {
    font-family: ${f.serif};
    font-size: 26px;
    color: ${c.sage};
    font-weight: 300;
    font-style: italic;
  }
  .ti-empty .e-sub {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.2em;
    color: ${c.bark};
    text-transform: uppercase;
  }
  .ti-loading {
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 24px;
    padding: 20px 0;
  }
  .ti-loading .step-row {
    display: grid;
    grid-template-columns: 20px 1fr auto;
    align-items: center;
    gap: 14px;
    font-family: ${f.mono};
    font-size: 11px;
    letter-spacing: 0.14em;
    color: ${c.sage};
    text-transform: uppercase;
    animation: ti-panel-in 0.45s cubic-bezier(0.23, 1, 0.32, 1) both;
  }
  .ti-loading .step-row:nth-child(2) { animation-delay: 60ms; }
  .ti-loading .step-row:nth-child(3) { animation-delay: 120ms; }
  .ti-loading .step-row:nth-child(4) { animation-delay: 180ms; }
  .ti-loading .step-row .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${c.mist};
    border: 0.5px solid ${c.mist};
    transition: background 0.25s ease, border-color 0.25s ease;
  }
  .ti-loading .step-row.done .dot { background: ${c.terracotta}; border-color: ${c.terracotta}; }
  .ti-loading .step-row.active .dot {
    background: ${c.chalk};
    border: 1px solid ${c.terracotta};
    animation: ti-pulse 1.2s infinite;
  }
  .ti-loading .step-row .label { transition: color 0.25s ease; }
  .ti-loading .step-row.done .label,
  .ti-loading .step-row.active .label { color: ${c.ink}; }
  .ti-loading .step-row .t { font-size: 10px; color: ${c.bark}; }
  @keyframes ti-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.4); } }
  .ti-result { display: flex; flex-direction: column; gap: 18px; flex: 1; }
  .ti-result > * { animation: ti-panel-in 0.5s cubic-bezier(0.23, 1, 0.32, 1) both; }
  .ti-result > *:nth-child(2) { animation-delay: 70ms; }
  .ti-result > *:nth-child(3) { animation-delay: 140ms; }
  .ti-result > *:nth-child(4) { animation-delay: 210ms; }
  .ti-result > *:nth-child(5) { animation-delay: 280ms; }
  .ti-result > *:nth-child(6) { animation-delay: 350ms; }
  /* These re-mount on click — respond instantly instead of inheriting the reveal stagger */
  .ti-result > .ti-list-form,
  .ti-result > .ti-list-done {
    animation-delay: 0ms;
    animation-duration: 0.25s;
  }
  .ti-result .ident { display: flex; gap: 18px; align-items: flex-start; }
  .ti-result .ident-photo {
    width: 108px;
    height: 108px;
    flex: 0 0 108px;
    object-fit: cover;
    border: 0.5px solid ${c.mist};
    background: ${c.parchment};
  }
  .ti-result .ident-main { flex: 1; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .ti-result .ident-t { font-family: ${f.serif}; font-size: 24px; font-weight: 400; color: ${c.ink}; }
  .ti-result .ident-t em { color: ${c.terracotta}; font-style: italic; }
  .ti-result .ident-sub {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.bark};
    margin-top: 6px;
  }
  .ti-result .match-pct { font-family: ${f.serif}; font-size: 16px; color: ${c.forest}; white-space: nowrap; }
  .ti-conf-label {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.bark};
    margin-bottom: 8px;
  }
  .ti-big-price {
    font-family: ${f.serif};
    font-size: 56px;
    font-weight: 300;
    line-height: 1;
    letter-spacing: -0.02em;
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .ti-big-price .low { color: ${c.ink}; }
  .ti-big-price .sep { color: ${c.mist}; font-size: 32px; }
  .ti-big-price .high { color: ${c.terracotta}; font-style: italic; }
  .ti-conf-card { padding-top: 0; }
  .ti-conf-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 10px;
  }
  .ti-conf-val {
    font-family: ${f.serif};
    font-size: 22px;
    font-weight: 400;
    color: ${c.forest};
  }
  .ti-conf-val em { color: ${c.terracotta}; font-style: italic; }
  .ti-conf-bar {
    position: relative;
    height: 4px;
    background: ${c.mist};
    overflow: hidden;
  }
  .ti-conf-bar-fill {
    position: absolute;
    inset: 0;
    background: ${c.terracotta};
    transform: scaleX(var(--conf, 0));
    transform-origin: left center;
    transition: transform 1s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .ti-conf-ticks {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-family: ${f.mono};
    font-size: 9px;
    color: ${c.bark};
    letter-spacing: 0.14em;
  }
  /* comparables */
  .ti-comps .comps-head {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${c.bark};
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
  }
  .ti-comps .comps-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .ti-comps .comp { border: 0.5px solid ${c.mist}; padding: 10px; background: ${c.chalk}; }
  .ti-comps .comp .p { font-family: ${f.serif}; font-size: 17px; color: ${c.ink}; }
  .ti-comps .comp .m {
    font-family: ${f.mono};
    font-size: 8px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${c.sage};
    margin-top: 4px;
    display: flex;
    justify-content: space-between;
  }
  .ti-comps .comp .m .sold { color: ${c.forestSoft}; }
  .ti-result-meta {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    font-family: ${f.mono};
    font-size: 10px;
    color: ${c.bark};
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding-top: 8px;
    border-top: 0.5px solid ${c.mist};
  }
  /* actions + list flow */
  .ti-actions { margin-top: auto; padding-top: 16px; display: flex; gap: 12px; flex-wrap: wrap; }
  .ti-btn-primary {
    font-family: ${f.mono};
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 14px 22px;
    background: ${c.forest};
    color: ${c.chalk};
    border: 0;
    cursor: pointer;
    transition: background 0.18s ease, transform 0.16s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .ti-btn-primary:hover { background: ${c.terracotta}; }
  .ti-btn-primary:active { transform: scale(0.97); }
  .ti-btn-ghost {
    font-family: ${f.mono};
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 14px 22px;
    background: transparent;
    color: ${c.forest};
    border: 0.5px solid ${c.forest};
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease, transform 0.16s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .ti-btn-ghost:hover { background: ${c.forest}; color: ${c.chalk}; }
  .ti-btn-ghost:active { transform: scale(0.97); }
  .ti-list-form { border-top: 0.5px solid ${c.mist}; padding-top: 18px; }
  .ti-list-form .lf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .ti-list-form label {
    font-family: ${f.mono};
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${c.bark};
    display: block;
    margin-bottom: 6px;
  }
  .ti-list-form input,
  .ti-list-form select {
    width: 100%;
    padding: 11px 12px;
    font-family: ${f.sans};
    font-size: 14px;
    background: ${c.chalk};
    border: 0.5px solid ${c.mist};
    color: ${c.ink};
  }
  .ti-list-form input:focus,
  .ti-list-form select:focus { outline: none; border-color: ${c.terracotta}; }
  .ti-list-form .lf-submit { margin-top: 14px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .ti-list-done {
    padding: 18px 20px;
    background: ${c.forest};
    color: ${c.chalk};
  }
  .ti-list-done .t { font-family: ${f.serif}; font-size: 22px; }
  .ti-list-done .t em { color: ${c.terracottaWarm}; font-style: italic; }
  .ti-list-done a {
    color: ${c.terracottaWarm};
    font-family: ${f.mono};
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    display: inline-block;
    margin: 10px 18px 0 0;
    text-decoration: none;
  }
  .ti-list-done a:hover { text-decoration: underline; }
  .ti-limited {
    grid-column: 1 / -1;
    padding: 48px;
    text-align: center;
    border: 0.5px solid ${c.mist};
    background: ${c.chalk};
  }
  .ti-limited h3 {
    font-family: ${f.serif};
    font-size: 28px;
    font-weight: 300;
    color: ${c.ink};
    margin: 0 0 12px;
  }
  .ti-limited p { color: ${c.sage}; margin: 0 0 20px; }
  @media (prefers-reduced-motion: reduce) {
    .ti-head, .ti-usage, .ti-app {
      transform: none;
      transition: opacity 0.3s ease;
    }
    .ti-empty, .ti-loading .step-row, .ti-result > * {
      animation-duration: 0.2s;
      animation-delay: 0ms;
      animation-name: ti-fade-only;
    }
    .ti-loading .step-row.active .dot { animation: none; }
    .ti-usage .u-track i, .ti-conf-bar-fill { transition: none; }
    .ti-sample, .ti-dropzone, .ti-btn-primary, .ti-btn-ghost { transition-property: border-color, background, color; }
  }
  @keyframes ti-fade-only {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @media (max-width: 1000px) {
    .ti-container { padding: 0 24px; }
    .ti-head { grid-template-columns: 1fr; gap: 28px; }
    .ti-app { grid-template-columns: 1fr; }
    .ti-left { border-right: none; border-bottom: 0.5px solid ${c.mist}; }
    .ti-comps .comps-grid { grid-template-columns: repeat(2, 1fr); }
    .ti-list-form .lf-grid { grid-template-columns: 1fr; }
  }
`

function animateNumber(el: HTMLElement, from: number, to: number, dur: number, fmt: (v: number) => string) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = fmt(to)
    return
  }
  const start = performance.now()
  function tick(now: number) {
    const t = Math.min(1, (now - start) / dur)
    const ease = 1 - (1 - t) ** 3
    el.textContent = fmt(from + (to - from) * ease)
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

export function TryIt() {
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const resLowRef = useRef<HTMLSpanElement>(null)
  const resHighRef = useRef<HTMLSpanElement>(null)
  const barFillRef = useRef<HTMLDivElement>(null)

  const [vis, setVis] = useState(false)
  const navigate = useNavigate()
  const { authToken } = usePersistence()

  // Server-side usage — the single source of truth for the free monthly limit
  const [apiUsage, setApiUsage] = useState<ApiUsageState>({
    used: 0,
    limit: 3,
    remaining: 3,
    is_limited: false,
  })

  type Panel = 'empty' | 'loading' | 'result' | 'uploading'
  const [panel, setPanel] = useState<Panel>('empty')
  const [activeSample, setActiveSample] = useState<SampleKey | null>(null)
  const [loadPhase, setLoadPhase] = useState(0)
  const [demoData, setDemoData] = useState<SampleData | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const timersRef = useRef<number[]>([])

  // List-on-marketplace flow
  const [listOpen, setListOpen] = useState(false)
  const [listedId, setListedId] = useState<string | null>(null)
  const [lfAsk, setLfAsk] = useState('')
  const [lfCond, setLfCond] = useState('Good')
  const [lfLoc, setLfLoc] = useState('Seattle, WA')
  const [lfSeller, setLfSeller] = useState('your_handle')

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVis(true)
      },
      { threshold: 0.1 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const headers: Record<string, string> = { 'X-Fingerprint': getBrowserFingerprint() }
    if (authToken) headers.Authorization = `Bearer ${authToken}`
    fetch('/api/usage', { headers })
      .then((r) => r.json())
      .then((data) =>
        setApiUsage({
          used: data.used ?? 0,
          limit: data.limit ?? 3,
          remaining: data.remaining ?? 3,
          is_limited: data.is_limited ?? false,
        })
      )
      .catch(() => {})
  }, [authToken])

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id))
      timersRef.current = []
    }
  }, [])

  const clearDemoTimers = () => {
    timersRef.current.forEach((id) => clearTimeout(id))
    timersRef.current = []
  }

  const canUploadPhoto = !apiUsage.is_limited

  const onDropzoneBlocked = () => {
    setUploadError("You've used all your free appraisals this month — upgrade to keep going.")
  }

  const runDemo = useCallback((key: SampleKey) => {
    clearDemoTimers()
    setUploadError(null)
    setActiveSample(key)
    setPanel('loading')
    setLoadPhase(0)
    setListOpen(false)
    setListedId(null)
    const data = SAMPLES[key]
    let t = 0
    for (let i = 0; i < DEMO_SEQUENCE_MS.length; i++) {
      t += DEMO_SEQUENCE_MS[i]
      timersRef.current.push(
        window.setTimeout(() => setLoadPhase(i + 1), t)
      )
    }
    timersRef.current.push(
      window.setTimeout(() => {
        // Samples are client-side demos and do not count against the free monthly limit.
        setDemoData(data)
        setLfAsk(String(data.ask))
        setLfCond('Good')
        setPanel('result')
        requestAnimationFrame(() => {
          if (resLowRef.current && resHighRef.current) {
            resLowRef.current.textContent = '$0'
            resHighRef.current.textContent = '$0'
            barFillRef.current?.style.setProperty('--conf', '0')
            animateNumber(resLowRef.current, 0, data.low, 900, (v) => `$${Math.round(v).toLocaleString()}`)
            animateNumber(resHighRef.current, 0, data.high, 900, (v) => `$${Math.round(v).toLocaleString()}`)
          }
          setTimeout(() => {
            barFillRef.current?.style.setProperty('--conf', `${data.conf / 100}`)
          }, 80)
        })
      }, t + 120)
    )
  }, [])

  const handleRealFile = async (file: File) => {
    setUploadError(null)
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('Please use an image under 20 MB.')
      return
    }
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image (JPG, PNG, HEIC).')
      return
    }
    setPanel('uploading')
    const formData = new FormData()
    formData.append('image', file)
    const headers: Record<string, string> = { 'X-Fingerprint': getBrowserFingerprint() }
    if (authToken) headers.Authorization = `Bearer ${authToken}`
    try {
      const response = await fetch('/api/appraise', { method: 'POST', body: formData, headers })
      const data = await response.json().catch(() => ({}))
      if (response.status === 403 && data?.error === 'free_limit_reached') {
        setApiUsage((p) => ({ ...p, is_limited: true, remaining: 0 }))
        setUploadError("You've used all free photo appraisals — the samples still work.")
        setPanel('empty')
        return
      }
      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Appraisal failed (${response.status})`)
      }
      await saveAppraisalResult(data, file)
      setApiUsage((p) => ({
        ...p,
        used: p.used + 1,
        remaining: Math.max(0, p.remaining - 1),
        is_limited: p.used + 1 >= p.limit,
      }))
      navigate('/appraise/results')
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Something went wrong.')
      setPanel('empty')
    }
  }

  const onFileDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (apiUsage.is_limited) return
    const f = e.dataTransfer.files?.[0]
    if (f?.type.startsWith('image/')) handleRealFile(f)
    else setUploadError('Drop an image file (JPG, PNG, HEIC).')
  }

  const dropzoneDragProps = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    },
    onDrop: onFileDrop,
  }

  const resetResult = () => {
    setPanel('empty')
    setActiveSample(null)
    setDemoData(null)
    setListOpen(false)
    setListedId(null)
  }

  const publishListing = (e: FormEvent) => {
    e.preventDefault()
    if (!demoData || !activeSample) return
    const ask = parseInt(lfAsk.replace(/[^0-9]/g, ''), 10) || demoData.median
    const verdict = ask < demoData.median * 0.95 ? 'deal' : ask > demoData.median * 1.08 ? 'over' : 'fair'
    const listing = addDemoListing({
      title: demoData.title,
      category: demoData.category,
      condition: lfCond,
      asking_price: ask,
      images: [landingImages.tryItSamples[activeSample].src],
      location: lfLoc.trim() || 'Seattle, WA',
      seller: lfSeller.trim() || 'your_handle',
      rating: 5.0,
      verdict,
      attrs: demoData.attrs,
      description: [
        `Listed via the YardFront appraiser. Price guided by ${demoData.n} comparable sales across 7 marketplaces.`,
      ],
      price_low: demoData.low,
      price_high: demoData.high,
      median: demoData.median,
      confidence: demoData.conf,
      confidence_label: demoData.label,
      sample_size: demoData.n,
    })
    setListOpen(false)
    setListedId(listing.id)
  }

  const usagePct = Math.min(100, (apiUsage.used / apiUsage.limit) * 100)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <input
        id={FILE_INPUT_ID}
        ref={fileRef}
        type="file"
        accept={ACCEPT_IMAGES}
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleRealFile(f)
          e.target.value = ''
        }}
      />

      <section className="ti-root" id="try" ref={ref}>
        <div className="ti-container">
          <div className={`ti-head ${vis ? 'vis' : ''}`}>
            <div>
              <p className="ti-eyebrow">Demonstration</p>
              <h2 className="ti-headline">
                Try it on something
                <br />
                you&apos;ve been <em>wondering about</em>.
              </h2>
            </div>
            <p className="ti-lede">
              Upload a photograph or choose one of the samples. The pipeline runs live — identification, parallel marketplace search, and a confidence-scored range.
            </p>
          </div>

          {/* Usage meter */}
          <div className={`ti-usage ${vis ? 'vis' : ''}`}>
            <span className="u-lab">
              Free appraisals · <b>{apiUsage.used}</b> / {apiUsage.limit} used
            </span>
            <div className="u-meter">
              <div className="u-track">
                <i style={{ transform: `scaleX(${usagePct / 100})` }} />
              </div>
            </div>
            <span className="u-lab">
              {apiUsage.remaining > 0
                ? `${apiUsage.remaining} remaining this month`
                : 'Free limit reached'}
            </span>
          </div>

          <div className={`ti-app ${vis ? 'vis' : ''}`}>
            {apiUsage.is_limited ? (
              <div className="ti-limited">
                <h3>Free appraisals used</h3>
                <p>You&apos;ve used all {apiUsage.limit} free appraisals this month. Upgrade to keep going.</p>
                <button type="button" className="ti-btn-primary" onClick={() => navigate('/developers')}>
                  View pricing
                </button>
              </div>
            ) : (
              <>
                <div className="ti-left">
                  {canUploadPhoto ? (
                    <label htmlFor={FILE_INPUT_ID} className="ti-dropzone" {...dropzoneDragProps}>
                      <div className="g">＋</div>
                      <div>Drop a photo or click to upload</div>
                      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: c.mist }}>JPG · PNG · HEIC · 20MB</div>
                    </label>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      className="ti-dropzone ti-dropzone--limited"
                      onClick={onDropzoneBlocked}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onDropzoneBlocked()
                        }
                      }}
                      {...dropzoneDragProps}
                    >
                      <div className="g">＋</div>
                      <div>Drop a photo or click to upload</div>
                      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: c.mist }}>JPG · PNG · HEIC · 20MB</div>
                      <span className="ti-upload-hint">
                        {apiUsage.is_limited ? 'Free limit reached this month' : 'Free appraisals used'}
                      </span>
                    </div>
                  )}
                  <div className="ti-samples">
                    <p className="ti-sample-eyebrow">Or try a sample</p>
                    {(Object.keys(SAMPLES) as SampleKey[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        className={`ti-sample ${activeSample === k ? 'active' : ''}`}
                        onClick={() => runDemo(k)}
                      >
                        <div className="sm-thumb">
                          <img
                            src={landingImages.tryItSamples[k].src}
                            alt={landingImages.tryItSamples[k].alt}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div>
                          <div className="sm-name">{landingImages.tryItSamples[k].title}</div>
                          <div className="sm-type">
                            {k === 'chair' && 'Herman Miller · 1963'}
                            {k === 'camera' && 'Black paint · 1988'}
                            {k === 'sneakers' && '2015 retro · size 10.5'}
                            {k === 'record' && 'Columbia · 1959 first press'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ti-right">
                  {uploadError && panel === 'empty' && (
                    <p style={{ color: c.terracotta, fontSize: 13, margin: 0 }}>{uploadError}</p>
                  )}
                  {panel === 'empty' && (
                    <div className="ti-empty">
                      <div className="e-dash">$—</div>
                      <div className="e-title">Awaiting specimen.</div>
                      <div className="e-sub">Pick a sample to the left, or drop a photo.</div>
                    </div>
                  )}
                  {panel === 'uploading' && (
                    <div className="ti-empty">
                      <div className="e-title">Uploading…</div>
                      <div className="e-sub">Running real appraisal</div>
                    </div>
                  )}
                  {panel === 'loading' && (
                    <div className="ti-loading">
                      {['Ingesting image', 'Identifying object', 'Searching 7 marketplaces', 'Synthesizing range'].map(
                        (label, i) => (
                          <div
                            key={label}
                            className={`step-row ${loadPhase > i ? 'done' : ''} ${loadPhase === i ? 'active' : ''}`}
                          >
                            <span className="dot" />
                            <span className="label">{label}</span>
                            <span className="t">{['0.2s', '0.6s', '1.4s', '0.2s'][i]}</span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                  {panel === 'result' && demoData && (
                    <div className="ti-result">
                      <div className="ident">
                        {activeSample && (
                          <img
                            className="ident-photo"
                            src={landingImages.tryItSamples[activeSample].src}
                            alt={landingImages.tryItSamples[activeSample].alt}
                          />
                        )}
                        <div className="ident-main">
                          <div>
                            <div className="ident-t" dangerouslySetInnerHTML={{ __html: demoData.name }} />
                            <div className="ident-sub">{demoData.sub}</div>
                          </div>
                          <div className="match-pct">{demoData.match}%</div>
                        </div>
                      </div>
                      <div>
                        <div className="ti-conf-label">Estimated resale value</div>
                        <div className="ti-big-price">
                          <span className="low" ref={resLowRef}>
                            $0
                          </span>
                          <span className="sep">/</span>
                          <span className="high" ref={resHighRef}>
                            $0
                          </span>
                        </div>
                      </div>
                      <div className="ti-conf-card">
                        <div className="ti-conf-head">
                          <span className="ti-conf-label" style={{ marginBottom: 0 }}>
                            Confidence
                          </span>
                          <span className="ti-conf-val">
                            <em>{demoData.conf}%</em> · <span>{demoData.label}</span>
                          </span>
                        </div>
                        <div className="ti-conf-bar">
                          <div className="ti-conf-bar-fill" ref={barFillRef} style={{ ['--conf' as string]: '0' }} />
                        </div>
                        <div className="ti-conf-ticks">
                          <span>Speculative</span>
                          <span>Defensible</span>
                          <span>Ironclad</span>
                        </div>
                      </div>

                      {/* Recent comparables — fills the lower panel */}
                      <div className="ti-comps">
                        <div className="comps-head">
                          <span>Recent comparables</span>
                          <span>Last 90 days</span>
                        </div>
                        <div className="comps-grid">
                          {demoData.comps.map(([price, source]) => (
                            <div className="comp" key={source + price}>
                              <div className="p">{price}</div>
                              <div className="m">
                                <span>{source}</span>
                                <span className="sold">Sold</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="ti-result-meta">
                        <span>{`n = ${demoData.n}`}</span>
                        <span>{`Median $${demoData.median.toLocaleString()}`}</span>
                        <span>{`Resolved in ${demoData.time}s`}</span>
                      </div>

                      {listedId ? (
                        <div className="ti-list-done">
                          <div className="t">
                            Listed on the <em>marketplace</em>.
                          </div>
                          <Link to={`/marketplace/${listedId}`}>View your listing →</Link>
                          <Link to="/marketplace">Go to marketplace →</Link>
                        </div>
                      ) : listOpen ? (
                        <form className="ti-list-form" onSubmit={publishListing}>
                          <p className="ti-conf-label" style={{ marginBottom: 14 }}>
                            Create listing
                          </p>
                          <div className="lf-grid">
                            <div>
                              <label htmlFor="ti-lf-ask">Asking price ($)</label>
                              <input
                                id="ti-lf-ask"
                                type="text"
                                inputMode="numeric"
                                value={lfAsk}
                                onChange={(e) => setLfAsk(e.target.value)}
                              />
                            </div>
                            <div>
                              <label htmlFor="ti-lf-cond">Condition</label>
                              <select id="ti-lf-cond" value={lfCond} onChange={(e) => setLfCond(e.target.value)}>
                                {CONDITIONS.map((cd) => (
                                  <option key={cd} value={cd}>
                                    {cd}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor="ti-lf-loc">Location</label>
                              <input
                                id="ti-lf-loc"
                                type="text"
                                placeholder="City, ST"
                                value={lfLoc}
                                onChange={(e) => setLfLoc(e.target.value)}
                              />
                            </div>
                            <div>
                              <label htmlFor="ti-lf-seller">Seller handle</label>
                              <input
                                id="ti-lf-seller"
                                type="text"
                                placeholder="your_handle"
                                value={lfSeller}
                                onChange={(e) => setLfSeller(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="lf-submit">
                            <button type="submit" className="ti-btn-primary">
                              Publish listing
                            </button>
                            <button type="button" className="ti-btn-ghost" onClick={() => setListOpen(false)}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="ti-actions">
                          <button type="button" className="ti-btn-primary" onClick={() => setListOpen(true)}>
                            List on marketplace →
                          </button>
                          <button type="button" className="ti-btn-ghost" onClick={resetResult}>
                            New appraisal
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

export default TryIt
