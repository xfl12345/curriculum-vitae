export class CssLengthInNumberUnit {
  protected unitName: string;

  unitValue: number;

  constructor(unitName: string, unitValue: number) {
    this.unitName = unitName;
    this.unitValue = unitValue;
  }

  getUnitName = () => this.unitName;
}

export class CssPixelUnit extends CssLengthInNumberUnit {
  constructor(unitValue: number) {
    super("px", unitValue);
  }
}
