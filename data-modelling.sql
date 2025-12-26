Design ONE

“A step contains all of its behavior.”

Behavior is implicit

Rules are embedded or ad-hoc

Harder to reason about evolution

CREATE TABLE problems (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE problem_steps (
  id BIGSERIAL PRIMARY KEY,
  problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  step_type TEXT NOT NULL, -- e.g. functional, non-functional etc
  "order" INT NOT NULL,
  required BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(problem_id, "order")
);

CREATE TABLE user_problems (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  problem_id BIGINT NOT NULL REFERENCES problems(id),
  status TEXT DEFAULT 'in_progress', -- in_progress, completed
  progress NUMERIC(5,2) DEFAULT 0,
  started_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  UNIQUE(user_id, problem_id)
);

CREATE TABLE user_problem_steps (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  problem_step_id BIGINT NOT NULL REFERENCES problem_steps(id),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, problem_step_id)
);




Design TWO

“A step is identity + ordering. Behavior is attached via rules.”

Behavior is explicit

Rules are first-class

Easy to extend without rewriting history

CREATE TABLE problems (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE problem_steps (
  id BIGSERIAL PRIMARY KEY,
  problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  "order" INT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (problem_id, "order")
);

CREATE TABLE user_problems (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  problem_id BIGINT NOT NULL REFERENCES problems(id),
  status TEXT DEFAULT 'in_progress',
  progress NUMERIC(5,2) DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, problem_id)
);

CREATE TABLE user_problem_steps (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  problem_step_id BIGINT NOT NULL REFERENCES problem_steps(id),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  score NUMERIC,
  attempts INT DEFAULT 0,
  UNIQUE (user_id, problem_step_id)
);

CREATE TABLE problem_step_rules (
  id BIGSERIAL PRIMARY KEY,
  step_id BIGINT NOT NULL REFERENCES problem_steps(id) ON DELETE CASCADE,
  rule_scope TEXT NOT NULL CHECK (rule_scope IN ('prerequisite', 'scoring')),
  rule_type TEXT NOT NULL,
  params JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);