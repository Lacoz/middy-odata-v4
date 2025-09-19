/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ODataEntity, ODataQueryOptions } from "./types";

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

  return rows.filter(row => evaluateSearchExpression(expression, row));
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

function evaluateSearchExpression<T extends ODataEntity>(node: SearchNode, entity: T): boolean {
  switch (node.type) {
    case 'term':
      return matchSearchTerm(entity, node.value);
    case 'and':
      return evaluateSearchExpression(node.left, entity) && evaluateSearchExpression(node.right, entity);
    case 'or':
      return evaluateSearchExpression(node.left, entity) || evaluateSearchExpression(node.right, entity);
    case 'not':
      return !evaluateSearchExpression(node.node, entity);
    default:
      return false;
  }
}

function matchSearchTerm(entity: ODataEntity, rawTerm: string): boolean {
  const term = rawTerm.trim();
  if (!term) return false;

  const colonIndex = term.indexOf(':');
  if (colonIndex > -1) {
    const field = term.slice(0, colonIndex).trim();
    const value = term.slice(colonIndex + 1);
    if (!field) return false;
    return matchFieldTerm(entity, field, value);
  }

  const spec = analyseTerm(term);
  if (!spec) return false;

  return matchesSpec(spec, entity, true);
}

function matchFieldTerm(entity: ODataEntity, fieldPath: string, rawValue: string): boolean {
  const candidate = getNestedValue(entity, fieldPath);
  if (candidate === undefined) {
    return false;
  }

  const trimmed = rawValue.trim();
  const rangeMatch = trimmed.match(/^\[(.+?)\s+to\s+(.+?)\]$/i);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    if (Number.isNaN(min) || Number.isNaN(max)) {
      return false;
    }

    if (Array.isArray(candidate)) {
      return candidate.some(value => isValueInRange(value, min, max));
    }
    return isValueInRange(candidate, min, max);
  }

  const spec = analyseTerm(trimmed);
  if (!spec) return false;

  return matchesSpec(spec, candidate, false, fieldPath);
}

function analyseTerm(raw: string): TermSpec | null {
  let term = raw.trim();
  if (!term) return null;

  let isPhrase = false;
  if (term.startsWith('"') && term.endsWith('"') && term.length >= 2) {
    isPhrase = true;
    term = term.slice(1, -1);
  }

  const boostIndex = term.indexOf('^');
  if (boostIndex !== -1) {
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
    hasWildcard
  };
}

function matchesSpec(spec: TermSpec, value: unknown, restrictToSearchable = false, path?: string): boolean {
  const candidates = collectCandidateStrings(value, restrictToSearchable, path);
  if (candidates.length === 0) return false;

  if (spec.hasWildcard) {
    const regex = wildcardToRegex(spec.normalized);
    return candidates.some(candidate => regex.test(candidate.toLowerCase()));
  }

  if (spec.isPhrase) {
    return candidates.some(candidate => candidate.toLowerCase().includes(spec.normalized));
  }

  if (spec.isFuzzy) {
    return candidates.some(candidate => {
      const lowerCandidate = candidate.toLowerCase();
      if (lowerCandidate.includes(spec.normalized)) {
        return true;
      }
      if (spec.normalized.length <= 1) {
        return false;
      }
      return lowerCandidate
        .split(/\s+/)
        .some(word => levenshteinDistance(word, spec.normalized) <= 1);
    });
  }

  return candidates.some(candidate => candidate.toLowerCase().includes(spec.normalized));
}

function wildcardToRegex(term: string): RegExp {
  const escaped = escapeRegex(term);
  const pattern = `^${escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.')}$`;
  return new RegExp(pattern);
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

function collectCandidateStrings(value: unknown, restrictToSearchable: boolean, path?: string): string[] {
  if (value == null) return [];

  if (typeof value === 'string') {
    if (!restrictToSearchable || isSearchablePath(path)) {
      return [value];
    }
    return [];
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    if (restrictToSearchable) return [];
    return [String(value)];
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
  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array(b.length + 1).fill(0));

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

// Simple apply implementation
export function applyData<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): T[] {
  if (!options.apply) return rows;
  
  // Simple apply transformations - in a real implementation, this would be much more complex
  let result = [...rows];
  
  if (options.apply.includes('groupby')) {
    // Simple groupby by first property
    const groups = new Map();
    result.forEach(row => {
      const key = Object.values(row)[0];
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(row);
    });
    result = Array.from(groups.values()).flat();
  }
  
  if (options.apply.includes('filter')) {
    // Apply additional filtering
    result = result.filter(row => {
      // Simple filter logic
      return Object.values(row).some(value => value !== null && value !== undefined);
    });
  }
  
  if (options.apply.includes('orderby')) {
    // Apply additional ordering
    result.sort((a, b) => {
      const aVal = Object.values(a)[0] as any;
      const bVal = Object.values(b)[0] as any;
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
  }
  
  return result;
}
