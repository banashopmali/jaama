export interface BusinessAccount {
  id: string;
  name: string;
  country: string;
}

export interface UserProfile {
  firstName: string;
  initials: string;
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
  },
  businesses: [
    {
      id: "biz-ml-01",
      name: "Diallo Commerce",
      country: "Mali",
    },
    {
      id: "biz-ml-02",
      name: "Bana Services",
      country: "Mali",
    },
  ],
  currentUser: {
    firstName: "Hamidou",
    initials: "HB",
  },
  unreadNotificationsCount: 3,
};
