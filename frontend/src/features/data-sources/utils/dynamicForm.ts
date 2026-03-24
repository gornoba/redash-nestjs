import type {
  DataSourceConfigurationSchema,
  DataSourceDetail,
  DataSourceSchemaProperty,
  DataSourceTypeDefinition,
  DynamicField,
} from '../types';

function titleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeFieldType(name: string, property: DataSourceSchemaProperty) {
  if (name === 'password' || name === 'passwd') {
    return 'password';
  }

  if (name.endsWith('File')) {
    return 'file';
  }

  if (property.type === 'boolean') {
    return 'checkbox';
  }

  if (property.type === 'number') {
    return 'number';
  }

  if (property.extendedEnum || property.options) {
    return 'select';
  }

  return 'text';
}

function getDefaultValue(property: DataSourceSchemaProperty) {
  if (property.default !== undefined) {
    return property.default;
  }

  if (property.extendedEnum && property.extendedEnum.length > 0) {
    return property.extendedEnum[0]?.value ?? '';
  }

  if (property.options && property.options.length > 0) {
    return property.options[0]?.value ?? '';
  }

  return '';
}

export function getFieldLabel(field: Pick<DynamicField, 'name' | 'title'>) {
  return field.title || titleCase(field.name);
}

function orderedFieldNames(schema: DataSourceConfigurationSchema) {
  const explicitOrder = schema.order ?? [];
  const propertyNames = Object.keys(schema.properties);
  const remaining = propertyNames.filter((name) => !explicitOrder.includes(name));

  return [...explicitOrder, ...remaining];
}

export function buildDataSourceFields(
  type: DataSourceTypeDefinition,
  dataSource?: DataSourceDetail | null,
) {
  const schema = type.configuration_schema;
  const required = new Set(schema.required ?? []);
  const extra = new Set(schema.extra_options ?? []);
  const targetOptions = dataSource?.options ?? {};
  const isNewDataSource = !dataSource?.id;

  const nameField: DynamicField = {
    name: 'name',
    title: 'Name',
    type: 'text',
    required: true,
    initialValue: dataSource?.name ?? '',
    placeholder: `My ${type.name}`,
    autoFocus: isNewDataSource,
  };

  const fields = orderedFieldNames(schema).map((name) => {
    const property = schema.properties[name];

    return {
      description: property.description,
      name,
      title: property.title ?? titleCase(name),
      type: normalizeFieldType(name, property),
      required: required.has(name),
      extra: extra.has(name),
      initialValue:
        (targetOptions[name] as boolean | number | string | null | undefined) ??
        getDefaultValue(property),
      placeholder:
        property.default === undefined ? null : String(property.default),
      options: property.extendedEnum ?? property.options,
    } satisfies DynamicField;
  });

  return [nameField, ...fields];
}

export function hasFilledExtraField(
  type: DataSourceTypeDefinition,
  dataSource?: DataSourceDetail | null,
) {
  const extraOptions = type.configuration_schema.extra_options ?? [];
  const targetOptions = dataSource?.options ?? {};

  return extraOptions.some((optionName) => {
    const defaultOptionValue =
      type.configuration_schema.properties[optionName]?.default;
    const targetOptionValue = targetOptions[optionName];

    return (
      targetOptionValue !== undefined &&
      targetOptionValue !== null &&
      targetOptionValue !== defaultOptionValue
    );
  });
}

export function normalizeSubmissionValues(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      if (value === '') {
        return [key, null];
      }

      return [key, value];
    }),
  );
}
