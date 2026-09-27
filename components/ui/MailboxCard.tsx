// components/ui/MailboxCard.tsx – One connected mailbox row (email + actions).
// Extracted so the email-sync screen can render a variable number of them.
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CheckCircle2, RefreshCw } from "lucide-react-native";

interface MailboxCardProps {
  email: string;
  programsFound: number;
  lastSyncAt: string | null;
  busy?: boolean;
  onScan: () => void;
  onRemove: () => void;
}

export const MailboxCard: React.FC<MailboxCardProps> = ({
  email,
  programsFound,
  lastSyncAt,
  busy = false,
  onScan,
  onRemove,
}) => {
  const syncLabel = lastSyncAt
    ? `synced ${new Date(lastSyncAt).toLocaleDateString()}`
    : "not scanned yet";

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-border-light shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-11 h-11 rounded-2xl bg-red-50 items-center justify-center mr-3 border border-red-100">
            <Text className="text-xl">✉️</Text>
          </View>
          <View className="flex-1">
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-sm text-dark"
              numberOfLines={1}
            >
              {email}
            </Text>
            <Text
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
              className="text-[11px] text-dark-muted"
            >
              {programsFound} program{programsFound === 1 ? "" : "s"} found · {syncLabel}
            </Text>
          </View>
        </View>

        <View className="bg-emerald-50 px-2.5 py-1 rounded-full flex-row items-center border border-emerald-200">
          <CheckCircle2 size={12} color="#059669" className="mr-1" />
          <Text
            style={{ fontFamily: "PlusJakartaSans-Bold" }}
            className="text-[10px] text-emerald-700 ml-1"
          >
            Connected
          </Text>
        </View>
      </View>

      <View className="flex-row mt-3.5">
        <TouchableOpacity
          onPress={onScan}
          disabled={busy}
          className="flex-1 bg-[#00A3FF] py-2.5 rounded-xl items-center flex-row justify-center"
        >
          <RefreshCw size={14} color="#FFFFFF" className="mr-1.5" />
          <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-white text-xs">
            Scan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRemove}
          disabled={busy}
          className="ml-2.5 px-4 py-2.5 rounded-xl items-center justify-center border border-red-200 bg-red-50"
        >
          <Text style={{ fontFamily: "PlusJakartaSans-Bold" }} className="text-xs text-red-600">
            Remove
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
