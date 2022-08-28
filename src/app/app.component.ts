import { Component } from '@angular/core';
import * as Papa from 'papaparse';

type ColumnDataType = 'text' | 'number+eu' | 'number+us' | 'date+yyyy-mm-dd' | 'date+dd/mm/yyyy' | 'date+mm/dd/yyyy';

type ColumnRole = 'identifier' | 'classifier' | 'feature' | 'remark';

type Column = {
  name: string;
  role: ColumnRole;
  datatype: ColumnDataType;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public file?: File;
  public contents?: Papa.ParseResult<string[]>;
  private _headerIncluded = false;

  public header?: Column[];
  public data?: string[][];

  fileChanged(e: Event) {
    const input = (e.target as HTMLInputElement);
    this.file = (input?.files || [])[0];
    this.contents = undefined;
    this.header = undefined;
    this._headerIncluded = false;
    if (this.file) {
      Papa.parse(this.file, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (results: Papa.ParseResult<string[]>) => {
          this.contents = results;
          
          if (!results.errors.length) {
            this.headerIncluded = false;
          }
        }
      });
    }
  }

  public get headerIncluded() { return this._headerIncluded; }
  public set headerIncluded(_headerIncluded: boolean) {
    this._headerIncluded = _headerIncluded;
    if (!this.contents || this.contents.errors.length) {
      return;
    }

    if (!this.header) {
      const length = this.contents.data.length;
      this.header = Array.from({length}).map(_ => ({name: '', role: 'remark', datatype: 'text'}));
    }

    if (!_headerIncluded) {
      this.header.forEach((column, i) => column.name = `Coluna ${i+1}`);
      this.data = this.contents.data;
    } else {
      this.header.forEach((column, i) => column.name = this.contents!.data[0][i]);
      this.data = this.contents.data.slice(1);
    }

    this.header.forEach((column, i) => {
      const selectedParser = parsers
        .map(parser =>
          this.data!
            .map(row => row[i])
            .map(cell => parser(cell))
            .filter(data => !(data instanceof Error))
            .length
          )
        .reduce((prev, _, curr, arr) => arr[curr] > arr[prev] ? curr : prev, 0);

      column.datatype = parsers[selectedParser].dataType as ColumnDataType;
    })
  }
}

function parseNumberEU(s: string): number | Error {
  const result = /^([-+]?\d{1,3}(?:(?:\.\d{3})*|(?:\d{3})*))(?:,(\d+))?$/.exec(s);
  if (!result)
    return Error(`Não é número (europeu): ${s}`);
  
  const integralPart = Number.parseInt(result[1].replace(/\./g, ''), 10);
  const fractionalPart = result[2] && Number.parseInt(result[2], 10) || 0;

  return integralPart + fractionalPart/Math.pow(10, Math.floor(Math.log10(fractionalPart))+1)
}
parseNumberEU.dataType = 'number+eu';

function parseNumberUS(s: string): number | Error {
  const result = /^([-+]?\d{1,3}(?:(?:,\d{3})*|(?:\d{3})*))(?:\.(\d+))?$/.exec(s);
  if (!result)
    return Error(`Não é número (americano): ${s}`);
  
  const integralPart = Number.parseInt(result[1].replace(/,/g, ''), 10);
  const fractionalPart = result[2] && Number.parseInt(result[2], 10) || 0;

  return integralPart + fractionalPart/Math.pow(10, Math.floor(Math.log10(fractionalPart))+1)
}
parseNumberUS.dataType = 'number+us';

function parseText(s: string): string {
  return s;
}
parseText.dataType = 'text';

const parsers = [parseNumberEU, parseNumberUS, parseText];