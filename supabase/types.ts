import type { TrademarkStatus } from "../src/types/status";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      trademark_applications: {
        Row: {
          id: string;
          request_id: string | null;
          user_id: string | null;
          management_number: string;
          brand_name: string;
          trademark_type: string | null;
          product_classes: string[];
          goods_description: string | null;
          status: TrademarkStatus;
          status_detail: string | null;
          status_updated_at: string;
          payment_amount: number | null;
          payment_currency: string | null;
          payment_due_at: string | null;
          payment_reference: string | null;
          payment_received_at: string | null;
          filing_receipt_number: string | null;
          filing_submission_reference: string | null;
          filing_submitted_at: string | null;
          filed_at: string | null;
          filing_office: string | null;
          assigned_to: string | null;
          notes: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id?: string | null;
          user_id?: string | null;
          management_number?: string;
          brand_name: string;
          trademark_type?: string | null;
          product_classes?: string[];
          goods_description?: string | null;
          status?: TrademarkStatus;
          status_detail?: string | null;
          status_updated_at?: string;
          payment_amount?: number | null;
          payment_currency?: string | null;
          payment_due_at?: string | null;
          payment_reference?: string | null;
          payment_received_at?: string | null;
          filing_receipt_number?: string | null;
          filing_submission_reference?: string | null;
          filing_submitted_at?: string | null;
          filed_at?: string | null;
          filing_office?: string | null;
          assigned_to?: string | null;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string | null;
          user_id?: string | null;
          management_number?: string;
          brand_name?: string;
          trademark_type?: string | null;
          product_classes?: string[];
          goods_description?: string | null;
          status?: TrademarkStatus;
          status_detail?: string | null;
          status_updated_at?: string;
          payment_amount?: number | null;
          payment_currency?: string | null;
          payment_due_at?: string | null;
          payment_reference?: string | null;
          payment_received_at?: string | null;
          filing_receipt_number?: string | null;
          filing_submission_reference?: string | null;
          filing_submitted_at?: string | null;
          filed_at?: string | null;
          filing_office?: string | null;
          assigned_to?: string | null;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trademark_applications_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trademark_applications_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "trademark_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trademark_applications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      trademark_status_logs: {
        Row: {
          id: number;
          application_id: string;
          from_status: TrademarkStatus | null;
          to_status: TrademarkStatus;
          note: string | null;
          metadata: Json;
          changed_by: string | null;
          changed_at: string;
        };
        Insert: {
          id?: number;
          application_id: string;
          from_status?: TrademarkStatus | null;
          to_status: TrademarkStatus;
          note?: string | null;
          metadata?: Json;
          changed_by?: string | null;
          changed_at?: string;
        };
        Update: {
          id?: number;
          application_id?: string;
          from_status?: TrademarkStatus | null;
          to_status?: TrademarkStatus;
          note?: string | null;
          metadata?: Json;
          changed_by?: string | null;
          changed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trademark_status_logs_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "trademark_applications";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      trademark_application_status: TrademarkStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type TrademarkApplicationStatus = TrademarkStatus;
export type TrademarkStatusLog = Database["public"]["Tables"]["trademark_status_logs"]["Row"];
export type TrademarkApplication = Database["public"]["Tables"]["trademark_applications"]["Row"];
