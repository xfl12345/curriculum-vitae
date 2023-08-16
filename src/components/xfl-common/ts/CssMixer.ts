import { VuePartialCssProperties } from "./VuePartialCssProperties";

export const cssMixer = (
  defaultCssStyle: VuePartialCssProperties,
  inputCssStyle: VuePartialCssProperties
): VuePartialCssProperties => {
  const theStyle: VuePartialCssProperties = { ...(defaultCssStyle as any) };
  if (defaultCssStyle !== inputCssStyle) {
    Object.keys(inputCssStyle).forEach((key) => {
      (theStyle as any)[key] = inputCssStyle[key as keyof typeof inputCssStyle];
    });
  }
  return theStyle;
};
