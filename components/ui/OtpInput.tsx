// components/ui/OtpInput.tsx
import React, { useRef } from "react";
import {
  View,
  TextInput,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import * as Haptics from "expo-haptics";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  error?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  error = false,
}) => {
  const inputs = useRef<Array<TextInput | null>>([]);
  const digits = value.split("");

  const handleChangeText = (text: string, index: number) => {
    // Check if pasted multiple characters
    if (text.length > 1) {
      const cleaned = text.replace(/[^0-9]/g, "").slice(0, length);
      onChange(cleaned);
      const nextFocus = Math.min(cleaned.length, length - 1);
      inputs.current[nextFocus]?.focus();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = text;
    const newCode = newDigits.join("");
    onChange(newCode);

    if (text) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (index < length - 1) {
        inputs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
      }
    }
  };

  return (
    <View className="flex-row justify-between items-center w-full my-4">
      {Array.from({ length }).map((_, index) => {
        const digit = digits[index] || "";
        const isFilled = !!digit;

        return (
          <View
            key={index}
            className={`w-12 h-14 bg-white rounded-2xl items-center justify-center border transition-all ${
              error
                ? "border-alert bg-alert-bg"
                : isFilled
                ? "border-primary bg-ice"
                : "border-border-light"
            }`}
          >
            <TextInput
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              style={{
                fontFamily: "PlusJakartaSans-Bold",
                fontSize: 20,
                color: "#070617",
                textAlign: "center",
                width: "100%",
                height: "100%",
              }}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleChangeText(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              selectTextOnFocus
            />
          </View>
        );
      })}
    </View>
  );
};
