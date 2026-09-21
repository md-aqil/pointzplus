// components/ui/TabIcons.tsx – Exact vector SVG icons for bottom navigation bar
import React from "react";
import Svg, { Path, Circle, Rect, Line, G } from "react-native-svg";

interface TabIconProps {
  focused: boolean;
  color?: string;
  size?: number;
}

/**
 * Home Icon: House silhouette with center window/door cutout
 */
export const HomeTabIcon: React.FC<TabIconProps> = ({
  focused,
  color = focused ? "#00A3FF" : "#6A6A74",
  size = 22,
}) => {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Solid filled house with cutout center */}
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10.867 2.454a1.75 1.75 0 012.266 0l8.25 6.75A1.75 1.75 0 0122 10.562V19.25A2.75 2.75 0 0119.25 22H4.75A2.75 2.75 0 012 19.25v-8.688a1.75 1.75 0 01.617-1.358l8.25-6.75zM9.5 13a2.5 2.5 0 012.5-2.5h0a2.5 2.5 0 012.5 2.5v4.25a.75.75 0 01-.75.75h-3.5a.75.75 0 01-.75-.75V13z"
          fill={color}
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5L12 3l9 7.5v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 21v-7a2 2 0 012-2h0a2 2 0 012 2v7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

/**
 * Overview Icon: 3 sparkle stars cluster (1 large star on left, 2 smaller stars on right)
 */
export const OverviewTabIcon: React.FC<TabIconProps> = ({
  focused,
  color = focused ? "#00A3FF" : "#6A6A74",
  size = 22,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Large 4-point sparkle on the left */}
      <Path
        d="M9.5 3C9.5 6.866 6.866 9.5 3 9.5C6.866 9.5 9.5 12.134 9.5 16C9.5 12.134 12.134 9.5 16 9.5C12.134 9.5 9.5 6.866 9.5 3Z"
        fill={focused ? color : "none"}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {/* Small sparkle top right */}
      <Path
        d="M18.5 4C18.5 5.657 17.157 7 15.5 7C17.157 7 18.5 8.343 18.5 10C18.5 8.343 19.843 7 21.5 7C19.843 7 18.5 5.657 18.5 4Z"
        fill={color}
      />
      {/* Small sparkle bottom right */}
      <Path
        d="M18 14.5C18 15.88 16.88 17 15.5 17C16.88 17 18 18.12 18 19.5C18 18.12 19.12 17 20.5 17C19.12 17 18 15.88 18 14.5Z"
        fill={color}
      />
    </Svg>
  );
};

/**
 * Deals Icon: Ticket voucher with side notches & dashed vertical perforation
 */
export const DealsTabIcon: React.FC<TabIconProps> = ({
  focused,
  color = focused ? "#00A3FF" : "#6A6A74",
  size = 22,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Ticket Body with notches */}
      <Path
        d="M3 8.5C4.38 8.5 5.5 9.62 5.5 11C5.5 12.38 4.38 13.5 3 13.5V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V13.5C19.62 13.5 18.5 12.38 18.5 11C18.5 9.62 19.62 8.5 21 8.5V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V8.5Z"
        fill={focused ? (color === "#00A3FF" ? "#E6F6FF" : "none") : "none"}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dashed vertical separator */}
      <Line
        x1="15"
        y1="7"
        x2="15"
        y2="15"
        stroke={color}
        strokeWidth={2}
        strokeDasharray="2 3"
        strokeLinecap="round"
      />
    </Svg>
  );
};

/**
 * Profile Icon: User head circle + smooth rounded shoulders
 */
export const ProfileTabIcon: React.FC<TabIconProps> = ({
  focused,
  color = focused ? "#00A3FF" : "#6A6A74",
  size = 22,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Head circle */}
      <Circle
        cx="12"
        cy="7"
        r="4"
        stroke={color}
        strokeWidth={2}
        fill={focused ? color : "none"}
      />
      {/* Shoulders arc */}
      <Path
        d="M4.5 20.5C4.5 16.91 7.858 14 12 14C16.142 14 19.5 16.91 19.5 20.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill={focused ? (color === "#00A3FF" ? "#E6F6FF" : "none") : "none"}
      />
    </Svg>
  );
};
