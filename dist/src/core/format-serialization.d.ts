import { ODataEntity } from './types';
export interface SerializationOptions {
    format?: "json" | "xml" | "atom" | "csv" | "text";
    serviceRoot?: string;
    count?: boolean;
    top?: number;
    skip?: number;
    metadata?: "minimal" | "full" | "none";
    annotations?: boolean;
    includeAnnotations?: string[];
    excludeAnnotations?: string[];
    deltaLink?: boolean;
}
export interface SerializedResponse {
    "@odata.context"?: string;
    "@odata.count"?: number;
    "@odata.nextLink"?: string;
    "@odata.deltaLink"?: string;
    "@odata.metadataEtag"?: string;
    value?: any;
    [key: string]: any;
}
export declare function serializeToJson(data: ODataEntity | ODataEntity[], options?: SerializationOptions): SerializedResponse;
export declare function serializeToXml(data: ODataEntity | ODataEntity[], options?: SerializationOptions): string;
export declare function serializeToAtom(data: ODataEntity | ODataEntity[], options?: SerializationOptions): string;
export declare function serializeToCsv(data: ODataEntity[], options?: SerializationOptions): string;
export declare function serializeToText(data: ODataEntity | ODataEntity[], options?: SerializationOptions): string;
export declare function serializeEntity(entity: ODataEntity, options?: SerializationOptions): Record<string, unknown>;
export declare function serializeMetadata(edmModel: unknown, options?: SerializationOptions): string;
export declare function serializeServiceDocument(options?: SerializationOptions): SerializedResponse;
export declare function serializeError(error: Error, options?: SerializationOptions): SerializedResponse;
export declare function getSupportedFormats(): string[];
export declare function validateFormat(format: string): boolean;
export declare function getContentType(format: string): string;
export declare function serializeWithFormat(data: ODataEntity | ODataEntity[], format: string, options?: SerializationOptions): string | SerializedResponse;
