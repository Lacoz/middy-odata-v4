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
// Expand navigation properties
export function expandData(data, options) {
    if (!options.expand || options.expand.length === 0) {
        return data;
    }
    if (Array.isArray(data)) {
        return data.map(item => expandData(item, options));
    }
    const expanded = { ...data };
    for (const expandItem of options.expand) {
        const navigationProperty = expandItem.path;
        // Simple expansion - in a real implementation, this would resolve navigation properties
        // For now, we'll just ensure the property exists
        if (navigationProperty && !(navigationProperty in expanded)) {
            // Create a placeholder for the expanded property
            expanded[navigationProperty] = null;
        }
        // Handle nested query options in expansion
        if (expandItem.options) {
            const nestedData = expanded[navigationProperty];
            if (nestedData) {
                expanded[navigationProperty] = expandData(nestedData, expandItem.options);
            }
        }
    }
    return expanded;
}
