import type { MiddlewareObj } from "@middy/core";
import type { EdmModel } from "../core/types";
export interface ODataMiddlewareOptions {
    model: EdmModel;
    serviceRoot: string | ((event: any) => string);
    enable?: {
        compute?: boolean;
        apply?: boolean;
        search?: boolean;
    };
    defaults?: {
        maxTop?: number;
        defaultTop?: number;
    };
}
export declare function odata(options: ODataMiddlewareOptions): MiddlewareObj;
