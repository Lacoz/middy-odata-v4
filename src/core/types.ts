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
  title?: string;
}

export interface EdmComplexType {
  name: string;
  properties: EdmProperty[];
}

export interface EdmEnumMember {
  name: string;
  value: number;
}

export interface EdmEnumType {
  name: string;
  underlyingType?: string;
  members: EdmEnumMember[];
}

export interface EdmFunctionParameter {
  name: string;
  type: string;
}

export interface EdmFunction {
  name: string;
  parameters?: EdmFunctionParameter[];
  returnType?: string;
}

export interface EdmAction {
  name: string;
  parameters?: EdmFunctionParameter[];
  returnType?: string;
}

export interface EdmFunctionImport {
  name: string;
  function: string;
  title?: string;
}

export interface EdmActionImport {
  name: string;
  action: string;
  title?: string;
}

export interface EdmSingleton {
  name: string;
  entityType: string;
  title?: string;
}

export interface EdmModel {
  namespace: string;
  entityTypes: EdmEntityType[];
  entitySets: EdmEntitySet[];
  complexTypes?: EdmComplexType[];
  enumTypes?: EdmEnumType[];
  functions?: EdmFunction[];
  actions?: EdmAction[];
  functionImports?: EdmFunctionImport[];
  actionImports?: EdmActionImport[];
  singletons?: EdmSingleton[];
  containerName?: string;
  extends?: string;
}

export interface ODataExpandItem {
  path: string;
  options?: ODataQueryOptions;
}

export interface ODataQueryOptions {
  select?: string[];
  expand?: ODataExpandItem[];
  filter?: string;
  orderby?: { property: string; direction: "asc" | "desc" }[];
  top?: number;
  skip?: number;
  count?: boolean;
  search?: string;
  compute?: string[];
  apply?: string;
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
