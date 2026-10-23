export declare const arrayModule: {
    /** Create a new float (number) array. */
    newFloat(size?: number, val?: number): number[];
    /** Create a new int (number) array. */
    newInt(size?: number, val?: number): number[];
    /** Create a new boolean array. */
    newBool(size?: number, val?: boolean): boolean[];
    /** Create a new string array. */
    newString(size?: number, val?: string): string[];
    /** Generic new array. */
    "new"(size?: number, val?: any): any[];
    /** Push a value onto the end of the array. */
    push(arr: any[], val: any): void;
    /** Remove and return the last element. */
    pop(arr: any[]): any;
    /** Get the element at the given index. */
    get(arr: any[], index: number): any;
    /** Set the element at the given index. */
    set(arr: any[], index: number, val: any): void;
    /** Return the size (length) of the array. */
    size(arr: any[]): number;
    /** Return the sum of all elements in a numeric array. */
    sum(arr: number[]): number;
    /** Return the average of all elements in a numeric array. */
    avg(arr: number[]): number;
    /** Return the maximum value in a numeric array. */
    max(arr: number[]): number;
    /** Return the minimum value in a numeric array. */
    min(arr: number[]): number;
    /** Insert a value at the given index, shifting elements right. */
    insert(arr: any[], index: number, val: any): void;
    /** Remove and return the element at the given index. */
    remove(arr: any[], index: number): any;
    /** Remove all elements from the array. */
    clear(arr: any[]): void;
    /** Return a shallow copy of the array. */
    copy(arr: any[]): any[];
    /** Reverse the array in place. */
    reverse(arr: any[]): void;
    /**
     * Sort the array in place.
     * @param order - 'asc' (default) or 'desc'
     */
    sort(arr: any[], order?: string): void;
    /** Join all elements into a string with the given separator. */
    join(arr: any[], sep?: string): string;
    /** Return a shallow copy of a portion of the array. */
    slice(arr: any[], start: number, end?: number): any[];
    /** Check if the array contains a given value. */
    includes(arr: any[], val: any): boolean;
    /** Return the index of the first occurrence of val, or -1. */
    indexof(arr: any[], val: any): number;
    /** Return the index of the last occurrence of val, or -1. */
    lastindexof(arr: any[], val: any): number;
    /** Create an array from the given values. */
    from(...vals: any[]): any[];
    /** Remove and return the first element. */
    shift(arr: any[]): any;
    /** Add element(s) to the beginning. */
    unshift(arr: any[], val: any): void;
    /** Return the median of a numeric array. */
    median(arr: number[]): number;
    /** Return the standard deviation. */
    stdev(arr: number[]): number;
    /** Return the variance. */
    variance(arr: number[]): number;
    /** Return the range (max - min). */
    range(arr: number[]): number;
    /** Return the first element. */
    first(arr: any[]): any;
    /** Return the last element. */
    last(arr: any[]): any;
    /** Concatenate two arrays into a new one. */
    concat(arr1: any[], arr2: any[]): any[];
    /** Create a new line array. */
    newLine(size?: number, val?: any): any[];
    /** Create a new label array. */
    newLabel(size?: number, val?: any): any[];
    /** Create a new box array. */
    newBox(size?: number, val?: any): any[];
    /** Create a new table array. */
    newTable(size?: number, val?: any): any[];
    /** Create a new color array. */
    newColor(size?: number, val?: any): any[];
    /** Return absolute values of all elements. */
    abs(arr: number[]): number[];
    /** Binary search (array must be sorted). Returns index. */
    binarySearch(arr: number[], val: number): number;
    binarySearchLeftmost(arr: number[], val: number): number;
    binarySearchRightmost(arr: number[], val: number): number;
    /** Test if all elements pass a condition function. */
    every(arr: any[], fn: (val: any) => boolean): boolean;
    /** Test if any element passes a condition function. */
    some(arr: any[], fn: (val: any) => boolean): boolean;
    /** Fill array with a value. */
    fill(arr: any[], val: any, fromIndex?: number, toIndex?: number): void;
    /** Compute covariance between two arrays. */
    covariance(arr1: number[], arr2: number[]): number;
    /** Return the mode (most common value). */
    mode(arr: number[]): number;
    /** Percentile using linear interpolation. */
    percentileLinearInterpolation(arr: number[], pct: number): number;
    /** Percentile using nearest rank. */
    percentileNearestRank(arr: number[], pct: number): number;
    /** Percent rank of value within array. */
    percentrank(arr: number[], val: number): number;
    /** Standardize array (z-score). */
    standardize(arr: number[]): number[];
    /** Return sorted indices without modifying the original array. */
    sortIndices(arr: any[], order?: string): number[];
};
export declare const mapModule: {
    /** Create a new map. */
    "new"<K = any, V = any>(): Map<K, V>;
    /** Put a key-value pair into the map. Returns the previous value if the key existed. */
    put<K, V>(m: Map<K, V>, key: K, val: V): V | undefined;
    /** Get the value associated with the key, or undefined. */
    get<K, V>(m: Map<K, V>, key: K): V | undefined;
    /** Check if the map contains the given key. */
    contains<K>(m: Map<K, any>, key: K): boolean;
    /** Remove the key-value pair. Returns the removed value. */
    remove<K, V>(m: Map<K, V>, key: K): V | undefined;
    /** Remove all key-value pairs from the map. */
    clear(m: Map<any, any>): void;
    /** Return the number of key-value pairs. */
    size(m: Map<any, any>): number;
    /** Return an array of all keys. */
    keys<K>(m: Map<K, any>): K[];
    /** Return an array of all values. */
    values<V>(m: Map<any, V>): V[];
};
/** Internal matrix representation: 2D array with row/col metadata. */
export interface PineMatrix<T = any> {
    data: T[][];
    rows: number;
    cols: number;
}
export declare const matrixModule: {
    /** Create a new matrix with given rows, cols, and fill value. */
    "new"<T = number>(rows: number, cols: number, val?: T): PineMatrix<T>;
    /** Get the value at (row, col). */
    get<T>(m: PineMatrix<T>, row: number, col: number): T | undefined;
    /** Set the value at (row, col). */
    set<T>(m: PineMatrix<T>, row: number, col: number, val: T): void;
    /** Return the number of rows. */
    rows<T>(m: PineMatrix<T>): number;
    /** Return the number of columns. */
    columns<T>(m: PineMatrix<T>): number;
    /** Add a row at the given index. vals may be an array of values or a single fill value. */
    addRow<T>(m: PineMatrix<T>, idx: number, vals?: T | T[]): void;
    /** Add a column at the given index. vals may be an array of values or a single fill value. */
    addCol<T>(m: PineMatrix<T>, idx: number, vals?: T | T[]): void;
    /** Remove a row at the given index. Returns the removed row. */
    removeRow<T>(m: PineMatrix<T>, idx: number): T[] | undefined;
    /** Remove a column at the given index. Returns the removed column values. */
    removeCol<T>(m: PineMatrix<T>, idx: number): T[] | undefined;
};
