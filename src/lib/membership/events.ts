export interface MembershipPurchaseStartedEvent {
  type: 'MEMBERSHIP_PURCHASE_STARTED';
  payload: {
    walletAddress: string;
    level: number;
    priceUSDT: number;
    timestamp: number;
  };
}

export interface MembershipPaymentCompletedEvent {
  type: 'MEMBERSHIP_PAYMENT_COMPLETED';
  payload: {
    walletAddress: string;
    level: number;
    priceUSDT: number;
    txHash: string;
    chain: string;
    timestamp: number;
  };
}

export interface MembershipVerificationStartedEvent {
  type: 'MEMBERSHIP_VERIFICATION_STARTED';
  payload: {
    walletAddress: string;
    level: number;
    txHash: string;
    timestamp: number;
  };
}

export interface MembershipVerificationCompletedEvent {
  type: 'MEMBERSHIP_VERIFICATION_COMPLETED';
  payload: {
    walletAddress: string;
    level: number;
    txHash: string;
    verified: boolean;
    timestamp: number;
  };
}

export interface MembershipPersistedEvent {
  type: 'MEMBERSHIP_PERSISTED';
  payload: {
    walletAddress: string;
    level: number;
    orderId: string;
    activated: boolean;
    previousLevel: number;
    timestamp: number;
  };
}

export interface RewardEventCreatedEvent {
  type: 'REWARD_EVENT_CREATED';
  payload: {
    buyerWallet: string;
    sponsorWallet: string;
    eventType: 'L1_direct' | 'L2plus_upgrade' | 'rollup';
    level: number;
    amount: number;
    rewardEventId: string;
    timestamp: number;
  };
}

export interface BCCCreditedEvent {
  type: 'BCC_CREDITED';
  payload: {
    walletAddress: string;
    level: number;
    transferableAmount: number;
    restrictedAmount: number;
    timestamp: number;
  };
}

export interface MatrixPlacementEvent {
  type: 'MATRIX_PLACEMENT';
  payload: {
    newMemberWallet: string;
    sponsorWallet: string;
    placementWallet: string;
    level: number;
    position: number;
    timestamp: number;
  };
}

export interface MembershipErrorEvent {
  type: 'MEMBERSHIP_ERROR';
  payload: {
    walletAddress: string;
    level?: number;
    error: string;
    stage: 'payment' | 'verification' | 'persistence' | 'rewards';
    timestamp: number;
  };
}

export type MembershipEvent = 
  | MembershipPurchaseStartedEvent
  | MembershipPaymentCompletedEvent
  | MembershipVerificationStartedEvent
  | MembershipVerificationCompletedEvent
  | MembershipPersistedEvent
  | RewardEventCreatedEvent
  | BCCCreditedEvent
  | MatrixPlacementEvent
  | MembershipErrorEvent;

export type MembershipEventType = MembershipEvent['type'];

export interface MembershipEventEmitter {
  emit<T extends MembershipEvent>(event: T): void;
  on<T extends MembershipEvent>(eventType: T['type'], handler: (event: T) => void): void;
  off<T extends MembershipEvent>(eventType: T['type'], handler: (event: T) => void): void;
}

// Simple event emitter implementation
class SimpleMembershipEventEmitter implements MembershipEventEmitter {
  private listeners: Map<MembershipEventType, Array<(event: any) => void>> = new Map();

  emit<T extends MembershipEvent>(event: T): void {
    const handlers = this.listeners.get(event.type) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in membership event handler for ${event.type}:`, error);
      }
    });
  }

  on<T extends MembershipEvent>(eventType: T['type'], handler: (event: T) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(handler);
  }

  off<T extends MembershipEvent>(eventType: T['type'], handler: (event: T) => void): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}

export const membershipEventEmitter = new SimpleMembershipEventEmitter();