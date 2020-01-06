export class Result
{
    Date: Date;
    FreeDays: number;
    DayTypes: Array<FreeDayType>;
}

export enum FreeDayType {
    NONE, HOLIDAY, WEEKEND, BRIDGE_DAY
}