// components/ui/AccountStatementModal.tsx – Full Proof & Statement Details Modal
import React from "react";
import { View, Text, Modal, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  X,
  Mail,
  ShieldCheck,
  Clock,
  Sparkles,
  Layers,
  FileText,
  Calendar,
  User,
  Coins,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LinkedAccount } from "../../types/loyalty";

interface AccountStatementModalProps {
  visible: boolean;
  account: LinkedAccount | null;
  onClose: () => void;
}

export const AccountStatementModal: React.FC<AccountStatementModalProps> = ({
  visible,
  account,
  onClose,
}) => {
  if (!account) return null;

  const estimatedValue = (
    account.currentBalance * (account.program.pointValueINR || 0.25)
  ).toFixed(2);

  const formattedSyncDate = account.lastSyncedAt
    ? new Date(account.lastSyncedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recently synced";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end items-center bg-black/50">
        <View className="w-full max-w-[393px] bg-white rounded-t-3xl max-h-[85%] border-t border-border-light overflow-hidden shadow-2xl">
          {/* Header */}
          <View className="px-5 py-4 border-b border-border-light/60 flex-row items-center justify-between bg-[#F5FEFF]">
            <View className="flex-row items-center flex-1 mr-3">
              <View
                style={{ backgroundColor: `${account.program.accentColor}20` }}
                className="w-10 h-10 rounded-2xl items-center justify-center mr-3 border border-border-light"
              >
                <Text className="text-lg">{account.program.logoInitial || "⭐"}</Text>
              </View>
              <View className="flex-1">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-base text-dark"
                  numberOfLines={1}
                >
                  {account.program.name}
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Medium" }}
                  className="text-xs text-dark-muted capitalize"
                >
                  {account.program.category} • {account.accountNumberMasked || "MEMBER-***"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-white border border-border-light items-center justify-center"
            >
              <X size={18} color="#070617" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          >
            {/* Balance Card */}
            <View className="bg-dark rounded-2xl p-5 mb-5 border border-dark-surface">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                className="text-xs text-muted uppercase tracking-wider mb-1"
              >
                Verified Points Balance
              </Text>
              <View className="flex-row items-baseline justify-between">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-3xl text-white tracking-tight"
                >
                  {account.currentBalance.toLocaleString()}{" "}
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                    className="text-primary text-sm"
                  >
                    pts
                  </Text>
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                  className="text-xs text-primary"
                >
                  ≈ ₹{Number(estimatedValue).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Email Extraction Source & Proof Details */}
            <Text
              style={{ fontFamily: "PlusJakartaSans-Bold" }}
              className="text-sm text-dark mb-3 uppercase tracking-wider"
            >
              Statement Source & Extraction Details
            </Text>

            <View className="bg-[#F8FDFF] rounded-2xl border border-[#E6F6FF] p-4 mb-4">
              {/* Mailbox */}
              <View className="flex-row items-start mb-3.5">
                <View className="w-8 h-8 rounded-xl bg-primary/10 items-center justify-center mr-3 mt-0.5">
                  <Mail size={16} color="#01A2FB" />
                </View>
                <View className="flex-1">
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Medium" }}
                    className="text-xs text-dark-muted"
                  >
                    Scanned Mailbox
                  </Text>
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                    className="text-sm text-dark"
                  >
                    Connected Gmail Inbox
                  </Text>
                </View>
              </View>

              {/* Source Sender */}
              {account.sourceSender && (
                <View className="flex-row items-start mb-3.5">
                  <View className="w-8 h-8 rounded-xl bg-purple-50 items-center justify-center mr-3 mt-0.5">
                    <FileText size={16} color="#9C4EBD" />
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Medium" }}
                      className="text-xs text-dark-muted"
                    >
                      Statement Sender
                    </Text>
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                      className="text-sm text-dark"
                    >
                      {account.sourceSender}
                    </Text>
                  </View>
                </View>
              )}

              {/* Email Subject */}
              {account.sourceSubject && (
                <View className="flex-row items-start mb-3.5">
                  <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center mr-3 mt-0.5">
                    <Sparkles size={16} color="#10B981" />
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Medium" }}
                      className="text-xs text-dark-muted"
                    >
                      Email Subject
                    </Text>
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                      className="text-sm text-dark"
                    >
                      {account.sourceSubject}
                    </Text>
                  </View>
                </View>
              )}

              {/* Extraction Engine */}
              <View className="flex-row items-start mb-3.5">
                <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center mr-3 mt-0.5">
                  <ShieldCheck size={16} color="#02EFF4" />
                </View>
                <View className="flex-1">
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Medium" }}
                    className="text-xs text-dark-muted"
                  >
                    Extraction Method
                  </Text>
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                    className="text-sm text-dark"
                  >
                    {account.syncMethod === "email_parser"
                      ? "AI & Smart Statement Parser (Verified)"
                      : "Direct Loyalty API / Manual Sync"}
                  </Text>
                </View>
              </View>

              {/* Member ID */}
              <View className="flex-row items-start mb-3.5">
                <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center mr-3 mt-0.5">
                  <User size={16} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Medium" }}
                    className="text-xs text-dark-muted"
                  >
                    Account / Membership ID
                  </Text>
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                    className="text-sm text-dark"
                  >
                    {account.accountNumberMasked || "MEMBER-***"}
                  </Text>
                </View>
              </View>

              {/* Expiry Details */}
              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-xl bg-red-50 items-center justify-center mr-3 mt-0.5">
                  <Clock size={16} color="#FF4343" />
                </View>
                <View className="flex-1">
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Medium" }}
                    className="text-xs text-dark-muted"
                  >
                    Expiry Status
                  </Text>
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                    className={`text-sm ${
                      account.expiringPoints > 0 ? "text-alert" : "text-dark"
                    }`}
                  >
                    {account.expiringPoints > 0
                      ? `${account.expiringPoints.toLocaleString()} pts expire ${
                          account.expiryDate || "soon"
                        }`
                      : "No points expiring soon (Active)"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Last Synced footer */}
            <View className="flex-row items-center justify-center pt-2">
              <Calendar size={14} color="#6A6A74" className="mr-1.5" />
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-dark-muted ml-1"
              >
                Last verified: {formattedSyncDate}
              </Text>
            </View>

            {/* Done CTA */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onClose();
              }}
              className="w-full bg-dark py-4 rounded-2xl items-center mt-6 shadow-sm active:opacity-90"
            >
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-white text-sm"
              >
                Done
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
