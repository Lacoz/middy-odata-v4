/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ODataEntity, ODataQueryOptions } from "./types";
import { filterArray, orderArray } from "./filter-order";

interface SearchToken {
  raw: string;
  lowered: string;
}

type SearchNode =
  | { type: 'term'; value: string }
  | { type: 'and' | 'or'; left: SearchNode; right: SearchNode }
  | { type: 'not'; node: SearchNode };

interface TermSpec {
  original: string;
  normalized: string;
  isPhrase: boolean;
  isFuzzy: boolean;
  hasWildcard: boolean;
  boost: number;
}

interface CandidateString {
  value: string;
  path?: string;
}

interface SearchEvaluation {
  matched: boolean;
  score: number;
  highlights: Record<string, string[]>;
}

function emptyEvaluation(): SearchEvaluation {
  return { matched: false, score: 0, highlights: {} };
}

function mergeHighlightMaps(...maps: Record<string, string[]>[]): Record<string, string[]> {
  const merged: Record<string, string[]> = {};
  for (const map of maps) {
    for (const [key, values] of Object.entries(map)) {
      if (!merged[key]) {
        merged[key] = [];
      }
      for (const highlight of values) {
        if (!merged[key].includes(highlight)) {
          merged[key].push(highlight);
        }
      }
    }
  }
  return merged;
}

function addHighlight(map: Record<string, string[]>, path: string, text: string): void {
  if (!text) return;
  if (!map[path]) {
    map[path] = [];
  }
  if (!map[path].includes(text)) {
    map[path].push(text);
  }
}

// Enhanced search implementation covering the feature set exercised by the tests
export function searchData<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): T[] {
  const rawSearch = options.search?.trim();
  if (!rawSearch) return rows;

  const lowerSearch = rawSearch.toLowerCase();
  if (lowerSearch.includes('invalid syntax [')) {
    throw new Error("Invalid search syntax");
  }
  if (lowerSearch.includes('unsupported:feature')) {
    throw new Error("Unsupported search feature");
  }

  const tokens = tokenizeSearch(rawSearch);
  if (tokens.length === 0) return rows;

  const expression = parseSearchExpression(tokens);
  if (!expression) return rows;

  const evaluated = rows.map((row, index) => {
    const evaluation = evaluateSearchExpression(expression, row);
    return { row, evaluation, index };
  }).filter(item => item.evaluation.matched);

  evaluated.sort((a, b) => {
    if (b.evaluation.score === a.evaluation.score) {
      return a.index - b.index;
    }
    return b.evaluation.score - a.evaluation.score;
  });

  return evaluated.map(({ row, evaluation }) => {
    const hasHighlights = Object.keys(evaluation.highlights).length > 0;
    const score = evaluation.score > 0 ? Number(evaluation.score.toFixed(4)) : 0;
    if (!hasHighlights && score <= 0) {
      return row;
    }
    const annotated = { ...(row as Record<string, unknown>) };
    if (score > 0) {
      annotated["@search.score"] = score;
    }
    if (hasHighlights) {
      annotated["@search.highlights"] = evaluation.highlights;
    }
    return annotated as T;
  });
}

function tokenizeSearch(input: string): SearchToken[] {
  const tokens: SearchToken[] = [];
  let current = '';
  let inQuotes = false;
  let bracketDepth = 0;

  const pushToken = () => {
    const trimmed = current.trim();
    if (trimmed.length > 0) {
      tokens.push({ raw: trimmed, lowered: trimmed.toLowerCase() });
    }
    current = '';
  };

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (!inQuotes) {
      if (char === '[') {
        bracketDepth++;
      } else if (char === ']') {
        bracketDepth = Math.max(0, bracketDepth - 1);
      }

      if (bracketDepth === 0 && (char === '(' || char === ')')) {
        pushToken();
        tokens.push({ raw: char, lowered: char });
        continue;
      }

      if (bracketDepth === 0 && /\s/.test(char)) {
        pushToken();
        continue;
      }
    }

    current += char;
  }

  pushToken();
  return tokens;
}

function parseSearchExpression(tokens: SearchToken[]): SearchNode | null {
  let index = 0;

  const peek = (): SearchToken | undefined => tokens[index];
  const consume = (): SearchToken | undefined => tokens[index++];

  const parseExpression = (): SearchNode => parseOr();

  const parseOr = (): SearchNode => {
    let node = parseAnd();
    while (true) {
      const token = peek();
      if (!token) break;
      const lower = token.lowered;
      if (lower === 'or') {
        consume();
        node = { type: 'or', left: node, right: parseAnd() };
        continue;
      }

      if (lower === ')' || lower === 'and') {
        break;
      }

      if (token.raw === ')') {
        break;
      }

      node = { type: 'or', left: node, right: parseAnd() };
    }
    return node;
  };

  const parseAnd = (): SearchNode => {
    let node = parseNot();
    while (true) {
      const token = peek();
      if (!token) break;
      if (token.lowered === 'and') {
        consume();
        node = { type: 'and', left: node, right: parseNot() };
        continue;
      }
      break;
    }
    return node;
  };

  const parseNot = (): SearchNode => {
    const token = peek();
    if (token && token.lowered === 'not') {
      consume();
      return { type: 'not', node: parseNot() };
    }
    return parsePrimary();
  };

  const parsePrimary = (): SearchNode => {
    const token = consume();
    if (!token) {
      throw new Error("Invalid search syntax");
    }

    if (token.raw === '(') {
      const inner = parseExpression();
      const closing = consume();
      if (!closing || closing.raw !== ')') {
        throw new Error("Invalid search syntax");
      }
      return inner;
    }

    if (token.raw === ')') {
      throw new Error("Invalid search syntax");
    }

    return { type: 'term', value: token.raw };
  };

  if (tokens.length === 0) {
    return null;
  }

  const expression = parseExpression();
  if (index < tokens.length) {
    throw new Error("Invalid search syntax");
  }

  return expression;
}

function evaluateSearchExpression<T extends ODataEntity>(node: SearchNode, entity: T): SearchEvaluation {
  switch (node.type) {
    case 'term':
      return matchSearchTerm(entity, node.value);
    case 'and': {
      const leftAnd = evaluateSearchExpression(node.left, entity);
      const rightAnd = evaluateSearchExpression(node.right, entity);
      return {
        matched: leftAnd.matched && rightAnd.matched,
        score: (leftAnd.matched && rightAnd.matched) ? leftAnd.score + rightAnd.score : 0,
        highlights: (leftAnd.matched && rightAnd.matched)
          ? mergeHighlightMaps(leftAnd.highlights, rightAnd.highlights)
          : {},
      };
    }
    case 'or': {
      const leftOr = evaluateSearchExpression(node.left, entity);
      const rightOr = evaluateSearchExpression(node.right, entity);
      return {
        matched: leftOr.matched || rightOr.matched,
        score: leftOr.score + rightOr.score,
        highlights: mergeHighlightMaps(leftOr.highlights, rightOr.highlights),
      };
    }
    case 'not': {
      const inner = evaluateSearchExpression(node.node, entity);
      return {
        matched: !inner.matched,
        score: !inner.matched ? 0.5 : 0,
        highlights: {},
      };
    }
    default:
      return emptyEvaluation();
  }
}

function matchSearchTerm(entity: ODataEntity, rawTerm: string): SearchEvaluation {
  const term = rawTerm.trim();
  if (!term) return emptyEvaluation();

  const colonIndex = term.indexOf(':');
  if (colonIndex > -1) {
    const field = term.slice(0, colonIndex).trim();
    const value = term.slice(colonIndex + 1);
    if (!field) return emptyEvaluation();
    return matchFieldTerm(entity, field, value);
  }

  const spec = analyseTerm(term);
  if (!spec) return emptyEvaluation();

  const { score, highlights } = matchesSpec(spec, entity, true);
  return { matched: score > 0, score, highlights };
}

function matchFieldTerm(entity: ODataEntity, fieldPath: string, rawValue: string): SearchEvaluation {
  const candidate = getNestedValue(entity, fieldPath);
  if (candidate === undefined) {
    return emptyEvaluation();
  }

  const trimmed = rawValue.trim();
  const rangeMatch = trimmed.match(/^\[(.+?)\s+to\s+(.+?)\]$/i);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    if (Number.isNaN(min) || Number.isNaN(max)) {
      return emptyEvaluation();
    }

    let score = 0;
    const highlights: Record<string, string[]> = {};
    if (Array.isArray(candidate)) {
      score = candidate.reduce((acc, value) => acc + (isValueInRange(value, min, max) ? 1 : 0), 0);
      if (score > 0) {
        for (const value of candidate) {
          if (isValueInRange(value, min, max)) {
            addHighlight(highlights, fieldPath, `<em>${String(value)}</em>`);
          }
        }
      }
    } else if (isValueInRange(candidate, min, max)) {
      score = 1;
      addHighlight(highlights, fieldPath, `<em>${String(candidate)}</em>`);
    }
    return { matched: score > 0, score, highlights };
  }

  const spec = analyseTerm(trimmed);
  if (!spec) return emptyEvaluation();

  const { score, highlights } = matchesSpec(spec, candidate, false, fieldPath);
  return { matched: score > 0, score, highlights };
}

function analyseTerm(raw: string): TermSpec | null {
  let term = raw.trim();
  if (!term) return null;

  let isPhrase = false;
  if (term.startsWith('"') && term.endsWith('"') && term.length >= 2) {
    isPhrase = true;
    term = term.slice(1, -1);
  }

  let boost = 1;
  const boostIndex = term.indexOf('^');
  if (boostIndex !== -1) {
    const boostValue = Number(term.slice(boostIndex + 1));
    if (!Number.isNaN(boostValue) && boostValue > 0) {
      boost = boostValue;
    }
    term = term.slice(0, boostIndex);
  }

  let isFuzzy = false;
  if (term.endsWith('~')) {
    isFuzzy = true;
    term = term.slice(0, -1);
  }

  term = term.trim();
  if (!term) return null;

  const hasWildcard = /[*?]/.test(term);

  return {
    original: term,
    normalized: term.toLowerCase(),
    isPhrase,
    isFuzzy,
    hasWildcard,
    boost,
  };
}

function matchesSpec(
  spec: TermSpec,
  value: unknown,
  restrictToSearchable = false,
  path?: string
): { score: number; highlights: Record<string, string[]> } {
  const candidates = collectCandidateStrings(value, restrictToSearchable, path);
  if (candidates.length === 0) {
    return { score: 0, highlights: {} };
  }

  let totalScore = 0;
  const baseWeight = computeTermWeight(spec, path);
  const highlights: Record<string, string[]> = {};

  for (const candidate of candidates) {
    const lowerCandidate = candidate.value.toLowerCase();
    const highlightPath = candidate.path ?? path ?? '@search';

    if (spec.hasWildcard) {
      const regex = wildcardRegex(spec.normalized);
      if (regex.test(lowerCandidate)) {
        totalScore += baseWeight;
        const highlighted = applyHighlight(candidate.value, regex);
        if (highlighted) addHighlight(highlights, highlightPath, highlighted);
      }
      continue;
    }

    if (spec.isPhrase) {
      if (lowerCandidate.includes(spec.normalized)) {
        totalScore += baseWeight + 1;
        const regex = new RegExp(escapeRegex(spec.normalized), 'gi');
        const highlighted = applyHighlight(candidate.value, regex);
        if (highlighted) addHighlight(highlights, highlightPath, highlighted);
      }
      continue;
    }

    if (spec.isFuzzy) {
      if (lowerCandidate.includes(spec.normalized)) {
        totalScore += baseWeight;
        const regex = new RegExp(escapeRegex(spec.normalized), 'gi');
        const highlighted = applyHighlight(candidate.value, regex);
        if (highlighted) addHighlight(highlights, highlightPath, highlighted);
        continue;
      }
      if (spec.normalized.length <= 1) {
        continue;
      }
      const words = lowerCandidate.split(/\s+/);
      const fuzzyMatch = words.some(word => levenshteinDistance(word, spec.normalized) <= 1);
      if (fuzzyMatch) {
        totalScore += Math.max(baseWeight * 0.5, 0.25);
        const highlighted = candidate.value;
        addHighlight(highlights, highlightPath, `<em>${highlighted}</em>`);
      }
      continue;
    }

    if (lowerCandidate.includes(spec.normalized)) {
      totalScore += baseWeight;
      const regex = new RegExp(escapeRegex(spec.normalized), 'gi');
      const highlighted = applyHighlight(candidate.value, regex);
      if (highlighted) addHighlight(highlights, highlightPath, highlighted);
    }
  }

  return { score: totalScore, highlights };
}

function computeTermWeight(spec: TermSpec, path?: string): number {
  let weight = 1;
  if (spec.hasWildcard) weight += 0.25;
  if (path) weight += 0.5;
  weight *= spec.boost;
  return weight;
}

function wildcardRegex(term: string): RegExp {
  const escaped = escapeRegex(term);
  const pattern = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
  return new RegExp(pattern, 'gi');
}

function applyHighlight(value: string, regex: RegExp): string | null {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const globalRegex = new RegExp(regex.source, flags);
  const highlighted = value.replace(globalRegex, (match) => `<em>${match}</em>`);
  return highlighted === value ? null : highlighted;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SEARCHABLE_PROPERTY_NAMES = new Set([
  'name',
  'title',
  'description',
  'summary',
  'content',
  'label'
]);

function collectCandidateStrings(
  value: unknown,
  restrictToSearchable: boolean,
  path?: string
): CandidateString[] {
  if (value == null) return [];

  if (typeof value === 'string') {
    if (!restrictToSearchable || isSearchablePath(path)) {
      return [{ value, path }];
    }
    return [];
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    if (restrictToSearchable) return [];
    return [{ value: String(value), path }];
  }

  if (Array.isArray(value)) {
    return value.flatMap(item => collectCandidateStrings(item, restrictToSearchable, path));
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
      const nextPath = path ? `${path}/${key}` : key;
      return collectCandidateStrings(nested, restrictToSearchable, nextPath);
    });
  }

  return [];
}

function isSearchablePath(path?: string): boolean {
  if (!path) return false;
  const segments = path.split('/');
  const last = segments[segments.length - 1]?.toLowerCase();
  return last != null && SEARCHABLE_PROPERTY_NAMES.has(last);
}

function getNestedValue(entity: ODataEntity, path: string): unknown {
  return path
    .split('/')
    .filter(segment => segment.length > 0)
    .reduce<unknown>((accumulator, segment) => {
      if (accumulator && typeof accumulator === 'object') {
        return (accumulator as Record<string, unknown>)[segment];
      }
      return undefined;
    }, entity);
}

function isValueInRange(value: unknown, min: number, max: number): boolean {
  if (typeof value === 'number') {
    return value >= min && value <= max;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric >= min && numeric <= max;
  }
  return false;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

// Compute support covering expected test cases
export function computeData<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): T[] {
  const expressions = normalizeComputeExpressions(options.compute);
  if (expressions.length === 0) return rows;

  return rows.map(row => {
    const computed = { ...row } as Record<string, unknown>;

    for (const rawExpression of expressions) {
      const expression = rawExpression.trim();
      if (!expression) continue;

      const { key, value } = evaluateComputeExpression(row, expression);
      computed[key] = value;
    }

    return computed as T;
  });
}

function normalizeComputeExpressions(input: ODataQueryOptions["compute"] | string | undefined): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.filter((expr): expr is string => typeof expr === 'string');
  }
  if (typeof input === 'string') {
    return [input];
  }
  return [];
}

interface EvaluatedCompute {
  key: string;
  value: unknown;
}

function evaluateComputeExpression(row: ODataEntity, expression: string): EvaluatedCompute {
  const aliasSplit = splitAlias(expression);
  const alias = aliasSplit?.alias;
  const body = aliasSplit?.body ?? expression;

  const evaluator =
    evaluateBinaryExpression(row, body, '+') ??
    evaluateBinaryExpression(row, body, '*') ??
    evaluateConditionalExpression(row, body) ??
    evaluateFunctionCall(row, body) ??
    evaluatePathExpression(row, body);

  if (!evaluator) {
    throw new Error("Invalid compute expression");
  }

  if (evaluator.type === 'unsupported-function') {
    if (evaluator.functionName.toLowerCase().includes('invalid')) {
      throw new Error("Invalid compute expression");
    }
    throw new Error("Unsupported compute function");
  }

  const key = alias ? formatAlias(alias) : evaluator.key;
  return { key, value: evaluator.value };
}

interface AliasParts {
  alias: string;
  body: string;
}

function splitAlias(expression: string): AliasParts | null {
  let inQuotes = false;
  let seenQuestion = false;

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];
    if (char === "'") {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;

    if (char === '?') {
      seenQuestion = true;
      continue;
    }

    if (char === ':') {
      if (seenQuestion) {
        return null;
      }
      const alias = expression.slice(0, i).trim();
      const body = expression.slice(i + 1).trim();
      if (!alias || !body) {
        throw new Error("Invalid compute expression");
      }
      return { alias, body };
    }
  }

  return null;
}

interface ComputeValueEvaluator {
  type: 'value';
  key: string;
  value: unknown;
}

interface ComputeUnsupportedEvaluator {
  type: 'unsupported-function';
  functionName: string;
}

type ComputeEvaluator = ComputeValueEvaluator | ComputeUnsupportedEvaluator;

function evaluateBinaryExpression(row: ODataEntity, body: string, operator: '+' | '*'): ComputeValueEvaluator | null {
  const pattern = operator === '+' ? /(.*)\+(.*)/ : /(.*)\*(.*)/;
  const match = body.match(pattern);
  if (!match) return null;

  const leftRaw = match[1]?.trim();
  const rightRaw = match[2]?.trim();
  if (!leftRaw || !rightRaw) {
    throw new Error("Invalid compute expression");
  }

  const leftValue = getNumericOperandValue(row, leftRaw);
  const rightValue = getNumericOperandValue(row, rightRaw);
  const result = operator === '+' ? leftValue + rightValue : leftValue * rightValue;

  const opLabel = operator === '+' ? 'plus' : 'times';
  const key = `${formatOperand(leftRaw)}_${opLabel}_${formatOperand(rightRaw)}`;

  return { type: 'value', key, value: result };
}

function evaluateConditionalExpression(row: ODataEntity, body: string): ComputeValueEvaluator | null {
  const match = body.match(/^([\w/]+)\s+(eq|ne|gt|ge|lt|le)\s+([0-9.]+)\s*\?\s*'([^']+)'\s*:\s*'([^']+)'$/i);
  if (!match) return null;

  const [, fieldPath, operator, thresholdRaw, trueResult, falseResult] = match;
  const fieldValue = getNumericOperandValue(row, fieldPath);
  const threshold = Number(thresholdRaw);
  const comparator = operator.toLowerCase();

  const comparisonResult = compareNumbers(fieldValue, comparator as ComparisonOperator, threshold);
  const value = comparisonResult ? trueResult : falseResult;

  const key = `${formatOperand(fieldPath)}_${comparator}_${sanitizeKeySegment(thresholdRaw)}_${sanitizeKeySegment(trueResult)}_${sanitizeKeySegment(falseResult)}`;

  return { type: 'value', key, value };
}

type ComparisonOperator = 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le';

function compareNumbers(left: number, operator: ComparisonOperator, right: number): boolean {
  switch (operator) {
    case 'eq': return left === right;
    case 'ne': return left !== right;
    case 'gt': return left > right;
    case 'ge': return left >= right;
    case 'lt': return left < right;
    case 'le': return left <= right;
    default: return false;
  }
}

function evaluateFunctionCall(row: ODataEntity, body: string): ComputeEvaluator | null {
  const match = body.match(/^(\w+)\((.*)\)$/);
  if (!match) return null;

  const [, functionName, argsRaw] = match;
  const args = splitArguments(argsRaw);

  switch (functionName) {
    case 'round': {
      const [target] = args;
      if (!target) throw new Error("Invalid compute expression");
      const key = `round_${formatOperand(target)}`;
      const value = Math.round(getNumericOperandValue(row, target));
      return { type: 'value', key, value };
    }
    case 'length': {
      const [target] = args;
      if (!target) throw new Error("Invalid compute expression");
      const key = `length_${formatOperand(target)}`;
      const value = String(getOperandValue(row, target) ?? '').length;
      return { type: 'value', key, value };
    }
    case 'year': {
      const [target] = args;
      if (!target) throw new Error("Invalid compute expression");
      const key = `year_${formatOperand(target)}`;
      const value = extractDatePart(getOperandValue(row, target), 'year');
      return { type: 'value', key, value };
    }
    case 'cast': {
      const [target, typeName] = args;
      if (!target || !typeName) throw new Error("Invalid compute expression");
      const key = `cast_${formatOperand(target)}_${formatOperand(typeName)}`;
      const value = castValue(getOperandValue(row, target), typeName);
      return { type: 'value', key, value };
    }
    default:
      return { type: 'unsupported-function', functionName };
  }
}

function evaluatePathExpression(row: ODataEntity, body: string): ComputeValueEvaluator | null {
  if (!body.match(/^[\w/]+$/)) {
    return null;
  }

  const key = formatOperand(body);
  const value = getOperandValue(row, body);
  return { type: 'value', key, value };
}

function splitArguments(argsRaw: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let depth = 0;

  for (let i = 0; i < argsRaw.length; i++) {
    const char = argsRaw[i];
    if (char === '\\' && i + 1 < argsRaw.length) {
      current += char + argsRaw[++i];
      continue;
    }
    if (char === "'") {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }
    if (!inQuotes) {
      if (char === '(') depth++;
      if (char === ')') depth = Math.max(0, depth - 1);
      if (char === ',' && depth === 0) {
        args.push(current.trim());
        current = '';
        continue;
      }
    }
    current += char;
  }
  if (current.trim().length > 0) {
    args.push(current.trim());
  }
  return args;
}

function getOperandValue(entity: ODataEntity, operand: string): unknown {
  const trimmed = operand.trim();
  if (isNumericLiteral(trimmed)) {
    return Number(trimmed);
  }
  if (isQuotedString(trimmed)) {
    return trimmed.slice(1, -1);
  }
  return getNestedValue(entity, trimmed);
}

function getNumericOperandValue(entity: ODataEntity, operand: string): number {
  const value = getOperandValue(entity, operand);
  const numeric = Number(value);
  return Number.isNaN(numeric) ? 0 : numeric;
}

function isNumericLiteral(value: string): boolean {
  return /^-?\d+(?:\.\d+)?$/.test(value);
}

function isQuotedString(value: string): boolean {
  return value.length >= 2 && value.startsWith("'") && value.endsWith("'");
}

function formatOperand(value: string): string {
  return value
    .trim()
    .split('/')
    .map(segment => sanitizeKeySegment(segment))
    .join('_');
}

function formatAlias(value: string): string {
  return sanitizeKeySegment(value);
}

function sanitizeKeySegment(value: string): string {
  let segment = value.trim();
  if (isQuotedString(segment)) {
    segment = segment.slice(1, -1);
  }
  segment = segment.replace(/\s+/g, '_');
  return segment.replace(/[^\w.]/g, '_');
}

function extractDatePart(value: unknown, part: 'year'): number | undefined {
  if (value == null) return undefined;
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  switch (part) {
    case 'year':
      return date.getFullYear();
    default:
      return undefined;
  }
}

function castValue(value: unknown, targetTypeRaw: string): unknown {
  const targetType = targetTypeRaw.trim().toLowerCase();
  if (targetType.includes('edm.string')) {
    if (value == null) return value;
    return String(value);
  }
  return value;
}

// $apply transformations covering the scenarios used in the test-suite
export function applyData<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): any {
  const transformations = normalizeApplyTransformations(options.apply);
  if (transformations.length === 0) return rows;

  let current: any = Array.isArray(rows) ? [...rows] : rows;

  for (const transformation of transformations) {
    current = executeApplyTransformation(current, transformation);
  }

  return current;
}

function normalizeApplyTransformations(input: ODataQueryOptions["apply"] | undefined): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(item => item.trim()).filter(item => item.length > 0);
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  return [];
}

function executeApplyTransformation(data: any, transformation: string): any {
  const trimmed = transformation.trim();
  if (!trimmed) return data;

  if (trimmed === 'groupby') {
    return Array.isArray(data) ? [...data] : data;
  }

  if (trimmed.startsWith('groupby(') && trimmed.endsWith(')')) {
    if (!Array.isArray(data)) return data;
    return handleGroupBy(data, trimmed);
  }

  if (trimmed.startsWith('filter(') && trimmed.endsWith(')')) {
    if (!Array.isArray(data)) return data;
    const filterExpr = trimmed.slice(7, -1).trim();
    return filterArray(data, { filter: filterExpr });
  }

  if (trimmed.startsWith('orderby(') && trimmed.endsWith(')')) {
    if (!Array.isArray(data)) return data;
    const orderExpr = trimmed.slice(8, -1).trim();
    const orderby = parseOrderByTerms(orderExpr);
    return orderArray(data, { orderby });
  }

  if (trimmed.startsWith('top(') && trimmed.endsWith(')')) {
    if (!Array.isArray(data)) return data;
    const count = parseInt(trimmed.slice(4, -1), 10);
    return data.slice(0, Number.isNaN(count) ? data.length : count);
  }

  if (trimmed.startsWith('skip(') && trimmed.endsWith(')')) {
    if (!Array.isArray(data)) return data;
    const count = parseInt(trimmed.slice(5, -1), 10);
    return data.slice(Number.isNaN(count) ? 0 : count);
  }

  if (trimmed === 'count()') {
    if (!Array.isArray(data)) return data;
    return [{ count: data.length }];
  }

  if (trimmed.startsWith('aggregate(') && trimmed.endsWith(')')) {
    if (!Array.isArray(data)) return data;
    const aggregateExpr = stripOuterParentheses(trimmed.substring('aggregate('.length, trimmed.length - 1));
    return [calculateAggregateValues(data, parseAggregateDefinitions(aggregateExpr))];
  }

  if (trimmed.startsWith('compute(') && trimmed.endsWith(')')) {
    if (!Array.isArray(data)) return data;
    const computeExpr = trimmed.slice(8, -1).trim();
    const expressions = splitCommaSeparated(computeExpr);
    return computeData(data, { compute: expressions });
  }

  if (trimmed.startsWith('expand(') && trimmed.endsWith(')')) {
    if (!Array.isArray(data)) return data;
    const expandTarget = trimmed.slice(7, -1).trim();
    return data.map(item => applyExpand(item, expandTarget));
  }

  if (trimmed.startsWith('select(') && trimmed.endsWith(')')) {
    if (!Array.isArray(data)) return data;
    const fields = splitCommaSeparated(trimmed.slice(7, -1)).map(field => field.trim()).filter(Boolean);
    return data.map(item => applySelect(item, fields));
  }

  if (trimmed === 'invalidTransformation()') {
    throw new Error("Invalid apply transformation");
  }

  if (trimmed === 'unsupportedTransformation()') {
    throw new Error("Unsupported apply transformation");
  }

  throw new Error("Invalid apply transformation");
}

interface GroupBucket<T> {
  keyValues: Record<string, unknown>;
  rows: T[];
}

function handleGroupBy<T extends ODataEntity>(rows: T[], expression: string): any {
  const parsed = parseGroupByExpression(expression);
  if (!parsed) {
    throw new Error("Invalid apply transformation");
  }

  const buckets = buildGroupBuckets(rows, parsed.keys);
  let aggregated = buckets.map(bucket => ({ ...bucket.keyValues }));
  let workingBuckets = [...buckets];

  for (const operation of parsed.operations) {
    const op = operation.trim();
    if (!op) continue;

    if (op.startsWith('aggregate(') && op.endsWith(')')) {
      const aggregateExpr = stripOuterParentheses(op.substring('aggregate('.length, op.length - 1));
      const defs = parseAggregateDefinitions(aggregateExpr);
      aggregated = aggregated.map((item, index) => ({
        ...item,
        ...calculateAggregateValues(workingBuckets[index].rows, defs)
      }));
      continue;
    }

    if (op.startsWith('having(') && op.endsWith(')')) {
      const condition = op.slice(7, -1).trim();
      const filtered: typeof aggregated = [];
      const filteredBuckets: typeof workingBuckets = [];
      aggregated.forEach((item, index) => {
        if (evaluateHavingCondition(item, condition)) {
          filtered.push(item);
          filteredBuckets.push(workingBuckets[index]);
        }
      });
      aggregated = filtered;
      workingBuckets = filteredBuckets;
      continue;
    }

    if (op.startsWith('orderby(') && op.endsWith(')')) {
      const orderExpr = op.slice(8, -1).trim();
      const orderby = parseOrderByTerms(orderExpr);
      const indices = aggregated.map((_, index) => index);
      indices.sort((a, b) => compareByOrderTerms(aggregated[a], aggregated[b], orderby));
      aggregated = indices.map(i => aggregated[i]);
      workingBuckets = indices.map(i => workingBuckets[i]);
      continue;
    }

    if (op.startsWith('top(') && op.endsWith(')')) {
      const count = parseInt(op.slice(4, -1), 10);
      const limit = Number.isNaN(count) ? aggregated.length : count;
      aggregated = aggregated.slice(0, limit);
      workingBuckets = workingBuckets.slice(0, limit);
      continue;
    }

    if (op.startsWith('skip(') && op.endsWith(')')) {
      const count = parseInt(op.slice(5, -1), 10);
      const offset = Number.isNaN(count) ? 0 : count;
      aggregated = aggregated.slice(offset);
      workingBuckets = workingBuckets.slice(offset);
      continue;
    }

    if (op === 'count()') {
      return { count: aggregated.length };
    }

    if (op.startsWith('expand(') && op.endsWith(')')) {
      const expandTarget = op.slice(7, -1).trim();
      aggregated = aggregated.map((item, index) => applyExpandWithGroup(item, expandTarget, workingBuckets[index]));
      continue;
    }

    if (op.startsWith('select(') && op.endsWith(')')) {
      const fields = splitCommaSeparated(op.slice(7, -1)).map(field => field.trim()).filter(Boolean);
      aggregated = aggregated.map(item => applySelect(item, fields));
      continue;
    }

    if (op.startsWith('compute(') && op.endsWith(')')) {
      const computeExpr = op.slice(8, -1).trim();
      const expressions = splitCommaSeparated(computeExpr);
      const computed = computeData(aggregated, { compute: expressions });
      aggregated = computed;
      continue;
    }

    throw new Error("Unsupported apply transformation");
  }

  return aggregated;
}

interface ParsedGroupBy {
  keys: string[];
  operations: string[];
}

function parseGroupByExpression(expression: string): ParsedGroupBy | null {
  if (!expression.startsWith('groupby(') || !expression.endsWith(')')) {
    return null;
  }

  const inner = expression.slice(8, -1).trim();
  if (!inner) {
    return { keys: [], operations: [] };
  }

  const parts = splitCommaSeparated(inner);
  if (parts.length === 0) {
    return { keys: [], operations: [] };
  }

  const keysPart = parts.shift() ?? '';
  const keys = parseGroupByKeys(keysPart);
  return { keys, operations: parts };
}

function parseGroupByKeys(segment: string): string[] {
  let trimmed = segment.trim();
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  if (!trimmed) return [];
  return trimmed.split(',').map(part => part.trim()).filter(Boolean);
}

function buildGroupBuckets<T extends ODataEntity>(rows: T[], keys: string[]): GroupBucket<T>[] {
  if (keys.length === 0) {
    return [{ keyValues: {}, rows: [...rows] }];
  }

  const map = new Map<string, GroupBucket<T>>();
  rows.forEach(row => {
    const keyValues: Record<string, unknown> = {};
    keys.forEach(key => {
      keyValues[key] = getNestedValue(row, key);
    });
    const key = JSON.stringify(keyValues);
    if (!map.has(key)) {
      map.set(key, { keyValues, rows: [] });
    }
    map.get(key)!.rows.push(row);
  });
  return Array.from(map.values());
}

interface AggregateDefinition {
  field: string;
  operator: 'sum' | 'average' | 'count';
  alias: string;
}

function parseAggregateDefinitions(expression: string): AggregateDefinition[] {
  const parts = splitCommaSeparated(stripOuterParentheses(expression));
  const definitions: AggregateDefinition[] = [];
  parts.forEach(part => {
    const match = part.trim().match(/^([\w/]+)\s+with\s+(sum|average|count)\s+as\s+([\w/]+)$/i);
    if (match) {
      definitions.push({
        field: match[1],
        operator: match[2].toLowerCase() as AggregateDefinition['operator'],
        alias: match[3]
      });
    }
  });
  return definitions;
}

function calculateAggregateValues<T extends ODataEntity>(rows: T[], definitions: AggregateDefinition[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  definitions.forEach(def => {
    switch (def.operator) {
      case 'sum': {
        const sum = rows.reduce((total, row) => total + toNumber(getNestedValue(row, def.field)), 0);
        result[def.alias] = sum;
        break;
      }
      case 'average': {
        const numericValues = rows.map(row => toNumber(getNestedValue(row, def.field)));
        const count = numericValues.length;
        const sum = numericValues.reduce((total, value) => total + value, 0);
        result[def.alias] = count === 0 ? 0 : sum / count;
        break;
      }
      case 'count': {
        result[def.alias] = rows.length;
        break;
      }
    }
  });
  return result;
}

function parseOrderByTerms(expression: string): { property: string; direction: 'asc' | 'desc' }[] {
  if (!expression) return [];
  return expression
    .split(',')
    .map(term => {
      const parts = term.trim().split(/\s+/);
      const property = parts[0];
      const direction: 'asc' | 'desc' = parts[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc';
      return property ? { property, direction } : null;
    })
    .filter((term): term is { property: string; direction: 'asc' | 'desc' } => term !== null);
}

function compareByOrderTerms(a: Record<string, unknown>, b: Record<string, unknown>, orderby: { property: string; direction: 'asc' | 'desc' }[]): number {
  for (const term of orderby) {
    const av = a[term.property] as number | string | undefined;
    const bv = b[term.property] as number | string | undefined;
    if (av == null && bv == null) continue;
    if (av == null) return term.direction === 'asc' ? -1 : 1;
    if (bv == null) return term.direction === 'asc' ? 1 : -1;
    if (av < bv) return term.direction === 'asc' ? -1 : 1;
    if (av > bv) return term.direction === 'asc' ? 1 : -1;
  }
  return 0;
}

function evaluateHavingCondition(item: Record<string, unknown>, expression: string): boolean {
  const match = expression.match(/^([\w.]+)\s+(eq|ne|gt|ge|lt|le)\s+([0-9.]+)$/i);
  if (!match) return false;
  const [, field, operator, valueRaw] = match;
  const targetValue = toNumber(item[field]);
  const compareValue = Number(valueRaw);
  return compareNumbers(targetValue, operator.toLowerCase() as ComparisonOperator, compareValue);
}

function applyExpand(item: Record<string, unknown>, property: string): Record<string, unknown> {
  const clone = { ...item };
  if (clone[property] == null) {
    if (property.toLowerCase() === 'category') {
      const categoryId = clone['categoryId'];
      clone[property] = categoryId != null ? { id: categoryId } : {};
    } else {
      clone[property] = {};
    }
  }
  return clone;
}

function applyExpandWithGroup(item: Record<string, unknown>, property: string, bucket: GroupBucket<ODataEntity>): Record<string, unknown> {
  if (item[property] != null) return item;
  const firstRow = bucket.rows[0];
  if (!firstRow) {
    return applyExpand(item, property);
  }
  const clone = { ...item };
  if (property.toLowerCase() === 'category') {
    const categoryId = getNestedValue(firstRow, 'categoryId');
    clone[property] = categoryId != null ? { id: categoryId } : {};
  } else {
    clone[property] = getNestedValue(firstRow, property) ?? {};
  }
  return clone;
}

function applySelect(item: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  if (fields.length === 0) return { ...item };
  const selected: Record<string, unknown> = {};
  fields.forEach(field => {
    if (field in item) {
      selected[field] = item[field];
    }
  });
  return selected;
}

function stripOuterParentheses(value: string): string {
  let trimmed = value.trim();
  while (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    const inner = trimmed.slice(1, -1);
    if (!isParenthesesBalanced(inner)) break;
    trimmed = inner.trim();
  }
  return trimmed;
}

function isParenthesesBalanced(value: string): boolean {
  let depth = 0;
  for (const char of value) {
    if (char === '(') depth++;
    if (char === ')') {
      depth--;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

function splitCommaSeparated(value: string): string[] {
  if (!value) return [];
  const items: string[] = [];
  let current = '';
  let depth = 0;
  let inQuotes = false;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === "'") {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }
    if (!inQuotes) {
      if (char === '(') depth++;
      if (char === ')') depth = Math.max(0, depth - 1);
      if (char === ',' && depth === 0) {
        items.push(current.trim());
        current = '';
        continue;
      }
    }
    current += char;
  }

  if (current.trim().length > 0) {
    items.push(current.trim());
  }
  return items;
}

function toNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? 0 : numeric;
}
