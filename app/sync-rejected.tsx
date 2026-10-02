// app/sync-rejected.tsx – Email Diagnostics & Statement Inspector Screen
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileCheck2,
  CheckCircle2,
  Cpu,
  Mail,
  RefreshCw,
  Clock,
  Layers,
  Plane,
  CreditCard,
  Building2,
  ShoppingBag,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { usePointsStore } from "../store/pointsStore";
import { usePoints } from "../hooks/usePoints";
import { RejectedEmail, ParsedEmailStatement } from "../types/models";

type TabMode = "SKIPPED" | "PARSED";
type SkippedFilterType = "ALL" | "AI_NON_LOYALTY" | "NO_VALID_BALANCE" | "NO_REWARD_SIGNALS" | "AI_ERROR";
type ParsedFilterType = "ALL" | "airlines" | "banking" | "hotels" | "shopping" | "other";

function getReasonBadge(reason: string) {
  switch (reason) {
    case "AI_NON_LOYALTY":
      return {
        label: "AI: Non-Loyalty Statement",
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-800",
      };
    case "NO_VALID_BALANCE":
      return {
        label: "AI: No Point Balance Found",
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-800",
      };
    case "NO_REWARD_SIGNALS":
      return {
        label: "No Reward Keywords",
        bg: "bg-slate-100",
        border: "border-slate-200",
        text: "text-slate-700",
      };
    case "AI_ERROR":
      return {
        label: "AI Timeout / Error",
        bg: "bg-rose-50",
        border: "border-rose-200",
        text: "text-rose-800",
      };
    default:
      return {
        label: reason.replace(/_/g, " "),
        bg: "bg-slate-100",
        border: "border-slate-200",
        text: "text-slate-700",
      };
  }
}

function getCategoryIcon(category?: string) {
  switch (category?.toLowerCase()) {
    case "airlines":
      return "✈️";
    case "banking":
      return "💳";
    case "hotels":
      return "🏨";
    case "shopping":
      return "🛍️";
    default:
      return "⭐";
  }
}

export default function SyncRejectedScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabMode>("SKIPPED");
  const [refreshing, setRefreshing] = useState(false);

  const {
    syncProgress,
    isSyncing,
    isBackfillRunning,
    activeJobDetails,
    parsedStatements,
    fetchParsedStatements,
    checkActiveSyncStatus,
  } = usePoints();

  const lastSyncRejectedEmails = usePointsStore((s) => s.lastSyncRejectedEmails);

  // Initial data load on mount
  useEffect(() => {
    fetchParsedStatements(300);
    checkActiveSyncStatus();
  }, [fetchParsedStatements, checkActiveSyncStatus]);

  // Adaptive polling: only poll while a sync / backfill job is actively running
  useEffect(() => {
    if (!isBackfillRunning && !isSyncing) return;

    const interval = setInterval(() => {
      checkActiveSyncStatus();
    }, 4000);

    return () => clearInterval(interval);
  }, [isBackfillRunning, isSyncing, checkActiveSyncStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Promise.all([
      fetchParsedStatements(300),
      checkActiveSyncStatus(),
    ]);
    setRefreshing(false);
  };

  // Combine live stream rejected emails if currently syncing or fallback to last completed
  const rejectedList: RejectedEmail[] = useMemo(() => {
    if (syncProgress.rejectedEmails && syncProgress.rejectedEmails.length > 0) {
      return syncProgress.rejectedEmails;
    }
    return lastSyncRejectedEmails || [];
  }, [syncProgress.rejectedEmails, lastSyncRejectedEmails]);

  const [searchQuery, setSearchQuery] = useState("");
  const [skippedFilter, setSkippedFilter] = useState<SkippedFilterType>("ALL");
  const [parsedFilter, setParsedFilter] = useState<ParsedFilterType>("ALL");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredSkippedItems = useMemo(() => {
    return rejectedList.filter((item) => {
      if (skippedFilter !== "ALL" && item.reason !== skippedFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchSub = item.subject?.toLowerCase().includes(q);
      const matchFrom = item.from?.toLowerCase().includes(q);
      const matchSnippet = item.preview?.toLowerCase().includes(q);
      return matchSub || matchFrom || matchSnippet;
    });
  }, [rejectedList, skippedFilter, searchQuery]);

  const filteredParsedItems = useMemo(() => {
    return parsedStatements.filter((item) => {
      if (parsedFilter !== "ALL" && item.category?.toLowerCase() !== parsedFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchProg = item.program_name?.toLowerCase().includes(q);
      const matchSub = item.subject?.toLowerCase().includes(q);
      const matchFrom = item.from_email?.toLowerCase().includes(q);
      const matchAcc = item.extracted_account_number?.toLowerCase().includes(q);
      return matchProg || matchSub || matchFrom || matchAcc;
    });
  }, [parsedStatements, parsedFilter, searchQuery]);

  const isBackgroundScanning =
    isSyncing ||
    isBackfillRunning ||
    (activeJobDetails &&
      (activeJobDetails.status === "queued" ||
        activeJobDetails.status === "fetching" ||
        activeJobDetails.status === "parsing"));

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-light-bg">
      <ScreenHeader
        title="Email Diagnostics"
        fallbackRoute="/email-sync"
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00A3FF"
            colors={["#00A3FF"]}
          />
        }
      >
        {/* Active Background Scan Status Banner */}
        {isBackgroundScanning && (
          <View className="px-5 pt-3 pb-1">
            <View className="bg-white border-2 border-[#00A3FF]/30 rounded-2xl p-4 shadow-sm">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center flex-1 mr-2">
                  <ActivityIndicator size="small" color="#00A3FF" className="mr-2.5" />
                  <View className="flex-1">
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Bold" }}
                      className="text-xs text-slate-900"
                    >
                      Background Mailbox Scan Active
                    </Text>
                    <Text
                      style={{ fontFamily: "PlusJakartaSans-Regular" }}
                      className="text-[11px] text-slate-500 mt-0.5"
                    >
                      {activeJobDetails?.messages_processed !== null && activeJobDetails?.messages_processed !== undefined
                        ? `Processed ${activeJobDetails.messages_processed} of ${activeJobDetails.total_messages_found || "..."} statements`
                        : "DeepSeek AI is scanning statements in the background..."}
                    </Text>
                  </View>
                </View>
                <View className="bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full">
                  <Text
                    style={{ fontFamily: "PlusJakartaSans-Bold" }}
                    className="text-[10px] text-[#00A3FF]"
                  >
                    LIVE
                  </Text>
                </View>
              </View>

              {activeJobDetails?.total_messages_found && activeJobDetails.total_messages_found > 0 ? (
                <View className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                  <View
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          8,
                          Math.round(
                            ((activeJobDetails.messages_processed || 0) /
                              activeJobDetails.total_messages_found) *
                              100
                          )
                        )
                      )}%`,
                    }}
                    className="bg-[#00A3FF] h-full rounded-full"
                  />
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Primary Segmented Tab Switcher */}
        <View className="px-5 pt-3 pb-2">
          <View className="bg-slate-100/90 p-1 rounded-2xl flex-row">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab("SKIPPED");
                setSearchQuery("");
              }}
              className={`flex-1 py-2.5 rounded-xl items-center justify-center flex-row ${
                activeTab === "SKIPPED" ? "bg-white shadow-sm" : ""
              }`}
            >
              <Text
                style={{
                  fontFamily: activeTab === "SKIPPED" ? "PlusJakartaSans-Bold" : "PlusJakartaSans-Medium",
                }}
                className={`text-xs ${
                  activeTab === "SKIPPED" ? "text-slate-900" : "text-slate-500"
                }`}
              >
                Skipped / Unparsed
              </Text>
              <View
                className={`ml-1.5 px-1.5 py-0.2 rounded-full ${
                  activeTab === "SKIPPED" ? "bg-amber-100" : "bg-slate-200"
                }`}
              >
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className={`text-[10px] ${
                    activeTab === "SKIPPED" ? "text-amber-800" : "text-slate-600"
                  }`}
                >
                  {rejectedList.length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab("PARSED");
                setSearchQuery("");
              }}
              className={`flex-1 py-2.5 rounded-xl items-center justify-center flex-row ${
                activeTab === "PARSED" ? "bg-white shadow-sm" : ""
              }`}
            >
              <Text
                style={{
                  fontFamily: activeTab === "PARSED" ? "PlusJakartaSans-Bold" : "PlusJakartaSans-Medium",
                }}
                className={`text-xs ${
                  activeTab === "PARSED" ? "text-slate-900" : "text-slate-500"
                }`}
              >
                Parsed & Detected
              </Text>
              <View
                className={`ml-1.5 px-1.5 py-0.2 rounded-full ${
                  activeTab === "PARSED" ? "bg-emerald-100" : "bg-slate-200"
                }`}
              >
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className={`text-[10px] ${
                    activeTab === "PARSED" ? "text-emerald-800" : "text-slate-600"
                  }`}
                >
                  {parsedStatements.length}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Banner */}
        <View className="px-5 pt-1 pb-2">
          {activeTab === "SKIPPED" ? (
            <View className="bg-sky-50 border border-sky-200/80 rounded-2xl p-3.5 flex-row items-start space-x-3">
              <View className="w-7 h-7 rounded-full bg-sky-100 items-center justify-center mt-0.5 mr-2.5">
                <Sparkles size={14} color="#01A2FB" />
              </View>
              <View className="flex-1">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-xs text-sky-950 mb-0.5"
                >
                  AI Skipped Emails Stream
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-[11px] text-sky-900/80 leading-4"
                >
                  These messages were evaluated by DeepSeek & Gemini but were not classified as active loyalty balance statements.
                </Text>
              </View>
            </View>
          ) : (
            <View className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex-row items-start space-x-3">
              <View className="w-7 h-7 rounded-full bg-emerald-100 items-center justify-center mt-0.5 mr-2.5">
                <CheckCircle2 size={14} color="#059669" />
              </View>
              <View className="flex-1">
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-xs text-emerald-950 mb-0.5"
                >
                  Extracted Loyalty Statements
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-[11px] text-emerald-900/80 leading-4"
                >
                  Reward statements successfully parsed and credited to your PointzPlus portfolio.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Search Bar */}
        <View className="px-5 pt-1 pb-2">
          <View className="flex-row items-center bg-white rounded-2xl px-3.5 py-2.5 border border-slate-200 shadow-sm">
            <Search size={16} color="#6A6A74" className="mr-2" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                activeTab === "SKIPPED"
                  ? "Search sender, subject, or content..."
                  : "Search brand, account number, or subject..."
              }
              placeholderTextColor="#9C9BA2"
              className="flex-1 text-xs text-slate-900 ml-2 py-0"
              style={{ fontFamily: "PlusJakartaSans-Regular" }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} className="p-1">
                <Text className="text-xs text-slate-400 font-bold">✕</Text>
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
          {activeTab === "SKIPPED" ? (
            [
              { id: "ALL", label: `All (${rejectedList.length})` },
              { id: "AI_NON_LOYALTY", label: "AI Non-Loyalty" },
              { id: "NO_VALID_BALANCE", label: "No Point Balance" },
              { id: "NO_REWARD_SIGNALS", label: "No Reward Keywords" },
              { id: "AI_ERROR", label: "AI Errors" },
            ].map((pill) => {
              const isActive = skippedFilter === pill.id;
              return (
                <TouchableOpacity
                  key={pill.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSkippedFilter(pill.id as SkippedFilterType);
                  }}
                  className={`mr-2 px-3.5 py-2 rounded-xl border ${
                    isActive
                      ? "bg-slate-900 border-slate-900 shadow-sm"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Text
                    style={{
                      fontFamily: isActive
                        ? "PlusJakartaSans-Bold"
                        : "PlusJakartaSans-Medium",
                    }}
                    className={`text-xs ${isActive ? "text-white" : "text-slate-600"}`}
                  >
                    {pill.label}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            [
              { id: "ALL", label: `All (${parsedStatements.length})` },
              { id: "airlines", label: "Airlines" },
              { id: "banking", label: "Banking & Cards" },
              { id: "hotels", label: "Hotels" },
              { id: "shopping", label: "Shopping" },
              { id: "other", label: "Other" },
            ].map((pill) => {
              const isActive = parsedFilter === pill.id;
              return (
                <TouchableOpacity
                  key={pill.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setParsedFilter(pill.id as ParsedFilterType);
                  }}
                  className={`mr-2 px-3.5 py-2 rounded-xl border ${
                    isActive
                      ? "bg-slate-900 border-slate-900 shadow-sm"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Text
                    style={{
                      fontFamily: isActive
                        ? "PlusJakartaSans-Bold"
                        : "PlusJakartaSans-Medium",
                    }}
                    className={`text-xs ${isActive ? "text-white" : "text-slate-600"}`}
                  >
                    {pill.label}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Tab 1: Skipped List */}
        {activeTab === "SKIPPED" && (
          <View className="px-5 pt-3">
            {filteredSkippedItems.length === 0 ? (
              <View className="bg-white rounded-3xl p-8 items-center justify-center border border-slate-100 my-4">
                <View className="w-16 h-16 rounded-full bg-slate-50 items-center justify-center mb-3">
                  <FileCheck2 size={32} color="#64748B" />
                </View>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-sm text-slate-900 mb-1 text-center"
                >
                  {rejectedList.length === 0
                    ? "No Skipped Emails Recorded"
                    : "No Matching Emails Found"}
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-xs text-slate-400 text-center max-w-xs leading-4"
                >
                  {rejectedList.length === 0
                    ? "Start a mailbox scan from Email Sync to inspect unextracted emails in real time."
                    : "Try clearing search keywords or selecting 'All'."}
                </Text>
              </View>
            ) : (
              filteredSkippedItems.map((item, index) => {
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
                    className="bg-white rounded-[22px] border border-slate-100 mb-3 overflow-hidden"
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => toggleExpand(itemKey)}
                      className="p-4"
                    >
                      <View className="flex-row items-center justify-between mb-2">
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
                          className="text-[11px] text-slate-400"
                        >
                          {formattedDate}
                        </Text>
                      </View>

                      <Text
                        style={{ fontFamily: "PlusJakartaSans-Bold" }}
                        className="text-xs text-slate-900 leading-5 mb-1"
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        {item.subject || "(No Subject)"}
                      </Text>

                      <View className="flex-row items-center justify-between mt-1">
                        <Text
                          style={{ fontFamily: "PlusJakartaSans-Medium" }}
                          className="text-[11px] text-slate-400 flex-1 mr-2"
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

                    {isExpanded && (
                      <View className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/70">
                        <View className="mb-3">
                          <Text
                            style={{ fontFamily: "PlusJakartaSans-Bold" }}
                            className="text-[11px] text-slate-600 uppercase tracking-wider mb-1"
                          >
                            AI Evaluation / Diagnostic Note
                          </Text>
                          <View className="bg-white p-2.5 rounded-xl border border-slate-100">
                            <Text
                              style={{ fontFamily: "PlusJakartaSans-Regular" }}
                              className="text-xs text-slate-800 leading-5"
                            >
                              {item.aiNotes || "Evaluated by LLM: No active points balance."}
                            </Text>
                          </View>
                        </View>

                        {Boolean(item.preview) && (
                          <View>
                            <Text
                              style={{ fontFamily: "PlusJakartaSans-Bold" }}
                              className="text-[11px] text-slate-600 uppercase tracking-wider mb-1"
                            >
                              Email Content Preview
                            </Text>
                            <View className="bg-white p-2.5 rounded-xl border border-slate-100">
                              <Text
                                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                                className="text-xs text-slate-500 leading-5 font-mono"
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
        )}

        {/* Tab 2: Parsed List */}
        {activeTab === "PARSED" && (
          <View className="px-5 pt-3">
            {filteredParsedItems.length === 0 ? (
              <View className="bg-white rounded-3xl p-8 items-center justify-center border border-slate-100 my-4">
                <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-3">
                  <CheckCircle2 size={32} color="#059669" />
                </View>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Bold" }}
                  className="text-sm text-slate-900 mb-1 text-center"
                >
                  {parsedStatements.length === 0
                    ? "No Parsed Statements Yet"
                    : "No Matching Statements Found"}
                </Text>
                <Text
                  style={{ fontFamily: "PlusJakartaSans-Regular" }}
                  className="text-xs text-slate-400 text-center max-w-xs leading-4"
                >
                  {parsedStatements.length === 0
                    ? "Run a scan to allow AI to parse and extract points from your loyalty emails."
                    : "Try selecting 'All' or adjusting your search term."}
                </Text>
              </View>
            ) : (
              filteredParsedItems.map((item, index) => {
                const itemKey = item.id || `parsed_${index}`;
                const isExpanded = Boolean(expandedIds[itemKey]);

                const formattedDate = (() => {
                  try {
                    const d = new Date(item.received_at || item.created_at);
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
                    className="bg-white rounded-[22px] border border-slate-100 mb-3 overflow-hidden"
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => toggleExpand(itemKey)}
                      className="p-4"
                    >
                      {/* Top Row: Brand & Balance Pill */}
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center flex-1 mr-2">
                          <View className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 items-center justify-center mr-2.5">
                            <Text className="text-sm">
                              {getCategoryIcon(item.category)}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text
                              style={{ fontFamily: "PlusJakartaSans-Bold" }}
                              className="text-sm text-slate-900"
                              numberOfLines={1}
                            >
                              {item.program_name || "Loyalty Statement"}
                            </Text>
                          </View>
                        </View>

                        <View className="bg-[#E8FAF3] border border-[#D1F7E5] px-3 py-1 rounded-full items-center justify-center">
                          <Text
                            style={{ fontFamily: "PlusJakartaSans-Bold" }}
                            className="text-xs text-[#00A86B]"
                          >
                            +{Number(item.extracted_balance).toLocaleString()} pts
                          </Text>
                        </View>
                      </View>

                      {/* Subject */}
                      <Text
                        style={{ fontFamily: "PlusJakartaSans-SemiBold" }}
                        className="text-xs text-slate-700 leading-5 mb-1.5"
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        {item.subject || "(No Subject)"}
                      </Text>

                      {/* Metadata row */}
                      <View className="flex-row items-center justify-between mt-1">
                        <View className="flex-row items-center flex-1 mr-2 flex-wrap">
                          {item.extracted_account_number ? (
                            <View className="bg-slate-100 px-2 py-0.5 rounded-md mr-1.5 mb-1">
                              <Text
                                style={{ fontFamily: "PlusJakartaSans-Medium" }}
                                className="text-[10px] text-slate-600"
                              >
                                {item.extracted_account_number}
                              </Text>
                            </View>
                          ) : null}

                          <View className="bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md mr-1.5 mb-1">
                            <Text
                              style={{ fontFamily: "PlusJakartaSans-Bold" }}
                              className="text-[10px] text-[#00A3FF]"
                            >
                              {item.extraction_source === "ai_extractor" ? "🤖 DeepSeek AI" : "⚡ Parser"}
                            </Text>
                          </View>

                          {item.parser_confidence != null ? (
                            <View className="bg-emerald-50 px-2 py-0.5 rounded-md mb-1">
                              <Text
                                style={{ fontFamily: "PlusJakartaSans-Bold" }}
                                className="text-[10px] text-emerald-700"
                              >
                                {Math.round(item.parser_confidence * 100)}% Match
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View className="flex-row items-center space-x-1">
                          <Text
                            style={{ fontFamily: "PlusJakartaSans-Regular" }}
                            className="text-[11px] text-slate-400 mr-1"
                          >
                            {formattedDate}
                          </Text>
                          {isExpanded ? (
                            <ChevronUp size={16} color="#9C9BA2" />
                          ) : (
                            <ChevronDown size={16} color="#9C9BA2" />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/70">
                        <View className="mb-2">
                          <Text
                            style={{ fontFamily: "PlusJakartaSans-Bold" }}
                            className="text-[11px] text-slate-600 uppercase tracking-wider mb-1"
                          >
                            Statement Sender
                          </Text>
                          <Text
                            style={{ fontFamily: "PlusJakartaSans-Regular" }}
                            className="text-xs text-slate-700 font-mono"
                          >
                            {item.from_email}
                          </Text>
                        </View>

                        {item.extracted_expiry_date && (
                          <View className="mb-2">
                            <Text
                              style={{ fontFamily: "PlusJakartaSans-Bold" }}
                              className="text-[11px] text-slate-600 uppercase tracking-wider mb-1"
                            >
                              Expiry Date
                            </Text>
                            <Text
                              style={{ fontFamily: "PlusJakartaSans-Regular" }}
                              className="text-xs text-slate-700"
                            >
                              {item.extracted_expiry_date}
                            </Text>
                          </View>
                        )}

                        {Boolean(item.raw_text_preview) && (
                          <View className="mt-1">
                            <Text
                              style={{ fontFamily: "PlusJakartaSans-Bold" }}
                              className="text-[11px] text-slate-600 uppercase tracking-wider mb-1"
                            >
                              Extracted Raw Preview
                            </Text>
                            <View className="bg-white p-2.5 rounded-xl border border-slate-100">
                              <Text
                                style={{ fontFamily: "PlusJakartaSans-Regular" }}
                                className="text-xs text-slate-500 leading-5 font-mono"
                              >
                                {item.raw_text_preview}
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
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
