declare module "lunar-javascript" {
  export class Solar {
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Solar;
    static fromYmd(year: number, month: number, day: number): Solar;
    getLunar(): Lunar;
    getFullYear(): number;
    getMonth(): number;
    getDate(): number;
    toYmd(): string;
  }
  export class Lunar {
    getEightChar(): EightChar;
  }
  export class EightChar {
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getYun(genderCode: number): Yun;
  }
  export class Yun {
    getDaYun(): DaYun[];
  }
  export class DaYun {
    getGanZhi(): string;
    getStartAge(): number;
  }
}
