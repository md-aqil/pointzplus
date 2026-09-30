// server/services/deals.service.js – Third-party Coupon & Deals Aggregator
// Integrates LinkMyDeals & Coupomated API feeds with memory caching & fallback.

const LINKMYDEALS_API_KEY = process.env.LINKMYDEALS_API_KEY;
const COUPOMATED_API_KEY = process.env.COUPOMATED_API_KEY;

// Cache deals in memory to prevent rate-limiting and minimize latency (TTL: 30 minutes)
let cachedDeals = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30 * 60 * 1000;

// Curated partner deals for top loyalty & reward brands (active fallback)
const CURATED_DEALS = [
  {
    id: "deal-mmt-fly",
    title: "Flat 12% Off + 3X Reward Points on Flight Bookings",
    description: "Book domestic & international flights and earn 3X loyalty points with instant discount.",
    code: "MMTFLY3X",
    type: "coupon",
    discount: "12% OFF + 3X PTS",
    store: "MakeMyTrip",
    storeSlug: "makemytrip",
    category: "airlines",
    url: "https://www.makemytrip.com/flights/",
    imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=500&q=80",
    expiryDate: "2026-10-31",
    featured: true,
    multiplier: "3X Points",
    terms: "Valid on all major airline partners. Min booking ₹4,500.",
  },
  {
    id: "deal-flipkart-super",
    title: "Extra 200 SuperCoins on Electronics & Laptops",
    description: "Earn 200 Bonus Flipkart SuperCoins on minimum order of ₹15,000.",
    code: "SUPER200",
    type: "coupon",
    discount: "+200 SuperCoins",
    store: "Flipkart",
    storeSlug: "flipkart",
    category: "shopping",
    url: "https://www.flipkart.com",
    imageUrl: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500&q=80",
    expiryDate: "2026-10-15",
    featured: true,
    multiplier: "Bonus Coins",
    terms: "Valid on electronics category. Coins credited within 48 hours.",
  },
  {
    id: "deal-marriott-stay",
    title: "Earn 2,000 Bonus Marriott Bonvoy Points Per Stay",
    description: "Get 2,000 bonus Bonvoy points starting from your second stay at luxury properties worldwide.",
    code: "BONVOY2K",
    type: "deal",
    discount: "+2,000 PTS",
    store: "Marriott Bonvoy",
    storeSlug: "marriott",
    category: "hotels",
    url: "https://www.marriott.com",
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80",
    expiryDate: "2026-11-30",
    featured: true,
    multiplier: "2,000 Bonus Pts",
    terms: "Requires registration before check-in. Valid at participating properties.",
  },
  {
    id: "deal-myntra-fashion",
    title: "Flat ₹500 Off + 2X Myntra Insider Points",
    description: "Shop the latest fashion collections and double your loyalty points balance.",
    code: "MYNTRAPOINTZ",
    type: "coupon",
    discount: "₹500 OFF",
    store: "Myntra",
    storeSlug: "myntra",
    category: "shopping",
    url: "https://www.myntra.com",
    imageUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&q=80",
    expiryDate: "2026-10-20",
    featured: false,
    multiplier: "2X Insider Pts",
    terms: "Applicable on orders above ₹2,499. One time use per member.",
  },
  {
    id: "deal-qatar-avios",
    title: "Earn 5,000 Bonus Avios on Business Class Flights",
    description: "Fly Qatar Airways and earn 5,000 extra Avios to boost your tier upgrade.",
    code: "QAVIOS5K",
    type: "coupon",
    discount: "+5,000 Avios",
    store: "Qatar Airways",
    storeSlug: "qatar_airways",
    category: "airlines",
    url: "https://www.qatarairways.com",
    imageUrl: "https://images.unsplash.com/photo-1540339832862-474599807836?w=500&q=80",
    expiryDate: "2026-12-15",
    featured: true,
    multiplier: "5,000 Avios",
    terms: "Valid on international long-haul bookings for Privilege Club members.",
  },
  {
    id: "deal-swiggy-one",
    title: "Save ₹120 + 20% Cashback Points on Gourmet Dining",
    description: "Enjoy gourmet delicacies and earn instant reward points on food orders.",
    code: "GOURMET120",
    type: "coupon",
    discount: "₹120 OFF",
    store: "Swiggy",
    storeSlug: "swiggy",
    category: "dining",
    url: "https://www.swiggy.com",
    imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&q=80",
    expiryDate: "2026-10-10",
    featured: false,
    multiplier: "20% Points Back",
    terms: "Min order value ₹399. Valid in all metro cities.",
  },
  {
    id: "deal-hdfc-smartbuy",
    title: "10X Reward Points on Apple & Electronics via SmartBuy",
    description: "Pay with HDFC Infinia or Regalia cards to get 10X reward points credited to your statement.",
    code: "SMART10X",
    type: "deal",
    discount: "10X REWARDS",
    store: "HDFC SmartBuy",
    storeSlug: "hdfc_bank",
    category: "banking",
    url: "https://offers.smartbuy.hdfcbank.com",
    imageUrl: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=500&q=80",
    expiryDate: "2026-11-15",
    featured: true,
    multiplier: "10X Points",
    terms: "Max 5,000 reward points per calendar month per card.",
  },
  {
    id: "deal-starbucks-stars",
    title: "Double Stars on All Beverage Orders After 4 PM",
    description: "Collect double Starbucks Rewards Stars on handcrafted beverages every evening.",
    code: "STARBUCKS2X",
    type: "deal",
    discount: "2X STARS",
    store: "Starbucks India",
    storeSlug: "starbucks",
    category: "dining",
    url: "https://www.starbucks.in",
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&q=80",
    expiryDate: "2026-10-30",
    featured: false,
    multiplier: "2X Stars",
    terms: "Scan your Starbucks app or member card at checkout.",
  },
  {
    id: "deal-tataneu-coins",
    title: "Earn 5% NeuCoins on Electronics & Groceries",
    description: "Shop at Croma, BigBasket, and Westside via Tata Neu to get 5% NeuCoins back.",
    code: "NEU5COINS",
    type: "coupon",
    discount: "5% NeuCoins",
    store: "Tata Neu",
    storeSlug: "tata_neu",
    category: "shopping",
    url: "https://www.tataneu.com",
    imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=500&q=80",
    expiryDate: "2026-11-20",
    featured: true,
    multiplier: "5% NeuCoins",
    terms: "No minimum spend required. 1 NeuCoin = ₹1.",
  },
];

export class DealsService {
  /**
   * Fetch deals from LinkMyDeals API feed
   */
  static async fetchLinkMyDeals() {
    if (!LINKMYDEALS_API_KEY) return [];

    try {
      const url = `http://feed.linkmydeals.com/getOffers/?API_KEY=${LINKMYDEALS_API_KEY}&format=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return [];

      const data = await res.json();
      if (!data || !data.result || !Array.isArray(data.offers)) return [];

      return data.offers.map((o) => {
        const rawCategory = (o.Categories || "shopping").toLowerCase();
        let normalizedCat = "shopping";
        if (rawCategory.includes("flight") || rawCategory.includes("airline") || rawCategory.includes("travel")) {
          normalizedCat = "airlines";
        } else if (rawCategory.includes("hotel") || rawCategory.includes("stay")) {
          normalizedCat = "hotels";
        } else if (rawCategory.includes("food") || rawCategory.includes("dining") || rawCategory.includes("restaurant")) {
          normalizedCat = "dining";
        } else if (rawCategory.includes("bank") || rawCategory.includes("card") || rawCategory.includes("finance")) {
          normalizedCat = "banking";
        }

        return {
          id: `lmd-${o["LMD ID"] || Math.random().toString(36).slice(2, 9)}`,
          title: o.Title || o["Offer Text"] || "Exclusive Deal",
          description: o.Description || o["Terms and Conditions"] || "",
          code: o["Coupon Code"] || "",
          type: o.Type === "Coupon Code" && o["Coupon Code"] ? "coupon" : "deal",
          discount: o["Offer Value"] || o.Offer || "Discount",
          store: o.Store || "Partner Store",
          storeSlug: (o.Store || "").toLowerCase().replace(/[^a-z0-9]+/g, "_"),
          category: normalizedCat,
          url: o["Affiliate Link"] || o.URL || o["Merchant Homepage"] || "#",
          imageUrl: o.Image || null,
          expiryDate: o["End Date"] || null,
          featured: o.Featured === "Yes" || o["Publisher Exclusive"] === "Yes",
          multiplier: o.Offer ? `${o.Offer}` : null,
          terms: o["Terms and Conditions"] || null,
        };
      });
    } catch (err) {
      console.warn("[DealsService] LinkMyDeals fetch failed:", err.message);
      return [];
    }
  }

  /**
   * Fetch deals from Coupomated API feed
   */
  static async fetchCoupomated() {
    if (!COUPOMATED_API_KEY) return [];

    try {
      const url = `https://www.coupomated.com/api/get-coupons/?api_key=${COUPOMATED_API_KEY}&format=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return [];

      const data = await res.json();
      if (!data || !Array.isArray(data.coupons)) return [];

      return data.coupons.map((c) => ({
        id: `cm-${c.id || Math.random().toString(36).slice(2, 9)}`,
        title: c.title || c.coupon_title || "Partner Offer",
        description: c.description || c.terms || "",
        code: c.code || c.coupon_code || "",
        type: c.code ? "coupon" : "deal",
        discount: c.discount || c.saving || "Special Offer",
        store: c.store_name || "Online Partner",
        storeSlug: (c.store_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        category: (c.category || "shopping").toLowerCase(),
        url: c.link || c.affiliate_url || "#",
        imageUrl: c.logo || c.image || null,
        expiryDate: c.expiry || null,
        featured: Boolean(c.featured),
        multiplier: c.multiplier || null,
        terms: c.terms || null,
      }));
    } catch (err) {
      console.warn("[DealsService] Coupomated fetch failed:", err.message);
      return [];
    }
  }

  /**
   * Get all aggregated and normalized deals with caching
   */
  static async getDeals({ category, query: searchQuery, type, featured }) {
    const now = Date.now();

    // Check if cache is fresh
    if (!cachedDeals || now - lastCacheTime > CACHE_TTL_MS) {
      const [lmdDeals, cmDeals] = await Promise.all([
        this.fetchLinkMyDeals(),
        this.fetchCoupomated(),
      ]);

      const liveDeals = [...lmdDeals, ...cmDeals];
      cachedDeals = liveDeals.length > 0 ? liveDeals : CURATED_DEALS;
      lastCacheTime = now;
    }

    let filtered = [...cachedDeals];

    if (category && category !== "all") {
      filtered = filtered.filter(
        (d) => d.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (type && (type === "coupon" || type === "deal")) {
      filtered = filtered.filter((d) => d.type === type);
    }

    if (featured === true || featured === "true") {
      filtered = filtered.filter((d) => d.featured);
    }

    if (searchQuery && typeof searchQuery === "string" && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.store.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          (d.code && d.code.toLowerCase().includes(q))
      );
    }

    return filtered;
  }

  /**
   * Return category list for filter tabs
   */
  static getCategories() {
    return [
      { id: "all", name: "All Deals", icon: "Sparkles" },
      { id: "airlines", name: "Airlines & Travel", icon: "Plane" },
      { id: "shopping", name: "Shopping", icon: "ShoppingBag" },
      { id: "hotels", name: "Hotels & Stays", icon: "Building2" },
      { id: "dining", name: "Dining & Food", icon: "Utensils" },
      { id: "banking", name: "Banking & Cards", icon: "CreditCard" },
    ];
  }
}
