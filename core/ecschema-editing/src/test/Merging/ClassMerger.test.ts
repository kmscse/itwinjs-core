/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { CustomAttributeClass, EntityClass, Mixin, Schema, SchemaContext, SchemaItemType, StructClass } from "@itwin/ecschema-metadata";
import { SchemaMerger } from "../../Merging/SchemaMerger";
import { expect } from "chai";
import { SchemaOtherTypes } from "../../Differencing/SchemaDifference";
import { ECEditingStatus } from "../../Editing/Exception";

/* eslint-disable @typescript-eslint/naming-convention */

describe("Class merger tests", () => {
  let targetContext: SchemaContext;
  const targetJson = {
    $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
    name: "TargetSchema",
    version: "1.0.0",
    alias: "target",
  };

  beforeEach(() => {
    targetContext = new SchemaContext();
  });

  it("should merge missing struct class", async () => {
    await Schema.fromJson(targetJson, targetContext);
    const merger = new SchemaMerger(targetContext);
    const mergedSchema = await merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaItemType.StructClass,
          itemName: "TestStruct",
          difference: {
            label: "Test Structure",
            description: "Description for Test Structure",
          },
        },
      ],
    });
    const mergedItem = await mergedSchema.getItem<StructClass>("TestStruct");
    expect(mergedItem!.toJSON()).deep.eq({
      schemaItemType: "StructClass",
      label: "Test Structure",
      description: "Description for Test Structure",
    });
  });

  it("should merge missing custom attribute class", async () => {
    await Schema.fromJson(targetJson, targetContext);
    const merger = new SchemaMerger(targetContext);
    const mergedSchema = await merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaItemType.CustomAttributeClass,
          itemName: "TestCAClass",
          difference: {
            label: "Test Custom Attribute Class",
            appliesTo: "AnyClass",
          },
        },
      ],
    });

    const mergedItem = await mergedSchema.getItem<CustomAttributeClass>("TestCAClass");
    expect(mergedItem!.toJSON()).deep.eq({
      schemaItemType: "CustomAttributeClass",
      label: "Test Custom Attribute Class",
      appliesTo: "AnyClass",
    });
  });

  it("should merge missing entity class with baseClass", async () => {
    await Schema.fromJson(targetJson, targetContext);
    const merger = new SchemaMerger(targetContext);
    const mergedSchema = await merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaItemType.EntityClass,
          itemName: "TestBase",
          difference: {
            modifier: "Abstract",
          },
        },
        {
          changeType: "add",
          schemaType: SchemaItemType.EntityClass,
          itemName: "TestEntity",
          difference: {
            label: "Test Entity",
            description: "Description for TestEntity",
            baseClass: "SourceSchema.TestBase",
          },
        },
      ],
    });
    const mergedItem = await mergedSchema.getItem<EntityClass>("TestEntity");
    expect(mergedItem!.toJSON()).deep.eq({
      schemaItemType: "EntityClass",
      label: "Test Entity",
      description: "Description for TestEntity",
      baseClass: "TargetSchema.TestBase",
    });
  });

  it("should merge missing entity class with referenced baseClass", async () => {
    const referencedSchema = {
      $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
      name: "TestSchema",
      version: "01.00.15",
      alias: "test",
      items: {
        TestBase: {
          schemaItemType: "EntityClass",
          modifier: "Abstract",
        },
      },
    };

    await Schema.fromJson(referencedSchema, targetContext);
    await Schema.fromJson(targetJson, targetContext);
    const merger = new SchemaMerger(targetContext);
    const mergedSchema = await merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaOtherTypes.SchemaReference,
          difference: {
            name: "TestSchema",
            version: "01.00.15",
          },
        },
        {
          changeType: "add",
          schemaType: SchemaItemType.EntityClass,
          itemName: "TestEntity",
          difference: {
            label: "Test Entity",
            description: "Description for TestEntity",
            baseClass: "TestSchema.TestBase",
          },
        },
      ],
    });
    const mergedItem = await mergedSchema.getItem<EntityClass>("TestEntity");
    expect(mergedItem!.toJSON()).deep.eq({
      schemaItemType: "EntityClass",
      label: "Test Entity",
      description: "Description for TestEntity",
      baseClass: "TestSchema.TestBase",
    });
  });

  it("should merge missing entity class with referenced mixin", async () => {
    const referencedSchema = {
      $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
      name: "TestSchema",
      version: "01.00.15",
      alias: "test",
      items: {
        BaseClass: {
          schemaItemType: "EntityClass",
        },
        TestMixin: {
          schemaItemType: "Mixin",
          appliesTo: "TestSchema.BaseClass",
        },
      },
    };

    await Schema.fromJson(referencedSchema, targetContext);
    await Schema.fromJson(targetJson, targetContext);
    const merger = new SchemaMerger(targetContext);
    const mergedSchema = await merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaOtherTypes.SchemaReference,
          difference: {
            name: "TestSchema",
            version: "01.00.15",
          },
        },
        {
          changeType: "add",
          schemaType: SchemaItemType.EntityClass,
          itemName: "TestEntity",
          difference: {
            label: "Test Entity",
            description: "Description for TestEntity",
            baseClass: "TestSchema.BaseClass",
            mixins: [
              "TestSchema.TestMixin",
            ],
          },
        },
      ],
    });

    const mergedItem = await mergedSchema.getItem<EntityClass>("TestEntity");
    expect(mergedItem!.toJSON()).deep.eq({
      schemaItemType: "EntityClass",
      label: "Test Entity",
      description: "Description for TestEntity",
      baseClass: "TestSchema.BaseClass",
      mixins: [
        "TestSchema.TestMixin",
      ],
    });
  });

  it("should merge missing mixin", async () => {
    await Schema.fromJson(targetJson, targetContext);
    const merger = new SchemaMerger(targetContext);
    const mergedSchema = await merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaItemType.EntityClass,
          itemName: "TestEntity",
          difference: {
            modifier: "Abstract",
          },
        },
        {
          changeType: "add",
          schemaType: SchemaItemType.Mixin,
          itemName: "TestMixin",
          difference: {
            label: "Test Mixin",
            description: "Description for TestMixin",
            appliesTo: "SourceSchema.TestEntity",
          },
        },
      ],
    });
    const mergedItem = await mergedSchema.getItem<Mixin>("TestMixin");
    expect(mergedItem!.toJSON()).deep.eq({
      schemaItemType: "Mixin",
      label: "Test Mixin",
      description: "Description for TestMixin",
      appliesTo: "TargetSchema.TestEntity",
    });
  });

  it("should merge mixin base class derived from the current base class", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        BaseEntity: {
          schemaItemType: SchemaItemType.EntityClass,
          modifier: "Abstract",
        },
        TestEntity: {
          schemaItemType: SchemaItemType.EntityClass,
          baseClass: "TargetSchema.BaseEntity",
        },
        BaseMixin: {
          schemaItemType: "Mixin",
          appliesTo: "TargetSchema.BaseEntity",
        },
        TestMixin: {
          schemaItemType: "Mixin",
          baseClass: "TargetSchema.BaseMixin",
          appliesTo: "TargetSchema.TestEntity",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const mergedSchema = await merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaItemType.Mixin,
          itemName: "TestBase",
          difference: {
            baseClass: "SourceSchema.BaseMixin",
            appliesTo: "SourceSchema.BaseEntity",
          },
        },
        {
          changeType: "modify",
          schemaType: SchemaItemType.Mixin,
          itemName: "TestMixin",
          difference: {
            baseClass: "SourceSchema.TestBase",
          },
        },
      ],
    });
    const mergedItem = await mergedSchema.getItem<Mixin>("TestMixin");
    expect(mergedItem!.toJSON().baseClass).deep.eq("TargetSchema.TestBase");
  });

  it("should merge struct class changes", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        TestStruct: {
          schemaItemType: "StructClass",
          label: "Struct",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const mergedSchema = await merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "modify",
          schemaType: SchemaItemType.StructClass,
          itemName: "TestStruct",
          difference: {
            description: "Description for Test Structure",
            label: "Test Structure",
          },
        },
      ],
    });

    const mergedItem = await mergedSchema.getItem<StructClass>("TestStruct");
    expect(mergedItem!.toJSON()).deep.eq({
      schemaItemType: "StructClass",
      description: "Description for Test Structure",
      label: "Test Structure",
    });
  });

  it("should merge struct base class derived from the existing base class", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        BaseStruct: {
          schemaItemType: "StructClass",
        },
        TestStruct: {
          schemaItemType: "StructClass",
          baseClass: "TargetSchema.BaseStruct",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const mergedSchema = await merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaItemType.StructClass,
          itemName: "TestBase",
          difference: {
            baseClass: "SourceSchema.BaseStruct",
          },
        },
        {
          changeType: "modify",
          schemaType: SchemaItemType.StructClass,
          itemName: "TestStruct",
          difference: {
            baseClass: "SourceSchema.TestBase",
          },
        },
      ],
    });
    const mergedItem = await mergedSchema.getItem<StructClass>("TestStruct");
    expect(mergedItem!.toJSON().baseClass).deep.eq("TargetSchema.TestBase");
  });

  it("should merge custom attribute class changes", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        TestCAClass: {
          schemaItemType: "CustomAttributeClass",
          label: "TestCustomAttributeClass",
          appliesTo: "AnyProperty",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const mergedSchema = await merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "modify",
          schemaType: SchemaItemType.CustomAttributeClass,
          itemName: "TestCAClass",
          difference: {
            label: "Test Custom Attribute Class",
            appliesTo: "AnyClass",
          },
        },
      ],
    });

    const mergedItem = await mergedSchema.getItem<CustomAttributeClass>("TestCAClass");
    expect(mergedItem!.toJSON()).deep.eq({
      schemaItemType: "CustomAttributeClass",
      label: "Test Custom Attribute Class",
      appliesTo: "AnyClass, AnyProperty",
    });
  });

  it("should merge custom attribute base class derived from the current base class", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        BaseCAClass: {
          schemaItemType: "CustomAttributeClass",
          appliesTo: "AnyProperty",
        },
        TestCAClass: {
          schemaItemType: "CustomAttributeClass",
          appliesTo: "AnyProperty",
          baseClass: "TargetSchema.BaseCAClass",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const mergedSchema = await merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaItemType.CustomAttributeClass,
          itemName: "TestBase",
          difference: {
            baseClass: "SourceSchema.BaseCAClass",
            appliesTo: "AnyProperty",
          },
        },
        {
          changeType: "modify",
          schemaType: SchemaItemType.CustomAttributeClass,
          itemName: "TestCAClass",
          difference: {
            baseClass: "SourceSchema.TestBase",
          },
        },
      ],
    });
    const mergedItem = await mergedSchema.getItem<CustomAttributeClass>("TestCAClass");
    expect(mergedItem!.toJSON().baseClass).deep.eq("TargetSchema.TestBase");
  });

  it("should merge class modifier changed from Sealed to None", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        TestEntity: {
          schemaItemType: "EntityClass",
          modifier: "Sealed",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const mergedSchema = await merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "modify",
          schemaType: SchemaItemType.EntityClass,
          itemName: "TestEntity",
          difference: {
            modifier: "None",
          },
        },
      ],
    });
    const mergedItem = await mergedSchema.getItem<EntityClass>("TestEntity");
    expect(mergedItem!.toJSON()).deep.eq({
      schemaItemType: "EntityClass",
      // If modifier is set to None, it won't appear in the JSON
    });
  });

  it("should merge entity base class derived from the existing base class", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        BaseEntity: {
          schemaItemType: "EntityClass",
          modifier: "Abstract",
        },
        TestEntity: {
          schemaItemType: "EntityClass",
          baseClass: "TargetSchema.BaseEntity",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const mergedSchema = await merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaItemType.EntityClass,
          itemName: "TestBase",
          difference: {
            baseClass: "SourceSchema.BaseEntity",
          },
        },
        {
          changeType: "modify",
          schemaType: SchemaItemType.EntityClass,
          itemName: "TestEntity",
          difference: {
            baseClass: "SourceSchema.TestBase",
          },
        },
      ],
    });
    const mergedItem = await mergedSchema.getItem<EntityClass>("TestEntity");
    expect(mergedItem!.toJSON().baseClass).deep.eq("TargetSchema.TestBase");
  });

  it.skip("should throw an error when merging classes with different schema item types", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        TestClass: {
          schemaItemType: "StructClass",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const merge = merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "modify",
          schemaType: SchemaItemType.StructClass,
          itemName: "TestClass",
          difference: {
            schemaItemType: "EntityClass",
          } as any, // difference needs to be any-fied to be able to set the schemaItemType property.
        },
      ],
    });
    await expect(merge).to.be.rejectedWith("Changing the class 'TestClass' type is not supported.");
  });

  it("should throw an error when merging class modifier changed from Abstract to Sealed", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        TestEntity: {
          schemaItemType: "EntityClass",
          modifier: "Abstract",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const merge = merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "modify",
          schemaType: SchemaItemType.EntityClass,
          itemName: "TestEntity",
          difference: {
            modifier: "Sealed",
          },
        },
      ],
    });

    await expect(merge).to.be.rejectedWith("Changing the class 'TestEntity' modifier is not supported.");
  });

  it("should throw an error when merging entity base class to one that doesn't derive from", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        TargetBase: {
          schemaItemType: "EntityClass",
        },
        TestEntity: {
          schemaItemType: "EntityClass",
          baseClass: "TargetSchema.TargetBase",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const merge = merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaItemType.EntityClass,
          itemName: "SourceBase",
          difference: {
          },
        },
        {
          changeType: "add",
          schemaType: SchemaItemType.EntityClass,
          itemName: "TestBase",
          difference: {
            baseClass: "SourceSchema.SourceBase",
          },
        },
        {
          changeType: "modify",
          schemaType: SchemaItemType.EntityClass,
          itemName: "TestEntity",
          difference: {
            baseClass: "SourceSchema.TestBase",
          },
        },
      ],
    });

    await expect(merge).to.be.eventually.rejected.then(function (error) {
      expect(error).to.have.property("errorNumber", ECEditingStatus.SetBaseClass);
      expect(error).to.have.nested.property("innerError.message", `Base class TargetSchema.TestBase must derive from TargetSchema.TargetBase.`);
      expect(error).to.have.nested.property("innerError.errorNumber", ECEditingStatus.InvalidBaseClass);
    });
  });

  it.skip("should throw an error when merging entity base class changed from existing one to undefined", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        BaseEntity: {
          schemaItemType: "EntityClass",
        },
        TestEntity: {
          schemaItemType: "EntityClass",
          baseClass: "TargetSchema.BaseEntity",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const merge = merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "modify",
          schemaType: SchemaItemType.EntityClass,
          itemName: "TestEntity",
          difference: {
            baseClass: undefined,
          },
        },
      ],
    });

    await expect(merge).to.be.rejectedWith("Changing the class 'TestEntity' baseClass is not supported.");
  });

  it("should throw an error when merging entity base class changed from undefined to existing one", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        TestEntity: {
          schemaItemType: "EntityClass",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const merge = merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaItemType.EntityClass,
          itemName: "BaseEntity",
          difference: {
          },
        },
        {
          changeType: "modify",
          schemaType: SchemaItemType.EntityClass,
          itemName: "TestEntity",
          difference: {
            baseClass: "SourceSchema.BaseEntity",
          },
        },
      ],
    });

    await expect(merge).to.be.rejectedWith("Changing the class 'TestEntity' baseClass is not supported.");
  });

  it("should throw an error when merging mixins with different appliesTo values", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        TargetEntity: {
          schemaItemType: "EntityClass",
        },
        TestMixin: {
          schemaItemType: "Mixin",
          appliesTo: "TargetSchema.TargetEntity",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const merge = merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaItemType.EntityClass,
          itemName: "SourceEntity",
          difference: {
          },
        },
        {
          changeType: "modify",
          schemaType: SchemaItemType.Mixin,
          itemName: "TestMixin",
          difference: {
            appliesTo: "SourceSchema.SourceEntity",
          },
        },
      ],
    });

    await expect(merge).to.be.rejectedWith("Changing the mixin 'TestMixin' appliesTo is not supported.");
  });

  it("should throw an error when merging entity classes with different mixins", async () => {
    const jsonObj = {
      $schema: "https://dev.bentley.com/json_schemas/ec/32/ecschema",
      name: "TestSchema",
      version: "01.00.15",
      alias: "test",
      items: {
        TestBase: {
          schemaItemType: "EntityClass",
          modifier: "Abstract",
        },
        TestMixin: {
          schemaItemType: "Mixin",
          appliesTo: "TestSchema.TestBase",
        },
      },
    };

    await Schema.fromJson(jsonObj, targetContext);
    await Schema.fromJson({
      ...targetJson,
      references: [
        {
          name: "TestSchema",
          version: "01.00.15",
        },
      ],
      items: {
        TargetMixin: {
          schemaItemType: "Mixin",
          appliesTo: "TestSchema.TestBase",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const merge = merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "modify" as any,
          schemaType: SchemaOtherTypes.EntityClassMixin,
          itemName: "TestEntity",
          difference: [
            "TestSchema.TestMixin",
          ],
        },
      ],
    });

    await expect(merge).to.be.rejectedWith("Changing the entity class 'TestEntity' mixins is not supported.");
  });

  it("should throw an error when merging entity class with a unknown mixins", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        TestEntity: {
          schemaItemType: "EntityClass",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const merge = merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaOtherTypes.EntityClassMixin,
          itemName: "TestEntity",
          difference: [
            "SourceSchema.NotExistingMixin",
          ],
        },
      ],
    });

    await expect(merge).to.be.eventually.rejected.then(function (error) {
      expect(error).to.have.property("errorNumber", ECEditingStatus.AddMixin);
      expect(error).to.have.nested.property("innerError.message", `Mixin TargetSchema.NotExistingMixin could not be found in the schema context.`);
      expect(error).to.have.nested.property("innerError.errorNumber", ECEditingStatus.SchemaItemNotFoundInContext);
    });
  });

  it("should throw an error when merging struct base class changed from undefined to existing one", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        TestStruct: {
          schemaItemType: "StructClass",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const merge = merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaItemType.StructClass,
          itemName: "BaseStruct",
          difference: {
          },
        },
        {
          changeType: "modify",
          schemaType: SchemaItemType.StructClass,
          itemName: "TestStruct",
          difference: {
            baseClass: "SourceSchema.BaseStruct",
          },
        },
      ],
    });

    await expect(merge).to.be.rejectedWith("Changing the class 'TestStruct' baseClass is not supported.");
  });

  it("should throw an error when merging mixin base class to one that doesn't derive from", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        TestEntity: {
          schemaItemType: "EntityClass",
        },
        BaseMixin: {
          schemaItemType: "Mixin",
          appliesTo: "TargetSchema.TestEntity",
        },
        TestMixin: {
          schemaItemType: "Mixin",
          baseClass: "TargetSchema.BaseMixin",
          appliesTo: "TargetSchema.TestEntity",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const merge = merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaItemType.Mixin,
          itemName: "TestBase",
          difference: {
            appliesTo: "SourceSchema.TestEntity",
          },
        },
        {
          changeType: "modify",
          schemaType: SchemaItemType.Mixin,
          itemName: "TestMixin",
          difference: {
            baseClass: "SourceSchema.TestBase",
          },
        },
      ],
    });

    await expect(merge).to.be.eventually.rejected.then(function (error) {
      expect(error).to.have.property("errorNumber", ECEditingStatus.SetBaseClass);
      expect(error).to.have.nested.property("innerError.message", `Base class TargetSchema.TestBase must derive from TargetSchema.BaseMixin.`);
      expect(error).to.have.nested.property("innerError.errorNumber", ECEditingStatus.InvalidBaseClass);
    });
  });

  it("should throw an error when merging custom attribute base class changed from undefined to existing one", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        testCAClass: {
          schemaItemType: "CustomAttributeClass",
          appliesTo: "AnyClass",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const merge = merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaItemType.CustomAttributeClass,
          itemName: "BaseCAClass",
          difference: {
            appliesTo: "AnyClass",
          },
        },
        {
          changeType: "modify",
          schemaType: SchemaItemType.CustomAttributeClass,
          itemName: "testCAClass",
          difference: {
            baseClass: "SourceSchema.BaseCAClass",
          },
        },
      ],
    });

    await expect(merge).to.be.rejectedWith("Changing the class 'testCAClass' baseClass is not supported.");
  });

  it("should throw an error when merging custom attribute base class to one that doesn't derive from", async () => {
    await Schema.fromJson({
      ...targetJson,
      items: {
        TargetBase: {
          schemaItemType: "CustomAttributeClass",
          appliesTo: "AnyProperty",
        },
        TestCAClass: {
          schemaItemType: "CustomAttributeClass",
          baseClass: "TargetSchema.TargetBase",
          appliesTo: "AnyProperty",
        },
      },
    }, targetContext);

    const merger = new SchemaMerger(targetContext);
    const merge = merger.merge({
      sourceSchemaName: "SourceSchema.01.02.03",
      targetSchemaName: "TargetSchema.01.00.00",
      differences: [
        {
          changeType: "add",
          schemaType: SchemaItemType.CustomAttributeClass,
          itemName: "SourceBase",
          difference: {
            appliesTo: "AnyProperty",
          },
        },
        {
          changeType: "add",
          schemaType: SchemaItemType.CustomAttributeClass,
          itemName: "TestBase",
          difference: {
            baseClass: "SourceSchema.SourceBase",
            appliesTo: "AnyProperty",
          },
        },
        {
          changeType: "modify",
          schemaType: SchemaItemType.CustomAttributeClass,
          itemName: "TestCAClass",
          difference: {
            baseClass: "SourceSchema.TestBase",
          },
        },
      ],
    });

    await expect(merge).to.be.eventually.rejected.then(function (error) {
      expect(error).to.have.property("errorNumber", ECEditingStatus.SetBaseClass);
      expect(error).to.have.nested.property("innerError.message", `Base class TargetSchema.TestBase must derive from TargetSchema.TargetBase.`);
      expect(error).to.have.nested.property("innerError.errorNumber", ECEditingStatus.InvalidBaseClass);
    });
  });
});
