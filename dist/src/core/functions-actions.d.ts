export interface FunctionParameter {
    name: string;
    type: string;
    value: any;
}
export interface FunctionCall {
    name: string;
    parameters?: FunctionParameter[];
    boundTo?: string;
}
export interface ActionParameter {
    name: string;
    type: string;
    value: any;
}
export interface ActionCall {
    name: string;
    parameters?: ActionParameter[];
    boundTo?: string;
}
export interface FunctionResult {
    value: any;
    "@odata.context"?: string;
}
export interface ActionResult {
    value?: any;
    "@odata.context"?: string;
}
export declare function callFunction(functionName: string, parameters?: Record<string, any>): FunctionResult;
export declare function callAction(actionName: string, parameters?: Record<string, any>): ActionResult;
export declare function callBoundFunction(entityId: string, functionName: string, parameters?: Record<string, any>): FunctionResult;
export declare function callBoundAction(entityId: string, actionName: string, parameters?: Record<string, any>): ActionResult;
export declare function registerFunction(name: string, implementation: Function): void;
export declare function registerAction(name: string, implementation: Function): void;
export declare function getFunctionMetadata(functionName: string): any;
export declare function getActionMetadata(actionName: string): any;
export declare function validateFunctionParameters(functionName: string, parameters: Record<string, any>): void;
export declare function validateActionParameters(actionName: string, parameters: Record<string, any>): void;
export declare function executeFunctionImport(functionImportName: string, parameters?: Record<string, any>): FunctionResult;
export declare function executeActionImport(actionImportName: string, parameters?: Record<string, any>): ActionResult;
export declare function getAvailableFunctions(): string[];
export declare function getAvailableActions(): string[];
