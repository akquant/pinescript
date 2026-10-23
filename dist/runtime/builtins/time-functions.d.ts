/**
 * Create the set of Pine Script time-extraction functions.
 *
 * @param getCurrentTime  A callback that returns the current bar's timestamp
 *                        in milliseconds (Unix epoch).
 */
export declare function createTimeFunctions(getCurrentTime: () => number): {
    /** Hour of the day (0-23). */
    hour(ts?: number, tz?: string): number;
    /** Minute of the hour (0-59). */
    minute(ts?: number, tz?: string): number;
    /** Second of the minute (0-59). */
    second(ts?: number, tz?: string): number;
    /**
     * Day of the week.
     * 1 = Sunday, 2 = Monday, ... 7 = Saturday  (Pine Script convention).
     */
    dayofweek(ts?: number, tz?: string): number;
    /** Day of the month (1-31). */
    dayofmonth(ts?: number, tz?: string): number;
    /** Month of the year (1-12). */
    month(ts?: number, tz?: string): number;
    /** Four-digit year. */
    year(ts?: number, tz?: string): number;
    /**
     * Build a UTC timestamp (milliseconds) from date/time components.
     *
     * Pine Script months are 1-based (January = 1), so we subtract 1 for the
     * JS Date.UTC constructor which expects 0-based months.
     */
    timestamp(year: number, month: number, day: number, hour?: number, minute?: number, second?: number): number;
    /**
     * ISO week number of the year (1–53).
     * ISO 8601: Week 1 contains January 4.
     */
    weekofyear(ts?: number, tz?: string): number;
    /**
     * Returns the bar's open time (ms) if the bar falls within the given session
     * string, otherwise returns NA.
     *
     * Session string format: "HHMM-HHMM" or "HHMM-HHMM:days"
     * where days is a string of digit chars: 1=Sun, 2=Mon, ..., 7=Sat (Pine convention).
     *
     * @param timeframe  Timeframe string (e.g. "D") — currently unused in the check
     * @param session    Session window, e.g. "0930-1600:23456"
     * @param timezone   IANA timezone string, e.g. "America/New_York"
     */
    timeInSession(timeframe?: string, session?: string, timezone?: string): number | symbol;
};
