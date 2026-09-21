// components/ui/Input.tsx
import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  TextInputProps,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  prefix?: string;
  isPassword?: boolean;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  prefix,
  isPassword = false,
  leftIcon,
  rightAction,
  containerClassName = "",
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className={`w-full mb-4 ${containerClassName}`}>
      {label && (
        <Text
          style={{ fontFamily: "PlusJakartaSans-Medium" }}
          className="text-xs text-dark-muted mb-1.5"
        >
          {label}
        </Text>
      )}

      <View
        className={`flex-row items-center w-full px-4 py-3.5 bg-white rounded-2xl border transition-all ${
          error
            ? "border-alert bg-alert-bg"
            : isFocused
            ? "border-primary bg-white shadow-sm"
            : "border-border-light"
        }`}
      >
        {leftIcon && <View className="mr-2.5">{leftIcon}</View>}

        {prefix && (
          <Text
            style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
            className="text-dark-muted mr-1.5 text-sm"
          >
            {prefix}
          </Text>
        )}

        <TextInput
          style={{
            fontFamily: "PlusJakartaSans-Regular",
            flex: 1,
            fontSize: 14,
            color: "#070617",
            padding: 0,
          }}
          placeholderTextColor="#9C9BA2"
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          {...textInputProps}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="ml-2"
          >
            {showPassword ? (
              <EyeOff size={18} color="#6A6A74" />
            ) : (
              <Eye size={18} color="#6A6A74" />
            )}
          </TouchableOpacity>
        )}

        {rightAction && <View className="ml-2">{rightAction}</View>}
      </View>

      {error && (
        <Text
          style={{ fontFamily: "PlusJakartaSans-Regular" }}
          className="text-xs text-alert mt-1.5 ml-1"
        >
          {error}
        </Text>
      )}
    </View>
  );
};
