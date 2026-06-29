-- ── SUPPORT TICKETS ──
create table if not exists support_tickets (
  id                     uuid primary key default gen_random_uuid(),
  ticket_id              text unique not null,
  date                   date,
  student_name           text,
  phone                  text,
  user_type              text,
  batch                  text,
  source                 text,
  response_medium        text,
  query_type             text,
  category               text,
  query_description      text,
  priority               text,
  department             text,
  owner                  text,
  assignee               text,
  status                 text default 'Pending',
  date_received          date,
  date_resolved          date,
  resolution_hrs         int,
  first_contact_resolved text,
  remark                 text,
  satisfaction_sent      boolean default false,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- ── SETTINGS / MASTER DATA ──
create table if not exists settings (
  id      uuid primary key default gen_random_uuid(),
  section text,
  key     text,
  value   text,
  notes   text
);

-- ── AGENTS ──
create table if not exists agents (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text,
  department text,
  active     boolean default true
);

-- ── STUDENTS (autofill) ──
create table if not exists students (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  phone       text unique,
  email       text,
  batch       text,
  user_type   text,
  plan_expiry date
);

-- ── SEED: Settings ──
insert into settings (section, key, value) values
  -- User Types
  ('USER_TYPE', 'Student',              ''),
  ('USER_TYPE', 'Parent',               ''),
  ('USER_TYPE', 'Faculty',              ''),
  ('USER_TYPE', 'Trial User',           ''),

  -- Batches
  ('BATCH', 'GNM 2024',                 ''),
  ('BATCH', 'GNM 2025',                 ''),
  ('BATCH', 'BSc Nursing 2024',         ''),
  ('BATCH', 'BSc Nursing 2025',         ''),
  ('BATCH', 'ANM 2024',                 ''),
  ('BATCH', 'Post Basic BSc 2024',      ''),

  -- Sources
  ('SOURCE', 'WhatsApp',                ''),
  ('SOURCE', 'Phone Call',              ''),
  ('SOURCE', 'Email',                   ''),
  ('SOURCE', 'Telegram',                ''),
  ('SOURCE', 'Walk-in',                 ''),
  ('SOURCE', 'App Chat',                ''),

  -- Query Types
  ('QUERY_TYPE', 'Technical',           ''),
  ('QUERY_TYPE', 'Academic',            ''),
  ('QUERY_TYPE', 'Billing',             ''),
  ('QUERY_TYPE', 'Enrollment',          ''),
  ('QUERY_TYPE', 'General',             ''),
  ('QUERY_TYPE', 'Feedback',            ''),

  -- Categories (key = query type, value = comma-separated categories)
  ('CATEGORY', 'Technical',   'App Not Loading,Login Problem,Video Not Playing,Download Issue,OTP Not Received,Password Reset'),
  ('CATEGORY', 'Academic',    'Study Material Missing,Mock Test Issue,Doubt Clearance,Schedule Query,Faculty Query,Exam Syllabus'),
  ('CATEGORY', 'Billing',     'Payment Failed,Refund Request,Invoice Needed,Plan Upgrade,EMI Query,Coupon Issue'),
  ('CATEGORY', 'Enrollment',  'Admission Process,Document Submission,Eligibility Query,Batch Allotment,Transfer Request'),
  ('CATEGORY', 'General',     'App Feedback,Complaint,General Query,Feature Request,Other'),
  ('CATEGORY', 'Feedback',    'Positive Feedback,Suggestion,Complaint,Faculty Feedback'),

  -- Departments
  ('DEPARTMENT', 'Tech Support',        ''),
  ('DEPARTMENT', 'Academic Team',       ''),
  ('DEPARTMENT', 'Finance',             ''),
  ('DEPARTMENT', 'Admissions',          ''),
  ('DEPARTMENT', 'Student Support',     ''),

  -- Owners (key = department, value = comma-separated names)
  ('OWNER', 'Tech Support',    'Rahul Kumar,Suresh Verma'),
  ('OWNER', 'Academic Team',   'Priya Singh,Meena Sharma,Dr. Ravi'),
  ('OWNER', 'Finance',         'Amit Gupta,Sonia Jain'),
  ('OWNER', 'Admissions',      'Kavya Reddy,Rohit Mishra'),
  ('OWNER', 'Student Support', 'Ravi Teja,Sita Devi,Ankit'),

  -- Status options
  ('STATUS', 'Pending',         ''),
  ('STATUS', 'In Process',      ''),
  ('STATUS', 'Resolved',        ''),
  ('STATUS', 'Closed',          ''),
  ('STATUS', 'No Solution Yet', ''),

  -- Department emails
  ('DEPT_EMAIL', 'Tech Support',    'tech@nprep.in'),
  ('DEPT_EMAIL', 'Academic Team',   'academic@nprep.in'),
  ('DEPT_EMAIL', 'Finance',         'finance@nprep.in'),
  ('DEPT_EMAIL', 'Admissions',      'admissions@nprep.in'),
  ('DEPT_EMAIL', 'Student Support', 'support@nprep.in')
on conflict do nothing;

-- ── SEED: Agents ──
insert into agents (name, email, department, active) values
  ('Agent 1', 'agent1@nprep.in', 'Student Support', true),
  ('Agent 2', 'agent2@nprep.in', 'Student Support', true),
  ('Agent 3', 'agent3@nprep.in', 'Tech Support',    true)
on conflict do nothing;
