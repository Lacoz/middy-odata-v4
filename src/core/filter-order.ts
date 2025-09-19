/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ODataEntity, ODataQueryOptions } from "./types";

// Simple filter expression parser and evaluator
type FilterExpressionType =
  | 'comparison'
  | 'logical'
  | 'function'
  | 'property'
  | 'literal'
  | 'unary'
  | 'collection'
  | 'alias';

interface FilterExpression {
  type: FilterExpressionType;
  operator?: string;
  left?: FilterExpression;
  right?: FilterExpression;
  operand?: FilterExpression;
  property?: string;
  value?: any;
  function?: string;
  args?: FilterExpression[];
  values?: FilterExpression[];
  name?: string;
}

interface EvaluationContext {
  scope: Record<string, unknown>;
  aliases: Record<string, FilterExpression>;
  resolvingAliases: Set<string>;
}

function parseFilterExpression(filter: string): FilterExpression {
  filter = filter.trim();
  // Simple parser for basic filter expressions
  // This is a simplified implementation - a full OData parser would be much more complex
  
  // Handle parentheses and logical operators
  if (filter.includes(' and ')) {
    const parts = splitByOperator(filter, ' and ');
    return {
      type: 'logical',
      operator: 'and',
      left: parseFilterExpression(parts[0].trim()),
      right: parseFilterExpression(parts[1].trim())
    };
  }

  if (filter.includes(' or ')) {
    const parts = splitByOperator(filter, ' or ');
    return {
      type: 'logical',
      operator: 'or',
      left: parseFilterExpression(parts[0].trim()),
      right: parseFilterExpression(parts[1].trim())
    };
  }

  if (filter.startsWith('not ')) {
    return {
      type: 'unary',
      operator: 'not',
      operand: parseFilterExpression(filter.slice(4).trim())
    };
  }

  const hasParts = splitByOperator(filter, ' has ');
  if (hasParts.length === 2) {
    return {
      type: 'collection',
      operator: 'has',
      left: parseFilterExpression(hasParts[0].trim()),
      right: parseFilterExpression(hasParts[1].trim()),
    };
  }

  const inParts = splitByOperator(filter, ' in ');
  if (inParts.length === 2) {
    const right = inParts[1].trim();
    if (right.startsWith('(') && right.endsWith(')')) {
      const inner = right.slice(1, -1);
      const valueStrings = splitCollectionValues(inner);
      return {
        type: 'collection',
        operator: 'in',
        left: parseFilterExpression(inParts[0].trim()),
        values: valueStrings.map(value => parseFilterExpression(value.trim())),
      };
    }
  }

  // Handle comparison operators
  const comparisonOps = [' eq ', ' ne ', ' gt ', ' ge ', ' lt ', ' le '];
  for (const op of comparisonOps) {
    if (filter.includes(op)) {
      const parts = filter.split(op);
      if (parts.length === 2) {
        return {
          type: 'comparison',
          operator: op.trim(),
          left: parseFilterExpression(parts[0].trim()),
          right: parseFilterExpression(parts[1].trim())
        };
      }
    }
  }
  
  // Handle functions
  if (filter.includes('(') && filter.includes(')')) {
    const funcMatch = filter.match(/^(\w+)\((.+)\)$/);
    if (funcMatch) {
      const [, funcName, argsStr] = funcMatch;
      const args = argsStr.split(',').map(arg => parseFilterExpression(arg.trim()));
      return {
        type: 'function',
        function: funcName,
        args
      };
    }
  }
  
  // Handle literals
  if (filter.startsWith("'") && filter.endsWith("'")) {
    return {
      type: 'literal',
      value: filter.slice(1, -1)
    };
  }
  
  if (filter === 'null') {
    return {
      type: 'literal',
      value: null
    };
  }
  
  if (filter === 'true') {
    return {
      type: 'literal',
      value: true
    };
  }
  
  if (filter === 'false') {
    return {
      type: 'literal',
      value: false
    };
  }
  
  if (!isNaN(Number(filter))) {
    return {
      type: 'literal',
      value: Number(filter)
    };
  }
  
  if (filter.startsWith('@')) {
    return {
      type: 'alias',
      name: filter,
    };
  }

  // Handle properties
  return {
    type: 'property',
    property: filter
  };
}

function splitByOperator(str: string, operator: string): string[] {
  let depth = 0;
  let inQuotes = false;
  
  for (let i = 0; i < str.length - operator.length + 1; i++) {
    const char = str[i];
    if (char === "'") inQuotes = !inQuotes;
    if (inQuotes) continue;
    
    if (char === '(') depth++;
    if (char === ')') depth--;
    
    if (depth === 0 && str.slice(i, i + operator.length) === operator) {
      return [str.slice(0, i), str.slice(i + operator.length)];
    }
  }
  
  return [str];
}

function splitCollectionValues(str: string): string[] {
  const values: string[] = [];
  let current = '';
  let depth = 0;
  let inQuotes = false;

  const pushValue = () => {
    const trimmed = current.trim();
    if (trimmed.length > 0) {
      values.push(trimmed);
    }
    current = '';
  };

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "'") {
      inQuotes = !inQuotes;
    }

    if (!inQuotes) {
      if (char === '(') depth++;
      if (char === ')') depth = Math.max(0, depth - 1);
      if (char === ',' && depth === 0) {
        pushValue();
        continue;
      }
    }

    current += char;
  }

  pushValue();
  return values;
}

function evaluateExpression(expr: FilterExpression, entity: any, context: EvaluationContext): any {
  switch (expr.type) {
    case 'property':
      return getPropertyValue(entity, expr.property!);
    
    case 'literal':
      return expr.value;
    
    case 'comparison': {
      const left = evaluateExpression(expr.left!, entity, context);
      const right = evaluateExpression(expr.right!, entity, context);
      return evaluateComparison(left, expr.operator!, right);
    }
    
    case 'logical': {
      const leftResult = Boolean(evaluateExpression(expr.left!, entity, context));
      const rightResult = Boolean(evaluateExpression(expr.right!, entity, context));
      return evaluateLogical(leftResult, expr.operator!, rightResult);
    }

    case 'unary':
      return evaluateUnary(expr.operator!, Boolean(evaluateExpression(expr.operand!, entity, context)));

    case 'function':
      return evaluateFunction(expr.function!, expr.args!, entity, context);

    case 'collection':
      return evaluateCollectionExpression(expr, entity, context);

    case 'alias':
      return resolveAlias(expr.name!, entity, context);

    default:
      return false;
  }
}

function getPropertyValue(entity: any, property: string): any {
  // Handle nested properties (e.g., "address/city")
  const parts = property.split('/');
  let value = entity;
  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = value[part];
    } else {
      return undefined;
    }
  }
  return value;
}

function evaluateComparison(left: any, operator: string, right: any): boolean {
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

function evaluateLogical(left: boolean, operator: string, right: boolean): boolean {
  switch (operator) {
    case 'and': return left && right;
    case 'or': return left || right;
    default: return false;
  }
}

function evaluateUnary(operator: string, operand: boolean): boolean {
  switch (operator) {
    case 'not':
      return !operand;
    default:
      return false;
  }
}

function evaluateCollectionExpression(
  expr: FilterExpression,
  entity: any,
  context: EvaluationContext
): boolean {
  if (expr.operator === 'has') {
    const collection = evaluateExpression(expr.left!, entity, context);
    const candidate = evaluateExpression(expr.right!, entity, context);

    if (Array.isArray(collection)) {
      return collection.some((item) => item === candidate);
    }

    if (collection instanceof Set) {
      return collection.has(candidate);
    }

    if (typeof collection === 'string') {
      return typeof candidate === 'string' && collection.split(',').map(s => s.trim()).includes(candidate);
    }

    return false;
  }

  if (expr.operator === 'in') {
    const target = evaluateExpression(expr.left!, entity, context);
    const candidates = expr.values?.map(value => evaluateExpression(value, entity, context)) ?? [];
    return candidates.some(value => value === target);
  }

  return false;
}

function resolveAlias(aliasName: string, entity: any, context: EvaluationContext): unknown {
  const aliasExpression = context.aliases[aliasName];
  if (!aliasExpression) {
    return undefined;
  }

  if (context.resolvingAliases.has(aliasName)) {
    throw new Error(`Circular parameter alias reference detected for ${aliasName}`);
  }

  context.resolvingAliases.add(aliasName);
  try {
    return evaluateExpression(aliasExpression, entity, context);
  } finally {
    context.resolvingAliases.delete(aliasName);
  }
}

function evaluateFunction(
  funcName: string,
  args: FilterExpression[],
  entity: any,
  context: EvaluationContext
): any {
  const argValues = args.map(arg => evaluateExpression(arg, entity, context));
  
  switch (funcName) {
    case 'contains':
      if (argValues.length >= 2) {
        const str = String(argValues[0] || '');
        const substring = String(argValues[1] || '');
        return str.includes(substring);
      }
      return false;
    
    case 'startswith':
      if (argValues.length >= 2) {
        const str = String(argValues[0] || '');
        const prefix = String(argValues[1] || '');
        return str.startsWith(prefix);
      }
      return false;
    
    case 'endswith':
      if (argValues.length >= 2) {
        const str = String(argValues[0] || '');
        const suffix = String(argValues[1] || '');
        return str.endsWith(suffix);
      }
      return false;
    
    case 'length':
      if (argValues.length >= 1) {
        const str = String(argValues[0] || '');
        return str.length;
      }
      return 0;
    
    case 'tolower':
      if (argValues.length >= 1) {
        return String(argValues[0] || '').toLowerCase();
      }
      return '';
    
    case 'toupper':
      if (argValues.length >= 1) {
        return String(argValues[0] || '').toUpperCase();
      }
      return '';
    
    case 'trim':
      if (argValues.length >= 1) {
        return String(argValues[0] || '').trim();
      }
      return '';
    
    case 'substring':
      if (argValues.length >= 2) {
        const str = String(argValues[0] || '');
        const start = Number(argValues[1]) || 0;
        if (argValues.length >= 3) {
          const length = Number(argValues[2]) || 0;
          return str.substring(start, start + length);
        }
        return str.substring(start);
      }
      return '';
    
    case 'indexof':
      if (argValues.length >= 2) {
        const str = String(argValues[0] || '');
        const substring = String(argValues[1] || '');
        return str.indexOf(substring);
      }
      return -1;
    
    case 'concat':
      return argValues.map(v => String(v || '')).join('');
    
    case 'year':
      if (argValues.length >= 1) {
        const date = new Date(argValues[0]);
        return isNaN(date.getTime()) ? 0 : date.getFullYear();
      }
      return 0;
    
    case 'month':
      if (argValues.length >= 1) {
        const date = new Date(argValues[0]);
        return isNaN(date.getTime()) ? 0 : date.getMonth() + 1;
      }
      return 0;
    
    case 'day':
      if (argValues.length >= 1) {
        const date = new Date(argValues[0]);
        return isNaN(date.getTime()) ? 0 : date.getDate();
      }
      return 0;
    
    case 'hour':
      if (argValues.length >= 1) {
        const date = new Date(argValues[0]);
        return isNaN(date.getTime()) ? 0 : date.getHours();
      }
      return 0;
    
    case 'minute':
      if (argValues.length >= 1) {
        const date = new Date(argValues[0]);
        return isNaN(date.getTime()) ? 0 : date.getMinutes();
      }
      return 0;
    
    case 'second':
      if (argValues.length >= 1) {
        const date = new Date(argValues[0]);
        return isNaN(date.getTime()) ? 0 : date.getSeconds();
      }
      return 0;
    
    case 'round':
      if (argValues.length >= 1) {
        return Math.round(Number(argValues[0]) || 0);
      }
      return 0;
    
    case 'floor':
      if (argValues.length >= 1) {
        return Math.floor(Number(argValues[0]) || 0);
      }
      return 0;
    
    case 'ceiling':
      if (argValues.length >= 1) {
        return Math.ceil(Number(argValues[0]) || 0);
      }
      return 0;
    
    case 'now':
      return new Date().toISOString();
    
    case 'maxdatetime':
      return new Date('9999-12-31T23:59:59.999Z').toISOString();
    
    case 'mindatetime':
      return new Date('0001-01-01T00:00:00.000Z').toISOString();
    
    default:
      return false;
  }
}

export function filterArray<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): T[] {
  if (!options.filter) return rows;
  
  try {
    const expression = parseFilterExpression(options.filter);
    const aliasExpressions = buildAliasExpressions(options.parameterAliases);
    return rows.filter(row => {
      const context = createEvaluationContext(aliasExpressions);
      return Boolean(evaluateExpression(expression, row, context));
    });
  } catch (error) {
    // If filter parsing fails, return all rows
    console.warn('Filter parsing failed:', error);
    return rows;
  }
}

function createEvaluationContext(aliases: Record<string, FilterExpression>): EvaluationContext {
  return {
    scope: {},
    aliases,
    resolvingAliases: new Set<string>(),
  };
}

function buildAliasExpressions(parameterAliases: ODataQueryOptions['parameterAliases']): Record<string, FilterExpression> {
  const expressions: Record<string, FilterExpression> = {};
  if (!parameterAliases) {
    return expressions;
  }

  for (const [alias, rawValue] of Object.entries(parameterAliases)) {
    try {
      expressions[alias] = parseFilterExpression(rawValue.trim());
    } catch (error) {
      console.warn(`Failed to parse parameter alias ${alias}:`, error);
    }
  }

  return expressions;
}

export function orderArray<T extends ODataEntity>(rows: T[], options: ODataQueryOptions): T[] {
  if (!options.orderby || options.orderby.length === 0) return rows;
  const copy = [...rows];
  copy.sort((a, b) => {
    for (const term of options.orderby!) {
      const av = (a as any)[term.property];
      const bv = (b as any)[term.property];
      if (av == null && bv == null) continue;
      if (av == null) return term.direction === "asc" ? -1 : 1;
      if (bv == null) return term.direction === "asc" ? 1 : -1;
      if (av < bv) return term.direction === "asc" ? -1 : 1;
      if (av > bv) return term.direction === "asc" ? 1 : -1;
    }
    return 0;
  });
  return copy;
}

export function paginateArray<T>(rows: T[], options: ODataQueryOptions): T[] {
  const skip = options.skip ?? 0;
  const top = options.top ?? rows.length;
  return rows.slice(skip, skip + top);
}
