export interface VPSPlanPrice {
  cycle: string;
  price: number | string;
  is_active: boolean;
}

export interface VPSPlanGroup {
  id: string;
  name: string;
  [key: string]: any;
}

export interface VPSPlan {
  id: string;
  name: string;
  slug?: string | null | undefined;
  description?: string | null | undefined;
  disk_quota_mb?: number | null | undefined;
  bandwidth_quota_mb?: number | null | undefined;
  is_visible?: boolean | null | undefined;
  sort_order?: number | null | undefined;
  product_type?: string | null | undefined;
  group_id?: string | null | undefined;
  external_id?: string | null | undefined;
  immediate_purchase?: boolean | null | undefined;
  product_groups?: { name?: string | null | undefined } | null | undefined;
  product_prices?: VPSPlanPrice[] | null | undefined;
  [key: string]: any;
}

export interface EditingVPSPlan {
  id?: string | undefined;
  name: string;
  slug?: string | null | undefined;
  description?: string | null | undefined;
  product_type?: string | null | undefined;
  group_id?: string | null | undefined;
  external_id?: string | null | undefined;
  is_visible?: boolean | null | undefined;
  sort_order?: number | null | undefined;
  disk_quota_mb?: number | null | undefined;
  immediate_purchase?: boolean | null | undefined;
  prices: Array<{ cycle: string; price: number | string; is_active: boolean }>;
  [key: string]: any;
}

export interface VPSPlansHeaderProps {
  term: string;
  onTermChange: (value: string) => void;
  onCreate: () => void;
}

export interface VPSPlanCardProps {
  plan: VPSPlan;
  onEdit: (plan: VPSPlan) => void;
}

export interface VPSPlansListProps {
  plans: VPSPlan[];
  isLoading: boolean;
  onEdit: (plan: VPSPlan) => void;
}

export interface VPSPlanEditDialogProps {
  editing: EditingVPSPlan | null;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  productGroups?: VPSPlanGroup[] | any[] | undefined;
  contaboPlans?: any[] | undefined;
  isLoadingContabo?: boolean | undefined;
  onChange: (updated: EditingVPSPlan) => void;
}
