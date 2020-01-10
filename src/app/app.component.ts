import { Component, destroyPlatform, ChangeDetectorRef } from '@angular/core';
import { Result, FreeDayType } from '../data/Result';
import { DataSet } from '../data/DataSet';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  static readonly NUM_RESULTS: number = 20;
  static readonly REQUEST_URL: string = "https://feiertage-api.de/api/";

  title = 'holiday-optimization';

  Regions = ['BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE',
    'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST',
    'SH', 'TH'];

  RegionNames = {
    'BW': 'Baden-Württemberg', 'BY': 'Bayern', 'BE': 'Berlin',
    'BB': 'Brandenburg', 'HB': 'Bremen', 'HH': 'Hamburg', 'HE': 'Hessen',
    'MV': 'Mecklenburg-Vorpommern', 'NI': 'Niedersachsen',
    'NW': 'Nordrhein-Westfalen', 'RP': 'Rheinland-Pfalz', 'SL': 'Saarland',
    'SN': 'Sachsen', 'ST': 'Sachsen-Anhalt',
    'SH': 'Schleswig-Holstein', 'TH': 'Thüringen'
  }

  SelectedRegion: string;
  private _SelectedRegionName: string
  get SelectedRegionName(): string {
    return this._SelectedRegionName;
  };
  set SelectedRegionName(value) {
    this._SelectedRegionName = value;
    for (let key in this.RegionNames) {
      if (this.RegionNames[key] == value) {
        this.SelectedRegion = key;
        break;
      }
    }
  };

  IsLoading: boolean = false;
  NumberOfDays: number = 5;
  AreBridgeDaysFree: boolean = false;
  Results: Array<Result> = [];
  Dataset: DataSet;

  constructor(private http: HttpClient, private cd: ChangeDetectorRef) {
    this.SelectedRegionName = this.RegionNames.BW;
  }

  CalculateHolidays() {
    // enable the loading indicator
    this.IsLoading = true;
    this.cd.detectChanges();

    // first get the dataset
    let currentYear = new Date().getFullYear();

    // load the current year
    this.http.jsonp(AppComponent.GetURL(currentYear, this.SelectedRegion), "callback").subscribe(
      res => {
        this.Dataset = new DataSet().parse(currentYear, this.SelectedRegion, res);

        // load the next year
        this.http.jsonp(AppComponent.GetURL(currentYear + 1, this.SelectedRegion), "callback").subscribe(
          res => {
            this.Dataset = this.Dataset.merge(
              this.Dataset, new DataSet().parse(currentYear + 1, this.SelectedRegion, res)
            );

            this.SearchStreaks();

            // disable the loading indicator
            this.IsLoading = false;
            this.cd.detectChanges();
          })
      });
  }

  SearchStreaks() {
    let currentYear = new Date().getFullYear();
    console.log(this.Dataset);

    let yearStart = new Date(currentYear, 0, 1);

    // start at the year start
    let currentDate = yearStart;

    // iterate until the next year
    let results = new Array<Result>();
    while (currentDate < new Date(currentYear + 1, 0, 1)) {
      let leftDays = this.NumberOfDays;
      let freeDays = 0;
      let checkDate = new Date(currentDate);

      // check only if the first day to check is free
      // otherwise equivalent timespans are put into the results
      if (AppComponent.IsFreeDay(checkDate, this.Dataset, this.AreBridgeDaysFree)) {
        // iterate until no holidays are left
        let dayTypes = []
        while (leftDays >= 0) {
          let dayType = AppComponent.IsFreeDay(checkDate, this.Dataset, this.AreBridgeDaysFree);

          // if the day is not a free day, use a planned holiday
          if (dayType == FreeDayType.NONE) {
            leftDays--;

            if (leftDays < 0) {
              // spend one too many days
              break;
            }
          }
          freeDays++;
          dayTypes.push(dayType)

          checkDate.setDate(checkDate.getDate() + 1);
        }

        // first check if it's a valid results
        // i.e. with only the results containing more than just the weekends
        // and normal work days
        let numNotWE = dayTypes.filter(dt => {
          return dt != FreeDayType.WEEKEND && dt != FreeDayType.NONE
        }).length;

        // also check if the days before and after are normal workdays
        // otherwise this result would be suboptimal
        let dayBefore = new Date(currentDate);
        dayBefore.setDate(currentDate.getDate() - 1);
        let dayBeforeFree = AppComponent.IsFreeDay(
          dayBefore, this.Dataset, this.AreBridgeDaysFree);

        let dayAfter = new Date(currentDate);
        dayAfter.setDate(currentDate.getDate() + dayTypes.length);
        let dayAfterFree = AppComponent.IsFreeDay(
          dayAfter, this.Dataset, this.AreBridgeDaysFree);
        console.log(currentDate, dayBefore, dayTypes.length, dayAfter);

        let isValid = numNotWE > 0 && !(dayBeforeFree || dayAfterFree);
        if (isValid) {
          // then fill up the results array
          let resObj = new Result();
          resObj.Date = new Date(currentDate);
          resObj.FreeDays = freeDays;
          resObj.DayTypes = dayTypes;

          if (results.length < AppComponent.NUM_RESULTS) {
            results.push(resObj);

          } else {

            // then check if the result is competitive
            for (let i = 0; i < results.length; i++) {
              if (results[i].FreeDays < freeDays) {
                results[i] = resObj;
                break;
              }
            }
          }
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // sort the results
    results.sort((a, b) => (+a.Date) - (+b.Date));
    results.sort((a, b) => b.FreeDays - a.FreeDays);

    console.log(results);
    this.Results = results;
  }

  static GetURL(currentYear: number, region: string) {
    return AppComponent.REQUEST_URL + "?jahr=" + currentYear + "&nur_land=" + region;
  }

  static IsSameDate(date0: Date, date1: Date) {
    return date0.getFullYear() == date1.getFullYear()
      && date0.getMonth() == date1.getMonth()
      && date0.getDate() == date1.getDate();
  }

  static IsFreeDay(date: Date, dataset: DataSet, areBridgeDaysFree: boolean = false): FreeDayType {
    // check if date is sunday (0) or saturday(6)
    if (date.getDay() == 0 || date.getDay() == 6) {
      return FreeDayType.WEEKEND;
    }

    // check if day is in holiday dataset
    for (let entry in dataset.Holidays) {
      if (AppComponent.IsSameDate(new Date(dataset.Holidays[entry].Date), date)) {
        return FreeDayType.HOLIDAY;
      }
    }

    // check if the day is a bridge day (if the are free)
    if (areBridgeDaysFree) {
      // only mondays (1) or fridays (5) can be bridge days
      let respectiveDay = new Date(date)
      if (date.getDay() == 1) {
        // get tuesday
        respectiveDay.setDate(respectiveDay.getDate() + 1);

      } else if (date.getDay() == 5) {
        // get thursday
        respectiveDay.setDate(respectiveDay.getDate() - 1);
      }

      if (AppComponent.IsFreeDay(respectiveDay, dataset)) {
        return FreeDayType.BRIDGE_DAY;
      }
    }

    return FreeDayType.NONE;
  }
}
