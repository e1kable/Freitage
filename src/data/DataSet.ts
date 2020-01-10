/**
 * These data structures parse the data coming from https://feiertage-api.de/
 */
export class DataSet {
    public Region: string;

    public Holidays: Array<HolidayRecord>;

    parse(year: number, region: string, data: any) {
        this.Region = region;

        this.Holidays = [];
        for (let holidayName in data) {
            this.Holidays.push(new HolidayRecord().parse(holidayName, data[holidayName]));
        }
        return this;
    }

    merge(set0: DataSet, set1: DataSet) {
        this.Region = set0.Region;
        this.Holidays = set0.Holidays;
        this.Holidays = this.Holidays.concat(set1.Holidays);

        return this;
    }
}

export class HolidayRecord {
    public Name: string;
    public Date: Date;
    public Note: string;

    parse(name: string, data: any) {
        this.Name = name;
        this.Date = new Date(data.datum);
        this.Note = data.hinweis;

        return this;
    }
}