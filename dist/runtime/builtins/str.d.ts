import { NA } from '../types/na';
export declare const str: {
    /**
     * Convert any value to its string representation.
     * Optionally accepts a format string (e.g. "#.##" for number formatting)
     * or a named format specifier ("format.mintick", "format.volume", "format.percent").
     */
    tostring(value: any, format?: string): string;
    /**
     * Parse a string to a number.  Returns NaN if parsing fails.
     */
    tonumber(s: string): number;
    /** Return the length of a string. */
    length(s: string): number;
    /** Convert to lowercase. */
    lower(s: string): string;
    /** Convert to uppercase. */
    upper(s: string): string;
    /** Check if the string contains the given substring. */
    contains(s: string, substr: string): boolean;
    /** Check if the string starts with the given prefix. */
    startswith(s: string, prefix: string): boolean;
    /** Check if the string ends with the given suffix. */
    endswith(s: string, suffix: string): boolean;
    /** Extract a substring. */
    substring(s: string, begin: number, end?: number): string;
    /** Split a string by a separator. */
    split(s: string, sep: string): string[];
    /** Trim whitespace from both ends. */
    trim(s: string): string;
    /** Replace the first occurrence of target with replacement. */
    replace(s: string, target: string, replacement: string): string;
    /** Replace all occurrences of target with replacement. */
    replaceAll(s: string, target: string, replacement: string): string;
    /**
     * Returns the first match of the regex in the string, or na if not found.
     * Pine Script str.match returns the matched substring, not a boolean.
     */
    match(s: string, regex: string): string | typeof NA;
    /**
     * Find the position of the first occurrence of substr in s.
     * Returns -1 if not found (Pine returns na, but we use -1 for JS compat).
     */
    pos(s: string, substr: string): number;
    /**
     * Pine-style str.format: "{0} is {1}" with positional placeholders.
     */
    format(template: string, ...args: any[]): string;
    /**
     * Repeat a string count times.
     * Returns empty string if s is empty or count is <= 0.
     */
    repeat(s: string, count: number): string;
    /**
     * Format a timestamp (milliseconds) using a format string.
     *
     * Supported tokens:
     *   yyyy — 4-digit year        yy — 2-digit year
     *   MM   — 2-digit month       dd — 2-digit day
     *   HH   — 24-hour hour        hh — 12-hour hour
     *   mm   — minute              ss — second
     *   EEEE — full weekday name   EEE — short weekday name
     *   a    — AM/PM
     */
    formatTime(timestamp: number, format: string, timezone?: string): string;
};
