/**
 * Parquet file loader for Pine Script compiler.
 *
 * Uses the hyparquet library (pure-JS, browser-compatible).
 * If hyparquet is not installed the loader throws a helpful error message.
 *
 * Install: npm install hyparquet
 */
import { Bar } from './types';
export interface ParquetColumnMap {
    time?: string;
    open?: string;
    high?: string;
    low?: string;
    close?: string;
    volume?: string;
}
export interface ParquetLoadOptions {
    /** Override auto-detected column names */
    columns?: ParquetColumnMap;
    /** Maximum number of rows to load (default: unlimited) */
    maxRows?: number;
}
export interface ParquetLoadResult {
    bars: Bar[];
    warnings: string[];
    rowsSkipped: number;
}
/**
 * Load a Parquet ArrayBuffer and return OHLCV bars.
 *
 * @param buffer   The raw Parquet file bytes.
 * @param options  Optional column override + row limit.
 */
export declare function loadParquet(buffer: ArrayBuffer, options?: ParquetLoadOptions): Promise<Bar[]>;
/**
 * Load a Parquet ArrayBuffer and return bars plus warnings.
 */
export declare function loadParquetWithDetails(buffer: ArrayBuffer, options?: ParquetLoadOptions): Promise<ParquetLoadResult>;
/**
 * Read column names from a Parquet file without loading all data.
 * Useful for building column-mapping UI.
 */
export declare function readParquetColumns(buffer: ArrayBuffer): Promise<string[]>;
