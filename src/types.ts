export interface UserProfile {
  uid: string;
  telegramId: string | number;
  firstName: string;
  balance: number;
  referralCode: string;
  totalEarned: number;
  totalRefers: number;
  referredBy: string | null;
  photoUrl?: string;
}

export interface GlobalSettings {
  coinValue: string;
  paymentMethods: string[];
  gameReward: number;
  tttReward: number;
  mathReward: number;
  referralBonus: number;
  signupBonus: number;
  minWithdraw: number;
  socials?: {
    telegram?: string;
    youtube?: string;
    instagram?: string;
  };
}

export interface EarningRecord {
  amount: number;
  source: string;
  timestamp: any;
}

export interface WithdrawalRecord {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  method: string;
  details: string;
  status: "pending" | "paid" | "rejected";
  refundProcessed: boolean;
  timestamp: any;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: "success" | "error" | "info";
}
