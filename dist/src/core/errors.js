export class ODataBadRequest extends Error {
    statusCode = 400;
    code = "BadRequest";
}
export class ODataInternalServerError extends Error {
    statusCode = 500;
    code = "InternalServerError";
}
export function toODataError(err, message) {
    if (err && typeof err === "object" && "statusCode" in err && "message" in err) {
        const e = err;
        return { error: { code: e.code ?? String(e.statusCode), message: e.message } };
    }
    return { error: { code: "InternalServerError", message: message ?? "An error occurred" } };
}
