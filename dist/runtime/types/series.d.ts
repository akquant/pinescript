export declare class Series<T> {
    private buffer;
    private head;
    private _length;
    private maxLookback;
    constructor(maxLookback?: number);
    push(value: T): void;
    get(barsBack?: number): T;
    set(value: T): void;
    get length(): number;
    toArray(): T[];
    valueOf(): T;
    toString(): string;
}
