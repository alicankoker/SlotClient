import { TextStyle } from 'pixi.js';

export interface IStyleConfig {
  loaderStyles: {
    barFill: number;
    barBackground: number;
    barStrokeFront: number;
    barStrokeBack: number;
    barShadow: number;
    fontStyle: string;
  };
  style_1: TextStyle;
  style_2: TextStyle;
  style_3: TextStyle;
  style_4: TextStyle;
  style_5: TextStyle;
  
  // Utility methods
  getTextStyle(styleId: number): TextStyle;
  getAllTextStyles(): TextStyle[];
}

export abstract class BaseStyleConfig implements IStyleConfig {
  abstract loaderStyles: {
    barFill: number;
    barBackground: number;
    barStrokeFront: number;
    barStrokeBack: number;
    barShadow: number;
    fontStyle: string;
  };
  abstract style_1: TextStyle;
  abstract style_2: TextStyle;
  abstract style_3: TextStyle;
  abstract style_4: TextStyle;
  abstract style_5: TextStyle;

  public getLoaderStyles() {
    return this.loaderStyles;
  }
  
  public getTextStyle(styleId: number): TextStyle {
    const styleKey = `style_${styleId}` as keyof this;
    const style = this[styleKey];
    
    if (!style || !(style instanceof TextStyle)) {
      throw new Error(`Style with id ${styleId} not found`);
    }
    
    return style as TextStyle;
  }
  
  public getAllTextStyles(): TextStyle[] {
    const styles: TextStyle[] = [];
    
    for (let i = 1; i <= 10; i++) {
      const styleKey = `style_${i}` as keyof this;
      const style = this[styleKey];
      
      if (style && style instanceof TextStyle) {
        styles.push(style as TextStyle);
      }
    }
    
    return styles;
  }
}