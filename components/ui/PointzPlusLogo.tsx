import React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";

export type LogoVariant =
  | "vertical"
  | "horizontal"
  | "icon"
  | "wordmark"
  | "darkBackground"
  | "white"
  | "black"
  | "monogram";

interface PointzPlusLogoProps {
  variant?: LogoVariant;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: "contain" | "cover" | "stretch" | "center";
}

const logoSources: Record<LogoVariant, any> = {
  vertical: require("../../assets/logo.png"),
  horizontal: require("../../assets/logos/logo-horizontal.png"),
  icon: require("../../assets/logos/logo-icon.png"),
  wordmark: require("../../assets/logos/logo-wordmark.png"),
  darkBackground: require("../../assets/logos/logo-dark.png"),
  white: require("../../assets/logos/logo-white.png"),
  black: require("../../assets/logos/logo-black.png"),
  monogram: require("../../assets/logos/logo-monogram.png"),
};

export const PointzPlusLogo: React.FC<PointzPlusLogoProps> = ({
  variant = "vertical",
  width,
  height,
  style,
  resizeMode = "contain",
}) => {
  // Default dimensions based on aspect ratios of variants if not provided
  const getDefaultDimensions = () => {
    switch (variant) {
      case "horizontal":
        return { width: width ?? 160, height: height ?? 44 };
      case "icon":
      case "monogram":
        return { width: width ?? 44, height: height ?? 44 };
      case "wordmark":
        return { width: width ?? 140, height: height ?? 32 };
      case "vertical":
      case "darkBackground":
      case "white":
      case "black":
      default:
        return { width: width ?? 180, height: height ?? 120 };
    }
  };

  const dimensions = getDefaultDimensions();

  return (
    <Image
      source={logoSources[variant] || logoSources.vertical}
      style={[{ width: dimensions.width, height: dimensions.height }, style]}
      resizeMode={resizeMode}
      accessibilityRole="image"
      accessibilityLabel={`PointzPlus Logo (${variant})`}
    />
  );
};

export default PointzPlusLogo;
