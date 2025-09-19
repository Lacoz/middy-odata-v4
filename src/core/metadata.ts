/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EdmModel } from "./types";

function applyAnnotations(target: Record<string, unknown>, annotations?: Record<string, unknown>): void {
  if (!annotations) return;
  for (const [term, value] of Object.entries(annotations)) {
    target[`@${term}`] = value;
  }
}

function fullyQualifyName(model: EdmModel, name?: string): string | undefined {
  if (!name) return undefined;
  if (name.includes('.')) return name;
  return `${model.namespace}.${name}`;
}

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
    applyAnnotations(metadata[model.namespace], model.annotations);

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

        if (entityType.baseType) {
          entityTypeDef.$BaseType = fullyQualifyName(model, entityType.baseType);
        }

        // Add properties
        if (entityType.properties) {
          for (const prop of entityType.properties) {
            const propDef: Record<string, unknown> = {
              $Type: prop.type
            };
            if (prop.nullable !== undefined) {
              propDef.$Nullable = prop.nullable;
            }
            applyAnnotations(propDef, prop.annotations);
            entityTypeDef[prop.name] = propDef;
          }
        }

        // Add navigation properties
        if (entityType.navigation) {
          for (const nav of entityType.navigation) {
            const navDef: Record<string, unknown> = {
              $Type: nav.collection ? `Collection(${nav.target})` : nav.target
            };
            applyAnnotations(navDef, nav.annotations);
            entityTypeDef[nav.name] = navDef;
          }
        }

        applyAnnotations(entityTypeDef, entityType.annotations);
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

        applyAnnotations(funcDef, func.annotations);
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

        applyAnnotations(actionDef, action.annotations);
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
      const setDef: Record<string, unknown> = {
        $Collection: true,
        $Type: fullyQualifyName(model, entitySet.entityType)
      };

      if (entitySet.navigationBindings && entitySet.navigationBindings.length > 0) {
        setDef.$NavigationPropertyBinding = entitySet.navigationBindings.reduce<Record<string, string>>((acc, binding) => {
          acc[binding.path] = fullyQualifyName(model, binding.target) ?? binding.target;
          return acc;
        }, {});
      }

      applyAnnotations(setDef, entitySet.annotations);
      metadata[containerName][entitySet.name] = setDef;
    }
  }

  // Add singletons
  if (model.singletons) {
    for (const singleton of model.singletons) {
      const singletonDef: Record<string, unknown> = {
        $Type: fullyQualifyName(model, singleton.entityType)
      };
      if (singleton.title) {
        singletonDef['@Org.OData.Display.V1.Title'] = singleton.title;
      }
      applyAnnotations(singletonDef, singleton.annotations);
      metadata[containerName][singleton.name] = singletonDef;
    }
  }

  // Add function imports
  if (model.functionImports) {
    for (const funcImport of model.functionImports) {
      const funcImportDef: Record<string, unknown> = {
        $Function: `${model.namespace}.${funcImport.function}`
      };
      if (funcImport.title) {
        funcImportDef['@Org.OData.Display.V1.Title'] = funcImport.title;
      }
      applyAnnotations(funcImportDef, funcImport.annotations);
      metadata[containerName][funcImport.name] = funcImportDef;
    }
  }

  // Add action imports
  if (model.actionImports) {
    for (const actionImport of model.actionImports) {
      const actionImportDef: Record<string, unknown> = {
        $Action: `${model.namespace}.${actionImport.action}`
      };
      if (actionImport.title) {
        actionImportDef['@Org.OData.Display.V1.Title'] = actionImport.title;
      }
      applyAnnotations(actionImportDef, actionImport.annotations);
      metadata[containerName][actionImport.name] = actionImportDef;
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
