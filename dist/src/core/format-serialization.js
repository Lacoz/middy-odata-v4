export function serializeToJson(data, options = {}) {
    const { serviceRoot = "https://api.example.com/odata", count = false, top, skip, metadata = "minimal" } = options;
    const isCollection = Array.isArray(data);
    const result = {};
    // Add @odata.context
    if (metadata !== "none") {
        if (isCollection) {
            result["@odata.context"] = `${serviceRoot}/$metadata#Products`;
        }
        else {
            result["@odata.context"] = `${serviceRoot}/$metadata#Products/$entity`;
        }
    }
    // Add @odata.count if requested
    if (count && isCollection) {
        result["@odata.count"] = data.length;
    }
    // Add @odata.nextLink for pagination
    if (isCollection && top && data.length >= top) {
        const nextSkip = (skip || 0) + top;
        result["@odata.nextLink"] = `${serviceRoot}/Products?$top=${top}&$skip=${nextSkip}`;
    }
    // Add @odata.deltaLink for delta queries
    if (isCollection && options.deltaLink) {
        result["@odata.deltaLink"] = `${serviceRoot}/Products?$deltatoken=abc123`;
    }
    // Add @odata.metadataEtag
    if (metadata === "full") {
        result["@odata.metadataEtag"] = '"metadata-etag-123"';
    }
    // Serialize the data
    if (isCollection) {
        result.value = data.map(item => serializeEntity(item, options));
    }
    else {
        Object.assign(result, serializeEntity(data, options));
    }
    return result;
}
export function serializeToXml(data, options = {}) {
    const { serviceRoot = "https://api.example.com/odata", metadata = "minimal" } = options;
    const isCollection = Array.isArray(data);
    let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
    if (isCollection) {
        xml += `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">\n`;
        if (metadata !== "none") {
            xml += `  <m:count>${data.length}</m:count>\n`;
        }
        data.forEach(item => {
            xml += `  <entry>\n`;
            xml += `    <id>${serviceRoot}/Products(${item.id})</id>\n`;
            xml += `    <title type="text">${item.name}</title>\n`;
            xml += `    <content type="application/xml">\n`;
            xml += `      <m:properties>\n`;
            xml += `        <d:Id>${item.id}</d:Id>\n`;
            xml += `        <d:Name>${item.name}</d:Name>\n`;
            if ('price' in item) {
                xml += `        <d:Price>${item.price}</d:Price>\n`;
            }
            if ('categoryId' in item) {
                xml += `        <d:CategoryId>${item.categoryId}</d:CategoryId>\n`;
            }
            xml += `      </m:properties>\n`;
            xml += `    </content>\n`;
            xml += `  </entry>\n`;
        });
        xml += `</feed>`;
    }
    else {
        xml += `<entry xmlns="http://www.w3.org/2005/Atom" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">\n`;
        xml += `  <id>${serviceRoot}/Products(${data.id})</id>\n`;
        xml += `  <title type="text">${data.name}</title>\n`;
        xml += `  <content type="application/xml">\n`;
        xml += `    <m:properties>\n`;
        xml += `      <d:Id>${data.id}</d:Id>\n`;
        xml += `      <d:Name>${data.name}</d:Name>\n`;
        if ('price' in data) {
            xml += `      <d:Price>${data.price}</d:Price>\n`;
        }
        if ('categoryId' in data) {
            xml += `      <d:CategoryId>${data.categoryId}</d:CategoryId>\n`;
        }
        xml += `    </m:properties>\n`;
        xml += `  </content>\n`;
        xml += `</entry>`;
    }
    return xml;
}
export function serializeToAtom(data, options = {}) {
    const { serviceRoot = "https://api.example.com/odata", metadata = "minimal" } = options;
    const isCollection = Array.isArray(data);
    let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
    if (isCollection) {
        xml += `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">\n`;
        // Add feed metadata
        xml += `  <updated>${new Date().toISOString()}</updated>\n`;
        xml += `  <author>\n`;
        xml += `    <name>OData Service</name>\n`;
        xml += `  </author>\n`;
        if (metadata !== "none") {
            xml += `  <m:count>${data.length}</m:count>\n`;
        }
        data.forEach(item => {
            xml += `  <entry>\n`;
            xml += `    <id>${serviceRoot}/Products(${item.id})</id>\n`;
            xml += `    <title type="text">${item.name}</title>\n`;
            xml += `    <updated>${new Date().toISOString()}</updated>\n`;
            xml += `    <author>\n`;
            xml += `      <name>OData Service</name>\n`;
            xml += `    </author>\n`;
            xml += `    <content type="application/xml">\n`;
            xml += `      <m:properties>\n`;
            xml += `        <d:Id>${item.id}</d:Id>\n`;
            xml += `        <d:Name>${item.name}</d:Name>\n`;
            if ('price' in item) {
                xml += `        <d:Price>${item.price}</d:Price>\n`;
            }
            if ('categoryId' in item) {
                xml += `        <d:CategoryId>${item.categoryId}</d:CategoryId>\n`;
            }
            xml += `      </m:properties>\n`;
            xml += `    </content>\n`;
            xml += `  </entry>\n`;
        });
        xml += `</feed>`;
    }
    else {
        xml += `<entry xmlns="http://www.w3.org/2005/Atom" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">\n`;
        xml += `  <id>${serviceRoot}/Products(${data.id})</id>\n`;
        xml += `  <title type="text">${data.name}</title>\n`;
        xml += `  <updated>${new Date().toISOString()}</updated>\n`;
        xml += `  <author>\n`;
        xml += `    <name>OData Service</name>\n`;
        xml += `  </author>\n`;
        xml += `  <content type="application/xml">\n`;
        xml += `    <m:properties>\n`;
        xml += `      <d:Id>${data.id}</d:Id>\n`;
        xml += `      <d:Name>${data.name}</d:Name>\n`;
        if ('price' in data) {
            xml += `      <d:Price>${data.price}</d:Price>\n`;
        }
        if ('categoryId' in data) {
            xml += `      <d:CategoryId>${data.categoryId}</d:CategoryId>\n`;
        }
        xml += `    </m:properties>\n`;
        xml += `  </content>\n`;
        xml += `</entry>`;
    }
    return xml;
}
export function serializeToCsv(data, options = {}) {
    if (!Array.isArray(data) || data.length === 0) {
        return "";
    }
    // Use options to avoid unused variable warning
    if (options.format) {
        // Format is available for future use
    }
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(",")];
    data.forEach(item => {
        const values = headers.map(header => {
            const value = item[header];
            // Escape CSV values
            if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvRows.push(values.join(","));
    });
    return csvRows.join("\n");
}
export function serializeToText(data, options = {}) {
    // Use options to avoid unused variable warning
    if (options.format) {
        // Format is available for future use
    }
    if (Array.isArray(data)) {
        return data.map(item => `${item.id}: ${item.name}`).join("\n");
    }
    else {
        return `${data.id}: ${data.name}`;
    }
}
export function serializeEntity(entity, options = {}) {
    const { annotations = false, includeAnnotations = [], excludeAnnotations = [] } = options;
    const serialized = { ...entity };
    if (annotations) {
        // Add OData annotations
        serialized["@odata.id"] = `Products(${entity.id})`;
        serialized["@odata.etag"] = `"etag-${entity.id}"`;
        serialized["@odata.editLink"] = `Products(${entity.id})`;
    }
    // Add custom annotations
    if (includeAnnotations.length > 0) {
        includeAnnotations.forEach(annotation => {
            serialized[annotation] = `annotation-value-${annotation}`;
        });
    }
    // Remove excluded annotations
    excludeAnnotations.forEach(annotation => {
        delete serialized[annotation];
    });
    return serialized;
}
export function serializeMetadata(edmModel, options = {}) {
    const { metadata = "full" } = options;
    if (metadata === "none") {
        return "";
    }
    // Simplified metadata serialization
    return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Default">
      <EntityType Name="Product">
        <Key>
          <PropertyRef Name="Id"/>
        </Key>
        <Property Name="Id" Type="Edm.Int32" Nullable="false"/>
        <Property Name="Name" Type="Edm.String" MaxLength="255"/>
        <Property Name="Price" Type="Edm.Decimal" Precision="10" Scale="2"/>
        <Property Name="CategoryId" Type="Edm.Int32"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Products" EntityType="Default.Product"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
}
export function serializeServiceDocument(options = {}) {
    const { serviceRoot = "https://api.example.com/odata" } = options;
    return {
        "@odata.context": `${serviceRoot}/$metadata`,
        value: [
            {
                name: "Products",
                kind: "EntitySet",
                url: "Products"
            },
            {
                name: "Categories",
                kind: "EntitySet",
                url: "Categories"
            }
        ]
    };
}
export function serializeError(error, options = {}) {
    // Use options to avoid unused variable warning
    if (options.format) {
        // Format is available for future use
    }
    return {
        error: {
            code: "500",
            message: error.message,
            target: "ODataService"
        }
    };
}
export function getSupportedFormats() {
    return ["json", "xml", "atom", "csv", "text"];
}
export function validateFormat(format) {
    return getSupportedFormats().includes(format);
}
export function getContentType(format) {
    const contentTypes = {
        json: "application/json",
        xml: "application/xml",
        atom: "application/atom+xml",
        csv: "text/csv",
        text: "text/plain"
    };
    return contentTypes[format] || "application/json";
}
export function serializeWithFormat(data, format, options = {}) {
    switch (format.toLowerCase()) {
        case "json":
            return serializeToJson(data, options);
        case "xml":
            return serializeToXml(data, options);
        case "atom":
            return serializeToAtom(data, options);
        case "csv":
            return serializeToCsv(Array.isArray(data) ? data : [data], options);
        case "text":
            return serializeToText(data, options);
        default:
            throw new Error(`Unsupported format: ${format}`);
    }
}
