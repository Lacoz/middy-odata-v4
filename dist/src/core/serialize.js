export function serializeCollection(contextUrl, value, count, nextLink) {
    const out = {
        "@odata.context": contextUrl,
        value,
    };
    if (typeof count === "number")
        out["@odata.count"] = count;
    if (nextLink)
        out["@odata.nextLink"] = nextLink;
    return out;
}
