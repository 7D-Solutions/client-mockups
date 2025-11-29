// Type definitions for Kelly Rental Manager

export interface Property {
  id: number;
  address: string;
  type: 'single_family' | 'multi_family' | 'condo' | 'townhouse' | 'apartment' | 'commercial';
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  purchase_price: number;
  purchase_date: string;
  status: 'active' | 'sold' | 'archived';
  created_at: string;
  updated_at: string;
  // Mortgage data (optional)
  mortgage_lender?: string;
  mortgage_amount?: number;
  mortgage_interest_rate?: number;
  mortgage_start_date?: string;
  mortgage_term_years?: number;
}

export interface Tenant {
  id: number;
  property_id: number;
  name: string;
  email: string;
  phone: string;
  lease_start_date: string;
  lease_end_date: string;
  monthly_rent: number;
  security_deposit: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  property_address?: string;
}

export interface Payment {
  id: number;
  property_id: number;
  tenant_id: number;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'online';
  reference_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  tenant_name?: string;
  property_address?: string;
}

export interface Expense {
  id: number;
  property_id: number;
  date: string;
  category: 'maintenance' | 'repair' | 'utilities' | 'insurance' | 'property_tax' |
    'hoa_fees' | 'lawn_care' | 'pest_control' | 'cleaning' | 'legal' | 'accounting' | 'other';
  vendor: string;
  amount: number;
  description?: string;
  payment_method: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'debit_card' | 'online';
  created_at: string;
  updated_at: string;
  property_address?: string;
  receipt_id?: number;
  receipt_file_name?: string;
}

export interface Transaction {
  id: number;
  property_id: number;
  transaction_date: string;
  amount: number;
  description: string;
  transaction_type: 'deposit' | 'withdrawal';
  bank_reference?: string;
  created_at: string;
  updated_at: string;
  property_address?: string;
  payment_id?: number;
  reconciled_date?: string;
}

export interface Message {
  id: number;
  tenant_id: number;
  message_date: string;
  subject: 'maintenance_request' | 'rent_inquiry' | 'lease_question' | 'complaint' | 'notice' | 'general';
  message_text: string;
  communication_method: 'email' | 'phone' | 'text' | 'in_person' | 'mail';
  created_at: string;
  updated_at: string;
  tenant_name?: string;
  tenant_email?: string;
  property_address?: string;
  response_date?: string;
  response_text?: string;
}

export interface Application {
  id: number;
  property_id: number;
  application_date: string;
  applicant_name: string;
  email: string;
  phone: string;
  current_address?: string;
  desired_move_in_date?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  property_address?: string;
  // Employment info
  employer?: string;
  job_title?: string;
  annual_income?: number;
  employment_length_years?: number;
  // Screening
  credit_score?: number;
  background_check_status?: 'pass' | 'fail' | 'pending';
  screening_date?: string;
  screening_notes?: string;
  // Decision
  decision?: 'approved' | 'denied' | 'pending';
  decision_date?: string;
  decision_notes?: string;
  // Document
  document_file_path?: string;
  document_file_name?: string;
  document_file_type?: string;
}

export interface Stats {
  total_properties?: number;
  active_properties?: number;
  total_tenants?: number;
  total_payments?: number;
  total_amount?: number;
  avg_payment?: number;
  [key: string]: number | undefined;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
}
