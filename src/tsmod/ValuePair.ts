export class ValuePair {
  theDisplayValue: string;

  theCopyValue: string;

  constructor(theDisplayValue: string, theCopyValue: string) {
    this.theDisplayValue = theDisplayValue;
    this.theCopyValue = theCopyValue;
  }

  static createValuePairBlankInstance(): ValuePair {
    return new ValuePair("", "");
  }

  static createValuePairInstance2(theCopyValue: string): ValuePair {
    return new ValuePair(theCopyValue, theCopyValue);
  }
}
