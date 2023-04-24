import { ValuePair } from "./ValuePair";

export class KeyValuePair extends ValuePair {
  theKey: string;

  constructor(theKey: string, theDisplayValue: string, theCopyValue: string) {
    super(theDisplayValue, theCopyValue);
    this.theKey = theKey;
  }

  static createBlankInstance(): KeyValuePair {
    return new KeyValuePair("", "", "");
  }

  static createInstance2(theKey: string, theCopyValue: string): KeyValuePair {
    return new KeyValuePair(theKey, theCopyValue, theCopyValue);
  }
}
