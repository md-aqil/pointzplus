// components/ui/PasswordChecklist.tsx
import React from "react";
import { View, Text } from "react-native";
import { Check, X } from "lucide-react-native";

interface PasswordChecklistProps {
  password?: string;
}

export const PasswordChecklist: React.FC<PasswordChecklistProps> = ({
  password = "",
}) => {
  const rules = [
    {
      label: "Use 8+ characters",
      valid: password.length >= 8,
    },
    {
      label: "At least one number",
      valid: /[0-9]/.test(password),
    },
    {
      label: "At least one uppercase letter",
      valid: /[A-Z]/.test(password),
    },
    {
      label: "At least one special character",
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ];

  return (
    <View className="w-full bg-white p-4 rounded-2xl border border-border-light my-2">
      <Text
        style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
        className="text-xs text-dark-muted mb-2.5"
      >
        Password Requirements:
      </Text>

      <View className="space-y-2">
        {rules.map((rule, idx) => (
          <View key={idx} className="flex-row items-center space-x-2 py-0.5">
            <View
              className={`w-4 h-4 rounded-full items-center justify-center mr-2 ${
                rule.valid ? "bg-primary" : "bg-gray-100"
              }`}
            >
              {rule.valid ? (
                <Check size={10} color="#070617" strokeWidth={3} />
              ) : (
                <View className="w-1.5 h-1.5 rounded-full bg-muted" />
              )}
            </View>
            <Text
              style={{
                fontFamily: rule.valid
                  ? "PlusJakartaSans-SemiBold"
                  : "PlusJakartaSans-Regular",
              }}
              className={`text-xs ${rule.valid ? "text-dark" : "text-muted"}`}
            >
              {rule.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
