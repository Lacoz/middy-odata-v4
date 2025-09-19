import type { MiddlewareObj } from "@middy/core";
import type { ODataShapeOptions, ODataMiddlewareContext } from "./types";
import type { EdmModel, EdmEntityType } from "../core/types";
import { applySelect } from "../core/shape";
import { mergeMiddlewareOptions, getMiddlewareContext, setMiddlewareContext } from "./compose";

declare const console: any;


const DEFAULT_SHAPE_OPTIONS: ODataShapeOptions = {
  enableExpand: true,
  maxExpandDepth: 3,
  expandResolvers: {},
  autoResolveNavigation: true,
};

/**
 * OData Shape Middleware
 * 
 * Responsibilities:
 * - Apply $select projection to response data
 * - Handle $expand navigation property resolution
 * - Transform response data according to OData query options
 * - Manage expand depth and prevent infinite loops
 */
export function odataShape(options: Partial<ODataShapeOptions> = {}): MiddlewareObj {
  const opts = mergeMiddlewareOptions(DEFAULT_SHAPE_OPTIONS, options);

  return {
    after: async (request: any) => {
      try {
        const context = getMiddlewareContext(request);
        if (!context || !context.options) {
          return; // No OData context, skip shaping
        }

        // Get response data
        let responseData = request.response?.body;
        if (typeof responseData === 'string') {
          try {
            responseData = JSON.parse(responseData);
          } catch {
            // If parsing fails, skip shaping
            return;
          }
        }

        if (!responseData) {
          return; // No data to shape
        }

        // Apply data shaping
        const shapedData = await applyDataShaping(responseData, context, opts);

        // Update response
        if (request.response) {
          request.response.body = JSON.stringify(shapedData);
        } else {
          request.response = {
            statusCode: 200,
            body: JSON.stringify(shapedData),
          };
        }

        // Update context with shaped data
        context.data = shapedData;
        setMiddlewareContext(request, context);

      } catch (error) {
        // If shaping fails, log error but don't break the response
        console.error('[OData Shape] Error applying data shaping:', error);
        // Continue with original response
      }
    },
  };
}

/**
 * Applies data shaping based on OData query options
 * @param data Response data to shape
 * @param context OData middleware context
 * @param options Shape options
 * @returns Shaped data
 */
async function applyDataShaping(
  data: unknown,
  context: ODataMiddlewareContext,
  options: ODataShapeOptions
): Promise<unknown> {
  const { options: queryOptions } = context;
  const rootEntityType = determineRootEntityType(context);

  if (isODataCollectionResponse(data)) {
    const shapedCollection = await shapeCollection(
      data.value,
      queryOptions,
      options,
      context,
      rootEntityType
    );

    return {
      ...data,
      value: shapedCollection,
    };
  }

  // Handle collection responses
  if (Array.isArray(data)) {
    return await shapeCollection(data, queryOptions, options, context, rootEntityType);
  }

  // Handle single entity responses
  if (data && typeof data === 'object') {
    return await shapeEntity(
      data as Record<string, unknown>,
      queryOptions,
      options,
      context,
      rootEntityType
    );
  }

  // Return primitive values as-is
  return data;
}

function isODataCollectionResponse(data: unknown): data is { value: unknown[] } & Record<string, unknown> {
  return !!data && typeof data === 'object' && Array.isArray((data as any).value);
}

/**
 * Shapes a collection of entities
 * @param entities Array of entities
 * @param queryOptions OData query options
 * @param options Shape options
 * @param context OData middleware context
 * @returns Shaped collection
 */
async function shapeCollection(
  entities: unknown[],
  queryOptions: any,
  options: ODataShapeOptions,
  context: ODataMiddlewareContext,
  entityTypeName?: string
): Promise<unknown[]> {
  const shapedEntities: unknown[] = [];

  for (const entity of entities) {
    if (entity && typeof entity === 'object') {
      const shapedEntity = await shapeEntity(
        entity as Record<string, unknown>,
        queryOptions,
        options,
        context,
        entityTypeName
      );
      shapedEntities.push(shapedEntity);
    } else {
      shapedEntities.push(entity);
    }
  }

  return shapedEntities;
}

/**
 * Shapes a single entity
 * @param entity Entity to shape
 * @param queryOptions OData query options
 * @param options Shape options
 * @param context OData middleware context
 * @returns Shaped entity
 */
async function shapeEntity(
  entity: Record<string, unknown>,
  queryOptions: any,
  options: ODataShapeOptions,
  context: ODataMiddlewareContext,
  entityTypeName?: string
): Promise<Record<string, unknown>> {
  let shapedEntity = { ...entity };
  const projection = buildProjectionList(queryOptions);

  // Apply $expand navigation properties
  if (queryOptions.expand && queryOptions.expand.length > 0 && options.enableExpand) {
    shapedEntity = await applyExpansion(
      shapedEntity,
      queryOptions.expand,
      options,
      context,
      0,
      entityTypeName
    ) as Record<string, unknown>;
  }

  if (projection && projection.length > 0) {
    shapedEntity = applySelect(shapedEntity, projection) as Record<string, unknown>;
  }

  return shapedEntity;
}

/**
 * Applies navigation property expansion
 * @param entity Entity to expand
 * @param expandItems Expand items from query options
 * @param options Shape options
 * @param context OData middleware context
 * @param depth Current expansion depth
 * @returns Entity with expanded navigation properties
 */
async function applyExpansion(
  entity: Record<string, unknown>,
  expandItems: any[],
  options: ODataShapeOptions,
  context: ODataMiddlewareContext,
  depth: number,
  entityTypeName?: string
): Promise<Record<string, unknown>> {
  // Check expansion depth limit
  if (depth >= (options.maxExpandDepth || 3)) {
    console.warn(`[OData Shape] Maximum expansion depth (${options.maxExpandDepth}) reached`);
    return entity;
  }

  const expandedEntity = { ...entity };

  for (const expandItem of expandItems) {
    const navigationProperty = expandItem.path;
    
    if (!navigationProperty) {
      continue;
    }

    // Check if we have a custom resolver for this navigation property
    const resolver = options.expandResolvers?.[navigationProperty];
    
    if (resolver) {
      try {
        // Use custom resolver to get navigation data
        const navigationData = await resolver(context);
        expandedEntity[navigationProperty] = navigationData;
        
        // Apply nested query options if present
        if (expandItem.options) {
          const nestedContext = {
            ...context,
            options: expandItem.options,
          };
          
          if (Array.isArray(navigationData)) {
            expandedEntity[navigationProperty] = await shapeCollection(
              navigationData,
              expandItem.options,
              options,
              nestedContext,
              resolveTargetEntityTypeName(entityTypeName, navigationProperty, context.model)
            );
          } else if (navigationData && typeof navigationData === 'object') {
            expandedEntity[navigationProperty] = await shapeEntity(
              navigationData as Record<string, unknown>,
              expandItem.options,
              options,
              nestedContext,
              resolveTargetEntityTypeName(entityTypeName, navigationProperty, context.model)
            );
          }
        }
      } catch (error) {
        console.error(`[OData Shape] Error resolving navigation property ${navigationProperty}:`, error);
        expandedEntity[navigationProperty] = null;
      }
    } else {
      const targetTypeName = resolveTargetEntityTypeName(entityTypeName, navigationProperty, context.model);
      let navigationData = expandedEntity[navigationProperty];

      if (navigationData === undefined && options.autoResolveNavigation !== false && targetTypeName) {
        navigationData = await resolveViaDataProviders(
          expandedEntity,
          navigationProperty,
          targetTypeName,
          entityTypeName,
          context
        );
        expandedEntity[navigationProperty] = navigationData;
      } else if (!(navigationProperty in expandedEntity)) {
        expandedEntity[navigationProperty] = null;
        navigationData = null;
      }

      if (expandItem.options && navigationData) {
        const nestedContext = {
          ...context,
          options: expandItem.options,
          entityType: targetTypeName,
        };

        if (Array.isArray(navigationData)) {
          expandedEntity[navigationProperty] = await shapeCollection(
            navigationData,
            expandItem.options,
            options,
            nestedContext,
            targetTypeName
          );
        } else if (typeof navigationData === 'object') {
          expandedEntity[navigationProperty] = await shapeEntity(
            navigationData as Record<string, unknown>,
            expandItem.options,
            options,
            nestedContext,
            targetTypeName
          );
        }
      }
    }
  }

  return expandedEntity;
}

function buildProjectionList(queryOptions: any): string[] | undefined {
  if (!Array.isArray(queryOptions?.select) || queryOptions.select.length === 0) {
    return undefined;
  }

  const select: string[] = [...queryOptions.select];

  if (Array.isArray(queryOptions?.expand)) {
    for (const item of queryOptions.expand) {
      if (typeof item?.path === 'string' && item.path.length > 0) {
        select.push(item.path);
      }
    }
  }

  const unique = Array.from(new Set(select));
  return unique.length > 0 ? unique : undefined;
}

function determineRootEntityType(context: ODataMiddlewareContext): string | undefined {
  if (context.entityType) {
    return context.entityType;
  }

  if (context.entitySet) {
    return resolveEntityTypeForSet(context.entitySet, context.model);
  }

  return undefined;
}

function resolveEntityTypeForSet(entitySet: string, model: EdmModel): string | undefined {
  return model.entitySets?.find((set) => set.name === entitySet)?.entityType;
}

function resolveTargetEntityTypeName(
  sourceEntityTypeName: string | undefined,
  navigationProperty: string,
  model: EdmModel
): string | undefined {
  if (!sourceEntityTypeName) {
    return undefined;
  }
  const sourceEntity = model.entityTypes?.find((entity) => entity.name === sourceEntityTypeName);
  const nav = sourceEntity?.navigation?.find((n) => n.name === navigationProperty);
  return nav?.target;
}

async function resolveViaDataProviders(
  entity: Record<string, unknown>,
  navigationProperty: string,
  targetEntityTypeName: string,
  sourceEntityTypeName: string | undefined,
  context: ODataMiddlewareContext
): Promise<unknown> {
  const providers = context.dataProviders;
  if (!providers || Object.keys(providers).length === 0) {
    return null;
  }

  const model = context.model;
  const targetEntity = getEntityType(model, targetEntityTypeName);
  if (!targetEntity) {
    return null;
  }

  const sourceEntity = sourceEntityTypeName
    ? getEntityType(model, sourceEntityTypeName)
    : undefined;
  const navigation = sourceEntity?.navigation?.find((nav) => nav.name === navigationProperty);

  const targetEntitySetName = getEntitySetNameForType(model, targetEntityTypeName);
  if (!targetEntitySetName) {
    return null;
  }

  const data = await loadEntitySetFromProvider(targetEntitySetName, context);
  if (!data) {
    return null;
  }

  if (navigation?.collection) {
    return matchCollectionNavigation(
      entity,
      navigationProperty,
      targetEntity,
      data,
      sourceEntityTypeName,
      context
    );
  }

  return matchSingleNavigation(entity, navigationProperty, targetEntity, data);
}

async function loadEntitySetFromProvider(
  entitySetName: string,
  context: ODataMiddlewareContext
): Promise<unknown[] | null> {
  const providers = context.dataProviders;
  if (!providers) return null;
  const provider = providers[entitySetName];
  if (!provider) return null;

  context.runtime = context.runtime || {};
  const cache = context.runtime.dataCache ?? new Map<string, unknown[]>();
  if (cache.has(entitySetName)) {
    return cache.get(entitySetName) ?? null;
  }

  const deadline = context.metadata?.deadline;
  const result = await executeWithDeadline(async () => {
    const provided = await provider();
    return Array.isArray(provided) ? provided : [provided];
  }, deadline, `entity set '${entitySetName}'`);

  cache.set(entitySetName, result);
  context.runtime.dataCache = cache;
  return result;
}

function matchSingleNavigation(
  entity: Record<string, unknown>,
  navigationProperty: string,
  targetEntity: EdmEntityType,
  candidates: unknown[]
): unknown {
  const foreignKeyValue = findForeignKeyValue(entity, navigationProperty, targetEntity);
  if (foreignKeyValue === undefined || foreignKeyValue === null) {
    return null;
  }

  const keyName = targetEntity.key?.[0];
  if (!keyName) {
    return null;
  }

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      const candidateKey = getCaseInsensitiveProperty(candidate as Record<string, unknown>, keyName);
      if (candidateKey?.value === foreignKeyValue) {
        return candidate;
      }
    }
  }

  return null;
}

function matchCollectionNavigation(
  entity: Record<string, unknown>,
  navigationProperty: string,
  targetEntity: EdmEntityType,
  candidates: unknown[],
  sourceEntityTypeName: string | undefined,
  context: ODataMiddlewareContext
): unknown[] {
  const effectiveSourceTypeName = sourceEntityTypeName ?? context.entityType;
  const sourceEntity = effectiveSourceTypeName
    ? getEntityType(context.model, effectiveSourceTypeName)
    : undefined;

  const sourceKeyName = sourceEntity?.key?.[0];
  const sourceKeyValue = sourceKeyName
    ? getCaseInsensitiveProperty(entity, sourceKeyName)?.value
    : undefined;

  if (!sourceKeyName || sourceKeyValue === undefined) {
    return [];
  }

  const foreignKeyCandidates = buildCollectionForeignKeyCandidates(
    effectiveSourceTypeName ?? '',
    navigationProperty,
    sourceKeyName
  );

  return candidates.filter(candidate => {
    if (!candidate || typeof candidate !== 'object') {
      return false;
    }

    for (const candidateKey of foreignKeyCandidates) {
      const prop = getCaseInsensitiveProperty(candidate as Record<string, unknown>, candidateKey);
      if (prop && prop.value === sourceKeyValue) {
        return true;
      }
    }
    return false;
  });
}

function findForeignKeyValue(
  entity: Record<string, unknown>,
  navigationProperty: string,
  targetEntity: EdmEntityType
): unknown {
  const targetKey = targetEntity.key?.[0];
  const candidates = buildForeignKeyCandidates(navigationProperty, targetEntity.name, targetKey);

  for (const candidate of candidates) {
    const prop = getCaseInsensitiveProperty(entity, candidate);
    if (prop) {
      return prop.value;
    }
  }

  return undefined;
}

function buildForeignKeyCandidates(navName: string, targetName: string, targetKey?: string): string[] {
  const formattedNav = lowerFirst(navName);
  const formattedTarget = lowerFirst(targetName);
  const key = targetKey ? capitalize(targetKey) : 'Id';

  const candidates = new Set<string>([
    `${formattedNav}Id`,
    `${formattedNav}${key}`,
    `${formattedTarget}Id`,
    `${formattedTarget}${key}`,
  ]);

  if (targetKey && targetKey.toLowerCase() !== 'id') {
    candidates.add(`${formattedNav}${capitalize(targetKey)}`);
    candidates.add(`${formattedTarget}${capitalize(targetKey)}`);
  }

  return Array.from(candidates);
}

function buildCollectionForeignKeyCandidates(
  sourceEntityTypeName: string,
  navigationProperty: string,
  sourceKeyName?: string
): string[] {
  const baseCandidates = new Set<string>();
  if (sourceEntityTypeName) {
    baseCandidates.add(lowerFirst(sourceEntityTypeName));
  }

  if (navigationProperty) {
    baseCandidates.add(lowerFirst(navigationProperty));
    if (navigationProperty.endsWith('s') && navigationProperty.length > 1) {
      baseCandidates.add(lowerFirst(navigationProperty.slice(0, -1)));
    }
  }

  const candidates = new Set<string>();
  const keySegment = sourceKeyName ? capitalize(sourceKeyName) : 'Id';

  for (const base of baseCandidates) {
    candidates.add(`${base}Id`);
    candidates.add(`${base}${keySegment}`);
  }

  if (sourceKeyName && sourceKeyName.toLowerCase() !== 'id') {
    candidates.add(sourceKeyName);
  }

  return Array.from(candidates);
}

function getEntityType(model: EdmModel, entityTypeName: string): EdmEntityType | undefined {
  return model.entityTypes?.find(entity => entity.name === entityTypeName);
}

function getEntitySetNameForType(model: EdmModel, entityTypeName: string): string | undefined {
  return model.entitySets?.find((set) => set.entityType === entityTypeName)?.name;
}

function getCaseInsensitiveProperty(
  entity: Record<string, unknown>,
  candidateName: string
): { key: string; value: unknown } | null {
  const lower = candidateName.toLowerCase();
  for (const key of Object.keys(entity)) {
    if (key.toLowerCase() === lower) {
      return { key, value: entity[key] };
    }
  }
  return null;
}

function lowerFirst(input: string): string {
  if (!input) return input;
  return input.charAt(0).toLowerCase() + input.slice(1);
}

function capitalize(input: string): string {
  if (!input) return input;
  return input.charAt(0).toUpperCase() + input.slice(1);
}

async function executeWithDeadline<T>(
  operation: () => Promise<T>,
  deadline: number | undefined,
  label: string
): Promise<T> {
  if (!deadline) {
    return await operation();
  }

  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    throw new Error(`Timeout while resolving ${label}`);
  }

  let timeoutHandle: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timeoutHandle = globalThis.setTimeout(() => {
          reject(new Error(`Timeout while resolving ${label}`));
        }, remaining);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      globalThis.clearTimeout(timeoutHandle);
    }
  }
}
