import { parseODataQuery } from "../core/parse";
export function odata(options) {
    return {
        before: async (request) => {
            const event = request.event ?? {};
            const query = event.rawQueryString
                ? Object.fromEntries(new URLSearchParams(event.rawQueryString))
                : (event.queryStringParameters || {});
            const opts = parseODataQuery(query);
            const serviceRoot = typeof options.serviceRoot === "function" ? options.serviceRoot(event) : options.serviceRoot;
            const ctx = {
                model: options.model,
                serviceRoot,
                entitySet: undefined,
                options: opts,
            };
            request.internal = request.internal || {};
            request.internal.odata = ctx;
        },
    };
}
