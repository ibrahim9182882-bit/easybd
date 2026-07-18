import React, { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap,
  Coins,
  Flame,
  Gamepad2,
  Search,
  Shapes,
  Play,
  Users,
  TrendingUp,
  Landmark,
  ChevronDown,
  Gift,
  Copy,
  Send,
  Home,
  Wallet,
  User as UserIcon,
  Check,
  Clock,
  Youtube,
  Instagram,
  MousePointer,
  PlayCircle,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { ref as dbRef, onValue, onDisconnect, set, serverTimestamp as rtdbServerTimestamp } from "firebase/database";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, onAuthStateChanged, User } from "firebase/auth";

import { db, auth, rtdb } from "./firebase";
import { UserProfile, GlobalSettings, EarningRecord, WithdrawalRecord, ToastMessage } from "./types";
import ToastContainer from "./components/ToastContainer";
import ImageFinder from "./components/ImageFinder";
import TicTacToe from "./components/TicTacToe";
import MathSolve from "./components/MathSolve";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            photo_url?: string;
          };
          start_param?: string;
        };
      };
    };
    show_10499975?: () => Promise<void>;
  }
}

const artifactRoot = "artifacts/easybd-2fc02";

export default function App() {
  // Auth & Profile
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Connecting to EarnFast...");
  const [activeUsersCount, setActiveUsersCount] = useState<number | string>("...");

  // Navigation
  const [activePage, setActivePage] = useState<"home" | "refer" | "wallet" | "profile">("home");

  // Global Settings
  const [settings, setSettings] = useState<GlobalSettings>({
    coinValue: "₹1",
    paymentMethods: ["Paytm", "UPI", "Google Pay"],
    gameReward: 10,
    tttReward: 10,
    mathReward: 10,
    referralBonus: 500,
    signupBonus: 100,
    minWithdraw: 100,
    socials: {},
  });

  // Dynamic lists
  const [earningHistory, setEarningHistory] = useState<EarningRecord[]>([]);
  const [txHistory, setTxHistory] = useState<WithdrawalRecord[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Games and Overlay Modals
  const [activeGame, setActiveGame] = useState<"image-finder" | "ttt" | "math" | null>(null);
  const [gamesPlayedSession, setGamesPlayedSession] = useState(0);
  const [pendingReward, setPendingReward] = useState<{ amount: number; source: string } | null>(null);
  const [showClaimOverlay, setShowClaimOverlay] = useState(false);
  const [showAdClickModal, setShowAdClickModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Ad verification state
  const [isWaitingForAdClick, setIsWaitingForAdClick] = useState(false);
  const [adClickStartTime, setAdClickStartTime] = useState<number>(0);

  // Form states
  const [withdrawMethod, setWithdrawMethod] = useState("");
  const [withdrawDetails, setWithdrawDetails] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Simulated Withdrawal Feed (Fake sliding feed)
  const [tickerIndex, setTickerIndex] = useState(0);
  const simulatedPayments = [
    { name: "Rahul", amount: 20 },
    { name: "Priya", amount: 50 },
    { name: "Amit", amount: 10 },
    { name: "Sneha", amount: 100 },
    { name: "Vikram", amount: 150 },
    { name: "Anjali", amount: 20 },
    { name: "Rohit", amount: 50 },
    { name: "Kavita", amount: 10 },
    { name: "Arjun", amount: 100 },
    { name: "Neha", amount: 50 },
  ];

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Visibility change check for ad click reward tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isWaitingForAdClick && pendingReward) {
        const timeSpentAway = Date.now() - adClickStartTime;
        if (timeSpentAway > 2000) {
          setIsWaitingForAdClick(false);
          setShowAdClickModal(false);
          showToast("Verification Success!", "success");
          saveGameEarnings(pendingReward.amount, "Ad Click Bonus");
          setPendingReward(null);
        } else {
          showToast("Please click the ad correctly to claim!", "error");
          setIsWaitingForAdClick(false);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isWaitingForAdClick, adClickStartTime, pendingReward]);

  // Rotate simulated withdrawals
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % simulatedPayments.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Firebase auth & presence
  useEffect(() => {
    let tgUser: any = null;
    let refCode: string | null = null;

    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      const initDataUnsafe = tg.initDataUnsafe || {};
      if (initDataUnsafe.start_param) {
        refCode = initDataUnsafe.start_param;
        sessionStorage.setItem("refCode", initDataUnsafe.start_param);
      }
      if (initDataUnsafe.user) {
        tgUser = initDataUnsafe.user;
      }
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const urlRef = urlParams.get("startapp") || urlParams.get("ref");
      if (urlRef) {
        refCode = urlRef;
        sessionStorage.setItem("refCode", urlRef);
      }
    }

    const triggerAuth = async () => {
      if (tgUser) {
        setLoadingText(`Logging in as Telegram User: ${tgUser.first_name}...`);
        const email = `tg_${tgUser.id}@earnfast.app`;
        const password = `secret_pass_${tgUser.id}`;
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
          if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
            try {
              await createUserWithEmailAndPassword(auth, email, password);
            } catch (e) {
              await signInAnonymously(auth);
            }
          } else {
            await signInAnonymously(auth);
          }
        }
      } else {
        setLoadingText("Signing in anonymously...");
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Anonymous authentication failed:", e);
        }
      }
    };

    triggerAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setupPresence(user.uid);
        await initUserProfile(user.uid, tgUser);
        
        // Listen to settings
        const settingsUnsubscribe = onSnapshot(
          doc(db, `${artifactRoot}/public/data/settings`, "global"),
          (docSnap) => {
            if (docSnap.exists()) {
              const d = docSnap.data();
              setSettings({
                coinValue: d.coinValue || "₹1",
                paymentMethods: d.paymentMethods || ["Paytm", "UPI", "Google Pay"],
                gameReward: Number(d.gameReward) || 10,
                tttReward: Number(d.tttReward) || 10,
                mathReward: Number(d.mathReward) || 10,
                referralBonus: Number(d.referralBonus) || 500,
                signupBonus: Number(d.signupBonus) || 100,
                minWithdraw: Number(d.minWithdraw) || 100,
                socials: d.socials || {},
              });
            }
          }
        );

        // Listen to user profile snapshot
        const profileUnsubscribe = onSnapshot(
          doc(db, `${artifactRoot}/users/${user.uid}/profile`, "main"),
          (docSnap) => {
            if (docSnap.exists()) {
              setUserData(docSnap.data() as UserProfile);
            }
          }
        );

        // Listen to earning history
        const earningsUnsubscribe = onSnapshot(
          collection(db, `${artifactRoot}/users/${user.uid}/earnings`),
          (snap) => {
            const list: EarningRecord[] = [];
            snap.forEach((docSnap) => {
              list.push(docSnap.data() as EarningRecord);
            });
            list.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setEarningHistory(list);
          }
        );

        // Listen to withdrawals and refund rejected ones automatically
        const withdrawalsUnsubscribe = onSnapshot(
          query(collection(db, `${artifactRoot}/public/data/withdrawals`), where("userId", "==", user.uid)),
          (snap) => {
            const list: WithdrawalRecord[] = [];
            snap.forEach((docSnap) => {
              const data = docSnap.data();
              const rec = { id: docSnap.id, ...data } as WithdrawalRecord;
              list.push(rec);

              // Auto-Refund rejection
              if (rec.status === "rejected" && !rec.refundProcessed) {
                processRefund(rec);
              }
            });
            list.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setTxHistory(list);
          }
        );

        // Process referral if stored
        const storedRef = sessionStorage.getItem("refCode");
        if (storedRef) {
          setTimeout(() => {
            processReferral(storedRef, user.uid);
          }, 2000);
        }

        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Presence system setup
  const setupPresence = (uid: string) => {
    const userStatusRef = dbRef(rtdb, `/status/${uid}`);
    const activeCountRef = dbRef(rtdb, "/status");

    onDisconnect(userStatusRef)
      .remove()
      .then(() => {
        set(userStatusRef, { state: "online", last_changed: rtdbServerTimestamp() });
      });

    onValue(activeCountRef, (snapshot) => {
      const count = snapshot.size || 0;
      setActiveUsersCount(count);
    });
  };

  // Initialize profile in Firestore
  const initUserProfile = async (uid: string, tgUser: any) => {
    const profileRef = doc(db, `${artifactRoot}/users/${uid}/profile`, "main");
    try {
      const docSnap = await getDoc(profileRef);
      if (!docSnap.exists()) {
        const code = "FAST" + Math.floor(10000 + Math.random() * 90000);
        const initialData: UserProfile = {
          uid,
          telegramId: tgUser ? tgUser.id : "anon",
          firstName: tgUser ? tgUser.first_name : "Guest User",
          balance: 0,
          referralCode: code,
          totalEarned: 0,
          totalRefers: 0,
          referredBy: null,
          photoUrl: tgUser?.photo_url || `https://ui-avatars.com/api/?name=${tgUser ? tgUser.first_name : "User"}&background=6366f1&color=fff`,
        };
        await setDoc(profileRef, initialData);
        // Save to public referral codes registry
        await setDoc(doc(db, `${artifactRoot}/public/data/referralCodes`, code), { userId: uid });
        setUserData(initialData);
      } else {
        setUserData(docSnap.data() as UserProfile);
      }
    } catch (e) {
      console.error("Failed to initialize profile:", e);
    }
  };

  // Process referral code
  const processReferral = async (code: string, currentUid: string) => {
    if (!code) return;
    const cleanedCode = code.trim().toUpperCase();

    if (userData && (userData.referredBy || cleanedCode === userData.referralCode)) {
      sessionStorage.removeItem("refCode");
      return;
    }

    try {
      const refCodeSnap = await getDoc(doc(db, `${artifactRoot}/public/data/referralCodes`, cleanedCode));
      if (!refCodeSnap.exists()) {
        showToast("Invalid Referral Code", "error");
        sessionStorage.removeItem("refCode");
        return;
      }

      const referrerId = refCodeSnap.data().userId;
      if (referrerId === currentUid) {
        showToast("You cannot refer yourself!", "error");
        sessionStorage.removeItem("refCode");
        return;
      }

      // 1. Give signup reward to current user
      const currentUserRef = doc(db, `${artifactRoot}/users/${currentUid}/profile`, "main");
      await updateDoc(currentUserRef, {
        balance: (userData?.balance || 0) + settings.signupBonus,
        totalEarned: (userData?.totalEarned || 0) + settings.signupBonus,
        referredBy: cleanedCode,
      });

      // 2. Give refer reward to referrer
      const referrerRef = doc(db, `${artifactRoot}/users/${referrerId}/profile`, "main");
      const referrerDoc = await getDoc(referrerRef);
      if (referrerDoc.exists()) {
        const refData = referrerDoc.data();
        await updateDoc(referrerRef, {
          balance: (refData.balance || 0) + settings.referralBonus,
          totalEarned: (refData.totalEarned || 0) + settings.referralBonus,
          totalRefers: (refData.totalRefers || 0) + 1,
        });

        // Add earning log for referrer
        await addDoc(collection(db, `${artifactRoot}/users/${referrerId}/earnings`), {
          amount: settings.referralBonus,
          source: `Referral: ${userData?.firstName || "Friend"}`,
          timestamp: serverTimestamp(),
        });
      }

      showToast(`Applied Referral Code! +${settings.signupBonus} Coins.`, "success");
      sessionStorage.removeItem("refCode");
    } catch (e) {
      console.error("Error applying referral:", e);
    }
  };

  // Automatically process refunds for rejected requests
  const processRefund = async (record: WithdrawalRecord) => {
    if (record.refundProcessed) return;

    try {
      const withdrawalRef = doc(db, `${artifactRoot}/public/data/withdrawals`, record.id);
      const userRef = doc(db, `${artifactRoot}/users/${currentUser?.uid}/profile`, "main");

      await runTransaction(db, async (transaction) => {
        const wSnap = await transaction.get(withdrawalRef);
        if (!wSnap.exists() || wSnap.data().refundProcessed) return;

        const uSnap = await transaction.get(userRef);
        const currentBal = uSnap.data()?.balance || 0;
        const refundAmt = Number(record.amount);

        transaction.update(userRef, { balance: currentBal + refundAmt });
        transaction.update(withdrawalRef, { refundProcessed: true });
      });

      showToast(`Refund processed: +${record.amount} Coins!`, "success");

      // Log refund in user's earning history
      await addDoc(collection(db, `${artifactRoot}/users/${currentUser?.uid}/earnings`), {
        amount: Number(record.amount),
        source: `Refund for Rejected withdrawal (${record.method})`,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to process refund automatically:", e);
    }
  };

  const handleGameWin = (source: string) => {
    let amount = settings.gameReward;
    if (source === "Tic Tac Toe Champion") amount = settings.tttReward;
    if (source === "Math Genius") amount = settings.mathReward;

    const nextGamesCount = gamesPlayedSession + 1;
    setGamesPlayedSession(nextGamesCount);
    setPendingReward({ amount, source });

    if (nextGamesCount % 5 === 0) {
      setShowAdClickModal(true);
    } else {
      setShowClaimOverlay(true);
    }
  };

  const handleWatchAd = () => {
    if (window.show_10499975) {
      showToast("Launching Sponsor Ad...", "info");
      window
        .show_10499975()
        .then(() => {
          if (pendingReward) {
            saveGameEarnings(pendingReward.amount, pendingReward.source);
            setPendingReward(null);
          }
          setShowClaimOverlay(false);
        })
        .catch((e) => {
          console.error("Ad Playback error:", e);
          // Fallback to credit points anyway to provide robust UX
          if (pendingReward) {
            saveGameEarnings(pendingReward.amount, pendingReward.source);
            setPendingReward(null);
          }
          setShowClaimOverlay(false);
        });
    } else {
      showToast("Ad sponsors loading... crediting coins anyway!", "success");
      if (pendingReward) {
        saveGameEarnings(pendingReward.amount, pendingReward.source);
        setPendingReward(null);
      }
      setShowClaimOverlay(false);
    }
  };

  const handleAdClickBonus = () => {
    setIsWaitingForAdClick(true);
    setAdClickStartTime(Date.now());

    if (window.show_11321974) {
      window
        .show_11321974()
        .then(() => {
          // If they didn't navigate or click
          if (isWaitingForAdClick) {
            setIsWaitingForAdClick(false);
            showToast("You must click the sponsor ad and spend 2+ seconds to claim!", "error");
          }
        })
        .catch((e) => {
          console.error("Ad Verification error:", e);
          // Direct claim fallback
          if (pendingReward) {
            saveGameEarnings(pendingReward.amount, "Ad Watch (Fallback)");
            setPendingReward(null);
          }
          setShowAdClickModal(false);
          setIsWaitingForAdClick(false);
        });
    } else {
      showToast("Sponsor ad verification bypassed, adding coins!", "success");
      if (pendingReward) {
        saveGameEarnings(pendingReward.amount, "Direct Bonus");
        setPendingReward(null);
      }
      setShowAdClickModal(false);
      setIsWaitingForAdClick(false);
    }
  };

  const saveGameEarnings = async (amount: number, source: string) => {
    if (!currentUser) return;

    try {
      const userRef = doc(db, `${artifactRoot}/users/${currentUser.uid}/profile`, "main");
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(userRef);
        const currentBal = docSnap.data()?.balance || 0;
        const currentTotal = docSnap.data()?.totalEarned || 0;
        transaction.update(userRef, {
          balance: currentBal + amount,
          totalEarned: currentTotal + amount,
        });
      });

      // Log in earnings collection
      await addDoc(collection(db, `${artifactRoot}/users/${currentUser.uid}/earnings`), {
        amount,
        source,
        timestamp: serverTimestamp(),
      });

      // Play victory sound
      try {
        const audio = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-successful-payment-making-notification-2329.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {}

      showToast(`+${amount} Coins added to your wallet!`, "success");
    } catch (e) {
      console.error("Failed to credit game reward:", e);
      showToast("Network sync error, please try again", "error");
    }
  };

  const copyReferralCode = () => {
    if (!userData?.referralCode) return;
    navigator.clipboard.writeText(userData.referralCode);
    showToast("Referral Code copied!", "success");
  };

  const shareOnTelegram = () => {
    if (!userData) return;
    const botLink = `https://t.me/mushfikaassistantbot?startapp=${userData.referralCode}`;
    const text = `Join EarnFast & get ${settings.signupBonus} Coins Bonus! 🚀\nPlay Games & Earn Real Money.\n\n👇 Click here to start earning now:`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleApplyManualReferral = () => {
    const codeInput = (document.getElementById("manual-ref-input") as HTMLInputElement)?.value;
    if (!codeInput) {
      showToast("Please enter a code!", "error");
      return;
    }
    processReferral(codeInput, currentUser?.uid || "");
  };

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawMethod) {
      showToast("Select a payment method first!", "error");
      return;
    }
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount < settings.minWithdraw) {
      showToast(`Minimum withdrawal is ${settings.minWithdraw} coins`, "error");
      return;
    }
    if (!userData || amount > userData.balance) {
      showToast("Insufficient coin balance!", "error");
      return;
    }

    const details = withdrawDetails.trim();
    if (!details) {
      showToast("Payment details cannot be empty!", "error");
      return;
    }

    // Advanced Regex validations
    const methodLower = withdrawMethod.toLowerCase();
    if (methodLower.includes("upi")) {
      if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(details)) {
        showToast("Invalid UPI ID format (e.g. user@bank)", "error");
        return;
      }
    } else if (methodLower.includes("paytm") || methodLower.includes("gpay") || methodLower.includes("number")) {
      if (!/^\d{10,12}$/.test(details)) {
        showToast("Enter a valid 10-12 digit mobile number", "error");
        return;
      }
    }

    try {
      const userRef = doc(db, `${artifactRoot}/users/${currentUser?.uid}/profile`, "main");
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(userRef);
        const currentBal = docSnap.data()?.balance || 0;
        transaction.update(userRef, { balance: currentBal - amount });
      });

      // Add to public pending withdrawals pool
      await addDoc(collection(db, `${artifactRoot}/public/data/withdrawals`), {
        userId: currentUser?.uid,
        userName: userData.firstName || "Guest",
        amount,
        method: withdrawMethod,
        details,
        status: "pending",
        refundProcessed: false,
        timestamp: serverTimestamp(),
      });

      setShowSuccessModal(true);
      setWithdrawAmount("");
      setWithdrawDetails("");
      
      // Auto close success modal after 5 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 5000);
    } catch (e) {
      console.error("Failed to process withdrawal request:", e);
      showToast("Failed to submit request. Try again.", "error");
    }
  };

  const getDetailsPlaceholder = () => {
    const method = withdrawMethod.toLowerCase();
    if (method.includes("upi")) return "Enter UPI ID (e.g. name@okhdfcbank)";
    if (method.includes("paytm") || method.includes("phone") || method.includes("gpay") || method.includes("number")) {
      return "Enter Mobile Number linked with wallet";
    }
    if (method.includes("bank")) return "Enter Account Number & IFSC Code";
    return "Enter wallet address or details";
  };

  if (loading) {
    return (
      <div id="auth-screen" className="fixed inset-0 z-50 bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative w-32 h-32 mb-8">
          <div className="absolute inset-0 bg-indigo-500 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute inset-2 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/50">
            <Zap className="w-14 h-14 text-white animate-bounce" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-300 mb-2 font-sans tracking-tight">
          EarnFast
        </h1>
        <p className="text-slate-400 mb-8 text-sm font-medium">Earn money while playing games!</p>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xs text-slate-500 font-mono">{loadingText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#0f172a] text-slate-100 selection:bg-indigo-500/30">
      {/* Toast Alert Box */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <header className="flex justify-between items-center p-4 pt-6 bg-gradient-to-b from-slate-900 via-slate-900 to-transparent z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px]">
            <img
              id="user-avatar"
              src={userData?.photoUrl || "https://ui-avatars.com/api/?name=User&background=random"}
              className="w-full h-full rounded-full object-cover border-2 border-[#0f172a]"
              alt="Avatar"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight text-white flex items-center gap-1">
              {userData?.firstName || "Guest"}
            </h2>
            <span className="text-[10px] text-slate-400">Welcome back to EarnFast!</span>
          </div>
        </div>

        {/* Right Balance Box */}
        <div className="flex flex-col items-end gap-1">
          <div className="glass-card px-3 py-1 rounded-full flex items-center gap-2 border border-yellow-500/30 bg-yellow-500/10">
            <Coins className="w-3.5 h-3.5 text-yellow-400" />
            <span className="font-bold text-white text-xs">{userData?.balance || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/30 px-2.5 py-0.5 rounded-full border border-white/5 shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[9px] text-slate-300 font-mono font-bold">
              {activeUsersCount} Online
            </span>
          </div>
        </div>
      </header>

      {/* Scrollable Main Area */}
      <main className="flex-1 overflow-y-auto custom-scroll p-4 pb-28 relative">
        <AnimatePresence mode="wait">
          {activePage === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Fake withdrawing payment slider */}
              <div className="glass-card rounded-2xl mb-4 border border-yellow-500/10 bg-yellow-500/5 relative overflow-hidden h-11 flex items-center justify-center">
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[#0f172a] to-transparent z-10"></div>
                <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#0f172a] to-transparent z-10"></div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={tickerIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-2"
                  >
                    <img
                      src={`https://ui-avatars.com/api/?name=${simulatedPayments[tickerIndex].name}&background=random`}
                      className="w-5 h-5 rounded-full"
                      alt="User icon"
                    />
                    <span className="text-xs text-slate-300 font-medium">
                      {simulatedPayments[tickerIndex].name} withdrew{" "}
                      <span className="text-emerald-400 font-bold">₹{simulatedPayments[tickerIndex].amount}</span>
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Big Hero Image Finder Banner */}
              <div
                onClick={() => setActiveGame("image-finder")}
                className="relative w-full h-52 rounded-3xl overflow-hidden cursor-pointer shadow-xl shadow-indigo-900/20 group border border-white/5 active:scale-[0.98] transition-transform duration-200"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 transition duration-500 group-hover:scale-105"></div>
                <div className="absolute inset-0 p-6 flex flex-col justify-center items-start z-10">
                  <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded mb-2 border border-white/10 flex items-center gap-1 uppercase tracking-wider">
                    <Flame className="w-3 h-3 text-orange-400 fill-orange-400" /> POPULAR
                  </span>
                  <h2 className="text-3xl font-extrabold text-white leading-tight mb-1 font-sans">
                    Image Finder
                  </h2>
                  <p className="text-indigo-100 text-xs mb-5 opacity-90 font-medium">
                    Identify 3 correct icons under 30 seconds to win!
                  </p>
                  <button className="bg-white text-indigo-600 text-xs font-bold px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 hover:bg-indigo-50">
                    <Play className="w-3.5 h-3.5 fill-indigo-600 text-indigo-600" /> PLAY GAME
                  </button>
                </div>
                <div className="absolute right-4 bottom-4 pointer-events-none">
                  <Search className="w-24 h-24 text-white opacity-5 rotate-12 absolute -top-10 -right-4" />
                  <Gamepad2 className="w-16 h-16 text-yellow-300 opacity-80 animate-bounce drop-shadow-lg" />
                </div>
              </div>

              {/* Games Category Grid */}
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2 mb-4 px-1">
                  <Shapes className="w-5 h-5 text-pink-400" /> Play & Win Rewards
                </h3>

                <div className="space-y-3.5">
                  {/* Tic Tac Toe */}
                  <div
                    onClick={() => setActiveGame("ttt")}
                    className="glass-card p-3 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-emerald-500/40 active:scale-[0.98] transition-all duration-200 group"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-3xl font-extrabold shadow-md">
                      ❌
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition">
                        Tic Tac Toe
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Beat Smart AI • Earn {settings.tttReward} Coins
                      </p>
                    </div>
                    <button className="bg-slate-800 hover:bg-emerald-600 w-9 h-9 rounded-full flex items-center justify-center transition shadow-lg text-white">
                      <Play className="w-3.5 h-3.5 fill-white" />
                    </button>
                  </div>

                  {/* Math Solve */}
                  <div
                    onClick={() => setActiveGame("math")}
                    className="glass-card p-3 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-pink-500/40 active:scale-[0.98] transition-all duration-200 group"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center text-3xl font-extrabold shadow-md">
                      ➕
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-white group-hover:text-pink-400 transition">
                        Math Solve
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Solve simple sums • Earn {settings.mathReward} Coins
                      </p>
                    </div>
                    <button className="bg-slate-800 hover:bg-pink-600 w-9 h-9 rounded-full flex items-center justify-center transition shadow-lg text-white">
                      <Play className="w-3.5 h-3.5 fill-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Social Join Community Section */}
              {settings.socials && (settings.socials.telegram || settings.socials.youtube || settings.socials.instagram) && (
                <div id="social-container" className="mt-8">
                  <h3 className="font-bold text-sm text-white mb-3 px-1 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" /> Join Official Community
                  </h3>
                  <div className="flex justify-center gap-6 glass-card p-4 rounded-2xl">
                    {settings.socials.telegram && (
                      <a
                        href={settings.socials.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-11 h-11 bg-[#229ED9] rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition hover:bg-white hover:text-[#229ED9]"
                      >
                        <Send className="w-5 h-5 fill-white text-[#229ED9]" />
                      </a>
                    )}
                    {settings.socials.youtube && (
                      <a
                        href={settings.socials.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-11 h-11 bg-[#FF0000] rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition hover:bg-white hover:text-[#FF0000]"
                      >
                        <Youtube className="w-5 h-5 fill-white" />
                      </a>
                    )}
                    {settings.socials.instagram && (
                      <a
                        href={settings.socials.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-11 h-11 bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#833AB4] rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition hover:opacity-85"
                      >
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activePage === "refer" && (
            <motion.div
              key="refer"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center text-center mt-2 space-y-6"
            >
              <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center mb-2 shadow-xl shadow-indigo-900/30 rotate-3 border-4 border-[#0f172a]">
                <Gift className="w-12 h-12 text-white" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-white">Invite & Earn</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Earn <span className="text-yellow-400 font-extrabold">{settings.referralBonus} Coins</span> per referral friend!
                </p>
              </div>

              {/* Stat card */}
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/60 w-full max-w-[200px] shadow-md">
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Total Referral Friends</p>
                <p className="text-3xl font-extrabold text-indigo-400 mt-1">{userData?.totalRefers || 0}</p>
              </div>

              {/* Code box */}
              <div className="w-full glass-card p-5 rounded-2xl border border-dashed border-slate-600 mb-2 relative overflow-hidden group">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold mb-2.5">
                  Your Invite Code
                </p>
                <div className="flex items-center justify-between bg-black/20 px-4 py-3 rounded-xl border border-white/5">
                  <span className="text-2xl font-mono font-extrabold text-white tracking-widest">
                    {userData?.referralCode || "LOADING..."}
                  </span>
                  <button
                    onClick={copyReferralCode}
                    className="w-9 h-9 bg-slate-800 hover:bg-white hover:text-black rounded-xl flex items-center justify-center transition active:scale-90"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Telegram Invite Button */}
              <button
                onClick={shareOnTelegram}
                className="w-full bg-[#229ED9] hover:bg-[#1e8abc] text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-sky-900/20 active:scale-95 transition"
              >
                <Send className="w-5 h-5 fill-white text-[#229ED9] rotate-45" />
                <span>Invite on Telegram</span>
              </button>

              {/* Manual Input form */}
              <div className="w-full glass-card p-4.5 rounded-2xl text-left">
                <p className="text-xs text-indigo-300 mb-2 font-bold uppercase tracking-wider">
                  Enter Referral Code
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="manual-ref-input"
                    placeholder="ENTER CODE"
                    className="bg-[#0f172a] flex-1 rounded-xl px-4 py-3 text-sm text-white border border-slate-700 outline-none uppercase font-mono font-bold tracking-widest focus:border-indigo-500 transition"
                  />
                  <button
                    onClick={handleApplyManualReferral}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 rounded-xl font-bold text-sm active:scale-95 transition shadow-lg shadow-emerald-900/20"
                  >
                    APPLY
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activePage === "wallet" && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-extrabold px-1">My Wallet</h2>

              {/* Elegant bank-like card */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-center border border-slate-700 shadow-xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500 opacity-10 rounded-full blur-xl pointer-events-none"></div>
                <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Current Balance</p>
                <h1 className="text-5xl font-extrabold text-white my-3 flex justify-center items-center gap-2 tracking-tight">
                  <span>{userData?.balance || 0}</span>
                  <Coins className="w-8 h-8 text-yellow-400 fill-yellow-400 animate-pulse" />
                </h1>
                <div className="inline-block bg-slate-800/80 backdrop-blur border border-white/10 px-4 py-1.5 rounded-full text-xs text-slate-300 font-medium">
                  Rate: 100 Coins = <span className="text-emerald-400 font-extrabold">{settings.coinValue}</span>
                </div>
              </div>

              {/* Redeeming option */}
              <div className="glass-card rounded-2xl p-5 border border-slate-700/50">
                <h3 className="font-extrabold text-sm text-indigo-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-indigo-400" /> Withdraw Money
                </h3>
                <form onSubmit={handleWithdrawRequest} className="space-y-4">
                  <div className="relative">
                    <select
                      id="withdraw-method"
                      value={withdrawMethod}
                      onChange={(e) => {
                        setWithdrawMethod(e.target.value);
                        setWithdrawDetails("");
                      }}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3.5 text-sm text-white appearance-none outline-none focus:border-indigo-500 transition font-bold"
                    >
                      <option value="" disabled>
                        Select Withdrawal Method
                      </option>
                      {settings.paymentMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-4 top-4 text-slate-400" />
                  </div>

                  <input
                    type="text"
                    value={withdrawDetails}
                    onChange={(e) => setWithdrawDetails(e.target.value)}
                    required
                    placeholder={withdrawMethod ? getDetailsPlaceholder() : "Select Method First"}
                    disabled={!withdrawMethod}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3.5 text-sm text-white outline-none focus:border-indigo-500 transition placeholder-slate-600 disabled:opacity-50"
                  />

                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                    min={settings.minWithdraw}
                    placeholder={`Amount (Min ${settings.minWithdraw} Coins)`}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-3.5 text-sm text-white outline-none focus:border-indigo-500 transition placeholder-slate-600 font-semibold"
                  />

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-indigo-900/20 active:scale-95 transition"
                  >
                    Redeem Now
                  </button>
                </form>
              </div>

              {/* Transactions History */}
              <div>
                <h3 className="font-extrabold text-sm text-slate-300 uppercase tracking-widest px-1 mb-3">
                  Withdrawal History
                </h3>
                <div className="space-y-2.5">
                  {txHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                      No transactions recorded yet.
                    </div>
                  ) : (
                    txHistory.slice(0, 15).map((tx) => (
                      <div key={tx.id} className="glass-card p-3 rounded-2xl flex justify-between items-center border border-white/5 shadow-sm">
                        <div>
                          <p className="font-bold text-sm text-white">{tx.method}</p>
                          <p className="text-[10px] text-slate-400 font-medium font-mono">{tx.details}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-white text-sm">-{tx.amount} Coins</p>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-widest ${
                              tx.status === "paid"
                                ? "text-emerald-400"
                                : tx.status === "rejected"
                                ? "text-rose-400"
                                : "text-yellow-400"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activePage === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-extrabold px-1">My Profile</h2>

              <div className="glass-card rounded-2xl p-6 text-center mb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/15 to-transparent pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="w-20 h-20 mx-auto rounded-full p-[2px] bg-gradient-to-tr from-indigo-500 to-purple-500 mb-3 shadow-lg">
                    <img
                      src={userData?.photoUrl || "https://ui-avatars.com/api/?name=User&background=random"}
                      className="w-full h-full rounded-full object-cover bg-slate-900 border-2 border-[#0f172a]"
                      alt="Avatar"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">{userData?.firstName || "Guest"}</h3>
                  <p className="text-slate-400 text-xs font-semibold">Verified EarnFast Member</p>

                  <div className="mt-6 bg-slate-800/50 rounded-2xl p-4 border border-slate-700/60 shadow-sm">
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">
                      Total Lifetime Earnings
                    </p>
                    <p className="text-2xl font-black text-emerald-400 flex justify-center items-center gap-1.5">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      <span>{userData?.totalEarned || 0} Coins</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Earnings Log list */}
              <div>
                <h3 className="font-extrabold text-sm text-slate-300 uppercase tracking-widest px-1 mb-3">
                  Earning Events History
                </h3>
                <div className="space-y-2.5">
                  {earningHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                      No earning activities yet.
                    </div>
                  ) : (
                    earningHistory.slice(0, 10).map((record, index) => (
                      <div
                        key={index}
                        className="glass-card p-3.5 rounded-2xl flex justify-between items-center border-l-4 border-l-emerald-500 shadow-sm"
                      >
                        <div>
                          <p className="font-bold text-sm text-white">{record.source}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Credit Completed
                          </p>
                        </div>
                        <p className="font-extrabold text-emerald-400 text-sm">+{record.amount}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav Bar */}
      <nav className="glass-nav fixed bottom-0 left-0 right-0 pb-safe pt-2 px-6 flex justify-between items-center z-40 h-[75px]">
        <button
          onClick={() => setActivePage("home")}
          className={`flex flex-col items-center gap-1 w-14 transition duration-300 ${
            activePage === "home" ? "text-indigo-400 font-bold scale-105" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activePage === "home" ? "bg-indigo-500/10 text-indigo-400" : ""}`}>
            <Home className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Home</span>
        </button>

        <button
          onClick={() => setActivePage("refer")}
          className={`flex flex-col items-center gap-1 w-14 transition duration-300 ${
            activePage === "refer" ? "text-indigo-400 font-bold scale-105" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activePage === "refer" ? "bg-indigo-500/10 text-indigo-400" : ""}`}>
            <Users className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Refer</span>
        </button>

        {/* Big Game Button */}
        <div className="relative -top-6">
          <button
            onClick={() => setActiveGame("image-finder")}
            className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/40 border-4 border-[#0f172a] active:scale-90 hover:scale-105 transition duration-200 group"
          >
            <Gamepad2 className="w-7 h-7 text-white group-hover:scale-110 transition" />
          </button>
        </div>

        <button
          onClick={() => setActivePage("wallet")}
          className={`flex flex-col items-center gap-1 w-14 transition duration-300 ${
            activePage === "wallet" ? "text-indigo-400 font-bold scale-105" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activePage === "wallet" ? "bg-indigo-500/10 text-indigo-400" : ""}`}>
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Wallet</span>
        </button>

        <button
          onClick={() => setActivePage("profile")}
          className={`flex flex-col items-center gap-1 w-14 transition duration-300 ${
            activePage === "profile" ? "text-indigo-400 font-bold scale-105" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <div className={`p-1 rounded-xl transition ${activePage === "profile" ? "bg-indigo-500/10 text-indigo-400" : ""}`}>
            <UserIcon className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Profile</span>
        </button>
      </nav>

      {/* --- ALL GAME MODALS --- */}
      <AnimatePresence>
        {activeGame === "image-finder" && (
          <ImageFinder
            onClose={() => setActiveGame(null)}
            onWin={() => handleGameWin("Image Finder Master")}
            onShowToast={showToast}
          />
        )}

        {activeGame === "ttt" && (
          <TicTacToe
            onClose={() => setActiveGame(null)}
            onWin={() => handleGameWin("Tic Tac Toe Champion")}
            onShowToast={showToast}
            rewardAmount={settings.tttReward}
          />
        )}

        {activeGame === "math" && (
          <MathSolve
            onClose={() => setActiveGame(null)}
            onWin={() => handleGameWin("Math Genius")}
            onShowToast={showToast}
            rewardAmount={settings.mathReward}
          />
        )}
      </AnimatePresence>

      {/* --- CLAIMS OVERLAYS --- */}
      {/* 1. Watch Ad Claim Reward Overlay */}
      <AnimatePresence>
        {showClaimOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="mb-6 text-7xl animate-bounce">🎁</div>
            <h2 className="text-3xl font-extrabold text-white mb-2">You Won!</h2>
            <p className="text-slate-300 mb-8 text-lg font-medium">Watch Ad to Claim Reward</p>
            <button
              onClick={handleWatchAd}
              className="w-full max-w-xs bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-orange-500/30 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              <span>CLAIM REWARD</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Ad click modal verification */}
      <AnimatePresence>
        {showAdClickModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/95 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xl"
          >
            <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-lg shadow-indigo-500/50">
              <MousePointer className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2 leading-snug">Click Ad to Claim Coin</h2>
            <p className="text-amber-300 text-sm font-extrabold max-w-xs tracking-wide">
              Sponsor ad par click kare tabhi coins claim ho payenge!
            </p>
            <button
              onClick={handleAdClickBonus}
              className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-4 px-8 rounded-2xl shadow-lg shadow-indigo-500/40 active:scale-95 transition w-full max-w-xs flex items-center justify-center gap-3"
            >
              <PlayCircle className="w-5 h-5" />
              <span>WATCH SPONSOR AD</span>
            </button>
            <p className="text-xs text-slate-500 mt-4 max-w-[200px]">
              Ad click karke web page par 2+ seconds spend karein, fir back aayein.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Successful withdrawal submission modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 p-8 rounded-3xl border border-emerald-500/30 shadow-2xl flex flex-col items-center max-w-sm w-full relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none"></div>
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/40">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Success!</h2>
              <p className="text-slate-300 text-sm mb-6">Payment request submitted successfully.</p>

              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700 w-full mb-6">
                <p className="text-xs text-slate-400 mb-1 uppercase font-black tracking-widest">
                  Estimated Arrival
                </p>
                <p className="text-yellow-400 font-extrabold text-lg flex items-center justify-center gap-1.5">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  <span>24 - 48 Hours</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-4 rounded-xl shadow-lg active:scale-95 transition"
              >
                CLOSE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
