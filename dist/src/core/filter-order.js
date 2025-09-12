export function filterArray(rows, options) {
    if (!options.filter)
        return rows;
    // Placeholder: filtering to be implemented via tests.
    return rows;
}
export function orderArray(rows, options) {
    if (!options.orderby || options.orderby.length === 0)
        return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
        for (const term of options.orderby) {
            const av = a[term.property];
            const bv = b[term.property];
            if (av == null && bv == null)
                continue;
            if (av == null)
                return term.direction === "asc" ? -1 : 1;
            if (bv == null)
                return term.direction === "asc" ? 1 : -1;
            if (av < bv)
                return term.direction === "asc" ? -1 : 1;
            if (av > bv)
                return term.direction === "asc" ? 1 : -1;
        }
        return 0;
    });
    return copy;
}
export function paginateArray(rows, options) {
    const skip = options.skip ?? 0;
    const top = options.top ?? rows.length;
    return rows.slice(skip, skip + top);
}
