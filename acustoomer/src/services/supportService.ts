import { auth, IS_MOCK_MODE } from '../infrastructure/firebase/firebase';
import { getSecureAppCheckToken } from './appCheckService';
import { getApiUrl } from '../config/api';

export type SupportCategory = 'general' | 'refund' | 'callback';
export type SupportStatus = 'OPEN' | 'RESOLVED' | 'CLOSED';

export interface SupportMessage {
  id: string;
  senderId: string;
  senderRole: 'customer' | 'admin' | 'system';
  senderName: string;
  text: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  complaintId?: string;
  userId: string;
  userName: string;
  orderId?: string;
  subject: string;
  message: string;
  category: SupportCategory;
  status: SupportStatus;
  reply?: string;
  messages?: SupportMessage[];
  callbackRequested?: boolean;
  callbackStatus?: 'REQUESTED' | 'COMPLETED';
  callbackDueAt?: string;
  createdAt: string;
  updatedAt: string;
}

const getHeaders = async () => {
  if (!auth?.currentUser) throw new Error('Please sign in again to contact support.');
  const token = await auth.currentUser.getIdToken();
  const appCheckToken = await getSecureAppCheckToken(false);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-Firebase-AppCheck': appCheckToken,
  };
};

const readResponse = async (response: Response) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Support service is temporarily unavailable. Please try again.');
  return body;
};

export const supportService = {
  async getTickets(): Promise<SupportTicket[]> {
    if (IS_MOCK_MODE) return [];
    const response = await fetch(getApiUrl('/v1/support/tickets'), { headers: await getHeaders() });
    return readResponse(response);
  },

  async createTicket(payload: { userName: string; orderId?: string; subject: string; message: string; category: SupportCategory }) {
    const response = await fetch(getApiUrl('/v1/support/tickets'), {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });
    return readResponse(response) as Promise<{ status: string; id: string; acknowledgement: string }>;
  },

  async sendMessage(ticketId: string, message: string) {
    const response = await fetch(getApiUrl(`/v1/support/tickets/${encodeURIComponent(ticketId)}/messages`), {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ message }),
    });
    return readResponse(response);
  },
};
