// app/sync-rejected.tsx – Skipped & Unparsed Email Diagnostics Screen
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  MailX,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  Info,
  AlertTriangle,
  FileCheck2,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { usePointsStore } from "../store/pointsStore";
import { RejectedEmail } from "../types/models";

type FilterType = "ALL" | "AI_NON_LOYALTY" | "NO_VALID_BALANCE" | "NO_REWARD_SIGNALS" | "AI_ERROR";

function getReasonBadge(reason: string) {
  switch (reason) {
    case "AI_NON_LOYALTY":
      return {
        label: "AI: Non-Loyalty Statement",
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-800",
        iconColor: "#D97706",
      };
    case "NO_VALID_BALANCE":
      return {
        label: "AI: No Point Balance Found",
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-800",
        iconColor: "#2563EB",
      };
    case "NO_REWARD_SIGNALS":
      return {
        label: "No Reward Keywords",
        bg: "bg-slate-100",
        border: "border-slate-200",
        text: "text-slate-700",
        iconColor: "#64748B",
      };
    case "AI_ERROR":
      return {
        label: "AI Timeout / Error",
        bg: "bg-rose-50",
        border: "border-rose-200",
        text: "text-rose-800",
        iconColor: "#E11D48",
      };
    default:
      return {
        label: reason.replace(/_/g, " "),
        bg: "bg-slate-100",
        border: "border-slate-200",
        text: "text-slate-700",
        iconColor: "#64748B",
      };
  }
}

export default function SyncRejectedScreen() {
  const router = useRouter();
  const lastSyncRejectedEmails = usePointsStore((s) => s.lastSyncRejectedEmails);
  const syncProgress = usePointsStore((s) => s.syncProgress);

  // Combine live stream rejected emails if currently syncing or fallback to last completed
  const rejectedList: RejectedEmail[] = useMemo(() => {
    if (syncProgress.rejectedEmails && syncProgress.rejectedEmails.length > 0) {
      return syncProgress.rejectedEmails;
    }
    return lastSyncRejectedEmails || [];
  }, [syncProgress.rejectedEmails, lastSyncRejectedEmails]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredItems = useMemo(() => {
    return rejectedList.filter((item) => {
      // Filter tab
      if (activeFilter !== "ALL" && item.reason !== activeFilter) {
        return false;
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchSub = item.subject?.toLowerCase().includes(q);
      const matchFrom = item.from?.toLowerCase().includes(q);
      const matchSnippet = item.preview?.toLowerCase().includes(q);
      return matchSub || matchFrom || matchSnippet;
    });
  }, [rejectedList, activeFilter, searchQuery]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      <ScreenHeader
        title="Skipped & Unparsed"
        fallbackRoute="/email-sync"
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        {/* Info Banner */}
        <View className="px-5 pt-3 pb-2">
          <View className="bg-sky-50 border border-sky-200/80 rounded-2xl p-4 flex-row items-start space-x-3">
            <View className="w-8 h-8 rounded-full bg-sky-100 items-center justify-center mt-0.5 mr-3">
              <Sparkles size={16} color="#01A2FB" />
            </View>
            <View className="flex-1">
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-xs text-sky-950 mb-0.5"
              >
                AI Diagnostic & Audit Stream
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-[11px] text-sky-900/80 leading-4"
              >
                These emails were evaluated by DeepSeek & Gemini but were not classified as active loyalty balance statements. Review them to identify missing rewards.
              </Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View className="px-5 pt-2 pb-2">
          <View className="flex-row items-center bg-white rounded-2xl px-3.5 py-2.5 border border-border-light shadow-sm">
            <Search size={16} color="#6A6A74" className="mr-2" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search sender, subject, or content..."
              placeholderTextColor="#9C9BA2"
              className="flex-1 text-xs text-dark ml-2 py-0"
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} className="p-1">
                <Text className="text-xs text-dark-muted font-bold">✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-5 py-2"
          contentContainerStyle={{ paddingRight: 20 }}
        >
          {[
            { id: "ALL", label: `All (${rejectedList.length})` },
            { id: "AI_NON_LOYALTY", label: "AI Non-Loyalty" },
            { id: "NO_VALID_BALANCE", label: "No Point Balance" },
            { id: "NO_REWARD_SIGNALS", label: "No Reward Keywords" },
            { id: "AI_ERROR", label: "AI Errors" },
          ].map((pill) => {
            const isActive = activeFilter === pill.id;
            return (
              <TouchableOpacity
                key={pill.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveFilter(pill.id as FilterType);
                }}
                className={`mr-2 px-3.5 py-2 rounded-xl border ${
                  isActive
                    ? "bg-dark border-dark shadow-sm"
                    : "bg-white border-border-light"
                }`}
              >
                <Text
                  style={{
                    fontFamily: isActive
                      ? "PlusJakartaSans-Bold"
                      : "PlusJakartaSans-Medium",
                  }}
                  className={`text-xs ${isActive ? "text-white" : "text-dark-muted"}`}
                >
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List of Rejected Emails */}
        <View className="px-5 pt-3">
          {filteredItems.length === 0 ? (
            <View className="bg-white rounded-3xl p-8 items-center justify-center border border-border-light my-4">
              <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
                <FileCheck2 size={32} color="#64748B" />
              </View>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                className="text-sm text-dark mb-1 text-center"
              >
                {rejectedList.length === 0
                  ? "No Skipped Emails Recorded"
                  : "No Matching Emails Found"}
              </Text>
              <Text
                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                className="text-xs text-dark-muted text-center max-w-xs leading-4"
              >
                {rejectedList.length === 0
                  ? "Run a Gmail scan from the Email Sync screen to inspect unextracted emails in real time."
                  : "Try clearing search keywords or selecting 'All'."}
              </Text>
            </View>
          ) : (
            filteredItems.map((item, index) => {
              const itemKey = item.messageId || `rej_${index}_${item.receivedAt}`;
              const isExpanded = Boolean(expandedIds[itemKey]);
              const badge = getReasonBadge(item.reason);

              const formattedDate = (() => {
                try {
                  const d = new Date(item.receivedAt);
                  return isNaN(d.getTime())
                    ? "Recent"
                    : d.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                } catch {
                  return "Recent";
                }
              })();

              return (
                <View
                  key={itemKey}
                  className="bg-white rounded-2xl border border-border-light mb-3 overflow-hidden shadow-sm"
                >
                  {/* Header Row */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleExpand(itemKey)}
                    className="p-4"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      {/* Reason Pill */}
                      <View
                        className={`px-2.5 py-1 rounded-full border ${badge.bg} ${badge.border} flex-row items-center`}
                      >
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Bold" }}
                          className={`text-[10px] ${badge.text}`}
                        >
                          {badge.label}
                        </Text>
                      </View>

                      <Text
                        style={{ fontFamily: "PlusJakartaSans-Regular" }}
                        className="text-[11px] text-dark-muted"
                      >
                        {formattedDate}
                      </Text>
                    </View>

                    {/* Subject Line */}
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Bold" }}
                      className="text-xs text-dark leading-5 mb-1"
                      numberOfLines={isExpanded ? undefined : 2}
                    >
                      {item.subject || "(No Subject)"}
                    </Text>

                    {/* Sender Header */}
                    <View className="flex-row items-center justify-between mt-1">
                      <Text
                        style={{ fontFamily: "PlusJakartaSans-Medium" }}
                        className="text-[11px] text-dark-muted flex-1 mr-2"
                        numberOfLines={1}
                      >
                        {item.from}
                      </Text>

                      <View className="flex-row items-center space-x-1">
                        {item.hasAttachments && (
                          <View className="bg-slate-100 px-1.5 py-0.5 rounded mr-1.5">
                            <Text
                              style={{ fontFamily: "PlusJakartaSans-Bold" }}
                              className="text-[9px] text-slate-700"
                            >
                              📎 Attachment
                            </Text>
                          </View>
                        )}
                        {isExpanded ? (
                          <ChevronUp size={16} color="#9C9BA2" />
                        ) : (
                          <ChevronDown size={16} color="#9C9BA2" />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded AI Analysis & Snippet */}
                  {isExpanded && (
                    <View className="px-4 pb-4 pt-2 border-t border-border-light/60 bg-slate-50/70">
                      {/* AI Diagnostic Note */}
                      <View className="mb-3">
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Bold" }}
                          className="text-[11px] text-dark-surface uppercase tracking-wider mb-1"
                        >
                          AI Evaluation / Diagnostic Note
                        </Text>
                        <View className="bg-white p-2.5 rounded-xl border border-border-light">
                          <Text
                            style={{ fontFamily: "PlusJakartaSans-Regular" }}
                            className="text-xs text-dark leading-5"
                          >
                            {item.aiNotes || "No additional diagnostic info."}
                          </Text>
                        </View>
                      </View>

                      {/* Content Snippet */}
                      {Boolean(item.preview) && (
                        <View>
                          <Text
                            style={{ fontFamily: "PlusJakartaSans-Bold" }}
                            className="text-[11px] text-dark-surface uppercase tracking-wider mb-1"
                          >
                            Email Content Preview
                          </Text>
                          <View className="bg-white p-2.5 rounded-xl border border-border-light">
                            <Text
                              style={{ fontFamily: "PlusJakartaSans-Regular" }}
                              className="text-xs text-dark-muted leading-5 font-mono"
                            >
                              {item.preview}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
