import {
  Home,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  FileText,
  Wallet,
  BarChart3,
  Settings,
  CircleHelp,
  MoreHorizontal,
  LucideIcon,
} from "lucide-react";

export interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
  badge?: string;
  isBottomNavMobile?: boolean;
}

export interface NavGroupConfig {
  id: string;
  label: string;
  items: NavItemConfig[];
}

export const navigationConfig: NavGroupConfig[] = [
  {
    id: "group-principal",
    label: "PRINCIPAL",
    items: [
      {
        id: "nav-accueil",
        label: "Accueil",
        href: "/",
        icon: Home,
        enabled: true,
        isBottomNavMobile: true,
      },
    ],
  },
  {
    id: "group-operations",
    label: "OPÉRATIONS",
    items: [
      {
        id: "nav-ventes",
        label: "Ventes",
        href: "/ventes",
        icon: ShoppingCart,
        enabled: true,
        isBottomNavMobile: true,
      },
      {
        id: "nav-produits",
        label: "Produits",
        href: "/produits",
        icon: Package,
        enabled: true,
        isBottomNavMobile: true,
      },
      {
        id: "nav-stocks",
        label: "Stocks",
        href: "/stocks",
        icon: Boxes,
        enabled: true,
      },
      {
        id: "nav-clients",
        label: "Clients",
        href: "/clients",
        icon: Users,
        enabled: true,
        isBottomNavMobile: true,
      },
    ],
  },
  {
    id: "group-finances",
    label: "FINANCES",
    items: [
      {
        id: "nav-factures",
        label: "Factures & devis",
        href: "/factures",
        icon: FileText,
        enabled: true,
      },
      {
        id: "nav-paiements",
        label: "Paiements",
        href: "/paiements",
        icon: Wallet,
        enabled: true,
      },
    ],
  },
  {
    id: "group-analyse",
    label: "ANALYSE",
    items: [
      {
        id: "nav-rapports",
        label: "Rapports",
        href: "/rapports",
        icon: BarChart3,
        enabled: true,
      },
    ],
  },
];

export const bottomNavItems: NavItemConfig[] = [
  {
    id: "nav-parametres",
    label: "Paramètres",
    href: "/parametres",
    icon: Settings,
    enabled: true,
  },
  {
    id: "nav-aide",
    label: "Aide & support",
    href: "/aide",
    icon: CircleHelp,
    enabled: true,
  },
];

export const mobileBottomNavDestinations: NavItemConfig[] = [
  {
    id: "mobile-nav-accueil",
    label: "Accueil",
    href: "/",
    icon: Home,
    enabled: true,
  },
  {
    id: "mobile-nav-ventes",
    label: "Ventes",
    href: "/ventes",
    icon: ShoppingCart,
    enabled: true,
  },
  {
    id: "mobile-nav-produits",
    label: "Produits",
    href: "/produits",
    icon: Package,
    enabled: true,
  },
  {
    id: "mobile-nav-clients",
    label: "Clients",
    href: "/clients",
    icon: Users,
    enabled: true,
  },
  {
    id: "mobile-nav-plus",
    label: "Plus",
    href: "/menu",
    icon: MoreHorizontal,
    enabled: true,
  },
];

/**
 * Resolves page context title from current route pathname.
 */
export function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Accueil";
  if (pathname === "/app-shell-preview") return "App Shell Preview";
  if (pathname === "/design-system") return "Design System QA";

  for (const group of navigationConfig) {
    const item = group.items.find(
      (i) => i.href === pathname || (i.href !== "/" && pathname.startsWith(i.href))
    );
    if (item) return item.label;
  }

  for (const item of bottomNavItems) {
    if (item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href))) {
      return item.label;
    }
  }

  for (const item of mobileBottomNavDestinations) {
    if (item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href))) {
      return item.label;
    }
  }

  return "Accueil";
}
