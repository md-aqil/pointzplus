// types/models.ts – Shared client-side domain models
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  totalPoints: number;
  monthlyEarned: number;
  expiringSoon: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  dateGroup: string;
  isRead: boolean;
  type: "credit" | "expiry" | "offer";
  pointsDelta?: number;
}
