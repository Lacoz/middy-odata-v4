import type { EdmModel } from "./types";

export function generateMetadata(model: EdmModel, serviceRoot: string): any {
  const metadata: any = {
    "@odata.context": `${serviceRoot}/$metadata`,
    "@odata.metadataEtag": `"${Date.now()}"`,
    "$Version": "4.01"
  };

  // Add schema
  if (model.namespace) {
    metadata[model.namespace] = {
      "$Kind": "Schema",
      "$Alias": model.namespace
    };

    // Add entity types
    if (model.entityTypes) {
      for (const entityType of model.entityTypes) {
        const entityTypeDef: any = {
          "$Kind": "EntityType"
        };

        // Add key
        if (entityType.key && entityType.key.length > 0) {
          entityTypeDef.$Key = entityType.key.map(key => `${entityType.name}/${key}`);
        }

        // Add properties
        if (entityType.properties) {
          for (const prop of entityType.properties) {
            entityTypeDef[prop.name] = {
              $Type: prop.type
            };
            if (prop.nullable !== undefined) {
              entityTypeDef[prop.name].$Nullable = prop.nullable;
            }
          }
        }

        // Add navigation properties
        if (entityType.navigation) {
          for (const nav of entityType.navigation) {
            entityTypeDef[nav.name] = {
              $Type: nav.collection ? `Collection(${nav.target})` : nav.target
            };
          }
        }

        metadata[model.namespace][entityType.name] = entityTypeDef;
      }
    }

    // Add complex types
    if (model.complexTypes) {
      for (const complexType of model.complexTypes) {
        const complexTypeDef: any = {
          "$Kind": "ComplexType"
        };

        if (complexType.properties) {
          for (const prop of complexType.properties) {
            complexTypeDef[prop.name] = {
              $Type: prop.type
            };
          }
        }

        metadata[model.namespace][complexType.name] = complexTypeDef;
      }
    }

    // Add enums
    if (model.enumTypes) {
      for (const enumType of model.enumTypes) {
        const enumDef: any = {
          "$Kind": "EnumType",
          $UnderlyingType: enumType.underlyingType || "Edm.Int32"
        };

        if (enumType.members) {
          for (const member of enumType.members) {
            enumDef[member.name] = {
              $Value: member.value
            };
          }
        }

        metadata[model.namespace][enumType.name] = enumDef;
      }
    }

    // Add functions
    if (model.functions) {
      for (const func of model.functions) {
        const funcDef: any = {
          "$Kind": "Function"
        };

        if (func.parameters) {
          for (const param of func.parameters) {
            funcDef[param.name] = {
              $Type: param.type
            };
          }
        }

        if (func.returnType) {
          funcDef.$ReturnType = func.returnType;
        }

        metadata[model.namespace][func.name] = funcDef;
      }
    }

    // Add actions
    if (model.actions) {
      for (const action of model.actions) {
        const actionDef: any = {
          "$Kind": "Action"
        };

        if (action.parameters) {
          for (const param of action.parameters) {
            actionDef[param.name] = {
              $Type: param.type
            };
          }
        }

        if (action.returnType) {
          actionDef.$ReturnType = action.returnType;
        }

        metadata[model.namespace][action.name] = actionDef;
      }
    }
  }

  // Add entity container
  const containerName = model.containerName || "Container";
  metadata[containerName] = {
    "$Kind": "EntityContainer",
    $Extends: model.extends || undefined
  };

  // Add entity sets
  if (model.entitySets) {
    for (const entitySet of model.entitySets) {
      metadata[containerName][entitySet.name] = {
        $Collection: true,
        $Type: `${model.namespace}.${entitySet.entityType}`
      };
    }
  }

  // Add singletons
  if (model.singletons) {
    for (const singleton of model.singletons) {
      metadata[containerName][singleton.name] = {
        $Type: `${model.namespace}.${singleton.entityType}`
      };
    }
  }

  // Add function imports
  if (model.functionImports) {
    for (const funcImport of model.functionImports) {
      metadata[containerName][funcImport.name] = {
        $Function: `${model.namespace}.${funcImport.function}`
      };
    }
  }

  // Add action imports
  if (model.actionImports) {
    for (const actionImport of model.actionImports) {
      metadata[containerName][actionImport.name] = {
        $Action: `${model.namespace}.${actionImport.action}`
      };
    }
  }

  return metadata;
}

export function generateServiceDocument(model: EdmModel, serviceRoot: string): any {
  const serviceDoc: any = {
    "@odata.context": `${serviceRoot}/$metadata`,
    "value": []
  };

  // Add entity sets
  if (model.entitySets) {
    for (const entitySet of model.entitySets) {
      serviceDoc.value.push({
        name: entitySet.name,
        kind: "EntitySet",
        url: entitySet.name,
        title: entitySet.title || entitySet.name
      });
    }
  }

  // Add singletons
  if (model.singletons) {
    for (const singleton of model.singletons) {
      serviceDoc.value.push({
        name: singleton.name,
        kind: "Singleton",
        url: singleton.name,
        title: singleton.title || singleton.name
      });
    }
  }

  // Add function imports
  if (model.functionImports) {
    for (const funcImport of model.functionImports) {
      serviceDoc.value.push({
        name: funcImport.name,
        kind: "FunctionImport",
        url: funcImport.name,
        title: funcImport.title || funcImport.name
      });
    }
  }

  // Add action imports
  if (model.actionImports) {
    for (const actionImport of model.actionImports) {
      serviceDoc.value.push({
        name: actionImport.name,
        kind: "ActionImport",
        url: actionImport.name,
        title: actionImport.title || actionImport.name
      });
    }
  }

  return serviceDoc;
}
