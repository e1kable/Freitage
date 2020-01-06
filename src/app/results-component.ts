import { Component, Input } from '@angular/core';
import { Result, FreeDayType } from 'src/data/Result';
import { AppComponent } from './app.component';
import { DataSet } from 'src/data/DataSet';

@Component({
  selector: 'results',
  templateUrl: './results-component.html',
  styleUrls: ['./results-component.css']
})
export class ResultsComponent {

  static readonly DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  FreeDayTypes = FreeDayType;

  @Input() Results: Array<Result>;
  @Input() Dataset: DataSet;

  GetOffsetDate(date: Date, offset: number): Date {
    let newDate = new Date(date);
    newDate.setDate(newDate.getDate() + offset);
    return newDate;
  }

  GetTooltip(date: Date, offset: number, type: FreeDayType) {

    let newDate = this.GetOffsetDate(date, offset);
    let tip = ""
    switch (type) {
      case FreeDayType.BRIDGE_DAY: tip = "Brückentag"; break;
      case FreeDayType.NONE: tip = "Urlaubstag"; break;
      case FreeDayType.HOLIDAY: tip = "Feiertag"; break;
      case FreeDayType.WEEKEND: tip = "Wochenende"; break;
    }

    let note = ""
    if (type == FreeDayType.HOLIDAY) {
      let name = ""
      for (let holiday of this.Dataset.Holidays) {
        if (AppComponent.IsSameDate(this.GetOffsetDate(date, offset), new Date(holiday.Date))) {
          name = holiday.Name;
          if (holiday.Note.length > 0) {
            note = " Hinweis: " + holiday.Note;
          }
          break;
        }
      }
      tip = tip + " (" + name + ")";
    }
    tip += ": " + ResultsComponent.DAYS[newDate.getDay()] + ", " +
      newDate.getDate() + "." + (newDate.getMonth() + 1) + "." + newDate.getFullYear() + note;



    return tip
  }
}
