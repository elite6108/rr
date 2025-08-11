import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '../../../lib/supabase';

interface GeneratePDFOptions {
  reportData: any;
  tableName: string;
}

// Define field configurations for each form type
const FORM_FIELD_CONFIGS = {
  'accidents_personalinjury': {
    title: 'PERSONAL INJURY REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' }
        ]
      },
      {
        title: 'INJURED PERSON DETAILS',
        fields: [
          { key: 'injured_person_name', label: 'Name', type: 'text' },
          { key: 'injured_person_address', label: 'Address', type: 'textarea' },
          { key: 'injured_person_phone', label: 'Phone', type: 'text' },
          { key: 'injured_person_position', label: 'Position', type: 'text' },
          { key: 'time_lost', label: 'Time Lost', type: 'boolean' },
          { key: 'time_lost_start_date', label: 'Time Lost Start Date', type: 'date' },
          { key: 'time_lost_end_date', label: 'Time Lost End Date', type: 'date' },
          { key: 'ae_hospital_name', label: 'A&E Hospital Name', type: 'text' },
          { key: 'required_ppe', label: 'Required PPE', type: 'text' },
          { key: 'worn_ppe', label: 'Worn PPE', type: 'text' }
        ]
      },
      {
        title: 'INJURY DETAILS',
        fields: [
          { key: 'injury_locations', label: 'Injury Locations', type: 'array' },
          { key: 'injury_types', label: 'Injury Types', type: 'array' }
        ]
      },
      {
        title: 'FIRST AID & MEDICAL',
        fields: [
          { key: 'advised_medical', label: 'Advised Medical', type: 'boolean' },
          { key: 'drug_alcohol_test', label: 'Drug/Alcohol Test', type: 'boolean' },
          { key: 'first_aid_details', label: 'First Aid Details', type: 'textarea' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'basic_cause', label: 'Basic Cause', type: 'text' },
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  },
  'accidents_nearmiss': {
    title: 'NEAR MISS REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' },
          { key: 'basic_cause_of_incident', label: 'Basic Cause of Incident', type: 'text' },
          { key: 'source_of_hazard', label: 'Source of Hazard', type: 'text' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  },
  'accidents_fatality': {
    title: 'FATALITY REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',  
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' }
        ]
      },
      {
        title: 'INJURED PERSON DETAILS',
        fields: [
          { key: 'injured_person_name', label: 'Name', type: 'text' },
          { key: 'injured_person_address', label: 'Address', type: 'textarea' },
          { key: 'injured_person_phone', label: 'Phone', type: 'text' },
          { key: 'injured_person_position', label: 'Position', type: 'text' },
          { key: 'time_lost', label: 'Time Lost', type: 'boolean' },
          { key: 'time_lost_start_date', label: 'Time Lost Start Date', type: 'date' },
          { key: 'time_lost_end_date', label: 'Time Lost End Date', type: 'date' },
          { key: 'ae_hospital_name', label: 'A&E Hospital Name', type: 'text' },
          { key: 'required_ppe', label: 'Required PPE', type: 'text' },
          { key: 'worn_ppe', label: 'Worn PPE', type: 'text' }
        ]
      },
      {
        title: 'INJURY DETAILS',
        fields: [
          { key: 'injury_locations', label: 'Injury Locations', type: 'array' },
          { key: 'injury_types', label: 'Injury Types', type: 'array' }
        ]
      },
      {
        title: 'FIRST AID & MEDICAL',
        fields: [
          { key: 'advised_medical', label: 'Advised Medical', type: 'boolean' },
          { key: 'drug_alcohol_test', label: 'Drug/Alcohol Test', type: 'boolean' },
          { key: 'first_aid_details', label: 'First Aid Details', type: 'textarea' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'basic_cause', label: 'Basic Cause', type: 'text' },
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  },
  'accidents_dangerousoccurrence': {
    title: 'DANGEROUS OCCURRENCE REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' },
          { key: 'basic_cause_of_incident', label: 'Basic Cause of Incident', type: 'text' },
          { key: 'source_of_hazard', label: 'Source of Hazard', type: 'text' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  },
  'accidents_environmental': {
    title: 'ENVIRONMENTAL INCIDENT REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' },
          { key: 'environmental_incident_type', label: 'Environmental Incident Type', type: 'text' },
          { key: 'severity_of_incident', label: 'Severity of Incident', type: 'text' },
          { key: 'basic_cause_of_incident', label: 'Basic Cause of Incident', type: 'text' },
          { key: 'source_of_hazard', label: 'Source of Hazard', type: 'text' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  },
  'accidents_propertydamage': {
    title: 'PROPERTY DAMAGE REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' },
          { key: 'affected_items', label: 'Affected Items', type: 'text' },
          { key: 'basic_cause_of_incident', label: 'Basic Cause of Incident', type: 'text' },
          { key: 'source_of_hazard', label: 'Source of Hazard', type: 'text' }
        ]
      },
      {
        title: 'REPORTING INFORMATION',
        fields: [
          { key: 'reporting_datetime', label: 'Reporting Date/Time', type: 'datetime' },
          { key: 'reporter_name', label: 'Reporter Name', type: 'text' },
          { key: 'crime_reference', label: 'Crime Reference', type: 'text' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  },
  'accidents_unsafeactions': {
    title: 'UNSAFE ACTIONS REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' },
          { key: 'basic_cause_of_incident', label: 'Basic Cause of Incident', type: 'text' },
          { key: 'source_of_hazard', label: 'Source of Hazard', type: 'text' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  },
  'accidents_unsafeconditions': {
    title: 'UNSAFE CONDITIONS REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' },
          { key: 'hazard_source', label: 'Hazard Source', type: 'text' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  },
  'accidents_utilitydamage': {
    title: 'UTILITY DAMAGE REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' },
          { key: 'service_description', label: 'Service Description', type: 'text' },
          { key: 'service_owner', label: 'Service Owner', type: 'text' },
          { key: 'cause_damage', label: 'Cause of Damage', type: 'text' }
        ]
      },
      {
        title: 'REPAIR DETAILS',
        fields: [
          { key: 'plant_owner_name', label: 'Plant Owner Name', type: 'text' },
          { key: 'repair_service', label: 'Repair Service', type: 'text' },
          { key: 'repair_date', label: 'Repair Date', type: 'date' },
          { key: 'responsible_person', label: 'Responsible Person', type: 'text' },
          { key: 'notes', label: 'Notes', type: 'textarea' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  },
  'accidents_hospitaltreatment': {
    title: 'HOSPITAL TREATMENT REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' }
        ]
      },
      {
        title: 'INJURED PERSON DETAILS',
        fields: [
          { key: 'injured_person_name', label: 'Name', type: 'text' },
          { key: 'injured_person_address', label: 'Address', type: 'textarea' },
          { key: 'injured_person_phone', label: 'Phone', type: 'text' },
          { key: 'injured_person_position', label: 'Position', type: 'text' },
          { key: 'time_lost', label: 'Time Lost', type: 'boolean' },
          { key: 'time_lost_start_date', label: 'Time Lost Start Date', type: 'date' },
          { key: 'time_lost_end_date', label: 'Time Lost End Date', type: 'date' },
          { key: 'ae_hospital_name', label: 'A&E Hospital Name', type: 'text' },
          { key: 'required_ppe', label: 'Required PPE', type: 'text' },
          { key: 'worn_ppe', label: 'Worn PPE', type: 'text' }
        ]
      },
      {
        title: 'INJURY DETAILS',
        fields: [
          { key: 'injury_locations', label: 'Injury Locations', type: 'array' },
          { key: 'injury_types', label: 'Injury Types', type: 'array' }
        ]
      },
      {
        title: 'FIRST AID & MEDICAL',
        fields: [
          { key: 'advised_medical', label: 'Advised Medical', type: 'boolean' },
          { key: 'drug_alcohol_test', label: 'Drug/Alcohol Test', type: 'boolean' },
          { key: 'first_aid_details', label: 'First Aid Details', type: 'textarea' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'basic_cause', label: 'Basic Cause', type: 'text' },
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  },
  'accidents_illhealth': {
    title: 'ILL HEALTH REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' }
        ]
      },
      {
        title: 'INJURED PERSON DETAILS',
        fields: [
          { key: 'injured_person_name', label: 'Name', type: 'text' },
          { key: 'injured_person_address', label: 'Address', type: 'textarea' },
          { key: 'injured_person_phone', label: 'Phone', type: 'text' },
          { key: 'injured_person_position', label: 'Position', type: 'text' },
          { key: 'time_lost', label: 'Time Lost', type: 'boolean' },
          { key: 'time_lost_start_date', label: 'Time Lost Start Date', type: 'date' },
          { key: 'time_lost_end_date', label: 'Time Lost End Date', type: 'date' },
          { key: 'ae_hospital_name', label: 'A&E Hospital Name', type: 'text' },
          { key: 'required_ppe', label: 'Required PPE', type: 'text' },
          { key: 'worn_ppe', label: 'Worn PPE', type: 'text' }
        ]
      },
      {
        title: 'INJURY DETAILS',
        fields: [
          { key: 'injury_locations', label: 'Injury Locations', type: 'array' },
          { key: 'injury_types', label: 'Injury Types', type: 'array' }
        ]
      },
      {
        title: 'FIRST AID & MEDICAL',
        fields: [
          { key: 'advised_medical', label: 'Advised Medical', type: 'boolean' },
          { key: 'drug_alcohol_test', label: 'Drug/Alcohol Test', type: 'boolean' },
          { key: 'first_aid_details', label: 'First Aid Details', type: 'textarea' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'basic_cause', label: 'Basic Cause', type: 'text' },
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  },
  'accidents_minoraccident': {
    title: 'MINOR ACCIDENT REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' }
        ]
      },
      {
        title: 'INJURED PERSON DETAILS',
        fields: [
          { key: 'injured_person_name', label: 'Name', type: 'text' },
          { key: 'injured_person_address', label: 'Address', type: 'textarea' },
          { key: 'injured_person_phone', label: 'Phone', type: 'text' },
          { key: 'injured_person_position', label: 'Position', type: 'text' },
          { key: 'time_lost', label: 'Time Lost', type: 'boolean' },
          { key: 'time_lost_start_date', label: 'Time Lost Start Date', type: 'date' },
          { key: 'time_lost_end_date', label: 'Time Lost End Date', type: 'date' },
          { key: 'ae_hospital_name', label: 'A&E Hospital Name', type: 'text' },
          { key: 'required_ppe', label: 'Required PPE', type: 'text' },
          { key: 'worn_ppe', label: 'Worn PPE', type: 'text' }
        ]
      },
      {
        title: 'INJURY DETAILS',
        fields: [
          { key: 'injury_locations', label: 'Injury Locations', type: 'array' },
          { key: 'injury_types', label: 'Injury Types', type: 'array' }
        ]
      },
      {
        title: 'FIRST AID & MEDICAL',
        fields: [
          { key: 'advised_medical', label: 'Advised Medical', type: 'boolean' },
          { key: 'drug_alcohol_test', label: 'Drug/Alcohol Test', type: 'boolean' },
          { key: 'first_aid_details', label: 'First Aid Details', type: 'textarea' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'basic_cause', label: 'Basic Cause', type: 'text' },
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  },
  'accidents_nonfatal': {
    title: 'NON-FATAL ACCIDENT REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' }
        ]
      },
      {
        title: 'INJURED PERSON DETAILS',
        fields: [
          { key: 'injured_person_name', label: 'Name', type: 'text' },
          { key: 'injured_person_address', label: 'Address', type: 'textarea' },
          { key: 'injured_person_phone', label: 'Phone', type: 'text' },
          { key: 'injured_person_position', label: 'Position', type: 'text' },
          { key: 'time_lost', label: 'Time Lost', type: 'boolean' },
          { key: 'time_lost_start_date', label: 'Time Lost Start Date', type: 'date' },
          { key: 'time_lost_end_date', label: 'Time Lost End Date', type: 'date' },
          { key: 'ae_hospital_name', label: 'A&E Hospital Name', type: 'text' },
          { key: 'required_ppe', label: 'Required PPE', type: 'text' },
          { key: 'worn_ppe', label: 'Worn PPE', type: 'text' }
        ]
      },
      {
        title: 'INJURY DETAILS',
        fields: [
          { key: 'injury_locations', label: 'Injury Locations', type: 'array' },
          { key: 'injury_types', label: 'Injury Types', type: 'array' }
        ]
      },
      {
        title: 'FIRST AID & MEDICAL',
        fields: [
          { key: 'advised_medical', label: 'Advised Medical', type: 'boolean' },
          { key: 'drug_alcohol_test', label: 'Drug/Alcohol Test', type: 'boolean' },
          { key: 'first_aid_details', label: 'First Aid Details', type: 'textarea' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'basic_cause', label: 'Basic Cause', type: 'text' },
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  },
  'accidents_occupationaldisease': {
    title: 'OCCUPATIONAL DISEASE REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' }
        ]
      },
      {
        title: 'INJURED PERSON DETAILS',
        fields: [
          { key: 'injured_person_name', label: 'Name', type: 'text' },
          { key: 'injured_person_address', label: 'Address', type: 'textarea' },
          { key: 'injured_person_phone', label: 'Phone', type: 'text' },
          { key: 'injured_person_position', label: 'Position', type: 'text' },
          { key: 'time_lost', label: 'Time Lost', type: 'boolean' },
          { key: 'time_lost_start_date', label: 'Time Lost Start Date', type: 'date' },
          { key: 'time_lost_end_date', label: 'Time Lost End Date', type: 'date' },
          { key: 'ae_hospital_name', label: 'A&E Hospital Name', type: 'text' },
          { key: 'required_ppe', label: 'Required PPE', type: 'text' },
          { key: 'worn_ppe', label: 'Worn PPE', type: 'text' }
        ]
      },
      {
        title: 'INJURY DETAILS',
        fields: [
          { key: 'injury_locations', label: 'Injury Locations', type: 'array' },
          { key: 'injury_types', label: 'Injury Types', type: 'array' }
        ]
      },
      {
        title: 'FIRST AID & MEDICAL',
        fields: [
          { key: 'advised_medical', label: 'Advised Medical', type: 'boolean' },
          { key: 'drug_alcohol_test', label: 'Drug/Alcohol Test', type: 'boolean' },
          { key: 'first_aid_details', label: 'First Aid Details', type: 'textarea' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'basic_cause', label: 'Basic Cause', type: 'text' },
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  },
  'accidents_sevendayincapacitation': {
    title: 'SEVEN DAY INCAPACITATION REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' }
        ]
      },
      {
        title: 'INJURED PERSON DETAILS',
        fields: [
          { key: 'injured_person_name', label: 'Name', type: 'text' },
          { key: 'injured_person_address', label: 'Address', type: 'textarea' },
          { key: 'injured_person_phone', label: 'Phone', type: 'text' },
          { key: 'injured_person_position', label: 'Position', type: 'text' },
          { key: 'time_lost', label: 'Time Lost', type: 'boolean' },
          { key: 'time_lost_start_date', label: 'Time Lost Start Date', type: 'date' },
          { key: 'time_lost_end_date', label: 'Time Lost End Date', type: 'date' },
          { key: 'ae_hospital_name', label: 'A&E Hospital Name', type: 'text' },
          { key: 'required_ppe', label: 'Required PPE', type: 'text' },
          { key: 'worn_ppe', label: 'Worn PPE', type: 'text' }
        ]
      },
      {
        title: 'INJURY DETAILS',
        fields: [
          { key: 'injury_locations', label: 'Injury Locations', type: 'array' },
          { key: 'injury_types', label: 'Injury Types', type: 'array' }
        ]
      },
      {
        title: 'FIRST AID & MEDICAL',
        fields: [
          { key: 'advised_medical', label: 'Advised Medical', type: 'boolean' },
          { key: 'drug_alcohol_test', label: 'Drug/Alcohol Test', type: 'boolean' },
          { key: 'first_aid_details', label: 'First Aid Details', type: 'textarea' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'basic_cause', label: 'Basic Cause', type: 'text' },
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  },
  'accidents_specifiedinjuries': {
    title: 'SPECIFIED INJURIES REPORT',
    sections: [
      {
        title: 'INCIDENT DETAILS',
        fields: [
          { key: 'incident_location', label: 'Location', type: 'text' },
          { key: 'incident_date', label: 'Injury / Incident Date', type: 'date' },
          { key: 'incident_description', label: 'Description', type: 'textarea' }
        ]
      },
      {
        title: 'INJURED PERSON DETAILS',
        fields: [
          { key: 'injured_person_name', label: 'Name', type: 'text' },
          { key: 'injured_person_address', label: 'Address', type: 'textarea' },
          { key: 'injured_person_phone', label: 'Phone', type: 'text' },
          { key: 'injured_person_position', label: 'Position', type: 'text' },
          { key: 'time_lost', label: 'Time Lost', type: 'boolean' },
          { key: 'time_lost_start_date', label: 'Time Lost Start Date', type: 'date' },
          { key: 'time_lost_end_date', label: 'Time Lost End Date', type: 'date' },
          { key: 'ae_hospital_name', label: 'A&E Hospital Name', type: 'text' },
          { key: 'required_ppe', label: 'Required PPE', type: 'text' },
          { key: 'worn_ppe', label: 'Worn PPE', type: 'text' }
        ]
      },
      {
        title: 'INJURY DETAILS',
        fields: [
          { key: 'injury_locations', label: 'Injury Locations', type: 'array' },
          { key: 'injury_types', label: 'Injury Types', type: 'array' }
        ]
      },
      {
        title: 'FIRST AID & MEDICAL',
        fields: [
          { key: 'advised_medical', label: 'Advised Medical', type: 'boolean' },
          { key: 'drug_alcohol_test', label: 'Drug/Alcohol Test', type: 'boolean' },
          { key: 'first_aid_details', label: 'First Aid Details', type: 'textarea' }
        ]
      },
      {
        title: 'INVESTIGATION',
        fields: [
          { key: 'basic_cause', label: 'Basic Cause', type: 'text' },
          { key: 'root_cause_work_environment', label: 'Work Environment Factors', type: 'array' },
          { key: 'root_cause_human_factors', label: 'Human Factors', type: 'array' },
          { key: 'root_cause_ppe', label: 'PPE Factors', type: 'array' },
          { key: 'root_cause_management', label: 'Management Factors', type: 'array' },
          { key: 'root_cause_plant_equipment', label: 'Plant/Equipment Factors', type: 'array' }
        ]
      },
      {
        title: 'ACTIONS',
        fields: [
          { key: 'actions_taken', label: 'Actions Taken', type: 'textarea' },
          { key: 'actions', label: 'Action Items', type: 'actions' }
        ]
      }
    ]
  }
};

export async function generateAccidentsPDF({
  reportData,
  tableName
}: GeneratePDFOptions): Promise<string> {
  try {
    // Create new PDF document
    const doc = new jsPDF();
    
    // Define theme colors and styles
    const themeColor = '#000000';
    const headerColor = '#edeaea';
    const cellBackgroundColor = '#f7f7f7';
    const borderColor = [211, 211, 211]; // Light gray border
    
    // Set default font
    doc.setFont('helvetica');

    // Fetch company settings for logo
    const { data: companySettings, error: companyError } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (companyError) throw new Error(`Failed to load company settings: ${companyError.message}`);
    if (!companySettings) throw new Error('Company settings not found');

    // Fetch current user for display name
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error(`Failed to get user: ${userError.message}`);
    
    const createdByName = user?.user_metadata?.display_name || reportData.created_by_name || 'N/A';

    // Add company logo if exists
    if (companySettings.logo_url) {
      try {
        const response = await fetch(companySettings.logo_url);
        if (!response.ok) {
          throw new Error(`Failed to fetch logo: ${response.statusText}`);
        }
        const blob = await response.blob();
        const reader = new FileReader();
        
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            try {
              if (reader.result) {
                // Calculate dimensions to maintain aspect ratio
                const maxWidth = 40;
                const maxHeight = 20;
                const aspectRatio = 300/91; // Default aspect ratio
                let width = maxWidth;
                let height = width / aspectRatio;
                
                if (height > maxHeight) {
                  height = maxHeight;
                  width = height * aspectRatio;
                }

                doc.addImage(
                  reader.result as string,
                  'PNG',
                  15,
                  15,
                  width,
                  height,
                  undefined,
                  'FAST'
                );
              }
              resolve(null);
            } catch (error) {
              reject(new Error(`Failed to add logo to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read logo file'));
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error loading company logo:', error);
        // Continue without logo
      }
    }

    // Get form configuration
    const formConfig = FORM_FIELD_CONFIGS[tableName as keyof typeof FORM_FIELD_CONFIGS];
    if (!formConfig) {
      throw new Error(`No configuration found for table: ${tableName}`);
    }

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(themeColor);
    doc.text(formConfig.title, 195, 25, { align: 'right' });
    
    // Reset text color and font
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let yPos = 45;

    const pageWidth = doc.internal.pageSize.width;
    const leftColumnX = 15; // Left margin
    const rightColumnX = pageWidth / 2 + 5; // Adjusted for proper spacing
    const boxWidth = pageWidth / 2 - 20; // Box width for equal spacing

    // Company Information (Left Side)
    (doc as any).autoTable({
      startY: yPos,
      head: [['COMPANY INFORMATION']],
      body: [
        [{
          content: [
            { text: companySettings.name, styles: { fontStyle: 'bold' } },
            { text: '\n' + companySettings.address_line1 }, 
            { text: companySettings.address_line2 ? '\n' + companySettings.address_line2 : '' },
            { text: `\n${companySettings.town}, ${companySettings.county}` },
            { text: '\n' + companySettings.post_code },
            { text: '\n\n'+ companySettings.phone },  
            { text: '\n' + companySettings.email }
          ].map(item => item.text).join(''),
          styles: { cellWidth: 'auto', halign: 'left' }
        }]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: headerColor,
        textColor: 'black',
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
        fillColor: cellBackgroundColor,
        lineWidth: 0.1,
        lineColor: borderColor
      },
      margin: { left: leftColumnX, right: rightColumnX },
      tableWidth: boxWidth
    });

    // Report Details (Right Side)
    (doc as any).autoTable({
      startY: yPos,
      head: [[{ content: 'REPORT DETAILS', colSpan: 2 }]],
      body: [
        [{ content: 'REPORT ID:', styles: { fontStyle: 'bold' } }, reportData.auto_id || reportData.autoId || 'N/A'],
        [{ content: 'REPORT TYPE:', styles: { fontStyle: 'bold' } }, reportData.report_type || reportData.reportType || 'N/A'],
        [{ content: 'CATEGORY:', styles: { fontStyle: 'bold' } }, reportData.category || 'N/A'],
        [{ content: 'CREATED:', styles: { fontStyle: 'bold' } }, new Date(reportData.created_at || Date.now()).toLocaleDateString()],
        [{ content: 'CREATED BY:', styles: { fontStyle: 'bold' } }, createdByName]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: headerColor,
        textColor: 'black',
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
        fillColor: cellBackgroundColor,
        lineWidth: 0.1,
        lineColor: borderColor
      },
      columnStyles: { 
        0: { cellWidth: boxWidth * 0.4 },
        1: { cellWidth: boxWidth * 0.6 }
      },
      margin: { left: rightColumnX, right: 15 },
      tableWidth: boxWidth
    });

    yPos = 125;

    // Render each section dynamically based on form configuration
    for (const section of formConfig.sections) {
      // Create section body rows
      const sectionRows: any[] = [];
      
      for (const field of section.fields) {
        const value = reportData[field.key];
        
        // Skip fields that are empty or null
        if (value === null || value === undefined || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
          continue;
        }

        let displayValue = '';
        
        switch (field.type) {
          case 'boolean':
            displayValue = value ? 'Yes' : 'No';
            break;
          case 'date':
            displayValue = value ? new Date(value).toLocaleDateString() : 'N/A';
            break;
          case 'datetime':
            displayValue = value ? new Date(value).toLocaleString() : 'N/A';
            break;
          case 'array':
            displayValue = Array.isArray(value) ? value.join(', ') : (value || 'N/A');
            break;
          case 'actions':
            if (Array.isArray(value) && value.length > 0) {
              displayValue = value.map((action, index) => 
                `${index + 1}. ${action.title} (Due: ${action.dueDate || 'N/A'})\n   ${action.description || ''}`
              ).join('\n\n');
            } else {
              displayValue = 'No actions recorded';
            }
            break;
          case 'textarea':
          case 'text':
          default:
            displayValue = String(value || 'N/A');
            break;
        }

        sectionRows.push([
          { content: field.label.toUpperCase() + ':', styles: { fontStyle: 'bold' } },
          displayValue
        ]);
      }

      // Only create the table if there are rows to display
      if (sectionRows.length > 0) {
        (doc as any).autoTable({
          startY: yPos,
          head: [[{ content: section.title, colSpan: 2 }]],
          body: sectionRows,
          headStyles: {
            fillColor: headerColor,
            textColor: 'black',
            fontStyle: 'bold',
            halign: 'left'
          },
          styles: {
            fontSize: 10,
            cellPadding: 3,
            fillColor: cellBackgroundColor,
            lineWidth: 0.1,
            lineColor: borderColor
          },
          columnStyles: { 
            0: { cellWidth: 60 },
            1: { cellWidth: 'auto' }
          },
          theme: 'grid',
          margin: { left: 15, right: 15 }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
    }

    // Add page numbers and footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      
      // Add company details and page number in footer
      const footerParts = [];
      if (companySettings.company_number) {
        footerParts.push(`Company Number: ${companySettings.company_number}`);
      }
      if (companySettings.vat_number) {
        footerParts.push(`VAT Number: ${companySettings.vat_number}`);
      }
      
      if (footerParts.length > 0) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        
        const footerText = footerParts.join('   ');
        const pageNumberText = `Page ${i} of ${pageCount}`;
        
        // Calculate positions
        const footerWidth = doc.getTextWidth(footerText);
        const pageNumberWidth = doc.getTextWidth(pageNumberText);
        
        // Draw footer text on the left and page number on the right
        doc.text(footerText, 15, pageHeight - 10); // Left margin of 15px
        doc.text(pageNumberText, pageWidth - pageNumberWidth - 15, pageHeight - 10); // Right margin of 15px
      }
    }

    // Additional Images Section
    if (reportData.file_urls && Array.isArray(reportData.file_urls) && reportData.file_urls.length > 0) {
      // Check if we need a new page for the images section
      const pageHeight = doc.internal.pageSize.height;
      if (yPos > pageHeight - 100) { // If less than 100 units from bottom, add new page
        doc.addPage();
        yPos = 25;
      }

      // Add Additional Images section header
      (doc as any).autoTable({
        startY: yPos,
        head: [['ADDITIONAL IMAGES']],
        body: [
          ['PDF or other documents should be attached separately to this report. Uploaded images will appear inside of this report.']
        ],
        headStyles: {
          fillColor: headerColor,
          textColor: 'black',
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: {
          fontSize: 10,
          cellPadding: 3,
          fillColor: cellBackgroundColor,
          lineWidth: 0.1,
          lineColor: borderColor
        },
        theme: 'grid',
        margin: { left: 15, right: 15 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Process each image
      for (const imageUrl of reportData.file_urls) {
        try {
          if (!imageUrl || typeof imageUrl !== 'string') continue;

          // Fetch the image
          const response = await fetch(imageUrl);
          if (!response.ok) {
            console.warn(`Failed to fetch image: ${imageUrl}`);
            continue;
          }

          const blob = await response.blob();
          const reader = new FileReader();
          
          await new Promise((resolve, reject) => {
            reader.onload = () => {
              try {
                if (reader.result) {
                  // Create an image to get dimensions
                  const img = new Image();
                  img.onload = () => {
                    try {
                      // Calculate dimensions maintaining aspect ratio with max width of 700px (approximately 185mm)
                      const maxWidthPx = 700;
                      const maxWidthMm = 185; // Maximum width in mm (A4 width minus margins)
                      const originalWidth = img.width;
                      const originalHeight = img.height;
                      
                      let displayWidth = maxWidthMm;
                      let displayHeight = (originalHeight / originalWidth) * maxWidthMm;
                      
                      // If calculated width exceeds max, scale down proportionally
                      if (originalWidth < maxWidthPx) {
                        // If original is smaller than max, use original size converted to mm
                        displayWidth = (originalWidth / maxWidthPx) * maxWidthMm;
                        displayHeight = (originalHeight / maxWidthPx) * maxWidthMm;
                      }

                      // Check if image fits on current page, if not add new page
                      const currentPageHeight = doc.internal.pageSize.height;
                      if (yPos + displayHeight > currentPageHeight - 30) { // 30mm margin from bottom
                        doc.addPage();
                        yPos = 25;
                      }

                      // Add the image to PDF
                      const imageFormat = imageUrl.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
                      doc.addImage(
                        reader.result as string,
                        imageFormat,
                        15, // Left margin
                        yPos,
                        displayWidth,
                        displayHeight,
                        undefined,
                        'FAST'
                      );

                      // Update yPos for next image
                      yPos += displayHeight + 10; // 10mm spacing between images
                      
                      resolve(null);
                    } catch (error) {
                      console.error('Error adding image to PDF:', error);
                      resolve(null);
                    }
                  };
                  
                  img.onerror = () => {
                    console.warn('Failed to load image for dimension calculation');
                    resolve(null);
                  };
                  
                  img.src = reader.result as string;
                }
              } catch (error) {
                console.error('Error processing image:', error);
                resolve(null);
              }
            };
            
            reader.onerror = () => {
              console.warn('Failed to read image file');
              resolve(null);
            };
            
            reader.readAsDataURL(blob);
          });

        } catch (error) {
          console.error('Error processing image URL:', imageUrl, error);
          continue;
        }
      }
    }

    // Re-add page numbers and footer after adding images
    const finalPageCount = doc.getNumberOfPages();
    for (let i = 1; i <= finalPageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      
      // Add company details and page number in footer
      const footerParts = [];
      if (companySettings.company_number) {
        footerParts.push(`Company Number: ${companySettings.company_number}`);
      }
      if (companySettings.vat_number) {
        footerParts.push(`VAT Number: ${companySettings.vat_number}`);
      }
      
      if (footerParts.length > 0) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        
        const footerText = footerParts.join('   ');
        const pageNumberText = `Page ${i} of ${finalPageCount}`;
        
        // Calculate positions
        const footerWidth = doc.getTextWidth(footerText);
        const pageNumberWidth = doc.getTextWidth(pageNumberText);
        
        // Draw footer text on the left and page number on the right
        doc.text(footerText, 15, pageHeight - 10); // Left margin of 15px
        doc.text(pageNumberText, pageWidth - pageNumberWidth - 15, pageHeight - 10); // Right margin of 15px
      }
    }

    // Return the PDF as a data URL
    return doc.output('dataurlstring');
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
