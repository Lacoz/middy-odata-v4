export type ODataBoolean = boolean;
export type ODataNumber = number;
export type ODataString = string;
export type ODataPrimitive = ODataBoolean | ODataNumber | ODataString | null;

export type ODataValue = ODataPrimitive | ODataEntity | ODataEntity[];

export interface ODataEntity {
  [propertyName: string]: unknown;
}

export interface EdmProperty {
  name: string;
  type: string;
  nullable?: boolean;
}

export interface EdmNavigationProperty {
  name: string;
  target: string;
  collection?: boolean;
}

export interface EdmEntityType {
  name: string;
  key: string[];
  properties: EdmProperty[];
  navigation?: EdmNavigationProperty[];
}

export interface EdmEntitySet {
  name: string;
  entityType: string;
}

export interface EdmModel {
  namespace: string;
  entityTypes: EdmEntityType[];
  entitySets: EdmEntitySet[];
}

export interface ODataQueryOptions {
  select?: string[];
  expand?: Record<string, ODataQueryOptions>;
  filter?: string;
  orderby?: { property: string; direction: "asc" | "desc" }[];
  top?: number;
  skip?: number;
  count?: boolean;
}

export interface ODataRequestContext {
  model: EdmModel;
  serviceRoot: string;
  entitySet?: string;
  options: ODataQueryOptions;
}

export interface ODataCollectionResponse<T = unknown> {
  "@odata.context": string;
  value: T[];
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
}

export interface ODataErrorDetail {
  code?: string;
  message: string;
  target?: string;
}

export interface ODataErrorPayload {
  error: {
    code?: string;
    message: string;
    target?: string;
    details?: ODataErrorDetail[];
  };
}
