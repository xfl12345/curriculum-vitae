export const cssMixer = (
  defaultCssStyle: Partial<CSSStyleDeclaration>,
  inputCssStyle: Partial<CSSStyleDeclaration>
): Partial<CSSStyleDeclaration> => {
  const theStyle: Partial<CSSStyleDeclaration> = { ...defaultCssStyle };
  if (defaultCssStyle !== inputCssStyle) {
    Object.keys(inputCssStyle).forEach((key) => {
      (theStyle as any)[key] = inputCssStyle[key as keyof typeof inputCssStyle];
    });
  }
  return theStyle;
};
