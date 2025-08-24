import { stringSimilarity } from 'string-similarity-js';

export class BaseService {
  protected removeNullOrUndefinedFields<T>({
    inputObject,
  }: {
    inputObject: T;
  }): T {
    if (inputObject === null || inputObject === undefined) return inputObject;
    if (Array.isArray(inputObject)) {
      return inputObject.filter(
        (item) => item !== null && item !== undefined,
      ) as unknown as T;
    }
    const cleaned = Object.fromEntries(
      Object.entries(inputObject as object).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    );
    return cleaned as T;
  }

  protected reduceSimilarString({
    inputArray,
  }: {
    inputArray: string[];
  }): string[] {
    const result: string[] = [];

    inputArray.forEach((item, i) => {
      if (
        !inputArray.some(
          (otherItem, j) =>
            i !== j && stringSimilarity(item, otherItem) >= 0.85,
        )
      ) {
        result.push(item);
      }
    });
    return result.length > 0 ? result : inputArray;
  }

  protected cleanSimilarStringsInObject<T>(inputObject: unknown): T | unknown {
    if (typeof inputObject !== 'object' || inputObject === null) {
      return inputObject;
    }

    if (Array.isArray(inputObject)) {
      if (inputObject.every((item) => typeof item === 'string')) {
        const reducedArray = this.reduceSimilarString({
          inputArray: inputObject as string[],
        });
        return reducedArray.length > 0 ? reducedArray : inputObject;
      } else {
        return inputObject.map((item) =>
          this.cleanSimilarStringsInObject(item),
        );
      }
    }

    return Object.fromEntries(
      Object.entries(inputObject).map(([key, value]) => [
        key,
        this.cleanSimilarStringsInObject(value),
      ]),
    );
  }

  protected shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  protected shuffleAndSliceArray<T>({
    array,
    shuffle = false,
    limit,
  }: {
    array: T[];
    shuffle?: boolean;
    limit?: number;
  }): T[] {
    let elements = array;

    if (shuffle) {
      elements = this.shuffleArray(elements);
    }

    if (limit) {
      elements = elements.slice(0, limit);
    }

    return elements;
  }

  protected flattenObject(
    obj: Record<string, unknown>,
    prefix = '',
  ): Record<string, unknown> {
    return Object.entries(obj).reduce(
      (acc, [key, value]) => {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          !(value instanceof Date)
        ) {
          Object.assign(
            acc,
            this.flattenObject(value as Record<string, unknown>, newKey),
          );
        } else {
          acc[newKey] = value;
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }

  protected splitAndTrim(str: string, splitValue: string): string[] {
    return str.split(splitValue).map((s) => s.trim());
  }

  protected decodeBase64String(value: string): string {
    return Buffer.from(value, 'base64').toString('utf-8');
  }

  protected encodeBase64String(value: string): string {
    return Buffer.from(value).toString('base64');
  }

  protected sanitizeString({
    value,
    additionalFields,
    capitalizeWords = false,
  }: {
    value: unknown;
    additionalFields?: (string | RegExp | [string | RegExp, string])[];
    capitalizeWords?: boolean;
  }): string {
    let str = String(value || '');
    const fields = (additionalFields ? [...additionalFields] : []).concat([
      [/[\r\n]+/g, ''],
    ]);

    fields.forEach((field) => {
      if (typeof field === 'string') {
        str = str.split(field).join('');
      } else if (field instanceof RegExp) {
        str = str?.replace(field, '');
      } else if (Array.isArray(field) && field.length === 2) {
        const [pattern, replacement] = field;
        str = str?.replace(pattern, replacement);
      }
    });

    str = str.replace(/\(([^)]+)\)/g, (match, p1) => `(${p1.toUpperCase()})`);
    str = str.trim().replace(/\s+/g, ' ');

    if (capitalizeWords) {
      str = str?.replace(
        /\w\S*/g,
        (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      );
    }

    return str.trim();
  }

  protected extractElements(text: string): string[] {
    const fragments = text?.replace(/\n/g, ' ').split(/[,;.\n\n]+/);

    const cleanedFragments = fragments
      .map((fragment) => fragment?.trim())
      .filter(Boolean);

    return Array.from(new Set(cleanedFragments));
  }

  protected mergeAndCleanArrays<T>(...arrays: T[][]): T[] {
    return [...new Set(arrays.flat())];
  }

  protected mergeCleanAndRemoveDuplicatesStrings(
    ...arrays: string[][]
  ): string[] {
    return this.reduceSimilarString({
      inputArray: this.mergeAndCleanArrays(...arrays),
    });
  }

  protected areStringsSimilar(
    str1: string,
    str2: string,
    threshold: number = 0.85,
  ): boolean {
    const similarity = stringSimilarity(str1, str2);
    return similarity >= threshold;
  }

  protected transformTitles({
    items,
    predefinedTitles,
  }: {
    predefinedTitles: Record<string, string>;
    items: { name?: string; status?: boolean }[];
  }): Record<string, boolean> {
    const titles: Record<string, boolean> = {};

    for (const item of items) {
      if (!item.name) continue;

      const sanitizedTitle = this.sanitizeString({
        value: item.name,
        capitalizeWords: true,
      });

      for (const [key, value] of Object.entries(predefinedTitles)) {
        if (
          this.areStringsSimilar(key, sanitizedTitle) ||
          this.areStringsSimilar(value, sanitizedTitle)
        ) {
          if (item.status !== false)
            titles[value] = item.status !== undefined ? item.status : true;
        }
      }
    }

    return titles;
  }

  protected addTitles({
    items,
    itemsToAdd,
    predefinedTitles,
  }: {
    items: Record<string, boolean>;
    itemsToAdd: string[];
    predefinedTitles: Record<string, string>;
  }) {
    const _items = { ...items };

    for (const item of itemsToAdd) {
      const sanitizedTitle = this.sanitizeString({
        value: item,
        capitalizeWords: true,
      });

      for (const [key, value] of Object.entries(predefinedTitles)) {
        if (
          this.areStringsSimilar(key, sanitizedTitle) ||
          this.areStringsSimilar(value, sanitizedTitle)
        ) {
          _items[value] = true;
        }
      }
    }
    return _items;
  }

  protected extractFilteredListFromText({
    text,
    terms,
  }: {
    text: string;
    terms: string[];
  }): string[] {
    if (!text) return [];
    const { normalized: normText, mapping } =
      this.createNormalizedMapping(text);
    const combinedRegex = this.getCombinedRegexFromTerms(terms);
    let newText = text;
    const match = combinedRegex.exec(normText);
    if (match) {
      const normMatchIndex = match.index;
      const originalStart = mapping[normMatchIndex];
      newText = text.slice(0, originalStart).trim();
    }
    let list = newText
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '');
    const cleanString = (s: string): string =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase();
    const cleanedTerms = new Set(terms.map((term) => cleanString(term)));
    list = list.filter((item) => !cleanedTerms.has(cleanString(item)));
    return list;
  }

  protected filterLinesIncludingSubsequent({
    text,
    terms,
  }: {
    text: string;
    terms: string[];
  }): string[] {
    if (!text) return [];
    const { normalized: normText, mapping } =
      this.createNormalizedMapping(text);
    const combinedRegex = this.getCombinedRegexFromTerms(terms);
    const match = combinedRegex.exec(normText);
    if (!match) return [];
    const normMatchIndex = match.index;
    const originalStart = mapping[normMatchIndex];
    const newText = text.slice(originalStart).trim();
    return newText
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '');
  }

  protected removeSpecificTexts({
    text,
    textsToRemove,
  }: {
    text: string;
    textsToRemove: string[];
  }): string {
    if (!text) return text;
    const baseRegex = this.getCombinedRegexFromTerms(textsToRemove);
    const regex = new RegExp(baseRegex.source, 'gi');
    return text.replace(regex, '').trim();
  }

  protected normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  protected escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  protected createNormalizedMapping(line: string): {
    normalized: string;
    mapping: number[];
  } {
    let normalized = '';
    const mapping: number[] = [];
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const normChar = this.normalizeText(char);
      for (let j = 0; j < normChar.length; j++) {
        normalized += normChar[j];
        mapping.push(i);
      }
    }
    return { normalized, mapping };
  }

  protected extractWeightAndUnit(
    text: string,
    regexPattern = /(\d+(?:\.\d+)?)\s*(g|mg|kg|ml|l)$/i,
  ): {
    value: number;
    unit: string;
  } {
    const match = text.match(regexPattern);
    if (match) {
      return {
        value: Number(match[1]),
        unit: match[2].toLowerCase(),
      };
    }
    return { value: 0, unit: 'g' };
  }

  protected getCombinedRegexFromTerms(terms: string[]): RegExp {
    const normalizedTerms = terms
      .map((term) => {
        const normTerm = this.normalizeText(term);
        return {
          original: term,
          normalized: normTerm,
          length: normTerm.length,
        };
      })
      .sort((a, b) => b.length - a.length);

    const patterns = normalizedTerms.map((termObj) => {
      const escaped = this.escapeRegex(termObj.normalized);
      const leadingBoundary = /^[a-z0-9]/.test(termObj.normalized) ? '\\b' : '';
      const trailingBoundary = /[a-z0-9]$/.test(termObj.normalized)
        ? '\\b'
        : '';
      return leadingBoundary + escaped + trailingBoundary;
    });

    return new RegExp(patterns.join('|'), 'i');
  }

  /**
   * Validates if a localized strings object has at least one valid, non-empty string
   * in one of the required languages (english, spanish, catalan).
   * @param localizedStrings The localized strings object to validate
   * @param defaultValue Optional default value to use if all values are empty/null
   * @returns The original object if valid, or a fixed object with default values
   */
  protected validateLocalizedStrings(
    localizedStrings: {
      en?: string | null;
      es?: string | null;
      ca?: string | null;
    },
    defaultValue: string = 'No information available',
  ): { en: string; es: string; ca: string } {
    // Check if at least one language has a non-empty string
    const hasValidTranslation = Boolean(
      (localizedStrings.en && localizedStrings.en.trim()) ||
        (localizedStrings.es && localizedStrings.es.trim()) ||
        (localizedStrings.ca && localizedStrings.ca.trim()),
    );

    // If valid, return the original object with nulls replaced by empty strings
    if (hasValidTranslation) {
      return {
        en: localizedStrings.en || '',
        es: localizedStrings.es || '',
        ca: localizedStrings.ca || '',
      };
    }

    // If not valid, return object with default values
    return {
      en: defaultValue,
      es: defaultValue,
      ca: defaultValue,
    };
  }

  protected exponentialBackoff(
    attempt: number,
    baseDelay = 1000,
    maxDelay = 5000,
    factor = 1.5,
  ): number {
    const jitter = Math.random() * 1000;
    const exponentialDelay = baseDelay * Math.pow(factor, attempt);
    return Math.min(maxDelay, exponentialDelay) + jitter;
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), timeoutMs),
      ),
    ]);
  }

  protected updateOrAddArrayItem<
    T extends { property: P },
    P extends string = string,
  >(array: T[], newItem: T): T[] {
    if (!array || !Array.isArray(array)) {
      return [newItem];
    }

    const existingIndex = array.findIndex(
      (item) =>
        item &&
        typeof item === 'object' &&
        'property' in item &&
        item.property === newItem.property,
    );

    if (existingIndex >= 0) {
      const updatedArray = [...array];
      updatedArray[existingIndex] = newItem;
      return updatedArray;
    }

    return [...array, newItem];
  }

  /**
   * Ensures a string value is returned from potentially multilingual objects.
   * Handles cases where a string is expected but a multilingual object is provided.
   * @param value The value to convert to a string (may be a string or {english, spanish, catalan} object)
   * @returns A string representation of the value
   */
  protected ensureStringFromMultilingual(value: unknown): string {
    if (!value) return '';

    // If it's already a string, return it
    if (typeof value === 'string') return value;

    // If it's a multilingual object
    if (typeof value === 'object' && value !== null) {
      const mlValue = value as { en?: string; es?: string; ca?: string };
      // Return the first non-empty value in order: english, spanish, catalan
      return mlValue.en || mlValue.es || mlValue.ca || '';
    }

    // For other types, convert to string
    return String(value);
  }

  /**
   * Executes a function with automatic retry logic for transient errors like rate limits (429)
   * Uses exponential backoff to avoid overwhelming APIs
   * @param fn The async function to execute with retry logic
   * @param options Retry configuration options
   * @returns The result of the function
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      retryableStatuses?: number[];
      responseService?: { errorHandler: (error: unknown) => void };
    } = {},
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      retryableStatuses = [429, 503],
      responseService = this['responseService'],
    } = options;

    let attempt = 0;

    while (true) {
      try {
        return await fn();
      } catch (error) {
        attempt++;

        const isRetryable =
          // Status code based retry (like 429)
          (error.status && retryableStatuses.includes(error.status)) ||
          // Message based retry
          (error.message &&
            /rate limit|too many requests|429|timeout/i.test(error.message));

        if (!isRetryable || attempt >= maxRetries) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = this.exponentialBackoff(attempt, baseDelay, maxDelay);
        if (responseService?.verbose) {
          responseService.verbose(
            `Retrying after ${delay}ms (attempt ${attempt}/${maxRetries})`,
          );
        }

        await this.delay(delay);
      }
    }
  }
}
