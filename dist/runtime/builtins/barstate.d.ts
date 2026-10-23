export interface BarState {
    isfirst: boolean;
    islast: boolean;
    ishistory: boolean;
    isrealtime: boolean;
    isconfirmed: boolean;
}
export declare function createBarstate(barIndex: number, lastIndex: number): BarState;
export declare function makeBarstateProxy(state: BarState): BarState;
