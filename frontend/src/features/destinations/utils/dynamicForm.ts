import type {
  DestinationConfigurationSchema,
  DestinationDetail,
  DestinationSchemaProperty,
  DestinationTypeDefinition,
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

function normalizeFieldType(name: string, property: DestinationSchemaProperty) {
  if (name.includes('password') || name.includes('token')) {
    return 'password';
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

function getDefaultValue(property: DestinationSchemaProperty) {
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

export function orderedFieldNames(schema: DestinationConfigurationSchema) {
  const explicitOrder = schema.order ?? [];
  const propertyNames = Object.keys(schema.properties);
  const remaining = propertyNames.filter((name) => !explicitOrder.includes(name));

  return [...explicitOrder, ...remaining];
}

export function buildDestinationFields(
  type: DestinationTypeDefinition,
  destination?: DestinationDetail | null,
) {
  const schema = type.configuration_schema;
  const required = new Set(schema.required ?? []);
  const extra = new Set(schema.extra_options ?? []);
  const targetOptions = destination?.options ?? {};
  const isNewDestination = !destination?.id;

  const nameField: DynamicField = {
    name: 'name',
    title: 'Name',
    type: 'text',
    required: true,
    initialValue: destination?.name ?? '',
    placeholder: `${type.name} Destination`,
    autoFocus: isNewDestination,
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
  type: DestinationTypeDefinition,
  destination?: DestinationDetail | null,
) {
  const extraOptions = type.configuration_schema.extra_options ?? [];
  const targetOptions = destination?.options ?? {};

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
