export interface BusinessAccount {
  id: string;
  name: string;
  country: string;
  category?: string;
  active?: boolean;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  initials: string;
  role: string;
  avatarUrl?: string;
}

export interface ShellMockData {
  currentBusiness: BusinessAccount;
  businesses: BusinessAccount[];
  currentUser: UserProfile;
  unreadNotificationsCount: number;
}

export const shellMockData: ShellMockData = {
  currentBusiness: {
    id: "biz-ml-01",
    name: "Diallo Commerce",
    country: "Mali",
    category: "Boutique & Alimentation",
    active: true,
  },
  businesses: [
    {
      id: "biz-ml-01",
      name: "Diallo Commerce",
      country: "Mali",
      category: "Boutique & Alimentation",
      active: true,
    },
    {
      id: "biz-ml-02",
      name: "Bana Services",
      country: "Mali",
      category: "Services & Logistique",
      active: false,
    },
  ],
  currentUser: {
    firstName: "Hamidou",
    lastName: "Ballo",
    email: "h.ballo@diallo-commerce.ml",
    initials: "HB",
    role: "Administrateur",
  },
  unreadNotificationsCount: 3,
};
