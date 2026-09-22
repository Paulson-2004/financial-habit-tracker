const toCamel = (key) => key.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());

/** Converts snake_case column names of one database row to camelCase. */
export function camelizeKeys(row) {
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    result[toCamel(key)] = value;
  }
  return result;
}
