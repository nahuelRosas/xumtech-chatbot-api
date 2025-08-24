export function safeJSON({
  replacerFunction,
  indentation,
  object,
}: {
  replacerFunction?: (key: string, value: unknown) => unknown;
  indentation?: string | number;
  object: unknown;
}): string | undefined {
  try {
    const visitedObjects = new Set<object>();
    const jsonString = JSON.stringify(
      object,
      function (key, value) {
        if (typeof value === 'object' && value !== null) {
          if (visitedObjects.has(value)) {
            return '[Circular]';
          }
          visitedObjects.add(value);
        }
        return replacerFunction ? replacerFunction(key, value) : value;
      },
      indentation,
    );
    visitedObjects.clear();
    return jsonString;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Unable to stringify object: ${error.message}`);
    }
  }
}
