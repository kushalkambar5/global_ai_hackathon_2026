import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  numeric,
  real,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  integer,
  primaryKey,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// ENUMS
// ==========================================

export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE', 'OTHER']);
export const bloodGroupEnum = pgEnum('blood_group', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
export const roleEnum = pgEnum('role', ['PATIENT', 'DOCTOR']);
export const dpStatusEnum = pgEnum('doctor_patient_status', ['ACTIVE', 'INACTIVE']);
export const reportTypeEnum = pgEnum('report_type', ['LAB', 'IMAGING', 'PRESCRIPTION', 'DISCHARGE', 'OTHER']);
export const sourceEnum = pgEnum('health_metric_source', ['HEALTH_CONNECT', 'MANUAL']);
export const scanTypeEnum = pgEnum('scan_type', ['BONE_FRACTURE', 'BRAIN_TUMOR', 'ECG', 'HEART', 'SKIN', 'CHEST']);
export const scanStatusEnum = pgEnum('scan_status', ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);
export const dietPlanStatusEnum = pgEnum('diet_plan_status', ['DRAFT', 'AI_GENERATED', 'DOCTOR_VERIFIED', 'ACTIVE', 'COMPLETED']);
export const suggestionCategoryEnum = pgEnum('suggestion_category', ['DIET', 'EXERCISE', 'MEDICATION', 'LIFESTYLE', 'FOLLOWUP']);
export const suggestionStatusEnum = pgEnum('suggestion_status', ['PENDING_REVIEW', 'DOCTOR_APPROVED', 'DOCTOR_MODIFIED', 'DOCTOR_REJECTED', 'AUTO_APPROVED']);
export const severityEnum = pgEnum('severity', ['MILD', 'MODERATE', 'SEVERE', 'CRITICAL']);
export const taskTypeEnum = pgEnum('task_type', ['task_based', 'goal_based']);
export const goalMetricEnum = pgEnum('goal_metric', ['daily_steps', 'calories_burn', 'min_sleep']);
export const chatSenderEnum = pgEnum('chat_sender', ['user', 'ai']);

// ==========================================
// TABLES
// ==========================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  dateOfBirth: date('date_of_birth'),
  gender: genderEnum('gender'),
  bloodGroup: bloodGroupEnum('blood_group'),
  heightCm: numeric('height_cm', { precision: 5, scale: 2 }),
  weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
  allergiesJson: text('allergies_json'),
  chronicConditionsJson: text('chronic_conditions_json'),
  currentMedicationsJson: text('current_medications_json'),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 50 }),
  role: roleEnum('role').notNull().default('PATIENT'),
  onboardingComplete: boolean('onboarding_complete').default(false),
  profileImageUrl: varchar('profile_image_url', { length: 512 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const doctorProfiles = pgTable('doctor_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  licenseNumber: varchar('license_number', { length: 100 }).notNull().unique(),
  specialization: varchar('specialization', { length: 255 }),
  yearsExperience: integer('years_experience'),
  bio: text('bio'),
  hospitalAffiliation: varchar('hospital_affiliation', { length: 255 }),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const doctorPatients = pgTable('doctor_patients', {
  doctorId: uuid('doctor_id').notNull().references(() => doctorProfiles.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  status: dpStatusEnum('status').default('ACTIVE'),
  isActive: boolean('is_active').default(true).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.doctorId, t.patientId] })
}));

export const medicalReports = pgTable('medical_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  reportType: reportTypeEnum('report_type'),
  fileUrl: varchar('file_url', { length: 512 }),
  r2Key: varchar('r2_key', { length: 255 }),
  fileType: varchar('file_type', { length: 50 }), // pdf | image | dicom
  extractedData: jsonb('extracted_data'),
  aiSummary: jsonb('ai_summary'),
  affectedParts: integer('affected_parts').array(),
  medicines: text('medicines').array(),
  reportDate: date('report_date'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

export const healthMetrics = pgTable('health_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  steps: integer('steps'),
  heartRateAvg: integer('heart_rate_avg'),
  heartRateMin: integer('heart_rate_min'),
  heartRateMax: integer('heart_rate_max'),
  caloriesBurnt: numeric('calories_burnt', { precision: 8, scale: 2 }),
  distanceMeters: numeric('distance_meters', { precision: 10, scale: 2 }),
  spo2Percentage: numeric('spo2_percentage', { precision: 5, scale: 2 }),
  sleepDurationMinutes: integer('sleep_duration_minutes'),
  sleepStages: jsonb('sleep_stages'),
  metricDate: date('metric_date').notNull(),
  source: sourceEnum('source'),
  syncedAt: timestamp('synced_at').defaultNow().notNull(),
}, (t) => ({
  // Ensure one entry per day per user as stated in the diagram
  unqMetricDate: unique('unq_patient_metric_date').on(t.patientId, t.metricDate)
}));

export const diseaseScans = pgTable('disease_scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  scanType: scanTypeEnum('scan_type').notNull(),
  inputImageUrl: varchar('input_image_url', { length: 512 }),
  r2Key: varchar('r2_key', { length: 255 }),
  modelInputMetadata: jsonb('model_input_metadata'),
  predictionResult: jsonb('prediction_result'),
  status: scanStatusEnum('status').default('PENDING'),
  aiExplanation: text('ai_explanation'),
  affectedParts: integer('affected_parts').array(),
  medicines: text('medicines').array(),
  aiSuggestions: text('ai_suggestions').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const dietPlans = pgTable('diet_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  doctorId: uuid('doctor_id').references(() => doctorProfiles.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by'), // nullable/no FK constraint since it can be "SYSTEM" or a doctor's ID
  title: varchar('title', { length: 255 }),
  status: dietPlanStatusEnum('status').default('DRAFT'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  dailySchedule: jsonb('daily_schedule'),
  nutritionalTargets: jsonb('nutritional_targets'),
  healthGoals: jsonb('health_goals'),
  aiRationale: text('ai_rationale'),
  doctorNotes: text('doctor_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==========================================
// TASKS
// ==========================================

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  doctorId: uuid('doctor_id').notNull().references(() => doctorProfiles.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskType: taskTypeEnum('task_type').notNull(),
  // --- task_based only ---
  taskName: varchar('task_name', { length: 255 }),       // free-text name for task_based
  // --- goal_based only ---
  goalMetric: goalMetricEnum('goal_metric'),             // which wearable metric to watch
  goalTarget: numeric('goal_target', { precision: 10, scale: 2 }), // target value
  freqIntervalDays: integer('freq_interval_days'),       // recurrence in days (1=daily, 7=weekly…)
  // --- common ---
  taskDescription: text('task_description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskHistory = pgTable('task_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  periodDate: date('period_date').notNull(),             // the date this interval covers
  isDone: boolean('is_done').default(false).notNull(),
  actualValue: numeric('actual_value', { precision: 10, scale: 2 }), // wearable value (goal_based)
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
}, (t) => ({
  unqTaskPeriod: unique('unq_task_period').on(t.taskId, t.periodDate)
}));

export const aiSuggestions = pgTable('ai_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  doctorId: uuid('doctor_id').references(() => doctorProfiles.id, { onDelete: 'set null' }),
  category: suggestionCategoryEnum('category'),
  suggestionText: text('suggestion_text').notNull(),
  aiRationale: text('ai_rationale'),
  status: suggestionStatusEnum('status').default('PENDING_REVIEW'),
  doctorFeedback: text('doctor_feedback'),
  modifiedSuggestion: text('modified_suggestion'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
});

export const bodyMapConditions = pgTable('body_map_conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bodyPartId: varchar('body_part_id', { length: 100 }).notNull(),
  conditionName: varchar('condition_name', { length: 255 }).notNull(),
  severity: severityEnum('severity'),
  description: text('description'),
  sourceScanId: uuid('source_scan_id').references(() => diseaseScans.id, { onDelete: 'set null' }),
  sourceReportId: uuid('source_report_id').references(() => medicalReports.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').default(true),
  diagnosedAt: timestamp('diagnosed_at').defaultNow(),
  resolvedAt: timestamp('resolved_at'),
});

export const chatContexts = pgTable('chat_contexts', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  agentConversationId: varchar('agent_conversation_id', { length: 255 }),
  contextSnapshot: text('context_snapshot'), // Can also be jsonb based on needs
  lastSyncedAt: timestamp('last_synced_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const doctorPatientChats = pgTable('doctor_patient_chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  doctorId: uuid('doctor_id').notNull().references(() => doctorProfiles.id, { onDelete: 'cascade' }),
  patientId: uuid('patient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  messages: jsonb('messages').default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  unqDoctorPatientChat: unique('unq_doctor_patient_chat').on(t.doctorId, t.patientId)
}));

export const conversations = pgTable('conversations', {
  conversationId: uuid('conversation_id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  doctorId: uuid('doctor_id').notNull().references(() => doctorProfiles.id, { onDelete: 'cascade' }),
  conversationTranscription: text('conversation_transcription'),
  conversationSummary: text('conversation_summary'),
  conversationMedication: text('conversation_medication').array(),
  conversationAudio: varchar('conversation_audio', { length: 512 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==========================================
// MEDICATION ADHERENCE PATTERNS (64-dim encoder embeddings)
// general_patterns: one hardcoded baseline per patient (from training set label==1)
// today_patterns: one encoder embedding per patient per day (from watch sync / stub)
// ==========================================

export const generalPatterns = pgTable('general_patterns', {
  id: uuid('pattern_id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  pattern: real('pattern').array().notNull(), // list of 64 floats
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const todayPatterns = pgTable('today_patterns', {
  id: uuid('pattern_id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  pattern: real('pattern').array().notNull(), // list of 64 floats
  patternDate: date('pattern_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  unqUserPatternDate: unique('unq_user_pattern_date').on(t.userId, t.patternDate),
}));

// ==========================================
// AI CHATS
// ==========================================

export const aiChats = pgTable('ai_chats', {
  chatId: uuid('chat_id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // List of up to 10 recent chat messages stored as JSONB array
  // Each entry: { chat_text: string, created_at: string (ISO), created_by: 'user' | 'ai' }
  chats: jsonb('chats').default([]).notNull(),
  chatSummary: text('chat_summary'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  unqUserChat: unique('unq_user_ai_chat').on(t.userId),
}));

