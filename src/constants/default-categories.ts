/**
 * Predefined System Default Categories for Expense Tracker
 */
export interface DefaultCategoryDefinition {
  name: string;
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: DefaultCategoryDefinition[] = [
  {
    name: 'Food',
    icon: 'silverware-fork-knife',
    color: '#EA580C',
  },
  {
    name: 'Transport',
    icon: 'car-outline',
    color: '#0284C7',
  },
  {
    name: 'Shopping',
    icon: 'shopping-outline',
    color: '#DB2777',
  },
  {
    name: 'Rent',
    icon: 'home-city-outline',
    color: '#4F46E5',
  },
  {
    name: 'Bills',
    icon: 'receipt-text-outline',
    color: '#D97706',
  },
  {
    name: 'Health',
    icon: 'heart-pulse',
    color: '#059669',
  },
  {
    name: 'Education',
    icon: 'school-outline',
    color: '#7C3AED',
  },
  {
    name: 'Entertainment',
    icon: 'movie-outline',
    color: '#9333EA',
  },
  {
    name: 'Travel',
    icon: 'airplane',
    color: '#0891B2',
  },
  {
    name: 'Groceries',
    icon: 'cart-outline',
    color: '#16A34A',
  },
  {
    name: 'Other',
    icon: 'dots-horizontal-circle-outline',
    color: '#64748B',
  },
];
