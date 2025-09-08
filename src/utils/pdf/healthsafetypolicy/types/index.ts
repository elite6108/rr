import type { CompanySettings } from '../../../../types/database';

export interface GeneratePDFOptions {
  title: string;
  content: string;
  policyNumber?: number;
  companySettings: CompanySettings;
}

export interface Section {
  header: string;
  content: string;
}

export interface OrgChartData {
  orgData: any[];
  reportingLines: any[];
}

export interface OrgChartEmployee {
  id: string;
  name: string;
  title?: string;
  parent_id: string | null;
  children: OrgChartEmployee[];
}
