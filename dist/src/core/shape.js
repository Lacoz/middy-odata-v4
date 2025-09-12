export function applySelect(row, select) {
    if (!select || select.length === 0)
        return { ...row };
    const out = {};
    for (const p of select)
        if (p in row)
            out[p] = row[p];
    return out;
}
export function projectArray(rows, options) {
    return rows.map((r) => applySelect(r, options.select));
}
// TODO: Implement expand functionality
export function expandData(data, options) {
    // Placeholder implementation
    return data;
}
