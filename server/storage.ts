import { 
  type User, 
  type InsertUser,
  type MembershipState,
  type InsertMembershipState,
  type ReferralNode,
  type InsertReferralNode,
  type BCCBalance,
  type InsertBCCBalance,
  type Order,
  type InsertOrder,
  type RewardEvent,
  type InsertRewardEvent,
  type MerchantNFT,
  type InsertMerchantNFT,
  type NFTPurchase,
  type InsertNFTPurchase,
  type Course,
  type InsertCourse,
  type CourseAccess,
  type InsertCourseAccess
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(walletAddress: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(walletAddress: string, updates: Partial<User>): Promise<User | undefined>;

  // Membership operations
  getMembershipState(walletAddress: string): Promise<MembershipState | undefined>;
  createMembershipState(membership: InsertMembershipState): Promise<MembershipState>;
  updateMembershipState(walletAddress: string, updates: Partial<MembershipState>): Promise<MembershipState | undefined>;

  // Referral operations
  getReferralNode(walletAddress: string): Promise<ReferralNode | undefined>;
  createReferralNode(node: InsertReferralNode): Promise<ReferralNode>;
  updateReferralNode(walletAddress: string, updates: Partial<ReferralNode>): Promise<ReferralNode | undefined>;

  // BCC Balance operations
  getBCCBalance(walletAddress: string): Promise<BCCBalance | undefined>;
  createBCCBalance(balance: InsertBCCBalance): Promise<BCCBalance>;
  updateBCCBalance(walletAddress: string, updates: Partial<BCCBalance>): Promise<BCCBalance | undefined>;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByWallet(walletAddress: string): Promise<Order[]>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;

  // Reward operations
  createRewardEvent(event: InsertRewardEvent): Promise<RewardEvent>;
  getRewardEvent(id: string): Promise<RewardEvent | undefined>;
  getRewardEventsByWallet(walletAddress: string): Promise<RewardEvent[]>;
  updateRewardEvent(id: string, updates: Partial<RewardEvent>): Promise<RewardEvent | undefined>;

  // Merchant NFT operations
  getMerchantNFTs(): Promise<MerchantNFT[]>;
  getMerchantNFT(id: string): Promise<MerchantNFT | undefined>;
  createMerchantNFT(nft: InsertMerchantNFT): Promise<MerchantNFT>;

  // NFT Purchase operations
  createNFTPurchase(purchase: InsertNFTPurchase): Promise<NFTPurchase>;
  getNFTPurchasesByWallet(walletAddress: string): Promise<NFTPurchase[]>;

  // Course operations
  getCourses(): Promise<Course[]>;
  getCourse(id: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;

  // Course Access operations
  getCourseAccess(walletAddress: string, courseId: string): Promise<CourseAccess | undefined>;
  getCourseAccessByWallet(walletAddress: string): Promise<CourseAccess[]>;
  createCourseAccess(access: InsertCourseAccess): Promise<CourseAccess>;
  updateCourseAccess(walletAddress: string, courseId: string, updates: Partial<CourseAccess>): Promise<CourseAccess | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private membershipStates: Map<string, MembershipState> = new Map();
  private referralNodes: Map<string, ReferralNode> = new Map();
  private bccBalances: Map<string, BCCBalance> = new Map();
  private orders: Map<string, Order> = new Map();
  private rewardEvents: Map<string, RewardEvent> = new Map();
  private merchantNFTs: Map<string, MerchantNFT> = new Map();
  private nftPurchases: Map<string, NFTPurchase> = new Map();
  private courses: Map<string, Course> = new Map();
  private courseAccess: Map<string, CourseAccess> = new Map();

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Initialize some sample merchant NFTs
    const sampleNFTs: InsertMerchantNFT[] = [
      {
        title: "Digital Art Collection #001",
        description: "Exclusive geometric art piece with rare attributes",
        imageUrl: "https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        priceBCC: 150,
        active: true,
      },
      {
        title: "Legendary Weapon",
        description: "Rare gaming asset with special abilities",
        imageUrl: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        priceBCC: 300,
        active: true,
      },
      {
        title: "Crystal Collection",
        description: "Limited edition crystal with unique properties",
        imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        priceBCC: 75,
        active: true,
      },
      {
        title: "Access Pass",
        description: "Premium access to exclusive platform features",
        imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        priceBCC: 500,
        active: true,
      },
      {
        title: "Audio Track #1",
        description: "Exclusive electronic music composition",
        imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        priceBCC: 200,
        active: true,
      },
      {
        title: "Character Avatar",
        description: "Unique character for metaverse experiences",
        imageUrl: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        priceBCC: 400,
        active: true,
      },
    ];

    sampleNFTs.forEach(nft => {
      const id = randomUUID();
      this.merchantNFTs.set(id, {
        id,
        ...nft,
        createdAt: new Date(),
      });
    });

    // Initialize sample courses
    const sampleCourses: InsertCourse[] = [
      {
        title: "Blockchain Basics",
        description: "Learn the fundamentals of blockchain technology and cryptocurrencies",
        requiredLevel: 1,
        priceBCC: 0,
        isFree: true,
        duration: "4 hours",
      },
      {
        title: "DeFi Strategies",
        description: "Advanced strategies for decentralized finance and yield farming",
        requiredLevel: 2,
        priceBCC: 50,
        isFree: false,
        duration: "4 hours",
      },
      {
        title: "NFT Creation",
        description: "Create, mint, and sell your own NFTs on various platforms",
        requiredLevel: 1,
        priceBCC: 0,
        isFree: true,
        duration: "3 hours",
      },
      {
        title: "Trading Masterclass",
        description: "Professional trading techniques and risk management",
        requiredLevel: 3,
        priceBCC: 150,
        isFree: false,
        duration: "8 hours",
      },
      {
        title: "Web3 Development",
        description: "Build decentralized applications with Solidity and Web3",
        requiredLevel: 2,
        priceBCC: 200,
        isFree: false,
        duration: "12 hours",
      },
      {
        title: "Live Workshops",
        description: "Interactive sessions with industry experts",
        requiredLevel: 1,
        priceBCC: 0,
        isFree: true,
        duration: "2 hours",
      },
    ];

    sampleCourses.forEach(course => {
      const id = randomUUID();
      this.courses.set(id, {
        id,
        ...course,
        createdAt: new Date(),
      });
    });
  }

  // User operations
  async getUser(walletAddress: string): Promise<User | undefined> {
    return this.users.get(walletAddress.toLowerCase());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      walletAddress: insertUser.walletAddress.toLowerCase(),
      createdAt: new Date(),
      memberActivated: false,
      currentLevel: 0,
    };
    this.users.set(user.walletAddress, user);
    return user;
  }

  async updateUser(walletAddress: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(walletAddress.toLowerCase());
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(walletAddress.toLowerCase(), updatedUser);
    return updatedUser;
  }

  // Membership operations
  async getMembershipState(walletAddress: string): Promise<MembershipState | undefined> {
    return this.membershipStates.get(walletAddress.toLowerCase());
  }

  async createMembershipState(membership: InsertMembershipState): Promise<MembershipState> {
    const state: MembershipState = {
      ...membership,
      walletAddress: membership.walletAddress.toLowerCase(),
      joinedAt: new Date(),
      lastUpgradeAt: new Date(),
    };
    this.membershipStates.set(state.walletAddress, state);
    return state;
  }

  async updateMembershipState(walletAddress: string, updates: Partial<MembershipState>): Promise<MembershipState | undefined> {
    const state = this.membershipStates.get(walletAddress.toLowerCase());
    if (!state) return undefined;
    
    const updatedState = { ...state, ...updates, lastUpgradeAt: new Date() };
    this.membershipStates.set(walletAddress.toLowerCase(), updatedState);
    return updatedState;
  }

  // Referral operations
  async getReferralNode(walletAddress: string): Promise<ReferralNode | undefined> {
    return this.referralNodes.get(walletAddress.toLowerCase());
  }

  async createReferralNode(node: InsertReferralNode): Promise<ReferralNode> {
    const referralNode: ReferralNode = {
      ...node,
      walletAddress: node.walletAddress.toLowerCase(),
      createdAt: new Date(),
    };
    this.referralNodes.set(referralNode.walletAddress, referralNode);
    return referralNode;
  }

  async updateReferralNode(walletAddress: string, updates: Partial<ReferralNode>): Promise<ReferralNode | undefined> {
    const node = this.referralNodes.get(walletAddress.toLowerCase());
    if (!node) return undefined;
    
    const updatedNode = { ...node, ...updates };
    this.referralNodes.set(walletAddress.toLowerCase(), updatedNode);
    return updatedNode;
  }

  // BCC Balance operations
  async getBCCBalance(walletAddress: string): Promise<BCCBalance | undefined> {
    return this.bccBalances.get(walletAddress.toLowerCase());
  }

  async createBCCBalance(balance: InsertBCCBalance): Promise<BCCBalance> {
    const bccBalance: BCCBalance = {
      ...balance,
      walletAddress: balance.walletAddress.toLowerCase(),
      lastUpdated: new Date(),
    };
    this.bccBalances.set(bccBalance.walletAddress, bccBalance);
    return bccBalance;
  }

  async updateBCCBalance(walletAddress: string, updates: Partial<BCCBalance>): Promise<BCCBalance | undefined> {
    const balance = this.bccBalances.get(walletAddress.toLowerCase());
    if (!balance) return undefined;
    
    const updatedBalance = { ...balance, ...updates, lastUpdated: new Date() };
    this.bccBalances.set(walletAddress.toLowerCase(), updatedBalance);
    return updatedBalance;
  }

  // Order operations
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      id,
      ...insertOrder,
      walletAddress: insertOrder.walletAddress.toLowerCase(),
      createdAt: new Date(),
      completedAt: null,
    };
    this.orders.set(id, order);
    return order;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByWallet(walletAddress: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.walletAddress === walletAddress.toLowerCase());
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updatedOrder = { ...order, ...updates };
    if (updates.status === 'completed' && !order.completedAt) {
      updatedOrder.completedAt = new Date();
    }
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Reward operations
  async createRewardEvent(insertEvent: InsertRewardEvent): Promise<RewardEvent> {
    const id = randomUUID();
    const event: RewardEvent = {
      id,
      ...insertEvent,
      createdAt: new Date(),
    };
    this.rewardEvents.set(id, event);
    return event;
  }

  async getRewardEvent(id: string): Promise<RewardEvent | undefined> {
    return this.rewardEvents.get(id);
  }

  async getRewardEventsByWallet(walletAddress: string): Promise<RewardEvent[]> {
    return Array.from(this.rewardEvents.values()).filter(
      event => event.buyerWallet === walletAddress.toLowerCase() || event.sponsorWallet === walletAddress.toLowerCase()
    );
  }

  async updateRewardEvent(id: string, updates: Partial<RewardEvent>): Promise<RewardEvent | undefined> {
    const event = this.rewardEvents.get(id);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, ...updates };
    this.rewardEvents.set(id, updatedEvent);
    return updatedEvent;
  }

  // Merchant NFT operations
  async getMerchantNFTs(): Promise<MerchantNFT[]> {
    return Array.from(this.merchantNFTs.values()).filter(nft => nft.active);
  }

  async getMerchantNFT(id: string): Promise<MerchantNFT | undefined> {
    return this.merchantNFTs.get(id);
  }

  async createMerchantNFT(insertNFT: InsertMerchantNFT): Promise<MerchantNFT> {
    const id = randomUUID();
    const nft: MerchantNFT = {
      id,
      ...insertNFT,
      createdAt: new Date(),
    };
    this.merchantNFTs.set(id, nft);
    return nft;
  }

  // NFT Purchase operations
  async createNFTPurchase(insertPurchase: InsertNFTPurchase): Promise<NFTPurchase> {
    const id = randomUUID();
    const purchase: NFTPurchase = {
      id,
      ...insertPurchase,
      walletAddress: insertPurchase.walletAddress.toLowerCase(),
      createdAt: new Date(),
    };
    this.nftPurchases.set(id, purchase);
    return purchase;
  }

  async getNFTPurchasesByWallet(walletAddress: string): Promise<NFTPurchase[]> {
    return Array.from(this.nftPurchases.values()).filter(purchase => purchase.walletAddress === walletAddress.toLowerCase());
  }

  // Course operations
  async getCourses(): Promise<Course[]> {
    return Array.from(this.courses.values());
  }

  async getCourse(id: string): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const id = randomUUID();
    const course: Course = {
      id,
      ...insertCourse,
      createdAt: new Date(),
    };
    this.courses.set(id, course);
    return course;
  }

  // Course Access operations
  async getCourseAccess(walletAddress: string, courseId: string): Promise<CourseAccess | undefined> {
    const key = `${walletAddress.toLowerCase()}-${courseId}`;
    return this.courseAccess.get(key);
  }

  async getCourseAccessByWallet(walletAddress: string): Promise<CourseAccess[]> {
    return Array.from(this.courseAccess.values()).filter(access => access.walletAddress === walletAddress.toLowerCase());
  }

  async createCourseAccess(insertAccess: InsertCourseAccess): Promise<CourseAccess> {
    const id = randomUUID();
    const key = `${insertAccess.walletAddress.toLowerCase()}-${insertAccess.courseId}`;
    const access: CourseAccess = {
      id,
      ...insertAccess,
      walletAddress: insertAccess.walletAddress.toLowerCase(),
      grantedAt: new Date(),
    };
    this.courseAccess.set(key, access);
    return access;
  }

  async updateCourseAccess(walletAddress: string, courseId: string, updates: Partial<CourseAccess>): Promise<CourseAccess | undefined> {
    const key = `${walletAddress.toLowerCase()}-${courseId}`;
    const access = this.courseAccess.get(key);
    if (!access) return undefined;
    
    const updatedAccess = { ...access, ...updates };
    this.courseAccess.set(key, updatedAccess);
    return updatedAccess;
  }
}

export const storage = new MemStorage();
