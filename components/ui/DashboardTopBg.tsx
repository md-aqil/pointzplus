// components/ui/DashboardTopBg.tsx – Exact SVG Background from design
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  G,
  Rect,
  Ellipse,
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  ClipPath,
} from "react-native-svg";

interface DashboardTopBgProps {
  width?: string | number;
  height?: string | number;
}

export const DashboardTopBg: React.FC<DashboardTopBgProps> = ({
  width = "100%",
  height = "100%",
}) => {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" as any }]}>
      <Svg
        width={width}
        height={height}
        viewBox="0 0 393 382"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        style={StyleSheet.absoluteFill}
      >
        <G clipPath="url(#clip0_5_476)">
          <Rect width="393" height="382" fill="url(#paint0_linear_5_476)" />
          <Ellipse
            cx="383.146"
            cy="30.2441"
            rx="127.5"
            ry="77.5"
            transform="rotate(-21.7597 383.146 30.2441)"
            fill="white"
            fillOpacity={0.08}
          />
          <Path
            d="M0 0H2L192 382H0V0Z"
            fill="url(#paint1_linear_5_476)"
            fillOpacity={0.32}
          />
        </G>
        <Defs>
          <SvgLinearGradient
            id="paint0_linear_5_476"
            x1="-196.5"
            y1="-207"
            x2="427.114"
            y2="343.345"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#02EFF4" />
            <Stop offset="0.495192" stopColor="#01A2FB" />
            <Stop offset="1" stopColor="#3F0059" />
          </SvgLinearGradient>
          <SvgLinearGradient
            id="paint1_linear_5_476"
            x1="-96"
            y1="-207"
            x2="360.996"
            y2="-9.96635"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#02EFF4" />
            <Stop offset="0.495192" stopColor="#01A2FB" />
            <Stop offset="1" stopColor="#3F0059" />
          </SvgLinearGradient>
          <ClipPath id="clip0_5_476">
            <Rect width="393" height="382" fill="white" />
          </ClipPath>
        </Defs>
      </Svg>
    </View>
  );
};
