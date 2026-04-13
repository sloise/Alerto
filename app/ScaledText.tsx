import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useAccessibility } from '../components/AccessibilityContext';

interface ScaledTextProps extends TextProps {
  /**
   * If true, applies the text size multiplier to the font
   * @default true
   */
  scalable?: boolean;
  /**
   * Optional variant for common text sizes
   * If provided, overrides the fontSize from style
   */
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'label' | 'caption' | 'button';
}

// Define base sizes for variants
const VARIANT_SIZES: Record<string, number> = {
  h1: 34,
  h2: 28,
  h3: 22,
  h4: 18,
  body: 16,
  label: 15,
  caption: 12,
  button: 14,
};

/**
 * ScaledText Component
 * 
 * Automatically scales text based on user's accessibility settings (textSizeMultiplier)
 * 
 * Usage:
 * <ScaledText style={styles.title}>Normal text</ScaledText>
 * <ScaledText variant="h1">Large heading</ScaledText>
 * <ScaledText scalable={false} style={styles.smallText}>This won't scale</ScaledText>
 */
export const ScaledText: React.FC<ScaledTextProps> = ({
  style,
  scalable = true,
  variant,
  children,
  ...props
}) => {
  const { textSizeMultiplier } = useAccessibility();

  // If not scalable or multiplier is 1, just render without scaling
  if (!scalable || textSizeMultiplier === 1.0) {
    // Apply variant size if provided
    let variantStyle = {};
    if (variant) {
      variantStyle = { fontSize: VARIANT_SIZES[variant] };
    }
    
    const finalStyle = variantStyle
      ? [variantStyle, style]
      : style;
    
    return (
      <Text style={finalStyle} {...props}>
        {children}
      </Text>
    );
  }

  // Get the base font size
  let baseFontSize: number | undefined;
  
  // If variant is provided, use that
  if (variant) {
    baseFontSize = VARIANT_SIZES[variant];
  } else if (style) {
    // Extract fontSize from style prop
    if (typeof style === 'object' && !Array.isArray(style)) {
      baseFontSize = (style as any).fontSize;
    } else if (Array.isArray(style)) {
      for (const s of style) {
        if (s && typeof s === 'object' && (s as any).fontSize) {
          baseFontSize = (s as any).fontSize;
          break;
        }
      }
    }
  }

  // Apply multiplier
  const scaledStyle = baseFontSize
    ? { fontSize: baseFontSize * textSizeMultiplier }
    : {};

  // Merge styles
  let mergedStyle;
  if (variant) {
    // If variant is used, apply variant size first, then user styles, then scaling
    const variantStyle = { fontSize: VARIANT_SIZES[variant] };
    mergedStyle = [variantStyle, style, scaledStyle];
  } else {
    mergedStyle = Array.isArray(style)
      ? [...style, scaledStyle]
      : { ...(style as object || {}), ...scaledStyle };
  }

  return (
    <Text style={mergedStyle} {...props}>
      {children}
    </Text>
  );
};

export default ScaledText;