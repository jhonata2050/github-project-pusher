export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          category: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          metadata: Json
          status: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          category: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json
          status?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          category?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          max_uses: number | null
          type: string
          updated_at: string
          used_count: number | null
          valid_until: string | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          max_uses?: number | null
          type: string
          updated_at?: string
          used_count?: number | null
          valid_until?: string | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          max_uses?: number | null
          type?: string
          updated_at?: string
          used_count?: number | null
          valid_until?: string | null
          value?: number
        }
        Relationships: []
      }
      domains: {
        Row: {
          auto_renew: boolean | null
          created_at: string | null
          domain_name: string
          expiry_date: string | null
          id: string
          nameservers: string[] | null
          registrar: string
          registration_date: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string | null
          domain_name: string
          expiry_date?: string | null
          id?: string
          nameservers?: string[] | null
          registrar: string
          registration_date?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string | null
          domain_name?: string
          expiry_date?: string | null
          id?: string
          nameservers?: string[] | null
          registrar?: string
          registration_date?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          subject: string
          template_name: string | null
          to_email: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          subject: string
          template_name?: string | null
          to_email: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          subject?: string
          template_name?: string | null
          to_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          service_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          service_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          discount_amount: number
          due_date: string
          id: string
          notes: string | null
          order_id: string | null
          paid_at: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
          user_id: string
          whmcs_id: string | null
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          due_date: string
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount?: number
          total_amount: number
          updated_at?: string
          user_id: string
          whmcs_id?: string | null
        }
        Update: {
          created_at?: string
          discount_amount?: number
          due_date?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
          whmcs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          notes: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      product_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_visible: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_visible?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_prices: {
        Row: {
          created_at: string
          currency: string
          cycle: Database["public"]["Enums"]["billing_cycle"]
          id: string
          is_active: boolean
          price: number
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          cycle: Database["public"]["Enums"]["billing_cycle"]
          id?: string
          is_active?: boolean
          price: number
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          cycle?: Database["public"]["Enums"]["billing_cycle"]
          id?: string
          is_active?: boolean
          price?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          auto_provision: boolean
          bandwidth_quota_mb: number | null
          created_at: string
          database_limit: number | null
          description: string | null
          directadmin_package: string | null
          disk_quota_mb: number | null
          domains_limit: number | null
          email_accounts_limit: number | null
          external_id: string | null
          group_id: string | null
          id: string
          is_featured: boolean
          is_visible: boolean
          name: string
          product_type: string
          setup_fee: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          auto_provision?: boolean
          bandwidth_quota_mb?: number | null
          created_at?: string
          database_limit?: number | null
          description?: string | null
          directadmin_package?: string | null
          disk_quota_mb?: number | null
          domains_limit?: number | null
          email_accounts_limit?: number | null
          external_id?: string | null
          group_id?: string | null
          id?: string
          is_featured?: boolean
          is_visible?: boolean
          name: string
          product_type?: string
          setup_fee?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          auto_provision?: boolean
          bandwidth_quota_mb?: number | null
          created_at?: string
          database_limit?: number | null
          description?: string | null
          directadmin_package?: string | null
          disk_quota_mb?: number | null
          domains_limit?: number | null
          email_accounts_limit?: number | null
          external_id?: string | null
          group_id?: string | null
          id?: string
          is_featured?: boolean
          is_visible?: boolean
          name?: string
          product_type?: string
          setup_fee?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line: string | null
          address_line2: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          status: string
          tax_id: string | null
          updated_at: string
          whmcs_id: string | null
        }
        Insert: {
          address_line?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          whmcs_id?: string | null
        }
        Update: {
          address_line?: string | null
          address_line2?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          whmcs_id?: string | null
        }
        Relationships: []
      }
      servers: {
        Row: {
          api_token: string
          api_user: string
          created_at: string | null
          hostname: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          max_accounts: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          api_token: string
          api_user: string
          created_at?: string | null
          hostname: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          max_accounts?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          api_token?: string
          api_user?: string
          created_at?: string | null
          hostname?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          max_accounts?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          auto_renew: boolean | null
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          created_at: string
          domain: string | null
          id: string
          next_due_date: string | null
          next_invoice_date: string | null
          order_id: string | null
          product_id: string
          server_id: string | null
          status: Database["public"]["Enums"]["service_status"]
          suspension_reason: string | null
          updated_at: string
          user_id: string
          username: string | null
          whmcs_id: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          domain?: string | null
          id?: string
          next_due_date?: string | null
          next_invoice_date?: string | null
          order_id?: string | null
          product_id: string
          server_id?: string | null
          status?: Database["public"]["Enums"]["service_status"]
          suspension_reason?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          whmcs_id?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          domain?: string | null
          id?: string
          next_due_date?: string | null
          next_invoice_date?: string | null
          order_id?: string | null
          product_id?: string
          server_id?: string | null
          status?: Database["public"]["Enums"]["service_status"]
          suspension_reason?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          whmcs_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          is_staff_reply: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_staff_reply?: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_staff_reply?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string | null
          id: string
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          gateway: string | null
          gateway_reference: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          gateway?: string | null
          gateway_reference?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          status: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway?: string | null
          gateway_reference?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vps_instances: {
        Row: {
          created_at: string | null
          external_id: string
          id: string
          ip_address: string | null
          os_template: string | null
          region: string | null
          service_id: string
          status: string | null
          updated_at: string | null
          vps_type: string | null
        }
        Insert: {
          created_at?: string | null
          external_id: string
          id?: string
          ip_address?: string | null
          os_template?: string | null
          region?: string | null
          service_id: string
          status?: string | null
          updated_at?: string | null
          vps_type?: string | null
        }
        Update: {
          created_at?: string | null
          external_id?: string
          id?: string
          ip_address?: string | null
          os_template?: string | null
          region?: string | null
          service_id?: string
          status?: string | null
          updated_at?: string | null
          vps_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vps_instances_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      whmcs_imports: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          stats: Json | null
          status: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          stats?: Json | null
          status?: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          stats?: Json | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_uses: {
        Args: { _coupon_id: string }
        Returns: undefined
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff" | "client"
      billing_cycle:
        | "monthly"
        | "quarterly"
        | "semiannually"
        | "annually"
        | "biennially"
      invoice_status: "pending" | "paid" | "cancelled" | "refunded" | "overdue"
      order_status: "pending" | "active" | "fraud" | "cancelled"
      service_status:
        | "pending"
        | "active"
        | "suspended"
        | "terminated"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "client"],
      billing_cycle: [
        "monthly",
        "quarterly",
        "semiannually",
        "annually",
        "biennially",
      ],
      invoice_status: ["pending", "paid", "cancelled", "refunded", "overdue"],
      order_status: ["pending", "active", "fraud", "cancelled"],
      service_status: [
        "pending",
        "active",
        "suspended",
        "terminated",
        "cancelled",
      ],
    },
  },
} as const
