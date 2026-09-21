// lib/db.ts – Local PostgreSQL / API Client Service for PointzPlus
import { CATEGORIES, BRANDS, Category, Brand } from "../constants/categories";

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

// Default empty user profile (No mock / dummy data)
export const initialUser: UserProfile | null = null;

export const initialNotifications: NotificationItem[] = [];

// Local PostgreSQL API Client Placeholder
export class ApiClient {
  private static baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api";

  static async getUserProfile(): Promise<UserProfile | null> {
    return initialUser;
  }

  static async getCategories(): Promise<Category[]> {
    return CATEGORIES;
  }

  static async getBrandsByCategory(categoryId: string): Promise<Brand[]> {
    return BRANDS.filter((b) => b.category === categoryId);
  }

  static async getNotifications(): Promise<NotificationItem[]> {
    return initialNotifications;
  }
}
