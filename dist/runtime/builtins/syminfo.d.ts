export interface SymInfo {
    ticker: string;
    tickerid: string;
    prefix: string;
    root: string;
    mintick: number;
    pointvalue: number;
    timezone: string;
    type: string;
    session: string;
    basecurrency: string;
    currency: string;
    description: string;
}
/**
 * Create a default syminfo object.
 * Users can override individual fields when loading real market data.
 */
export declare function createSyminfo(): SymInfo;
