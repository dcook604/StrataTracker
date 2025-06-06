--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13 (Debian 15.13-1.pgdg120+1)
-- Dumped by pg_dump version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: generate_uuidv7(); Type: FUNCTION; Schema: public; Owner: spectrum4
--

CREATE FUNCTION public.generate_uuidv7() RETURNS uuid
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- For now, use gen_random_uuid() which is available with pgcrypto
    -- This provides secure random UUIDs, though not time-ordered
    -- We can upgrade to proper UUIDv7 when PostgreSQL adds native support
    RETURN gen_random_uuid();
END;
$$;


ALTER FUNCTION public.generate_uuidv7() OWNER TO spectrum4;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    user_id integer,
    user_name text,
    user_email text,
    action text NOT NULL,
    target_type text,
    target_id text,
    details jsonb,
    ip_address text
);


ALTER TABLE public.audit_logs OWNER TO spectrum4;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO spectrum4;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: bike_lockers; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.bike_lockers (
    id integer NOT NULL,
    unit_id integer NOT NULL,
    identifier text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bike_lockers OWNER TO spectrum4;

--
-- Name: bike_lockers_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.bike_lockers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bike_lockers_id_seq OWNER TO spectrum4;

--
-- Name: bike_lockers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.bike_lockers_id_seq OWNED BY public.bike_lockers.id;


--
-- Name: bylaw_categories; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.bylaw_categories (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    display_order integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bylaw_categories OWNER TO spectrum4;

--
-- Name: bylaw_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.bylaw_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bylaw_categories_id_seq OWNER TO spectrum4;

--
-- Name: bylaw_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.bylaw_categories_id_seq OWNED BY public.bylaw_categories.id;


--
-- Name: bylaw_category_links; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.bylaw_category_links (
    id integer NOT NULL,
    bylaw_id integer NOT NULL,
    category_id integer NOT NULL
);


ALTER TABLE public.bylaw_category_links OWNER TO spectrum4;

--
-- Name: bylaw_category_links_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.bylaw_category_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bylaw_category_links_id_seq OWNER TO spectrum4;

--
-- Name: bylaw_category_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.bylaw_category_links_id_seq OWNED BY public.bylaw_category_links.id;


--
-- Name: bylaw_revisions; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.bylaw_revisions (
    id integer NOT NULL,
    bylaw_id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    revision_notes text,
    effective_date date,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by_id integer NOT NULL
);


ALTER TABLE public.bylaw_revisions OWNER TO spectrum4;

--
-- Name: bylaw_revisions_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.bylaw_revisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bylaw_revisions_id_seq OWNER TO spectrum4;

--
-- Name: bylaw_revisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.bylaw_revisions_id_seq OWNED BY public.bylaw_revisions.id;


--
-- Name: bylaws; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.bylaws (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    section_number text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    parent_section_id integer,
    section_order integer NOT NULL,
    part_number text,
    part_title text,
    is_active boolean DEFAULT true NOT NULL,
    effective_date date,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by_id integer NOT NULL,
    updated_by_id integer
);


ALTER TABLE public.bylaws OWNER TO spectrum4;

--
-- Name: bylaws_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.bylaws_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bylaws_id_seq OWNER TO spectrum4;

--
-- Name: bylaws_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.bylaws_id_seq OWNED BY public.bylaws.id;


--
-- Name: communication_campaigns; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.communication_campaigns (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    plain_text_content text,
    scheduled_at timestamp without time zone,
    sent_at timestamp without time zone,
    created_by_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.communication_campaigns OWNER TO spectrum4;

--
-- Name: communication_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.communication_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.communication_campaigns_id_seq OWNER TO spectrum4;

--
-- Name: communication_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.communication_campaigns_id_seq OWNED BY public.communication_campaigns.id;


--
-- Name: communication_recipients; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.communication_recipients (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    recipient_type text NOT NULL,
    unit_id integer,
    person_id integer,
    email text NOT NULL,
    recipient_name text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    sent_at timestamp without time zone,
    error_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    tracking_id text
);


ALTER TABLE public.communication_recipients OWNER TO spectrum4;

--
-- Name: communication_recipients_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.communication_recipients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.communication_recipients_id_seq OWNER TO spectrum4;

--
-- Name: communication_recipients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.communication_recipients_id_seq OWNED BY public.communication_recipients.id;


--
-- Name: communication_templates; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.communication_templates (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_by_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.communication_templates OWNER TO spectrum4;

--
-- Name: communication_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.communication_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.communication_templates_id_seq OWNER TO spectrum4;

--
-- Name: communication_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.communication_templates_id_seq OWNED BY public.communication_templates.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_number text NOT NULL,
    floor text,
    owner_name text NOT NULL,
    owner_email text NOT NULL,
    tenant_name text,
    tenant_email text,
    phone text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.customers OWNER TO spectrum4;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO spectrum4;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: email_deduplication_log; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.email_deduplication_log (
    id integer NOT NULL,
    recipient_email text NOT NULL,
    email_type text NOT NULL,
    content_hash text NOT NULL,
    original_idempotency_key text NOT NULL,
    duplicate_idempotency_key text NOT NULL,
    prevented_at timestamp without time zone DEFAULT now() NOT NULL,
    metadata jsonb
);


ALTER TABLE public.email_deduplication_log OWNER TO spectrum4;

--
-- Name: TABLE email_deduplication_log; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON TABLE public.email_deduplication_log IS 'Logs prevented duplicate emails for monitoring';


--
-- Name: COLUMN email_deduplication_log.metadata; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON COLUMN public.email_deduplication_log.metadata IS 'Context about duplicate prevention (reason, timing, etc.)';


--
-- Name: email_deduplication_log_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.email_deduplication_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_deduplication_log_id_seq OWNER TO spectrum4;

--
-- Name: email_deduplication_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.email_deduplication_log_id_seq OWNED BY public.email_deduplication_log.id;


--
-- Name: email_idempotency_keys; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.email_idempotency_keys (
    id integer NOT NULL,
    idempotency_key text NOT NULL,
    email_type text NOT NULL,
    recipient_email text NOT NULL,
    email_hash text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    sent_at timestamp without time zone,
    metadata jsonb,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_idempotency_keys OWNER TO spectrum4;

--
-- Name: TABLE email_idempotency_keys; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON TABLE public.email_idempotency_keys IS 'Tracks email sends with idempotency keys to prevent duplicates';


--
-- Name: COLUMN email_idempotency_keys.idempotency_key; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON COLUMN public.email_idempotency_keys.idempotency_key IS 'Unique key generated from email context to prevent duplicates';


--
-- Name: COLUMN email_idempotency_keys.email_hash; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON COLUMN public.email_idempotency_keys.email_hash IS 'Hash of email content (subject + body) for content-based deduplication';


--
-- Name: COLUMN email_idempotency_keys.metadata; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON COLUMN public.email_idempotency_keys.metadata IS 'Additional context like violationId, campaignId, userId';


--
-- Name: COLUMN email_idempotency_keys.expires_at; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON COLUMN public.email_idempotency_keys.expires_at IS 'TTL for automatic cleanup of old records';


--
-- Name: email_idempotency_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.email_idempotency_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_idempotency_keys_id_seq OWNER TO spectrum4;

--
-- Name: email_idempotency_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.email_idempotency_keys_id_seq OWNED BY public.email_idempotency_keys.id;


--
-- Name: email_send_attempts; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.email_send_attempts (
    id integer NOT NULL,
    idempotency_key text NOT NULL,
    attempt_number integer DEFAULT 1 NOT NULL,
    status text NOT NULL,
    error_message text,
    attempted_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone
);


ALTER TABLE public.email_send_attempts OWNER TO spectrum4;

--
-- Name: TABLE email_send_attempts; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON TABLE public.email_send_attempts IS 'Records individual send attempts for retry tracking';


--
-- Name: COLUMN email_send_attempts.attempt_number; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON COLUMN public.email_send_attempts.attempt_number IS 'Sequential attempt number for retry tracking';


--
-- Name: email_send_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.email_send_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_send_attempts_id_seq OWNER TO spectrum4;

--
-- Name: email_send_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.email_send_attempts_id_seq OWNED BY public.email_send_attempts.id;


--
-- Name: email_tracking_events; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.email_tracking_events (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    recipient_id integer NOT NULL,
    tracking_id text NOT NULL,
    event_type text NOT NULL,
    event_data jsonb,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text
);


ALTER TABLE public.email_tracking_events OWNER TO spectrum4;

--
-- Name: email_tracking_events_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.email_tracking_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_tracking_events_id_seq OWNER TO spectrum4;

--
-- Name: email_tracking_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.email_tracking_events_id_seq OWNED BY public.email_tracking_events.id;


--
-- Name: email_verification_codes; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.email_verification_codes (
    id integer NOT NULL,
    person_id integer NOT NULL,
    violation_id integer NOT NULL,
    code_hash text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_verification_codes OWNER TO spectrum4;

--
-- Name: email_verification_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.email_verification_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_verification_codes_id_seq OWNER TO spectrum4;

--
-- Name: email_verification_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.email_verification_codes_id_seq OWNED BY public.email_verification_codes.id;


--
-- Name: manual_email_recipients; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.manual_email_recipients (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    email text NOT NULL,
    name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.manual_email_recipients OWNER TO spectrum4;

--
-- Name: manual_email_recipients_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.manual_email_recipients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.manual_email_recipients_id_seq OWNER TO spectrum4;

--
-- Name: manual_email_recipients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.manual_email_recipients_id_seq OWNED BY public.manual_email_recipients.id;


--
-- Name: parking_spots; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.parking_spots (
    id integer NOT NULL,
    unit_id integer NOT NULL,
    identifier text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.parking_spots OWNER TO spectrum4;

--
-- Name: parking_spots_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.parking_spots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parking_spots_id_seq OWNER TO spectrum4;

--
-- Name: parking_spots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.parking_spots_id_seq OWNED BY public.parking_spots.id;


--
-- Name: persons; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.persons (
    id integer NOT NULL,
    auth_user_id text,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    is_system_user boolean DEFAULT false NOT NULL,
    has_cat boolean DEFAULT false,
    has_dog boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.persons OWNER TO spectrum4;

--
-- Name: persons_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.persons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.persons_id_seq OWNER TO spectrum4;

--
-- Name: persons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.persons_id_seq OWNED BY public.persons.id;


--
-- Name: property_units; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.property_units (
    id integer NOT NULL,
    customer_id integer,
    unit_number text NOT NULL,
    floor text,
    owner_name text,
    owner_email text,
    tenant_name text,
    tenant_email text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    strata_lot text,
    mailing_street1 text,
    mailing_street2 text,
    mailing_city text,
    mailing_state_province text,
    mailing_postal_code text,
    mailing_country text,
    phone text,
    notes text,
    townhouse boolean DEFAULT false NOT NULL
);


ALTER TABLE public.property_units OWNER TO spectrum4;

--
-- Name: property_units_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.property_units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.property_units_id_seq OWNER TO spectrum4;

--
-- Name: property_units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.property_units_id_seq OWNED BY public.property_units.id;


--
-- Name: storage_lockers; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.storage_lockers (
    id integer NOT NULL,
    unit_id integer NOT NULL,
    identifier text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.storage_lockers OWNER TO spectrum4;

--
-- Name: storage_lockers_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.storage_lockers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.storage_lockers_id_seq OWNER TO spectrum4;

--
-- Name: storage_lockers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.storage_lockers_id_seq OWNED BY public.storage_lockers.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    setting_key text NOT NULL,
    setting_value text,
    description text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_by_id integer
);


ALTER TABLE public.system_settings OWNER TO spectrum4;

--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_settings_id_seq OWNER TO spectrum4;

--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: unit_facilities; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.unit_facilities (
    id integer NOT NULL,
    unit_id integer NOT NULL,
    parking_spots text,
    storage_lockers text,
    bike_lockers text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.unit_facilities OWNER TO spectrum4;

--
-- Name: unit_facilities_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.unit_facilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.unit_facilities_id_seq OWNER TO spectrum4;

--
-- Name: unit_facilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.unit_facilities_id_seq OWNED BY public.unit_facilities.id;


--
-- Name: unit_person_roles; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.unit_person_roles (
    id integer NOT NULL,
    unit_id integer NOT NULL,
    person_id integer NOT NULL,
    role text NOT NULL,
    receive_email_notifications boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.unit_person_roles OWNER TO spectrum4;

--
-- Name: unit_person_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.unit_person_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.unit_person_roles_id_seq OWNER TO spectrum4;

--
-- Name: unit_person_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.unit_person_roles_id_seq OWNED BY public.unit_person_roles.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.users (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    full_name text NOT NULL,
    is_council_member boolean DEFAULT false NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    is_user boolean DEFAULT true NOT NULL,
    last_login timestamp without time zone,
    failed_login_attempts integer DEFAULT 0,
    account_locked boolean DEFAULT false,
    lock_reason text,
    password_reset_token text,
    password_reset_expires timestamp without time zone,
    force_password_change boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO spectrum4;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO spectrum4;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: violation_access_links; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.violation_access_links (
    id integer NOT NULL,
    violation_id integer NOT NULL,
    recipient_email text NOT NULL,
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    violation_uuid uuid
);


ALTER TABLE public.violation_access_links OWNER TO spectrum4;

--
-- Name: violation_access_links_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.violation_access_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.violation_access_links_id_seq OWNER TO spectrum4;

--
-- Name: violation_access_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.violation_access_links_id_seq OWNED BY public.violation_access_links.id;


--
-- Name: violation_categories; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.violation_categories (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    bylaw_reference text,
    default_fine_amount integer,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.violation_categories OWNER TO spectrum4;

--
-- Name: violation_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.violation_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.violation_categories_id_seq OWNER TO spectrum4;

--
-- Name: violation_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.violation_categories_id_seq OWNED BY public.violation_categories.id;


--
-- Name: violation_histories; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.violation_histories (
    id integer NOT NULL,
    violation_id integer NOT NULL,
    user_id integer NOT NULL,
    action text NOT NULL,
    comment text,
    commenter_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    violation_uuid uuid,
    rejection_reason text
);


ALTER TABLE public.violation_histories OWNER TO spectrum4;

--
-- Name: violation_histories_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.violation_histories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.violation_histories_id_seq OWNER TO spectrum4;

--
-- Name: violation_histories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.violation_histories_id_seq OWNED BY public.violation_histories.id;


--
-- Name: violations; Type: TABLE; Schema: public; Owner: spectrum4
--

CREATE TABLE public.violations (
    id integer NOT NULL,
    reference_number uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id integer NOT NULL,
    reported_by_id integer NOT NULL,
    category_id integer,
    violation_type text NOT NULL,
    violation_date timestamp without time zone NOT NULL,
    violation_time text,
    description text NOT NULL,
    bylaw_reference text,
    status text DEFAULT 'pending_approval'::text NOT NULL,
    fine_amount integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    pdf_generated boolean DEFAULT false,
    pdf_path text,
    uuid uuid NOT NULL,
    incident_area text,
    concierge_name text,
    people_involved text,
    noticed_by text,
    damage_to_property text,
    damage_details text,
    police_involved text,
    police_details text
);


ALTER TABLE public.violations OWNER TO spectrum4;

--
-- Name: COLUMN violations.incident_area; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON COLUMN public.violations.incident_area IS 'Location where the violation occurred (e.g., Pool area, Parking garage, Lobby)';


--
-- Name: COLUMN violations.concierge_name; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON COLUMN public.violations.concierge_name IS 'Name of the concierge on duty when the violation occurred';


--
-- Name: COLUMN violations.people_involved; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON COLUMN public.violations.people_involved IS 'Names or descriptions of people involved in the violation';


--
-- Name: COLUMN violations.noticed_by; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON COLUMN public.violations.noticed_by IS 'Who first noticed or reported the violation';


--
-- Name: COLUMN violations.damage_to_property; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON COLUMN public.violations.damage_to_property IS 'Whether there is damage to common property (yes/no)';


--
-- Name: COLUMN violations.damage_details; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON COLUMN public.violations.damage_details IS 'Details about property damage if applicable';


--
-- Name: COLUMN violations.police_involved; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON COLUMN public.violations.police_involved IS 'Whether police are involved (yes/no)';


--
-- Name: COLUMN violations.police_details; Type: COMMENT; Schema: public; Owner: spectrum4
--

COMMENT ON COLUMN public.violations.police_details IS 'Police report details, case numbers, officer information, etc.';


--
-- Name: violations_id_seq; Type: SEQUENCE; Schema: public; Owner: spectrum4
--

CREATE SEQUENCE public.violations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.violations_id_seq OWNER TO spectrum4;

--
-- Name: violations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: spectrum4
--

ALTER SEQUENCE public.violations_id_seq OWNED BY public.violations.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: bike_lockers id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bike_lockers ALTER COLUMN id SET DEFAULT nextval('public.bike_lockers_id_seq'::regclass);


--
-- Name: bylaw_categories id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaw_categories ALTER COLUMN id SET DEFAULT nextval('public.bylaw_categories_id_seq'::regclass);


--
-- Name: bylaw_category_links id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaw_category_links ALTER COLUMN id SET DEFAULT nextval('public.bylaw_category_links_id_seq'::regclass);


--
-- Name: bylaw_revisions id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaw_revisions ALTER COLUMN id SET DEFAULT nextval('public.bylaw_revisions_id_seq'::regclass);


--
-- Name: bylaws id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaws ALTER COLUMN id SET DEFAULT nextval('public.bylaws_id_seq'::regclass);


--
-- Name: communication_campaigns id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.communication_campaigns ALTER COLUMN id SET DEFAULT nextval('public.communication_campaigns_id_seq'::regclass);


--
-- Name: communication_recipients id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.communication_recipients ALTER COLUMN id SET DEFAULT nextval('public.communication_recipients_id_seq'::regclass);


--
-- Name: communication_templates id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.communication_templates ALTER COLUMN id SET DEFAULT nextval('public.communication_templates_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: email_deduplication_log id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.email_deduplication_log ALTER COLUMN id SET DEFAULT nextval('public.email_deduplication_log_id_seq'::regclass);


--
-- Name: email_idempotency_keys id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.email_idempotency_keys ALTER COLUMN id SET DEFAULT nextval('public.email_idempotency_keys_id_seq'::regclass);


--
-- Name: email_send_attempts id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.email_send_attempts ALTER COLUMN id SET DEFAULT nextval('public.email_send_attempts_id_seq'::regclass);


--
-- Name: email_tracking_events id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.email_tracking_events ALTER COLUMN id SET DEFAULT nextval('public.email_tracking_events_id_seq'::regclass);


--
-- Name: email_verification_codes id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.email_verification_codes ALTER COLUMN id SET DEFAULT nextval('public.email_verification_codes_id_seq'::regclass);


--
-- Name: manual_email_recipients id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.manual_email_recipients ALTER COLUMN id SET DEFAULT nextval('public.manual_email_recipients_id_seq'::regclass);


--
-- Name: parking_spots id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.parking_spots ALTER COLUMN id SET DEFAULT nextval('public.parking_spots_id_seq'::regclass);


--
-- Name: persons id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.persons ALTER COLUMN id SET DEFAULT nextval('public.persons_id_seq'::regclass);


--
-- Name: property_units id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.property_units ALTER COLUMN id SET DEFAULT nextval('public.property_units_id_seq'::regclass);


--
-- Name: storage_lockers id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.storage_lockers ALTER COLUMN id SET DEFAULT nextval('public.storage_lockers_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: unit_facilities id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.unit_facilities ALTER COLUMN id SET DEFAULT nextval('public.unit_facilities_id_seq'::regclass);


--
-- Name: unit_person_roles id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.unit_person_roles ALTER COLUMN id SET DEFAULT nextval('public.unit_person_roles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: violation_access_links id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violation_access_links ALTER COLUMN id SET DEFAULT nextval('public.violation_access_links_id_seq'::regclass);


--
-- Name: violation_categories id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violation_categories ALTER COLUMN id SET DEFAULT nextval('public.violation_categories_id_seq'::regclass);


--
-- Name: violation_histories id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violation_histories ALTER COLUMN id SET DEFAULT nextval('public.violation_histories_id_seq'::regclass);


--
-- Name: violations id; Type: DEFAULT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violations ALTER COLUMN id SET DEFAULT nextval('public.violations_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.audit_logs (id, "timestamp", user_id, user_name, user_email, action, target_type, target_id, details, ip_address) FROM stdin;
\.


--
-- Data for Name: bike_lockers; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.bike_lockers (id, unit_id, identifier, created_at, updated_at) FROM stdin;
5	5	B34	2025-06-04 00:59:20.893496	2025-06-04 00:59:20.893496
6	13	B20	2025-06-04 00:59:21.09242	2025-06-04 00:59:21.09242
7	15	B19	2025-06-04 00:59:21.139365	2025-06-04 00:59:21.139365
8	16	B93	2025-06-04 00:59:21.173414	2025-06-04 00:59:21.173414
9	18	B96	2025-06-04 00:59:21.231805	2025-06-04 00:59:21.231805
10	19	B63	2025-06-04 00:59:21.257019	2025-06-04 00:59:21.257019
11	20	B75	2025-06-04 00:59:21.281673	2025-06-04 00:59:21.281673
12	22	B97	2025-06-04 00:59:21.33167	2025-06-04 00:59:21.33167
13	28	B72	2025-06-04 00:59:21.491234	2025-06-04 00:59:21.491234
14	31	B97	2025-06-04 00:59:21.575793	2025-06-04 00:59:21.575793
15	34	B99	2025-06-04 00:59:21.657925	2025-06-04 00:59:21.657925
16	38	B45	2025-06-04 00:59:21.745872	2025-06-04 00:59:21.745872
17	40	B4	2025-06-04 00:59:21.820456	2025-06-04 00:59:21.820456
18	42	B43	2025-06-04 00:59:21.84906	2025-06-04 00:59:21.84906
19	44	B82	2025-06-04 00:59:21.902629	2025-06-04 00:59:21.902629
20	46	B20	2025-06-04 00:59:21.932961	2025-06-04 00:59:21.932961
21	48	B89	2025-06-04 00:59:21.971229	2025-06-04 00:59:21.971229
22	49	B65	2025-06-04 00:59:21.998675	2025-06-04 00:59:21.998675
23	50	B83	2025-06-04 00:59:22.019803	2025-06-04 00:59:22.019803
24	53	B92	2025-06-04 00:59:22.089	2025-06-04 00:59:22.089
25	57	B99	2025-06-04 00:59:22.173214	2025-06-04 00:59:22.173214
26	59	B78	2025-06-04 00:59:22.218974	2025-06-04 00:59:22.218974
27	60	B20	2025-06-04 00:59:22.233845	2025-06-04 00:59:22.233845
28	63	B9	2025-06-04 00:59:22.302587	2025-06-04 00:59:22.302587
29	64	B43	2025-06-04 00:59:22.330902	2025-06-04 00:59:22.330902
30	65	B12	2025-06-04 00:59:22.360572	2025-06-04 00:59:22.360572
31	66	B79	2025-06-04 00:59:22.394923	2025-06-04 00:59:22.394923
32	69	B96	2025-06-04 00:59:22.457166	2025-06-04 00:59:22.457166
33	70	B57	2025-06-04 00:59:22.482592	2025-06-04 00:59:22.482592
34	75	B65	2025-06-04 00:59:22.59155	2025-06-04 00:59:22.59155
35	76	B52	2025-06-04 00:59:22.624914	2025-06-04 00:59:22.624914
36	80	B88	2025-06-04 00:59:22.723709	2025-06-04 00:59:22.723709
37	82	B4	2025-06-04 00:59:22.756623	2025-06-04 00:59:22.756623
38	85	B21	2025-06-04 00:59:22.826042	2025-06-04 00:59:22.826042
39	89	B79	2025-06-04 00:59:22.929353	2025-06-04 00:59:22.929353
40	90	B41	2025-06-04 00:59:22.953794	2025-06-04 00:59:22.953794
41	96	B72	2025-06-04 00:59:23.089888	2025-06-04 00:59:23.089888
42	100	B89	2025-06-04 00:59:23.178622	2025-06-04 00:59:23.178622
43	105	B89	2025-06-04 00:59:23.283116	2025-06-04 00:59:23.283116
44	106	B12	2025-06-04 00:59:23.308862	2025-06-04 00:59:23.308862
45	128	B78	2025-06-04 00:59:23.745803	2025-06-04 00:59:23.745803
46	136	B37	2025-06-04 00:59:23.911938	2025-06-04 00:59:23.911938
47	141	B7	2025-06-04 00:59:24.019645	2025-06-04 00:59:24.019645
48	144	B93	2025-06-04 00:59:24.097592	2025-06-04 00:59:24.097592
49	145	B9	2025-06-04 00:59:24.117116	2025-06-04 00:59:24.117116
50	146	B84	2025-06-04 00:59:24.147442	2025-06-04 00:59:24.147442
51	156	B52	2025-06-04 01:00:25.488858	2025-06-04 01:00:25.488858
52	157	B65	2025-06-04 01:00:25.514928	2025-06-04 01:00:25.514928
53	162	B86	2025-06-04 01:00:25.666701	2025-06-04 01:00:25.666701
54	165	B90	2025-06-04 01:00:25.744093	2025-06-04 01:00:25.744093
55	168	B91	2025-06-04 01:00:25.806745	2025-06-04 01:00:25.806745
56	173	B86	2025-06-04 01:00:25.914758	2025-06-04 01:00:25.914758
57	180	B81	2025-06-04 01:00:26.087904	2025-06-04 01:00:26.087904
58	187	B76	2025-06-04 01:00:26.236874	2025-06-04 01:00:26.236874
59	190	B46	2025-06-04 01:00:26.322907	2025-06-04 01:00:26.322907
60	195	B33	2025-06-04 01:00:26.43816	2025-06-04 01:00:26.43816
61	198	B73	2025-06-04 01:00:26.49078	2025-06-04 01:00:26.49078
62	201	B89	2025-06-04 01:00:26.568081	2025-06-04 01:00:26.568081
63	202	B70	2025-06-04 01:00:26.592169	2025-06-04 01:00:26.592169
64	215	B74	2025-06-04 01:00:26.894775	2025-06-04 01:00:26.894775
65	216	B48	2025-06-04 01:00:26.925931	2025-06-04 01:00:26.925931
66	217	B1	2025-06-04 01:00:26.952743	2025-06-04 01:00:26.952743
67	221	B95	2025-06-04 01:00:27.035062	2025-06-04 01:00:27.035062
68	225	B22	2025-06-04 01:00:27.129952	2025-06-04 01:00:27.129952
69	226	B51	2025-06-04 01:00:27.159019	2025-06-04 01:00:27.159019
70	227	B48	2025-06-04 01:00:27.182054	2025-06-04 01:00:27.182054
71	228	B98	2025-06-04 01:00:27.209415	2025-06-04 01:00:27.209415
72	230	B67	2025-06-04 01:00:27.258679	2025-06-04 01:00:27.258679
73	233	B41	2025-06-04 01:00:27.336011	2025-06-04 01:00:27.336011
74	244	B37	2025-06-04 01:00:27.630336	2025-06-04 01:00:27.630336
75	247	B77	2025-06-04 01:00:27.699829	2025-06-04 01:00:27.699829
76	248	B20	2025-06-04 01:00:27.729797	2025-06-04 01:00:27.729797
77	250	B41	2025-06-04 01:00:27.780705	2025-06-04 01:00:27.780705
78	251	B5	2025-06-04 01:00:27.812828	2025-06-04 01:00:27.812828
79	261	B11	2025-06-04 01:00:28.05707	2025-06-04 01:00:28.05707
80	264	B61	2025-06-04 01:00:28.126352	2025-06-04 01:00:28.126352
81	265	B10	2025-06-04 01:00:28.157781	2025-06-04 01:00:28.157781
82	269	B59	2025-06-04 01:00:28.263865	2025-06-04 01:00:28.263865
83	271	B59	2025-06-04 01:00:28.321904	2025-06-04 01:00:28.321904
84	273	B57	2025-06-04 01:00:28.365925	2025-06-04 01:00:28.365925
85	276	B12	2025-06-04 01:00:28.41605	2025-06-04 01:00:28.41605
86	277	B81	2025-06-04 01:00:28.434733	2025-06-04 01:00:28.434733
87	280	B23	2025-06-04 01:00:28.479014	2025-06-04 01:00:28.479014
88	281	B11	2025-06-04 01:00:28.497604	2025-06-04 01:00:28.497604
89	291	B52	2025-06-04 01:00:28.698825	2025-06-04 01:00:28.698825
90	295	B9	2025-06-04 01:00:28.770733	2025-06-04 01:00:28.770733
91	297	B97	2025-06-04 01:00:28.809124	2025-06-04 01:00:28.809124
92	300	B28	2025-06-04 01:00:28.862532	2025-06-04 01:00:28.862532
93	301	B23	2025-06-04 01:00:28.879809	2025-06-04 01:00:28.879809
94	303	B36	2025-06-04 01:00:28.919029	2025-06-04 01:00:28.919029
95	307	B12	2025-06-04 01:00:29.001075	2025-06-04 01:00:29.001075
96	310	B55	2025-06-04 01:00:29.04063	2025-06-04 01:00:29.04063
97	312	B24	2025-06-04 01:00:29.06998	2025-06-04 01:00:29.06998
98	318	B57	2025-06-04 01:00:29.162764	2025-06-04 01:00:29.162764
99	321	B16	2025-06-04 01:00:29.210742	2025-06-04 01:00:29.210742
100	330	B51	2025-06-04 01:00:29.359653	2025-06-04 01:00:29.359653
101	341	B63	2025-06-04 01:00:29.591304	2025-06-04 01:00:29.591304
102	342	B22	2025-06-04 01:00:29.618814	2025-06-04 01:00:29.618814
103	344	B32	2025-06-04 01:00:29.663837	2025-06-04 01:00:29.663837
104	346	B5	2025-06-04 01:00:29.703971	2025-06-04 01:00:29.703971
105	348	B50	2025-06-04 01:00:29.738439	2025-06-04 01:00:29.738439
106	349	B35	2025-06-04 01:00:29.753556	2025-06-04 01:00:29.753556
\.


--
-- Data for Name: bylaw_categories; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.bylaw_categories (id, name, description, display_order, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: bylaw_category_links; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.bylaw_category_links (id, bylaw_id, category_id) FROM stdin;
\.


--
-- Data for Name: bylaw_revisions; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.bylaw_revisions (id, bylaw_id, title, content, revision_notes, effective_date, created_at, created_by_id) FROM stdin;
\.


--
-- Data for Name: bylaws; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.bylaws (id, uuid, section_number, title, content, parent_section_id, section_order, part_number, part_title, is_active, effective_date, created_at, updated_at, created_by_id, updated_by_id) FROM stdin;
1	b9578a31-f4ef-40f2-b1fa-c5364939f06f	Section 1	Force and Effect	1.1 These Bylaws bind the Strata Corporation and all owners/residents to the same extent, as if the Bylaws had been signed by the Strata Corporation, and each owner/resident and contained covenants on the part of the Strata Corporation with each owner/resident, and of each owner/resident with every other owner/resident to observe and perform every provision of these Bylaws.\n\n1.2 All owners, residents and visitors must comply strictly with these Bylaws and the Rules of the Strata Corporation, as adopted and amended from time to time.	\N	1	PART 1	INTERPRETATION AND EFFECT	t	2025-03-26	2025-05-30 22:39:11.414597	2025-05-30 22:39:11.414597	1	\N
2	e250c47e-7cd9-406c-88f5-1e47aa8ab3e5	Section 2	Payment of Strata Fees and Special Levies	2.1 An owner must pay strata fees on or before the first (1st) day of the month to which the strata fees relate.\n\n2.2 If an owner fails to pay the strata fees on time, the owner must pay interest on the arrears at the rate of 10% per annum, compounded annually, and calculated on a monthly basis from the date the payment was due until the date of payment.\n\n2.3 A special levy is due and payable on the date or dates noted in the resolution authorizing the special levy.\n\n2.4 Any owner owing money for strata fees not received by the first (1st) of the month in question will be deemed to be in arrears and subject to collection proceedings.	\N	2	PART 2	DUTIES OF OWNERS, TENANTS, OCCUPANTS AND VISITORS	t	2025-03-26	2025-05-30 22:39:11.421623	2025-05-30 22:39:11.421623	1	\N
3	9aeccdaa-630a-474a-8a22-64e65667ffb5	Section 3	Repair and Maintenance of Property by Owner	3.1 An owner must repair and maintain the owner's strata lot, except for repair and maintenance that is the responsibility of the strata corporation under these bylaws or the Strata Property Act.	\N	3	PART 2	DUTIES OF OWNERS, TENANTS, OCCUPANTS AND VISITORS	t	2025-03-26	2025-05-30 22:39:11.424881	2025-05-30 22:39:11.424881	1	\N
4	bf5032a7-6be5-4e2f-ab9a-a4328822c405	Section 4	Use of Property	4.1 An owner, tenant, occupant or visitor must not use a strata lot, the common property or limited common property in a way that causes unreasonable noise, causes a nuisance or hazard to another person, interferes unreasonably with the rights of other persons to use and enjoy the common property, limited common property or another strata lot, is illegal, or is not in compliance with the purpose for which the strata lot is to be used as shown in the Form V filed in the Land Title Office.	\N	4	PART 2	DUTIES OF OWNERS, TENANTS, OCCUPANTS AND VISITORS	t	2025-03-26	2025-05-30 22:39:11.427529	2025-05-30 22:39:11.427529	1	\N
5	03ff7a89-692b-4241-b018-8c8f1d2f537a	Section 5	No Smoking	5.1 An owner, tenant, occupant or visitor must not smoke tobacco or any other substance anywhere on the strata lot, limited common property, or common property (both inside and outside), including, without limitation, balconies, patios, inside strata lots, common areas, parkade, and garden areas.	\N	5	PART 2	DUTIES OF OWNERS, TENANTS, OCCUPANTS AND VISITORS	t	2025-03-26	2025-05-30 22:39:11.42989	2025-05-30 22:39:11.42989	1	\N
6	eae5ee94-e874-4ad8-848c-0d72855bac51	Section 6	Fire and Safety	6.1 An owner, tenant, occupant or visitor must not use or store any flammable substance in a strata lot or on common property or limited common property, except for normal household purposes.\n\n6.2 An owner, tenant, occupant or visitor must immediately report any fire, safety hazard, or emergency situation to the appropriate authorities and the strata corporation.	\N	6	PART 2	DUTIES OF OWNERS, TENANTS, OCCUPANTS AND VISITORS	t	2025-03-26	2025-05-30 22:39:11.43235	2025-05-30 22:39:11.43235	1	\N
7	cee0fa27-9dc9-4877-bbea-2936874b3cbc	Section 7	Inform Strata Corporation	7.1 An owner must inform the strata corporation within 2 weeks of any change in the owner's name, address, telephone number, or email address.\n\n7.2 An owner must inform the strata corporation within 2 weeks if the owner's strata lot becomes a rental property or ceases to be a rental property.	\N	7	PART 2	DUTIES OF OWNERS, TENANTS, OCCUPANTS AND VISITORS	t	2025-03-26	2025-05-30 22:39:11.434876	2025-05-30 22:39:11.434876	1	\N
8	d8efc66f-4134-4278-a3dc-d0905ae05b5c	Section 8	Obtain Approval Before Altering a Strata Lot	8.1 An owner must obtain the written approval of the strata corporation before making an alteration to a strata lot that involves the structure of the building, the exterior of the building, pipes, wires, cables or ducts that serve the building, or the common property or limited common property.	\N	8	PART 2	DUTIES OF OWNERS, TENANTS, OCCUPANTS AND VISITORS	t	2025-03-26	2025-05-30 22:39:11.438588	2025-05-30 22:39:11.438588	1	\N
9	51119b32-0ef2-4373-8cf7-7b02191965f7	Section 9	Renovation and or Alterations, Improvement Guidelines	9.1 All renovation work must be performed between 8:00 a.m. and 6:00 p.m., Monday through Friday, and between 9:00 a.m. and 5:00 p.m. on Saturdays. No renovation work is permitted on Sundays or statutory holidays.\n\n9.2 The owner must provide written notice to the strata corporation and all adjacent units at least 48 hours before commencing any renovation work.	\N	9	PART 2	DUTIES OF OWNERS, TENANTS, OCCUPANTS AND VISITORS	t	2025-03-26	2025-05-30 22:39:11.441962	2025-05-30 22:39:11.441962	1	\N
10	7d349412-df45-459a-93ed-c6938ae60a47	Section 10	Noise	10.1 An owner, tenant, occupant or visitor must not create unreasonable noise in a strata lot or on common property or limited common property.\n\n10.2 Unreasonable noise includes, but is not limited to, loud music, television, parties, or other activities that disturb other residents, particularly between 10:00 p.m. and 8:00 a.m.	\N	10	PART 2	DUTIES OF OWNERS, TENANTS, OCCUPANTS AND VISITORS	t	2025-03-26	2025-05-30 22:39:11.44509	2025-05-30 22:39:11.44509	1	\N
11	420ca1fe-ed7d-4301-b95d-98b545f2a7f9	Section 11	Permit Entry to Strata Lot	11.1 An owner, tenant or occupant of a strata lot must give the strata corporation access to the strata lot to inspect, maintain, repair or replace common property, limited common property or property that is the responsibility of the strata corporation under these bylaws or the Strata Property Act.\n\n11.2 Except in cases of emergency, the strata corporation must give at least 48 hours written notice before entering a strata lot.	\N	11	PART 2	DUTIES OF OWNERS, TENANTS, OCCUPANTS AND VISITORS	t	2025-03-26	2025-05-30 22:39:11.448872	2025-05-30 22:39:11.448872	1	\N
12	f388c23e-bf57-4a68-985f-3968adbd7539	Section 12	Maximum Occupancy	12.1 The maximum number of persons who may reside in a strata lot is determined by applicable building and fire codes and municipal bylaws.	\N	12	PART 2	DUTIES OF OWNERS, TENANTS, OCCUPANTS AND VISITORS	t	2025-03-26	2025-05-30 22:39:11.451969	2025-05-30 22:39:11.451969	1	\N
13	c05777ca-c466-4541-9ad2-688494bc1d27	Section 13	Pets	13.1 An owner, tenant or occupant may keep pets in a strata lot only with the written approval of the strata corporation.\n\n13.2 All pets must be registered with the strata corporation and owners must provide proof of appropriate insurance coverage.\n\n13.3 Pets must not cause unreasonable noise or disturbance to other residents.	\N	13	PART 2	DUTIES OF OWNERS, TENANTS, OCCUPANTS AND VISITORS	t	2025-03-26	2025-05-30 22:39:11.454999	2025-05-30 22:39:11.454999	1	\N
14	3f68418d-57e9-4006-9cce-05e1d13db6af	Section 14	Repair and Maintenance of Property by Strata Corporation	14.1 The strata corporation must repair and maintain all common property and limited common property, except for limited common property that these bylaws require an owner to repair and maintain.	\N	14	PART 3	POWERS AND DUTIES OF STRATA CORPORATION	t	2025-03-26	2025-05-30 22:39:11.45799	2025-05-30 22:39:11.45799	1	\N
15	872b0fad-f3e6-4b77-8810-95fd57c210ec	Section 29	Fines	29.1 The strata corporation may fine an owner or tenant for a contravention of a bylaw or rule of the strata corporation.\n\n29.2 The amount of the fine may not exceed the maximum amount set out in the regulations under the Strata Property Act.\n\n29.3 Before imposing a fine, the strata corporation must give the owner or tenant an opportunity to be heard by the strata council.	\N	15	PART 5	ENFORCEMENT OF BYLAWS AND RULES	t	2025-03-26	2025-05-30 22:39:11.460941	2025-05-30 22:39:11.460941	1	\N
16	a7e1f805-6c29-448f-bb94-b45a37d43070	Section 30	Continuing Contravention	30.1 If a contravention of a bylaw or rule continues, the strata corporation may impose a fine for each day the contravention continues, but the total fines imposed must not exceed the maximum amount set out in the regulations under the Strata Property Act.	\N	16	PART 5	ENFORCEMENT OF BYLAWS AND RULES	t	2025-03-26	2025-05-30 22:39:11.464858	2025-05-30 22:39:11.464858	1	\N
17	0516acb8-a1a5-4424-abfe-09858da23f42	Section 41	Parking/Storage Area Lease	41.1 Parking stalls and storage areas are separate from strata lots and must be leased separately from the strata corporation.\n\n41.2 Parking stalls may only be used for parking of motor vehicles and storage areas may only be used for storage of personal property.	\N	17	PART 9	PARKING	t	2025-03-26	2025-05-30 22:39:11.468825	2025-05-30 22:39:11.468825	1	\N
18	c9c69d05-b34a-4e30-90b0-d3f132fd3ebc	Section 42	Residents Vehicles and Parking	42.1 Only residents and their authorized guests may park in the building's parking areas.\n\n42.2 All vehicles must be properly licensed and insured.\n\n42.3 Residents must not wash, repair, or service vehicles in the parking areas.	\N	18	PART 9	PARKING	t	2025-03-26	2025-05-30 22:39:11.472499	2025-05-30 22:39:11.472499	1	\N
19	24e6b23b-cc42-40ca-8f76-a1ea0dd4f74c	Section 53	Garbage Disposal / Recycling	53.1 Garbage and recycling should be disposed of properly, and exclusively in the garbage room located on P1.\n\n53.2 It is an owner's responsibility to ensure they, or their tenant(s), possess key(s) for the garbage room located on P1.\n\n53.3 Any materials, other than household refuse, must be disposed of off site at his or her expense. All expenses incurred by the Strata to remove, dispose and or recycle such refuse, will be immediately charged to the Strata lot Owner. Contravention of this bylaw will result in an Immediate $100 fine charged to the Owner of the Strata lot.\n\n53.4 No Mattresses, furniture, appliances, humidifiers, air conditioners, construction related wood, pipes, sinks, toilet items, fixtures, cupboards, suitcases, or any large items (Maximum size limited to 18" height x 20"width) are to be disposed of in the recycle room / garbage room or on common property. These items must be disposed of off site at his / her expense. All expenses incurred by the Strata to remove, dispose and or recycle such refuse, will be immediately charged to the Strata Lot Owner. Contravention of this bylaw will result in an Immediate $100 fine charged to the Owner of the Strata lot.	\N	19	PART 14	GARBAGE / RECYCLING	t	2025-03-26	2025-05-30 22:39:11.475943	2025-05-30 22:39:11.475943	1	\N
\.


--
-- Data for Name: communication_campaigns; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.communication_campaigns (id, uuid, title, type, status, subject, content, plain_text_content, scheduled_at, sent_at, created_by_id, created_at, updated_at) FROM stdin;
5	17c5bc3a-aec1-4a06-adbe-7bad84e4d88a	asda	newsletter	draft	asdasd	asdasdasd	\N	\N	\N	1	2025-06-05 22:04:06.785437	2025-06-05 22:04:06.785437
\.


--
-- Data for Name: communication_recipients; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.communication_recipients (id, campaign_id, recipient_type, unit_id, person_id, email, recipient_name, status, sent_at, error_message, created_at, tracking_id) FROM stdin;
3	5	units	23	36	karen.thomas105@shaw.ca	Karen Thomas	pending	\N	\N	2025-06-05 22:04:06.797004	31a42d65c3ddca78c823c65072cdd6cc
4	5	units	23	37	dorothy.king588@hotmail.com	Dorothy King	pending	\N	\N	2025-06-05 22:04:06.797004	8ec083fee5c40cfde8e7dc455d6396b3
5	5	units	69	119	kimberly.thomas646@yahoo.com	Kimberly Thomas	pending	\N	\N	2025-06-05 22:04:06.797004	4a9f980a4e85cf58d256abc10e3a8501
\.


--
-- Data for Name: communication_templates; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.communication_templates (id, uuid, name, type, subject, content, is_default, created_by_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.customers (id, uuid, unit_number, floor, owner_name, owner_email, tenant_name, tenant_email, phone, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: email_deduplication_log; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.email_deduplication_log (id, recipient_email, email_type, content_hash, original_idempotency_key, duplicate_idempotency_key, prevented_at, metadata) FROM stdin;
\.


--
-- Data for Name: email_idempotency_keys; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.email_idempotency_keys (id, idempotency_key, email_type, recipient_email, email_hash, status, sent_at, metadata, expires_at, created_at) FROM stdin;
1	f71db3837c8591d4cf42b52c0f7c1280	violation_notification		2654dc590cf0d788c72ca6e689fecf4b	failed	\N	{"unitId": 1, "unitNumber": "1105", "violationId": 2, "recipientType": "owner", "recipientEmail": ""}	2025-06-02 16:59:09.902	2025-06-01 16:59:09.903532
2	7da634b36e309f3b28728f099b555381	violation_approved		f59092065aee7b2c171f4e37db307124	failed	\N	{"unitId": 1, "fineAmount": 1000, "unitNumber": "1105", "violationId": "2", "recipientType": "owner", "recipientEmail": ""}	2025-06-02 16:59:49.724	2025-06-01 16:59:49.724853
3	173e6c94dc3799d97ad5325a9f132a73	violation_notification	danielcook111@gmail.com	cf6e1e960faba2207a8c708851842cc2	sent	2025-06-05 16:02:45.015	{"unitId": 350, "personId": 1, "unitNumber": "1105", "violationId": 4, "recipientType": "owner", "recipientEmail": "danielcook111@gmail.com"}	2025-06-06 16:02:40.787	2025-06-05 16:02:40.789086
4	violation-b3b9a66d-e702-47a2-b17a-6c17a3e9efd7-pending-approval-admin-1	system	tester@test.com	0990d9595c57f82b55a017eacbb23822	sent	2025-06-05 16:03:11.903	{"adminUserId": 1, "violationId": 4, "recipientType": "admin/council", "violationUuid": "b3b9a66d-e702-47a2-b17a-6c17a3e9efd7"}	2025-06-06 16:02:45.032	2025-06-05 16:02:45.033674
5	violation-b3b9a66d-e702-47a2-b17a-6c17a3e9efd7-pending-approval-admin-4	system	danielcook111@gmail.com	13a6787cd125c3cc15af683ca34d7df1	sent	2025-06-05 16:03:13.067	{"adminUserId": 4, "violationId": 4, "recipientType": "admin/council", "violationUuid": "b3b9a66d-e702-47a2-b17a-6c17a3e9efd7"}	2025-06-06 16:03:11.916	2025-06-05 16:03:11.917989
6	0bf17b378044d0e0300a14efa235070b	violation_notification	danielcook111@gmail.com	c8dfdd8f428963ae22dff7efb9fd17ea	sent	2025-06-05 16:18:15.494	{"unitId": 350, "personId": 1, "unitNumber": "1105", "violationId": 5, "recipientType": "owner", "recipientEmail": "danielcook111@gmail.com"}	2025-06-06 16:18:14.021	2025-06-05 16:18:14.022352
7	violation-2797c710-364f-4e3d-83ef-46f11263abe8-pending-approval-admin-4	system	danielcook111@gmail.com	9678399f310ce70ec264b2a05b4a1b9a	sent	2025-06-05 16:18:15.843	{"adminUserId": 4, "violationId": 5, "recipientType": "admin/council", "violationUuid": "2797c710-364f-4e3d-83ef-46f11263abe8"}	2025-06-06 16:18:15.516	2025-06-05 16:18:15.51768
8	violation-2797c710-364f-4e3d-83ef-46f11263abe8-pending-approval-admin-1	system	tester@test.com	41aa27a647cc39f245a217395fa3259f	sent	2025-06-05 16:18:21.104	{"adminUserId": 1, "violationId": 5, "recipientType": "admin/council", "violationUuid": "2797c710-364f-4e3d-83ef-46f11263abe8"}	2025-06-06 16:18:15.517	2025-06-05 16:18:15.518764
9	89d3c3650500c06907b17b8190ae7d18	violation_notification	danielcook111@gmail.com	87e27a014a5f8c9bd95483cf46e92db6	sent	2025-06-05 18:13:43.632	{"unitId": 350, "personId": 1, "unitNumber": "1105", "violationId": 6, "recipientType": "owner", "recipientEmail": "danielcook111@gmail.com"}	2025-06-06 18:13:42.944	2025-06-05 18:13:42.946155
11	violation-9c62c8e6-976f-40c1-85ed-cc75e96de416-pending-approval-admin-4	system	danielcook111@gmail.com	a097565e6c487fac8efe2d293cf4ced8	sent	2025-06-05 18:13:44.492	{"adminUserId": 4, "violationId": 6, "recipientType": "admin/council", "violationUuid": "9c62c8e6-976f-40c1-85ed-cc75e96de416"}	2025-06-06 18:13:43.653	2025-06-05 18:13:43.654402
10	violation-9c62c8e6-976f-40c1-85ed-cc75e96de416-pending-approval-admin-1	system	tester@test.com	dc759afaab399b2f2ebb3a6c812b7a90	sent	2025-06-05 18:13:48.076	{"adminUserId": 1, "violationId": 6, "recipientType": "admin/council", "violationUuid": "9c62c8e6-976f-40c1-85ed-cc75e96de416"}	2025-06-06 18:13:43.652	2025-06-05 18:13:43.653496
12	6e65257439a8dd99c56b6828cda55b19	violation_notification	danielcook111@gmail.com	9ffc31bbc9e77150c1c845625dc30cd0	sent	2025-06-05 18:38:14.379	{"unitId": 350, "personId": 1, "unitNumber": "1105", "violationId": 7, "recipientType": "owner", "recipientEmail": "danielcook111@gmail.com"}	2025-06-06 18:38:12.368	2025-06-05 18:38:12.370291
13	violation-f8bbfb4b-b7e6-43bb-b4ea-9a421f845d45-pending-approval-admin-4	system	danielcook111@gmail.com	1d703a371e7760f98f04f0e097c01bd6	sent	2025-06-05 18:38:14.612	{"adminUserId": 4, "violationId": 7, "recipientType": "admin/council", "violationUuid": "f8bbfb4b-b7e6-43bb-b4ea-9a421f845d45"}	2025-06-06 18:38:14.394	2025-06-05 18:38:14.396028
14	violation-f8bbfb4b-b7e6-43bb-b4ea-9a421f845d45-pending-approval-admin-1	system	tester@test.com	d007ff2f0dda0e6154060487fa095e48	sent	2025-06-05 18:38:18.536	{"adminUserId": 1, "violationId": 7, "recipientType": "admin/council", "violationUuid": "f8bbfb4b-b7e6-43bb-b4ea-9a421f845d45"}	2025-06-06 18:38:14.396	2025-06-05 18:38:14.397213
\.


--
-- Data for Name: email_send_attempts; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.email_send_attempts (id, idempotency_key, attempt_number, status, error_message, attempted_at, completed_at) FROM stdin;
1	f71db3837c8591d4cf42b52c0f7c1280	1	failed	Email service returned false	2025-06-01 16:59:09.912683	2025-06-01 16:59:12.62
2	7da634b36e309f3b28728f099b555381	1	failed	Email service returned false	2025-06-01 16:59:49.730031	2025-06-01 16:59:52.891
3	173e6c94dc3799d97ad5325a9f132a73	1	sent	\N	2025-06-05 16:02:40.795375	2025-06-05 16:02:45.015
4	violation-b3b9a66d-e702-47a2-b17a-6c17a3e9efd7-pending-approval-admin-1	1	sent	\N	2025-06-05 16:02:45.040384	2025-06-05 16:03:11.904
5	violation-b3b9a66d-e702-47a2-b17a-6c17a3e9efd7-pending-approval-admin-4	1	sent	\N	2025-06-05 16:03:11.923558	2025-06-05 16:03:13.068
6	0bf17b378044d0e0300a14efa235070b	1	sent	\N	2025-06-05 16:18:14.02775	2025-06-05 16:18:15.495
7	violation-2797c710-364f-4e3d-83ef-46f11263abe8-pending-approval-admin-4	1	sent	\N	2025-06-05 16:18:15.526036	2025-06-05 16:18:15.844
8	violation-2797c710-364f-4e3d-83ef-46f11263abe8-pending-approval-admin-1	1	sent	\N	2025-06-05 16:18:15.527325	2025-06-05 16:18:21.104
9	89d3c3650500c06907b17b8190ae7d18	1	sent	\N	2025-06-05 18:13:42.95308	2025-06-05 18:13:43.632
11	violation-9c62c8e6-976f-40c1-85ed-cc75e96de416-pending-approval-admin-4	1	sent	\N	2025-06-05 18:13:43.660794	2025-06-05 18:13:44.492
10	violation-9c62c8e6-976f-40c1-85ed-cc75e96de416-pending-approval-admin-1	1	sent	\N	2025-06-05 18:13:43.658971	2025-06-05 18:13:48.076
12	6e65257439a8dd99c56b6828cda55b19	1	sent	\N	2025-06-05 18:38:12.376631	2025-06-05 18:38:14.379
13	violation-f8bbfb4b-b7e6-43bb-b4ea-9a421f845d45-pending-approval-admin-4	1	sent	\N	2025-06-05 18:38:14.401512	2025-06-05 18:38:14.612
14	violation-f8bbfb4b-b7e6-43bb-b4ea-9a421f845d45-pending-approval-admin-1	1	sent	\N	2025-06-05 18:38:14.402534	2025-06-05 18:38:18.537
\.


--
-- Data for Name: email_tracking_events; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.email_tracking_events (id, campaign_id, recipient_id, tracking_id, event_type, event_data, "timestamp", ip_address, user_agent) FROM stdin;
\.


--
-- Data for Name: email_verification_codes; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.email_verification_codes (id, person_id, violation_id, code_hash, expires_at, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: manual_email_recipients; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.manual_email_recipients (id, campaign_id, email, name, created_at) FROM stdin;
\.


--
-- Data for Name: parking_spots; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.parking_spots (id, unit_id, identifier, created_at, updated_at) FROM stdin;
7	4	P87	2025-06-04 00:59:20.843048	2025-06-04 00:59:20.843048
8	4	P135	2025-06-04 00:59:20.847583	2025-06-04 00:59:20.847583
9	5	P277	2025-06-04 00:59:20.884094	2025-06-04 00:59:20.884094
10	5	P464	2025-06-04 00:59:20.887902	2025-06-04 00:59:20.887902
11	6	P315	2025-06-04 00:59:20.924908	2025-06-04 00:59:20.924908
12	8	P376	2025-06-04 00:59:20.964407	2025-06-04 00:59:20.964407
13	8	P352	2025-06-04 00:59:20.96792	2025-06-04 00:59:20.96792
14	10	P412	2025-06-04 00:59:21.018739	2025-06-04 00:59:21.018739
15	12	P125	2025-06-04 00:59:21.063607	2025-06-04 00:59:21.063607
16	12	P28	2025-06-04 00:59:21.067157	2025-06-04 00:59:21.067157
17	15	P198	2025-06-04 00:59:21.128287	2025-06-04 00:59:21.128287
18	15	P335	2025-06-04 00:59:21.131765	2025-06-04 00:59:21.131765
19	16	P153	2025-06-04 00:59:21.166773	2025-06-04 00:59:21.166773
20	16	P12	2025-06-04 00:59:21.170146	2025-06-04 00:59:21.170146
21	17	P252	2025-06-04 00:59:21.200177	2025-06-04 00:59:21.200177
22	18	P153	2025-06-04 00:59:21.225038	2025-06-04 00:59:21.225038
23	18	P163	2025-06-04 00:59:21.228557	2025-06-04 00:59:21.228557
24	22	P452	2025-06-04 00:59:21.327588	2025-06-04 00:59:21.327588
25	24	P356	2025-06-04 00:59:21.381178	2025-06-04 00:59:21.381178
26	24	P465	2025-06-04 00:59:21.384897	2025-06-04 00:59:21.384897
27	25	P171	2025-06-04 00:59:21.400332	2025-06-04 00:59:21.400332
28	26	P57	2025-06-04 00:59:21.425773	2025-06-04 00:59:21.425773
29	26	P406	2025-06-04 00:59:21.429373	2025-06-04 00:59:21.429373
30	27	P177	2025-06-04 00:59:21.455571	2025-06-04 00:59:21.455571
31	30	P101	2025-06-04 00:59:21.542977	2025-06-04 00:59:21.542977
32	30	P106	2025-06-04 00:59:21.546593	2025-06-04 00:59:21.546593
33	31	P67	2025-06-04 00:59:21.564373	2025-06-04 00:59:21.564373
34	31	P111	2025-06-04 00:59:21.567885	2025-06-04 00:59:21.567885
35	32	P93	2025-06-04 00:59:21.599645	2025-06-04 00:59:21.599645
36	33	P260	2025-06-04 00:59:21.626417	2025-06-04 00:59:21.626417
37	33	P244	2025-06-04 00:59:21.629833	2025-06-04 00:59:21.629833
38	34	P33	2025-06-04 00:59:21.654312	2025-06-04 00:59:21.654312
39	38	P164	2025-06-04 00:59:21.737882	2025-06-04 00:59:21.737882
40	40	P72	2025-06-04 00:59:21.81226	2025-06-04 00:59:21.81226
41	43	P484	2025-06-04 00:59:21.87233	2025-06-04 00:59:21.87233
42	44	P171	2025-06-04 00:59:21.898653	2025-06-04 00:59:21.898653
43	46	P366	2025-06-04 00:59:21.930108	2025-06-04 00:59:21.930108
44	48	P203	2025-06-04 00:59:21.965926	2025-06-04 00:59:21.965926
45	49	P84	2025-06-04 00:59:21.989495	2025-06-04 00:59:21.989495
46	49	P182	2025-06-04 00:59:21.992618	2025-06-04 00:59:21.992618
47	53	P105	2025-06-04 00:59:22.080314	2025-06-04 00:59:22.080314
48	53	P291	2025-06-04 00:59:22.083041	2025-06-04 00:59:22.083041
49	54	P471	2025-06-04 00:59:22.101448	2025-06-04 00:59:22.101448
50	54	P120	2025-06-04 00:59:22.103341	2025-06-04 00:59:22.103341
51	55	P393	2025-06-04 00:59:22.126033	2025-06-04 00:59:22.126033
52	56	P178	2025-06-04 00:59:22.148197	2025-06-04 00:59:22.148197
53	57	P304	2025-06-04 00:59:22.168429	2025-06-04 00:59:22.168429
54	57	P249	2025-06-04 00:59:22.170309	2025-06-04 00:59:22.170309
55	58	P187	2025-06-04 00:59:22.192152	2025-06-04 00:59:22.192152
56	58	P176	2025-06-04 00:59:22.19506	2025-06-04 00:59:22.19506
57	64	P195	2025-06-04 00:59:22.326898	2025-06-04 00:59:22.326898
58	65	P308	2025-06-04 00:59:22.353358	2025-06-04 00:59:22.353358
59	66	P162	2025-06-04 00:59:22.384453	2025-06-04 00:59:22.384453
60	66	P354	2025-06-04 00:59:22.387819	2025-06-04 00:59:22.387819
61	67	P312	2025-06-04 00:59:22.41693	2025-06-04 00:59:22.41693
62	67	P3	2025-06-04 00:59:22.42035	2025-06-04 00:59:22.42035
63	69	P306	2025-06-04 00:59:22.44703	2025-06-04 00:59:22.44703
64	69	P104	2025-06-04 00:59:22.450312	2025-06-04 00:59:22.450312
65	70	P419	2025-06-04 00:59:22.479067	2025-06-04 00:59:22.479067
66	71	P226	2025-06-04 00:59:22.503179	2025-06-04 00:59:22.503179
67	73	P485	2025-06-04 00:59:22.54296	2025-06-04 00:59:22.54296
68	74	P413	2025-06-04 00:59:22.568953	2025-06-04 00:59:22.568953
69	74	P217	2025-06-04 00:59:22.572511	2025-06-04 00:59:22.572511
70	76	P284	2025-06-04 00:59:22.614522	2025-06-04 00:59:22.614522
71	76	P373	2025-06-04 00:59:22.617895	2025-06-04 00:59:22.617895
72	77	P133	2025-06-04 00:59:22.640549	2025-06-04 00:59:22.640549
73	77	P219	2025-06-04 00:59:22.643856	2025-06-04 00:59:22.643856
74	78	P158	2025-06-04 00:59:22.666602	2025-06-04 00:59:22.666602
75	78	P375	2025-06-04 00:59:22.669902	2025-06-04 00:59:22.669902
76	80	P33	2025-06-04 00:59:22.720095	2025-06-04 00:59:22.720095
77	81	P434	2025-06-04 00:59:22.738841	2025-06-04 00:59:22.738841
78	83	P203	2025-06-04 00:59:22.779931	2025-06-04 00:59:22.779931
79	85	P73	2025-06-04 00:59:22.822634	2025-06-04 00:59:22.822634
80	86	P494	2025-06-04 00:59:22.854347	2025-06-04 00:59:22.854347
81	87	P133	2025-06-04 00:59:22.875781	2025-06-04 00:59:22.875781
82	88	P410	2025-06-04 00:59:22.898871	2025-06-04 00:59:22.898871
83	88	P330	2025-06-04 00:59:22.902276	2025-06-04 00:59:22.902276
84	92	P87	2025-06-04 00:59:22.998507	2025-06-04 00:59:22.998507
85	93	P129	2025-06-04 00:59:23.020961	2025-06-04 00:59:23.020961
86	94	P423	2025-06-04 00:59:23.043399	2025-06-04 00:59:23.043399
87	94	P489	2025-06-04 00:59:23.046832	2025-06-04 00:59:23.046832
88	99	P29	2025-06-04 00:59:23.149533	2025-06-04 00:59:23.149533
89	99	P361	2025-06-04 00:59:23.152817	2025-06-04 00:59:23.152817
90	102	P495	2025-06-04 00:59:23.21817	2025-06-04 00:59:23.21817
91	104	P474	2025-06-04 00:59:23.261965	2025-06-04 00:59:23.261965
92	104	P234	2025-06-04 00:59:23.265192	2025-06-04 00:59:23.265192
93	105	P485	2025-06-04 00:59:23.279749	2025-06-04 00:59:23.279749
94	111	P237	2025-06-04 00:59:23.39576	2025-06-04 00:59:23.39576
95	113	P225	2025-06-04 00:59:23.425587	2025-06-04 00:59:23.425587
96	113	P292	2025-06-04 00:59:23.428688	2025-06-04 00:59:23.428688
97	114	P254	2025-06-04 00:59:23.452607	2025-06-04 00:59:23.452607
98	115	P373	2025-06-04 00:59:23.468016	2025-06-04 00:59:23.468016
99	117	P132	2025-06-04 00:59:23.509617	2025-06-04 00:59:23.509617
100	118	P405	2025-06-04 00:59:23.530939	2025-06-04 00:59:23.530939
101	119	P120	2025-06-04 00:59:23.558831	2025-06-04 00:59:23.558831
102	122	P320	2025-06-04 00:59:23.633148	2025-06-04 00:59:23.633148
103	122	P257	2025-06-04 00:59:23.636542	2025-06-04 00:59:23.636542
104	130	P219	2025-06-04 00:59:23.772999	2025-06-04 00:59:23.772999
105	131	P110	2025-06-04 00:59:23.791622	2025-06-04 00:59:23.791622
106	131	P182	2025-06-04 00:59:23.794868	2025-06-04 00:59:23.794868
107	132	P258	2025-06-04 00:59:23.816953	2025-06-04 00:59:23.816953
108	133	P409	2025-06-04 00:59:23.832551	2025-06-04 00:59:23.832551
109	134	P100	2025-06-04 00:59:23.854781	2025-06-04 00:59:23.854781
110	136	P341	2025-06-04 00:59:23.904766	2025-06-04 00:59:23.904766
111	137	P286	2025-06-04 00:59:23.935219	2025-06-04 00:59:23.935219
112	139	P44	2025-06-04 00:59:23.980382	2025-06-04 00:59:23.980382
113	142	P322	2025-06-04 00:59:24.042771	2025-06-04 00:59:24.042771
114	143	P27	2025-06-04 00:59:24.064091	2025-06-04 00:59:24.064091
115	143	P216	2025-06-04 00:59:24.068007	2025-06-04 00:59:24.068007
116	144	P464	2025-06-04 00:59:24.090437	2025-06-04 00:59:24.090437
117	144	P468	2025-06-04 00:59:24.093751	2025-06-04 00:59:24.093751
118	145	P390	2025-06-04 00:59:24.113576	2025-06-04 00:59:24.113576
119	146	P109	2025-06-04 00:59:24.140381	2025-06-04 00:59:24.140381
120	146	P454	2025-06-04 00:59:24.143555	2025-06-04 00:59:24.143555
121	147	P313	2025-06-04 00:59:24.171479	2025-06-04 00:59:24.171479
122	147	P46	2025-06-04 00:59:24.174849	2025-06-04 00:59:24.174849
123	150	P106	2025-06-04 01:00:25.328823	2025-06-04 01:00:25.328823
124	150	P119	2025-06-04 01:00:25.332835	2025-06-04 01:00:25.332835
125	151	P7	2025-06-04 01:00:25.355828	2025-06-04 01:00:25.355828
126	152	P114	2025-06-04 01:00:25.384852	2025-06-04 01:00:25.384852
127	152	P214	2025-06-04 01:00:25.388785	2025-06-04 01:00:25.388785
128	153	P310	2025-06-04 01:00:25.415856	2025-06-04 01:00:25.415856
129	154	P468	2025-06-04 01:00:25.442071	2025-06-04 01:00:25.442071
130	154	P174	2025-06-04 01:00:25.445756	2025-06-04 01:00:25.445756
131	155	P151	2025-06-04 01:00:25.463893	2025-06-04 01:00:25.463893
132	156	P464	2025-06-04 01:00:25.481165	2025-06-04 01:00:25.481165
133	156	P398	2025-06-04 01:00:25.484933	2025-06-04 01:00:25.484933
134	158	P386	2025-06-04 01:00:25.542992	2025-06-04 01:00:25.542992
135	158	P368	2025-06-04 01:00:25.546537	2025-06-04 01:00:25.546537
136	160	P106	2025-06-04 01:00:25.599673	2025-06-04 01:00:25.599673
137	160	P185	2025-06-04 01:00:25.603794	2025-06-04 01:00:25.603794
138	161	P498	2025-06-04 01:00:25.628092	2025-06-04 01:00:25.628092
139	161	P466	2025-06-04 01:00:25.631605	2025-06-04 01:00:25.631605
140	162	P459	2025-06-04 01:00:25.658908	2025-06-04 01:00:25.658908
141	164	P257	2025-06-04 01:00:25.712787	2025-06-04 01:00:25.712787
142	165	P244	2025-06-04 01:00:25.7369	2025-06-04 01:00:25.7369
143	165	P280	2025-06-04 01:00:25.740386	2025-06-04 01:00:25.740386
144	168	P352	2025-06-04 01:00:25.798935	2025-06-04 01:00:25.798935
145	168	P234	2025-06-04 01:00:25.802752	2025-06-04 01:00:25.802752
146	170	P154	2025-06-04 01:00:25.845164	2025-06-04 01:00:25.845164
147	171	P40	2025-06-04 01:00:25.863	2025-06-04 01:00:25.863
148	173	P255	2025-06-04 01:00:25.904648	2025-06-04 01:00:25.904648
149	173	P452	2025-06-04 01:00:25.908031	2025-06-04 01:00:25.908031
150	174	P31	2025-06-04 01:00:25.939893	2025-06-04 01:00:25.939893
151	176	P281	2025-06-04 01:00:25.985698	2025-06-04 01:00:25.985698
152	176	P312	2025-06-04 01:00:25.989064	2025-06-04 01:00:25.989064
153	179	P245	2025-06-04 01:00:26.055872	2025-06-04 01:00:26.055872
154	184	P238	2025-06-04 01:00:26.175092	2025-06-04 01:00:26.175092
155	186	P288	2025-06-04 01:00:26.21242	2025-06-04 01:00:26.21242
156	188	P218	2025-06-04 01:00:26.26158	2025-06-04 01:00:26.26158
157	189	P339	2025-06-04 01:00:26.284624	2025-06-04 01:00:26.284624
158	189	P105	2025-06-04 01:00:26.28823	2025-06-04 01:00:26.28823
159	191	P211	2025-06-04 01:00:26.3401	2025-06-04 01:00:26.3401
160	191	P401	2025-06-04 01:00:26.343762	2025-06-04 01:00:26.343762
161	192	P216	2025-06-04 01:00:26.368383	2025-06-04 01:00:26.368383
162	192	P191	2025-06-04 01:00:26.371594	2025-06-04 01:00:26.371594
163	194	P186	2025-06-04 01:00:26.411329	2025-06-04 01:00:26.411329
164	199	P325	2025-06-04 01:00:26.514772	2025-06-04 01:00:26.514772
165	199	P279	2025-06-04 01:00:26.518333	2025-06-04 01:00:26.518333
166	200	P72	2025-06-04 01:00:26.542396	2025-06-04 01:00:26.542396
167	201	P496	2025-06-04 01:00:26.564544	2025-06-04 01:00:26.564544
168	205	P6	2025-06-04 01:00:26.652405	2025-06-04 01:00:26.652405
169	205	P137	2025-06-04 01:00:26.655926	2025-06-04 01:00:26.655926
170	206	P436	2025-06-04 01:00:26.68399	2025-06-04 01:00:26.68399
171	207	P366	2025-06-04 01:00:26.704363	2025-06-04 01:00:26.704363
172	208	P479	2025-06-04 01:00:26.728824	2025-06-04 01:00:26.728824
173	210	P353	2025-06-04 01:00:26.768075	2025-06-04 01:00:26.768075
174	210	P267	2025-06-04 01:00:26.771659	2025-06-04 01:00:26.771659
175	211	P29	2025-06-04 01:00:26.786806	2025-06-04 01:00:26.786806
176	213	P96	2025-06-04 01:00:26.835958	2025-06-04 01:00:26.835958
177	213	P296	2025-06-04 01:00:26.839807	2025-06-04 01:00:26.839807
178	214	P318	2025-06-04 01:00:26.855969	2025-06-04 01:00:26.855969
179	215	P148	2025-06-04 01:00:26.883468	2025-06-04 01:00:26.883468
180	215	P133	2025-06-04 01:00:26.887009	2025-06-04 01:00:26.887009
181	216	P51	2025-06-04 01:00:26.918706	2025-06-04 01:00:26.918706
182	216	P102	2025-06-04 01:00:26.922111	2025-06-04 01:00:26.922111
183	217	P450	2025-06-04 01:00:26.948942	2025-06-04 01:00:26.948942
184	222	P469	2025-06-04 01:00:27.057431	2025-06-04 01:00:27.057431
185	223	P218	2025-06-04 01:00:27.077682	2025-06-04 01:00:27.077682
186	224	P424	2025-06-04 01:00:27.10118	2025-06-04 01:00:27.10118
187	224	P367	2025-06-04 01:00:27.104035	2025-06-04 01:00:27.104035
188	226	P102	2025-06-04 01:00:27.15277	2025-06-04 01:00:27.15277
189	226	P198	2025-06-04 01:00:27.155749	2025-06-04 01:00:27.155749
190	229	P144	2025-06-04 01:00:27.232792	2025-06-04 01:00:27.232792
191	230	P317	2025-06-04 01:00:27.25491	2025-06-04 01:00:27.25491
192	231	P403	2025-06-04 01:00:27.285337	2025-06-04 01:00:27.285337
193	232	P425	2025-06-04 01:00:27.30733	2025-06-04 01:00:27.30733
194	232	P400	2025-06-04 01:00:27.310838	2025-06-04 01:00:27.310838
195	233	P62	2025-06-04 01:00:27.327999	2025-06-04 01:00:27.327999
196	235	P232	2025-06-04 01:00:27.390666	2025-06-04 01:00:27.390666
197	235	P5	2025-06-04 01:00:27.394522	2025-06-04 01:00:27.394522
198	236	P89	2025-06-04 01:00:27.426962	2025-06-04 01:00:27.426962
199	238	P173	2025-06-04 01:00:27.477113	2025-06-04 01:00:27.477113
200	238	P99	2025-06-04 01:00:27.481019	2025-06-04 01:00:27.481019
201	239	P282	2025-06-04 01:00:27.50574	2025-06-04 01:00:27.50574
202	240	P259	2025-06-04 01:00:27.53363	2025-06-04 01:00:27.53363
203	240	P65	2025-06-04 01:00:27.536957	2025-06-04 01:00:27.536957
204	241	P413	2025-06-04 01:00:27.55698	2025-06-04 01:00:27.55698
205	241	P20	2025-06-04 01:00:27.560601	2025-06-04 01:00:27.560601
206	242	P65	2025-06-04 01:00:27.576516	2025-06-04 01:00:27.576516
207	242	P486	2025-06-04 01:00:27.579762	2025-06-04 01:00:27.579762
208	243	P175	2025-06-04 01:00:27.602902	2025-06-04 01:00:27.602902
209	243	P347	2025-06-04 01:00:27.606287	2025-06-04 01:00:27.606287
210	247	P130	2025-06-04 01:00:27.696161	2025-06-04 01:00:27.696161
211	248	P141	2025-06-04 01:00:27.722969	2025-06-04 01:00:27.722969
212	248	P67	2025-06-04 01:00:27.726237	2025-06-04 01:00:27.726237
213	249	P15	2025-06-04 01:00:27.75363	2025-06-04 01:00:27.75363
214	250	P265	2025-06-04 01:00:27.772898	2025-06-04 01:00:27.772898
215	250	P166	2025-06-04 01:00:27.776609	2025-06-04 01:00:27.776609
216	251	P467	2025-06-04 01:00:27.805603	2025-06-04 01:00:27.805603
217	252	P199	2025-06-04 01:00:27.838382	2025-06-04 01:00:27.838382
218	252	P165	2025-06-04 01:00:27.841911	2025-06-04 01:00:27.841911
219	253	P167	2025-06-04 01:00:27.859203	2025-06-04 01:00:27.859203
220	253	P166	2025-06-04 01:00:27.862697	2025-06-04 01:00:27.862697
221	254	P235	2025-06-04 01:00:27.883211	2025-06-04 01:00:27.883211
222	255	P389	2025-06-04 01:00:27.908011	2025-06-04 01:00:27.908011
223	257	P382	2025-06-04 01:00:27.959756	2025-06-04 01:00:27.959756
224	260	P91	2025-06-04 01:00:28.026886	2025-06-04 01:00:28.026886
225	260	P390	2025-06-04 01:00:28.030338	2025-06-04 01:00:28.030338
226	261	P79	2025-06-04 01:00:28.050191	2025-06-04 01:00:28.050191
227	261	P455	2025-06-04 01:00:28.05344	2025-06-04 01:00:28.05344
228	262	P459	2025-06-04 01:00:28.073366	2025-06-04 01:00:28.073366
229	263	P132	2025-06-04 01:00:28.090474	2025-06-04 01:00:28.090474
230	264	P238	2025-06-04 01:00:28.111965	2025-06-04 01:00:28.111965
231	264	P232	2025-06-04 01:00:28.118653	2025-06-04 01:00:28.118653
232	265	P166	2025-06-04 01:00:28.150139	2025-06-04 01:00:28.150139
233	265	P208	2025-06-04 01:00:28.153898	2025-06-04 01:00:28.153898
234	266	P230	2025-06-04 01:00:28.173926	2025-06-04 01:00:28.173926
235	266	P417	2025-06-04 01:00:28.177371	2025-06-04 01:00:28.177371
236	267	P232	2025-06-04 01:00:28.205388	2025-06-04 01:00:28.205388
237	267	P354	2025-06-04 01:00:28.20896	2025-06-04 01:00:28.20896
238	268	P102	2025-06-04 01:00:28.231999	2025-06-04 01:00:28.231999
239	269	P410	2025-06-04 01:00:28.260385	2025-06-04 01:00:28.260385
240	270	P405	2025-06-04 01:00:28.289374	2025-06-04 01:00:28.289374
241	271	P209	2025-06-04 01:00:28.314991	2025-06-04 01:00:28.314991
242	271	P129	2025-06-04 01:00:28.318398	2025-06-04 01:00:28.318398
243	272	P39	2025-06-04 01:00:28.33947	2025-06-04 01:00:28.33947
244	273	P209	2025-06-04 01:00:28.362656	2025-06-04 01:00:28.362656
245	277	P279	2025-06-04 01:00:28.42895	2025-06-04 01:00:28.42895
246	278	P115	2025-06-04 01:00:28.447078	2025-06-04 01:00:28.447078
247	278	P360	2025-06-04 01:00:28.448977	2025-06-04 01:00:28.448977
248	282	P390	2025-06-04 01:00:28.510403	2025-06-04 01:00:28.510403
249	282	P435	2025-06-04 01:00:28.512887	2025-06-04 01:00:28.512887
250	283	P381	2025-06-04 01:00:28.53043	2025-06-04 01:00:28.53043
251	283	P192	2025-06-04 01:00:28.533033	2025-06-04 01:00:28.533033
252	287	P455	2025-06-04 01:00:28.608213	2025-06-04 01:00:28.608213
253	288	P384	2025-06-04 01:00:28.638325	2025-06-04 01:00:28.638325
254	289	P28	2025-06-04 01:00:28.657032	2025-06-04 01:00:28.657032
255	291	P131	2025-06-04 01:00:28.690329	2025-06-04 01:00:28.690329
256	291	P90	2025-06-04 01:00:28.693076	2025-06-04 01:00:28.693076
257	292	P471	2025-06-04 01:00:28.716749	2025-06-04 01:00:28.716749
258	292	P298	2025-06-04 01:00:28.719449	2025-06-04 01:00:28.719449
259	293	P485	2025-06-04 01:00:28.732668	2025-06-04 01:00:28.732668
260	295	P469	2025-06-04 01:00:28.767862	2025-06-04 01:00:28.767862
261	296	P463	2025-06-04 01:00:28.788731	2025-06-04 01:00:28.788731
262	297	P203	2025-06-04 01:00:28.803805	2025-06-04 01:00:28.803805
263	300	P30	2025-06-04 01:00:28.854417	2025-06-04 01:00:28.854417
264	300	P288	2025-06-04 01:00:28.857166	2025-06-04 01:00:28.857166
265	302	P80	2025-06-04 01:00:28.896859	2025-06-04 01:00:28.896859
266	302	P356	2025-06-04 01:00:28.899402	2025-06-04 01:00:28.899402
267	304	P457	2025-06-04 01:00:28.935559	2025-06-04 01:00:28.935559
268	304	P297	2025-06-04 01:00:28.937831	2025-06-04 01:00:28.937831
269	305	P128	2025-06-04 01:00:28.95705	2025-06-04 01:00:28.95705
270	305	P392	2025-06-04 01:00:28.959356	2025-06-04 01:00:28.959356
271	306	P362	2025-06-04 01:00:28.981032	2025-06-04 01:00:28.981032
272	306	P460	2025-06-04 01:00:28.983541	2025-06-04 01:00:28.983541
273	312	P397	2025-06-04 01:00:29.067621	2025-06-04 01:00:29.067621
274	314	P273	2025-06-04 01:00:29.09689	2025-06-04 01:00:29.09689
275	317	P353	2025-06-04 01:00:29.148434	2025-06-04 01:00:29.148434
276	318	P449	2025-06-04 01:00:29.16008	2025-06-04 01:00:29.16008
277	319	P155	2025-06-04 01:00:29.179922	2025-06-04 01:00:29.179922
278	320	P399	2025-06-04 01:00:29.193983	2025-06-04 01:00:29.193983
279	320	P367	2025-06-04 01:00:29.196635	2025-06-04 01:00:29.196635
280	321	P439	2025-06-04 01:00:29.208056	2025-06-04 01:00:29.208056
281	323	P396	2025-06-04 01:00:29.237417	2025-06-04 01:00:29.237417
282	326	P304	2025-06-04 01:00:29.281934	2025-06-04 01:00:29.281934
283	326	P276	2025-06-04 01:00:29.284301	2025-06-04 01:00:29.284301
284	328	P182	2025-06-04 01:00:29.310963	2025-06-04 01:00:29.310963
285	328	P19	2025-06-04 01:00:29.313367	2025-06-04 01:00:29.313367
286	329	P470	2025-06-04 01:00:29.335811	2025-06-04 01:00:29.335811
287	329	P156	2025-06-04 01:00:29.338216	2025-06-04 01:00:29.338216
288	334	P292	2025-06-04 01:00:29.431952	2025-06-04 01:00:29.431952
289	337	P475	2025-06-04 01:00:29.487256	2025-06-04 01:00:29.487256
290	339	P322	2025-06-04 01:00:29.537732	2025-06-04 01:00:29.537732
291	340	P491	2025-06-04 01:00:29.561646	2025-06-04 01:00:29.561646
292	342	P270	2025-06-04 01:00:29.61507	2025-06-04 01:00:29.61507
293	344	P367	2025-06-04 01:00:29.653968	2025-06-04 01:00:29.653968
294	344	P313	2025-06-04 01:00:29.656737	2025-06-04 01:00:29.656737
295	346	P387	2025-06-04 01:00:29.70059	2025-06-04 01:00:29.70059
\.


--
-- Data for Name: persons; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.persons (id, auth_user_id, full_name, email, phone, is_system_user, has_cat, has_dog, created_at, updated_at) FROM stdin;
2	\N	John Brown	john.brown552@gmail.com	343-392-7129	f	f	f	2025-06-04 00:59:20.83268	2025-06-04 00:59:20.83268
3	\N	Sarah Adams	sarah.adams890@gmail.com	892-741-5288	f	t	t	2025-06-04 00:59:20.861694	2025-06-04 00:59:20.861694
4	\N	Michelle Taylor	michelle.taylor530@gmail.com	806-290-1866	f	f	f	2025-06-04 00:59:20.87396	2025-06-04 00:59:20.87396
5	\N	Betty Green	betty.green359@telus.net	992-978-8670	f	f	f	2025-06-04 00:59:20.907986	2025-06-04 00:59:20.907986
6	\N	Jessica King	jessica.king223@gmail.com	281-523-6507	f	f	f	2025-06-04 00:59:20.917533	2025-06-04 00:59:20.917533
7	\N	Elizabeth Brown	elizabeth.brown962@gmail.com	375-715-2560	f	t	f	2025-06-04 00:59:20.935334	2025-06-04 00:59:20.935334
8	\N	Susan Martin	susan.martin754@outlook.com	482-228-1517	f	t	t	2025-06-04 00:59:20.948852	2025-06-04 00:59:20.948852
9	\N	Michelle Thomas	michelle.thomas33@shaw.ca	\N	f	f	f	2025-06-04 00:59:20.956772	2025-06-04 00:59:20.956772
10	\N	Brian Harris	brian.harris762@yahoo.com	486-796-5723	f	f	t	2025-06-04 00:59:20.981713	2025-06-04 00:59:20.981713
11	\N	Andrew Allen	andrew.allen94@hotmail.com	\N	f	f	f	2025-06-04 00:59:20.989407	2025-06-04 00:59:20.989407
12	\N	Jason Hernandez	jason.hernandez308@shaw.ca	976-379-3350	f	f	t	2025-06-04 00:59:21.002485	2025-06-04 00:59:21.002485
13	\N	Kevin White	kevin.white944@shaw.ca	\N	f	f	f	2025-06-04 00:59:21.010572	2025-06-04 00:59:21.010572
14	\N	Elizabeth Flores	elizabeth.flores973@gmail.com	687-633-9702	f	f	f	2025-06-04 00:59:21.029431	2025-06-04 00:59:21.029431
15	\N	Mark Jones	mark.jones969@hotmail.com	328-694-6210	f	f	t	2025-06-04 00:59:21.038131	2025-06-04 00:59:21.038131
16	\N	Elizabeth Clark	elizabeth.clark68@outlook.com	\N	f	f	t	2025-06-04 00:59:21.054734	2025-06-04 00:59:21.054734
17	\N	Susan Thomas	susan.thomas412@gmail.com	763-607-6452	f	f	f	2025-06-04 00:59:21.074992	2025-06-04 00:59:21.074992
18	\N	Richard Johnson	richard.johnson542@gmail.com	637-657-6178	f	t	f	2025-06-04 00:59:21.083017	2025-06-04 00:59:21.083017
19	\N	Christopher Martinez	christopher.martinez503@telus.net	409-206-8031	f	f	t	2025-06-04 00:59:21.09976	2025-06-04 00:59:21.09976
20	\N	William Brown	william.brown764@telus.net	946-583-2939	f	f	f	2025-06-04 00:59:21.113169	2025-06-04 00:59:21.113169
21	\N	Timothy Hall	timothy.hall61@shaw.ca	\N	f	f	f	2025-06-04 00:59:21.121099	2025-06-04 00:59:21.121099
22	\N	Christopher Gonzalez	christopher.gonzalez459@hotmail.com	968-802-9197	f	f	f	2025-06-04 00:59:21.149699	2025-06-04 00:59:21.149699
23	\N	John Thomas	john.thomas485@outlook.com	\N	f	t	t	2025-06-04 00:59:21.159103	2025-06-04 00:59:21.159103
24	\N	John White	john.white305@shaw.ca	\N	f	f	f	2025-06-04 00:59:21.182743	2025-06-04 00:59:21.182743
25	\N	Joshua Hill	joshua.hill78@telus.net	403-465-3669	f	f	f	2025-06-04 00:59:21.191463	2025-06-04 00:59:21.191463
26	\N	Jessica Baker	jessica.baker80@gmail.com	\N	f	f	f	2025-06-04 00:59:21.20966	2025-06-04 00:59:21.20966
27	\N	Elizabeth Robinson	elizabeth.robinson325@hotmail.com	\N	f	f	f	2025-06-04 00:59:21.217137	2025-06-04 00:59:21.217137
28	\N	Helen Walker	helen.walker549@gmail.com	401-813-7605	f	f	f	2025-06-04 00:59:21.241449	2025-06-04 00:59:21.241449
29	\N	Paul Anderson	paul.anderson260@gmail.com	694-635-2585	f	f	t	2025-06-04 00:59:21.24903	2025-06-04 00:59:21.24903
30	\N	Anthony Baker	anthony.baker787@telus.net	629-593-7620	f	f	t	2025-06-04 00:59:21.266849	2025-06-04 00:59:21.266849
31	\N	Matthew Sanchez	matthew.sanchez500@yahoo.com	\N	f	f	f	2025-06-04 00:59:21.273764	2025-06-04 00:59:21.273764
32	\N	Paul Martin	paul.martin344@outlook.com	975-465-9661	f	f	f	2025-06-04 00:59:21.290067	2025-06-04 00:59:21.290067
33	\N	Betty Clark	betty.clark186@gmail.com	915-697-2028	f	f	f	2025-06-04 00:59:21.298148	2025-06-04 00:59:21.298148
34	\N	Christopher Lee	christopher.lee598@outlook.com	498-965-9909	f	f	t	2025-06-04 00:59:21.311219	2025-06-04 00:59:21.311219
35	\N	Patricia Wilson	patricia.wilson835@shaw.ca	\N	f	f	f	2025-06-04 00:59:21.319227	2025-06-04 00:59:21.319227
36	\N	Karen Thomas	karen.thomas105@shaw.ca	\N	f	f	t	2025-06-04 00:59:21.34091	2025-06-04 00:59:21.34091
37	\N	Dorothy King	dorothy.king588@hotmail.com	\N	f	f	f	2025-06-04 00:59:21.348562	2025-06-04 00:59:21.348562
38	\N	Sandra Nelson	sandra.nelson962@yahoo.com	790-621-2478	f	t	t	2025-06-04 00:59:21.365129	2025-06-04 00:59:21.365129
39	\N	Donna Smith	donna.smith520@outlook.com	\N	f	t	f	2025-06-04 00:59:21.372973	2025-06-04 00:59:21.372973
40	\N	Brian Scott	brian.scott328@yahoo.com	392-838-2406	f	f	f	2025-06-04 00:59:21.393444	2025-06-04 00:59:21.393444
41	\N	Brian Adams	brian.adams662@outlook.com	382-980-7026	f	f	f	2025-06-04 00:59:21.409416	2025-06-04 00:59:21.409416
42	\N	Anthony Martinez	anthony.martinez168@outlook.com	\N	f	f	t	2025-06-04 00:59:21.417673	2025-06-04 00:59:21.417673
43	\N	James Sanchez	james.sanchez163@outlook.com	419-647-5595	f	f	f	2025-06-04 00:59:21.438787	2025-06-04 00:59:21.438787
44	\N	John Brown	john.brown93@yahoo.com	\N	f	f	f	2025-06-04 00:59:21.447234	2025-06-04 00:59:21.447234
45	\N	Susan Sanchez	susan.sanchez659@telus.net	336-446-6916	f	f	t	2025-06-04 00:59:21.469538	2025-06-04 00:59:21.469538
46	\N	Betty Wright	betty.wright548@shaw.ca	993-494-2682	f	f	f	2025-06-04 00:59:21.479674	2025-06-04 00:59:21.479674
47	\N	Jeffrey Hill	jeffrey.hill390@shaw.ca	977-391-3134	f	f	f	2025-06-04 00:59:21.500912	2025-06-04 00:59:21.500912
48	\N	Deborah Thomas	deborah.thomas587@yahoo.com	234-696-9564	f	f	t	2025-06-04 00:59:21.509272	2025-06-04 00:59:21.509272
49	\N	James Walker	james.walker265@outlook.com	\N	f	f	f	2025-06-04 00:59:21.526539	2025-06-04 00:59:21.526539
50	\N	Mark Li	mark.li896@gmail.com	874-476-2913	f	f	f	2025-06-04 00:59:21.534879	2025-06-04 00:59:21.534879
51	\N	James Scott	james.scott810@telus.net	531-638-3987	f	f	t	2025-06-04 00:59:21.555842	2025-06-04 00:59:21.555842
52	\N	Laura Campbell	laura.campbell775@shaw.ca	546-641-5533	f	f	f	2025-06-04 00:59:21.584747	2025-06-04 00:59:21.584747
53	\N	Michael Anderson	michael.anderson869@shaw.ca	883-840-2934	f	f	t	2025-06-04 00:59:21.592201	2025-06-04 00:59:21.592201
54	\N	Jeffrey Nguyen	jeffrey.nguyen26@shaw.ca	\N	f	t	t	2025-06-04 00:59:21.611525	2025-06-04 00:59:21.611525
55	\N	Steven Wang	steven.wang655@hotmail.com	626-771-8679	f	f	t	2025-06-04 00:59:21.619658	2025-06-04 00:59:21.619658
56	\N	David Smith	david.smith292@yahoo.com	624-996-9156	f	t	t	2025-06-04 00:59:21.638656	2025-06-04 00:59:21.638656
57	\N	Michael Wilson	michael.wilson248@hotmail.com	800-802-8904	f	f	t	2025-06-04 00:59:21.646447	2025-06-04 00:59:21.646447
58	\N	Sarah Garcia	sarah.garcia470@hotmail.com	\N	f	f	f	2025-06-04 00:59:21.666685	2025-06-04 00:59:21.666685
59	\N	Steven Martin	steven.martin452@telus.net	219-405-3215	f	f	f	2025-06-04 00:59:21.675116	2025-06-04 00:59:21.675116
60	\N	Karen Li	karen.li367@shaw.ca	721-842-9865	f	f	f	2025-06-04 00:59:21.688626	2025-06-04 00:59:21.688626
61	\N	Ruth Mitchell	ruth.mitchell926@yahoo.com	782-337-9823	f	f	f	2025-06-04 00:59:21.694926	2025-06-04 00:59:21.694926
62	\N	Elizabeth Clark	elizabeth.clark471@outlook.com	439-944-6321	f	f	f	2025-06-04 00:59:21.709502	2025-06-04 00:59:21.709502
63	\N	Jeffrey Allen	jeffrey.allen817@telus.net	358-632-2606	f	f	f	2025-06-04 00:59:21.722526	2025-06-04 00:59:21.722526
64	\N	Edward White	edward.white485@yahoo.com	809-897-3697	f	f	f	2025-06-04 00:59:21.730446	2025-06-04 00:59:21.730446
65	\N	Anthony Allen	anthony.allen83@hotmail.com	988-264-4042	f	f	f	2025-06-04 00:59:21.754983	2025-06-04 00:59:21.754983
66	\N	Steven Wright	steven.wright948@outlook.com	231-601-9132	f	f	f	2025-06-04 00:59:21.762423	2025-06-04 00:59:21.762423
67	\N	Kenneth Moore	kenneth.moore820@outlook.com	806-353-5200	f	f	f	2025-06-04 00:59:21.778142	2025-06-04 00:59:21.778142
68	\N	Mary Walker	mary.walker2@gmail.com	\N	f	f	t	2025-06-04 00:59:21.786972	2025-06-04 00:59:21.786972
69	\N	Donna Miller	donna.miller424@yahoo.com	\N	f	t	f	2025-06-04 00:59:21.829697	2025-06-04 00:59:21.829697
70	\N	Sharon Allen	sharon.allen993@shaw.ca	276-638-5279	f	f	f	2025-06-04 00:59:21.842403	2025-06-04 00:59:21.842403
71	\N	Daniel Lopez	daniel.lopez317@gmail.com	338-369-9463	f	t	f	2025-06-04 00:59:21.857993	2025-06-04 00:59:21.857993
72	\N	Paul Chen	paul.chen864@telus.net	412-350-7331	f	f	f	2025-06-04 00:59:21.865724	2025-06-04 00:59:21.865724
73	\N	Carol Wilson	carol.wilson118@outlook.com	582-738-5179	f	f	f	2025-06-04 00:59:21.881441	2025-06-04 00:59:21.881441
74	\N	Charles Thompson	charles.thompson760@gmail.com	839-706-5927	f	f	t	2025-06-04 00:59:21.889931	2025-06-04 00:59:21.889931
75	\N	Anthony Ramirez	anthony.ramirez951@yahoo.com	723-488-2447	f	t	f	2025-06-04 00:59:21.909911	2025-06-04 00:59:21.909911
76	\N	Timothy Harris	timothy.harris226@yahoo.com	950-808-8782	f	f	f	2025-06-04 00:59:21.916485	2025-06-04 00:59:21.916485
77	\N	Matthew Torres	matthew.torres127@outlook.com	\N	f	f	t	2025-06-04 00:59:21.924908	2025-06-04 00:59:21.924908
78	\N	Joshua Wilson	joshua.wilson520@outlook.com	729-291-7325	f	f	t	2025-06-04 00:59:21.938839	2025-06-04 00:59:21.938839
79	\N	Deborah Perez	deborah.perez741@yahoo.com	\N	f	t	t	2025-06-04 00:59:21.944335	2025-06-04 00:59:21.944335
80	\N	George Sanchez	george.sanchez968@gmail.com	376-386-4832	f	f	f	2025-06-04 00:59:21.955554	2025-06-04 00:59:21.955554
81	\N	Jane Thomas	jane.thomas511@telus.net	371-610-9564	f	f	f	2025-06-04 00:59:21.960613	2025-06-04 00:59:21.960613
82	\N	Matthew Wilson	matthew.wilson894@shaw.ca	\N	f	f	t	2025-06-04 00:59:21.977248	2025-06-04 00:59:21.977248
83	\N	Michelle Chen	michelle.chen272@yahoo.com	546-647-8372	f	f	t	2025-06-04 00:59:21.983123	2025-06-04 00:59:21.983123
84	\N	Helen Scott	helen.scott940@hotmail.com	781-607-7830	f	t	f	2025-06-04 00:59:22.005781	2025-06-04 00:59:22.005781
85	\N	Jessica King	jessica.king848@hotmail.com	943-233-9484	f	f	t	2025-06-04 00:59:22.011479	2025-06-04 00:59:22.011479
86	\N	William Walker	william.walker784@yahoo.com	272-274-4407	f	f	t	2025-06-04 00:59:22.026788	2025-06-04 00:59:22.026788
87	\N	Michael Hernandez	michael.hernandez777@gmail.com	360-904-1942	f	f	f	2025-06-04 00:59:22.033334	2025-06-04 00:59:22.033334
88	\N	Kevin Gonzalez	kevin.gonzalez150@gmail.com	389-831-1032	f	f	f	2025-06-04 00:59:22.044481	2025-06-04 00:59:22.044481
89	\N	Sarah Nguyen	sarah.nguyen70@telus.net	481-228-3680	f	t	f	2025-06-04 00:59:22.051981	2025-06-04 00:59:22.051981
90	\N	Laura Adams	laura.adams79@telus.net	541-477-5881	f	f	f	2025-06-04 00:59:22.068341	2025-06-04 00:59:22.068341
91	\N	Kenneth Thompson	kenneth.thompson577@telus.net	748-691-7901	f	f	f	2025-06-04 00:59:22.074571	2025-06-04 00:59:22.074571
92	\N	Mark Robinson	mark.robinson300@hotmail.com	\N	f	f	f	2025-06-04 00:59:22.095524	2025-06-04 00:59:22.095524
93	\N	Steven Baker	steven.baker892@shaw.ca	237-855-2047	f	f	f	2025-06-04 00:59:22.113354	2025-06-04 00:59:22.113354
94	\N	Sarah Mitchell	sarah.mitchell479@telus.net	680-945-2786	f	f	t	2025-06-04 00:59:22.120001	2025-06-04 00:59:22.120001
95	\N	Mary Walker	mary.walker530@hotmail.com	744-996-2896	f	f	f	2025-06-04 00:59:22.135863	2025-06-04 00:59:22.135863
96	\N	Michelle Rivera	michelle.rivera396@yahoo.com	\N	f	f	f	2025-06-04 00:59:22.142241	2025-06-04 00:59:22.142241
97	\N	James Martin	james.martin725@shaw.ca	575-734-9298	f	f	f	2025-06-04 00:59:22.154967	2025-06-04 00:59:22.154967
98	\N	Helen Johnson	helen.johnson617@outlook.com	225-777-2716	f	f	f	2025-06-04 00:59:22.161542	2025-06-04 00:59:22.161542
99	\N	Karen Gonzalez	karen.gonzalez505@outlook.com	822-502-9057	f	f	f	2025-06-04 00:59:22.179685	2025-06-04 00:59:22.179685
100	\N	Barbara White	barbara.white853@outlook.com	312-495-4042	f	f	f	2025-06-04 00:59:22.186063	2025-06-04 00:59:22.186063
101	\N	Donald Thompson	donald.thompson937@outlook.com	\N	f	f	t	2025-06-04 00:59:22.205939	2025-06-04 00:59:22.205939
102	\N	Ronald Ramirez	ronald.ramirez862@shaw.ca	777-465-4784	f	t	f	2025-06-04 00:59:22.212644	2025-06-04 00:59:22.212644
103	\N	Jessica King	jessica.king742@shaw.ca	\N	f	t	t	2025-06-04 00:59:22.226905	2025-06-04 00:59:22.226905
104	\N	David Williams	david.williams838@telus.net	928-971-2748	f	f	f	2025-06-04 00:59:22.242152	2025-06-04 00:59:22.242152
105	\N	Sarah Green	sarah.green435@yahoo.com	\N	f	t	f	2025-06-04 00:59:22.249426	2025-06-04 00:59:22.249426
106	\N	Anthony Brown	anthony.brown401@yahoo.com	\N	f	f	t	2025-06-04 00:59:22.265584	2025-06-04 00:59:22.265584
107	\N	Betty Ramirez	betty.ramirez806@gmail.com	\N	f	f	t	2025-06-04 00:59:22.273316	2025-06-04 00:59:22.273316
108	\N	Michelle Johnson	michelle.johnson739@hotmail.com	770-706-3623	f	f	f	2025-06-04 00:59:22.284069	2025-06-04 00:59:22.284069
109	\N	Ronald Martin	ronald.martin646@gmail.com	714-514-4862	f	t	t	2025-06-04 00:59:22.291707	2025-06-04 00:59:22.291707
110	\N	Carol Allen	carol.allen788@yahoo.com	668-867-9203	f	f	f	2025-06-04 00:59:22.3114	2025-06-04 00:59:22.3114
111	\N	Helen Young	helen.young325@hotmail.com	537-391-1654	f	f	t	2025-06-04 00:59:22.319366	2025-06-04 00:59:22.319366
112	\N	Kevin Anderson	kevin.anderson991@outlook.com	\N	f	t	f	2025-06-04 00:59:22.339327	2025-06-04 00:59:22.339327
113	\N	Richard Gonzalez	richard.gonzalez244@shaw.ca	587-221-2092	f	f	f	2025-06-04 00:59:22.346583	2025-06-04 00:59:22.346583
114	\N	Christopher Rivera	christopher.rivera559@yahoo.com	382-238-7931	f	t	f	2025-06-04 00:59:22.369225	2025-06-04 00:59:22.369225
115	\N	Susan Thomas	susan.thomas450@outlook.com	\N	f	f	f	2025-06-04 00:59:22.3768	2025-06-04 00:59:22.3768
116	\N	William Moore	william.moore374@shaw.ca	896-255-8508	f	f	f	2025-06-04 00:59:22.403366	2025-06-04 00:59:22.403366
117	\N	Mark Baker	mark.baker547@outlook.com	900-643-9170	f	f	f	2025-06-04 00:59:22.410677	2025-06-04 00:59:22.410677
118	\N	Donald Hill	donald.hill7@yahoo.com	\N	f	f	f	2025-06-04 00:59:22.428393	2025-06-04 00:59:22.428393
119	\N	Kimberly Thomas	kimberly.thomas646@yahoo.com	507-627-1802	f	f	f	2025-06-04 00:59:22.440011	2025-06-04 00:59:22.440011
120	\N	Paul Flores	paul.flores513@outlook.com	365-283-1154	f	f	f	2025-06-04 00:59:22.464466	2025-06-04 00:59:22.464466
121	\N	Deborah Williams	deborah.williams876@shaw.ca	469-650-2766	f	f	t	2025-06-04 00:59:22.471926	2025-06-04 00:59:22.471926
122	\N	Jason Moore	jason.moore683@outlook.com	764-513-4732	f	f	t	2025-06-04 00:59:22.490137	2025-06-04 00:59:22.490137
123	\N	Karen Ramirez	karen.ramirez554@hotmail.com	\N	f	f	f	2025-06-04 00:59:22.497117	2025-06-04 00:59:22.497117
124	\N	Nancy Wright	nancy.wright427@yahoo.com	991-778-9815	f	f	t	2025-06-04 00:59:22.510895	2025-06-04 00:59:22.510895
125	\N	Jane Johnson	jane.johnson792@outlook.com	421-438-6066	f	f	f	2025-06-04 00:59:22.526971	2025-06-04 00:59:22.526971
126	\N	Dorothy Johnson	dorothy.johnson145@yahoo.com	588-956-4939	f	f	t	2025-06-04 00:59:22.535619	2025-06-04 00:59:22.535619
127	\N	Lisa Rodriguez	lisa.rodriguez883@hotmail.com	567-646-9593	f	f	f	2025-06-04 00:59:22.554492	2025-06-04 00:59:22.554492
128	\N	Mark Robinson	mark.robinson497@shaw.ca	625-560-1406	f	f	f	2025-06-04 00:59:22.562542	2025-06-04 00:59:22.562542
129	\N	Sarah Lee	sarah.lee757@outlook.com	487-863-8335	f	f	f	2025-06-04 00:59:22.584193	2025-06-04 00:59:22.584193
130	\N	Steven Thomas	steven.thomas711@gmail.com	454-719-5455	f	f	f	2025-06-04 00:59:22.599076	2025-06-04 00:59:22.599076
131	\N	Lisa Moore	lisa.moore98@telus.net	636-755-7584	f	t	t	2025-06-04 00:59:22.606355	2025-06-04 00:59:22.606355
132	\N	Matthew Walker	matthew.walker580@telus.net	\N	f	f	f	2025-06-04 00:59:22.633407	2025-06-04 00:59:22.633407
133	\N	Richard Adams	richard.adams508@yahoo.com	686-477-3368	f	t	f	2025-06-04 00:59:22.652516	2025-06-04 00:59:22.652516
134	\N	Patricia Wang	patricia.wang973@telus.net	736-506-2405	f	f	f	2025-06-04 00:59:22.659492	2025-06-04 00:59:22.659492
135	\N	Timothy Nguyen	timothy.nguyen527@gmail.com	929-496-1301	f	f	f	2025-06-04 00:59:22.681533	2025-06-04 00:59:22.681533
136	\N	Mary Scott	mary.scott467@telus.net	\N	f	f	f	2025-06-04 00:59:22.689101	2025-06-04 00:59:22.689101
137	\N	James Mitchell	james.mitchell444@telus.net	904-894-7783	f	f	f	2025-06-04 00:59:22.705003	2025-06-04 00:59:22.705003
138	\N	James Martin	james.martin964@shaw.ca	\N	f	f	t	2025-06-04 00:59:22.712721	2025-06-04 00:59:22.712721
139	\N	Michelle Jackson	michelle.jackson828@hotmail.com	772-202-6557	f	t	f	2025-06-04 00:59:22.731738	2025-06-04 00:59:22.731738
140	\N	John Thomas	john.thomas227@yahoo.com	941-609-7905	f	f	f	2025-06-04 00:59:22.74943	2025-06-04 00:59:22.74943
141	\N	Jeffrey Adams	jeffrey.adams955@outlook.com	747-485-7660	f	f	t	2025-06-04 00:59:22.764807	2025-06-04 00:59:22.764807
142	\N	Ronald Sanchez	ronald.sanchez188@telus.net	426-323-4298	f	f	f	2025-06-04 00:59:22.772626	2025-06-04 00:59:22.772626
143	\N	Christopher Rivera	christopher.rivera354@outlook.com	847-253-2472	f	f	f	2025-06-04 00:59:22.788407	2025-06-04 00:59:22.788407
144	\N	Susan Johnson	susan.johnson296@telus.net	\N	f	f	f	2025-06-04 00:59:22.796064	2025-06-04 00:59:22.796064
145	\N	George Lee	george.lee564@gmail.com	835-370-4374	f	f	t	2025-06-04 00:59:22.808356	2025-06-04 00:59:22.808356
146	\N	Betty Anderson	betty.anderson647@gmail.com	856-553-8763	f	f	f	2025-06-04 00:59:22.815358	2025-06-04 00:59:22.815358
147	\N	Steven Green	steven.green401@outlook.com	411-261-3364	f	f	f	2025-06-04 00:59:22.835818	2025-06-04 00:59:22.835818
148	\N	Christopher Thompson	christopher.thompson186@hotmail.com	873-412-1620	f	f	t	2025-06-04 00:59:22.845641	2025-06-04 00:59:22.845641
149	\N	Steven Roberts	steven.roberts843@yahoo.com	\N	f	t	f	2025-06-04 00:59:22.86734	2025-06-04 00:59:22.86734
150	\N	Sarah Garcia	sarah.garcia228@gmail.com	604-529-3286	f	f	f	2025-06-04 00:59:22.884061	2025-06-04 00:59:22.884061
151	\N	Donna Scott	donna.scott782@outlook.com	971-374-5582	f	t	f	2025-06-04 00:59:22.891797	2025-06-04 00:59:22.891797
152	\N	Jane Campbell	jane.campbell841@telus.net	\N	f	t	f	2025-06-04 00:59:22.91458	2025-06-04 00:59:22.91458
153	\N	Kenneth Campbell	kenneth.campbell759@telus.net	907-307-5452	f	f	t	2025-06-04 00:59:22.922169	2025-06-04 00:59:22.922169
154	\N	Barbara Allen	barbara.allen196@yahoo.com	758-562-8590	f	f	f	2025-06-04 00:59:22.938385	2025-06-04 00:59:22.938385
155	\N	Brian Anderson	brian.anderson882@hotmail.com	\N	f	f	f	2025-06-04 00:59:22.945986	2025-06-04 00:59:22.945986
156	\N	Jennifer Sanchez	jennifer.sanchez399@hotmail.com	259-362-5698	f	f	f	2025-06-04 00:59:22.962924	2025-06-04 00:59:22.962924
157	\N	Karen Young	karen.young167@yahoo.com	\N	f	t	f	2025-06-04 00:59:22.970898	2025-06-04 00:59:22.970898
158	\N	Ronald Martin	ronald.martin832@shaw.ca	896-328-9898	f	f	t	2025-06-04 00:59:22.989042	2025-06-04 00:59:22.989042
159	\N	Patricia Harris	patricia.harris205@telus.net	595-909-8142	f	f	t	2025-06-04 00:59:23.006527	2025-06-04 00:59:23.006527
160	\N	Susan Smith	susan.smith653@shaw.ca	663-707-3822	f	f	f	2025-06-04 00:59:23.013987	2025-06-04 00:59:23.013987
161	\N	Charles Miller	charles.miller953@gmail.com	345-978-2933	f	f	f	2025-06-04 00:59:23.029231	2025-06-04 00:59:23.029231
162	\N	Ruth Chen	ruth.chen719@hotmail.com	360-510-4321	f	f	f	2025-06-04 00:59:23.036398	2025-06-04 00:59:23.036398
163	\N	Karen King	karen.king649@hotmail.com	\N	f	t	f	2025-06-04 00:59:23.058511	2025-06-04 00:59:23.058511
164	\N	Robert Chen	robert.chen548@yahoo.com	\N	f	f	t	2025-06-04 00:59:23.064806	2025-06-04 00:59:23.064806
165	\N	John Young	john.young776@outlook.com	520-758-6762	f	f	f	2025-06-04 00:59:23.076204	2025-06-04 00:59:23.076204
166	\N	Barbara Li	barbara.li772@shaw.ca	695-306-2390	f	f	t	2025-06-04 00:59:23.08313	2025-06-04 00:59:23.08313
167	\N	Sandra Baker	sandra.baker721@hotmail.com	266-454-6835	f	f	f	2025-06-04 00:59:23.098327	2025-06-04 00:59:23.098327
168	\N	David Carter	david.carter899@shaw.ca	\N	f	f	f	2025-06-04 00:59:23.105661	2025-06-04 00:59:23.105661
169	\N	Kimberly Allen	kimberly.allen606@outlook.com	593-746-8118	f	t	f	2025-06-04 00:59:23.117827	2025-06-04 00:59:23.117827
170	\N	Robert Martin	robert.martin643@shaw.ca	666-694-4874	f	f	f	2025-06-04 00:59:23.124463	2025-06-04 00:59:23.124463
171	\N	James Nguyen	james.nguyen444@yahoo.com	315-418-8412	f	f	f	2025-06-04 00:59:23.135407	2025-06-04 00:59:23.135407
172	\N	Jennifer Jackson	jennifer.jackson193@telus.net	802-699-4356	f	f	t	2025-06-04 00:59:23.142789	2025-06-04 00:59:23.142789
173	\N	Joshua Green	joshua.green750@gmail.com	538-969-4660	f	t	f	2025-06-04 00:59:23.160677	2025-06-04 00:59:23.160677
174	\N	Dorothy Smith	dorothy.smith175@gmail.com	525-894-5692	f	f	t	2025-06-04 00:59:23.16757	2025-06-04 00:59:23.16757
175	\N	Andrew Wang	andrew.wang592@hotmail.com	555-523-3322	f	t	f	2025-06-04 00:59:23.185931	2025-06-04 00:59:23.185931
176	\N	David Mitchell	david.mitchell527@yahoo.com	559-943-9652	f	f	f	2025-06-04 00:59:23.193199	2025-06-04 00:59:23.193199
177	\N	Michelle Nguyen	michelle.nguyen476@shaw.ca	\N	f	f	f	2025-06-04 00:59:23.204383	2025-06-04 00:59:23.204383
178	\N	Brian Brown	brian.brown3@yahoo.com	302-270-4772	f	t	f	2025-06-04 00:59:23.211698	2025-06-04 00:59:23.211698
179	\N	James Miller	james.miller758@shaw.ca	469-846-3572	f	f	f	2025-06-04 00:59:23.227345	2025-06-04 00:59:23.227345
180	\N	Jennifer Lee	jennifer.lee468@yahoo.com	\N	f	f	f	2025-06-04 00:59:23.23543	2025-06-04 00:59:23.23543
181	\N	Donald Torres	donald.torres390@shaw.ca	\N	f	t	f	2025-06-04 00:59:23.250256	2025-06-04 00:59:23.250256
182	\N	Michael Lewis	michael.lewis995@telus.net	292-414-3829	f	f	f	2025-06-04 00:59:23.255814	2025-06-04 00:59:23.255814
183	\N	Deborah Roberts	deborah.roberts577@telus.net	324-362-2811	f	t	t	2025-06-04 00:59:23.273007	2025-06-04 00:59:23.273007
184	\N	Linda Williams	linda.williams391@shaw.ca	\N	f	f	t	2025-06-04 00:59:23.29122	2025-06-04 00:59:23.29122
185	\N	Elizabeth Nelson	elizabeth.nelson300@gmail.com	424-599-1580	f	t	f	2025-06-04 00:59:23.298252	2025-06-04 00:59:23.298252
186	\N	William Roberts	william.roberts956@yahoo.com	328-500-9331	f	f	t	2025-06-04 00:59:23.317344	2025-06-04 00:59:23.317344
187	\N	Linda Wilson	linda.wilson311@yahoo.com	719-348-6778	f	f	f	2025-06-04 00:59:23.326297	2025-06-04 00:59:23.326297
188	\N	Donna Green	donna.green226@telus.net	393-868-8655	f	f	t	2025-06-04 00:59:23.337223	2025-06-04 00:59:23.337223
189	\N	Kenneth Clark	kenneth.clark306@gmail.com	760-261-5292	f	f	t	2025-06-04 00:59:23.34763	2025-06-04 00:59:23.34763
190	\N	Mark Gonzalez	mark.gonzalez347@hotmail.com	302-713-5944	f	f	t	2025-06-04 00:59:23.35467	2025-06-04 00:59:23.35467
191	\N	Sharon Harris	sharon.harris584@outlook.com	416-938-7140	f	t	f	2025-06-04 00:59:23.364631	2025-06-04 00:59:23.364631
192	\N	Jane Carter	jane.carter944@outlook.com	327-527-6565	f	f	f	2025-06-04 00:59:23.371264	2025-06-04 00:59:23.371264
193	\N	David Taylor	david.taylor370@telus.net	\N	f	f	f	2025-06-04 00:59:23.381293	2025-06-04 00:59:23.381293
194	\N	William Allen	william.allen431@telus.net	562-540-4622	f	f	f	2025-06-04 00:59:23.388721	2025-06-04 00:59:23.388721
195	\N	John Thomas	john.thomas58@yahoo.com	262-988-1370	f	t	t	2025-06-04 00:59:23.407228	2025-06-04 00:59:23.407228
196	\N	James Scott	james.scott599@outlook.com	907-213-6579	f	f	f	2025-06-04 00:59:23.418337	2025-06-04 00:59:23.418337
197	\N	Daniel Scott	daniel.scott500@outlook.com	306-555-7026	f	f	f	2025-06-04 00:59:23.437373	2025-06-04 00:59:23.437373
198	\N	Jennifer Jones	jennifer.jones310@yahoo.com	\N	f	f	f	2025-06-04 00:59:23.444923	2025-06-04 00:59:23.444923
199	\N	Laura Martinez	laura.martinez917@yahoo.com	562-237-3720	f	t	t	2025-06-04 00:59:23.46077	2025-06-04 00:59:23.46077
200	\N	Robert Brown	robert.brown975@yahoo.com	\N	f	f	t	2025-06-04 00:59:23.475622	2025-06-04 00:59:23.475622
201	\N	Elizabeth Carter	elizabeth.carter606@shaw.ca	626-280-2049	f	f	t	2025-06-04 00:59:23.483458	2025-06-04 00:59:23.483458
202	\N	Sarah Johnson	sarah.johnson150@shaw.ca	\N	f	f	t	2025-06-04 00:59:23.495379	2025-06-04 00:59:23.495379
203	\N	Sarah Robinson	sarah.robinson938@outlook.com	458-996-3631	f	t	f	2025-06-04 00:59:23.502644	2025-06-04 00:59:23.502644
204	\N	George Allen	george.allen38@shaw.ca	583-833-7937	f	f	f	2025-06-04 00:59:23.517411	2025-06-04 00:59:23.517411
205	\N	Jessica Green	jessica.green692@hotmail.com	684-865-3203	f	t	f	2025-06-04 00:59:23.52399	2025-06-04 00:59:23.52399
206	\N	Kenneth Flores	kenneth.flores546@outlook.com	\N	f	f	f	2025-06-04 00:59:23.543778	2025-06-04 00:59:23.543778
207	\N	Andrew Anderson	andrew.anderson509@outlook.com	281-234-2325	f	t	f	2025-06-04 00:59:23.550445	2025-06-04 00:59:23.550445
208	\N	Patricia Li	patricia.li984@shaw.ca	680-763-5548	f	t	f	2025-06-04 00:59:23.573813	2025-06-04 00:59:23.573813
209	\N	Susan White	susan.white12@gmail.com	557-226-3972	f	f	f	2025-06-04 00:59:23.583595	2025-06-04 00:59:23.583595
210	\N	Patricia Hernandez	patricia.hernandez374@yahoo.com	989-499-8854	f	t	f	2025-06-04 00:59:23.597229	2025-06-04 00:59:23.597229
211	\N	Daniel Green	daniel.green565@gmail.com	\N	f	f	f	2025-06-04 00:59:23.60553	2025-06-04 00:59:23.60553
212	\N	Ronald Johnson	ronald.johnson949@shaw.ca	764-623-5653	f	f	f	2025-06-04 00:59:23.618042	2025-06-04 00:59:23.618042
213	\N	Sharon Wright	sharon.wright396@shaw.ca	830-912-8722	f	f	t	2025-06-04 00:59:23.625756	2025-06-04 00:59:23.625756
214	\N	Anthony Gonzalez	anthony.gonzalez80@outlook.com	\N	f	f	f	2025-06-04 00:59:23.648872	2025-06-04 00:59:23.648872
215	\N	Jessica Lewis	jessica.lewis62@telus.net	373-313-6862	f	f	f	2025-06-04 00:59:23.659839	2025-06-04 00:59:23.659839
216	\N	Betty Nguyen	betty.nguyen114@hotmail.com	843-815-4223	f	f	f	2025-06-04 00:59:23.667055	2025-06-04 00:59:23.667055
217	\N	Susan Lee	susan.lee351@telus.net	262-684-5983	f	f	f	2025-06-04 00:59:23.682465	2025-06-04 00:59:23.682465
218	\N	Jason Anderson	jason.anderson556@telus.net	610-826-6493	f	f	f	2025-06-04 00:59:23.696148	2025-06-04 00:59:23.696148
219	\N	Matthew Wang	matthew.wang100@yahoo.com	\N	f	f	f	2025-06-04 00:59:23.707951	2025-06-04 00:59:23.707951
220	\N	Kenneth Martin	kenneth.martin726@shaw.ca	877-573-4171	f	f	t	2025-06-04 00:59:23.715118	2025-06-04 00:59:23.715118
221	\N	Christopher Perez	christopher.perez366@yahoo.com	698-686-5392	f	f	f	2025-06-04 00:59:23.726442	2025-06-04 00:59:23.726442
222	\N	Mark Johnson	mark.johnson348@telus.net	991-878-6517	f	f	t	2025-06-04 00:59:23.733771	2025-06-04 00:59:23.733771
223	\N	Matthew Martinez	matthew.martinez389@outlook.com	610-353-5865	f	f	t	2025-06-04 00:59:23.754187	2025-06-04 00:59:23.754187
224	\N	Robert Wilson	robert.wilson278@gmail.com	672-354-7563	f	t	f	2025-06-04 00:59:23.765843	2025-06-04 00:59:23.765843
225	\N	Robert Lopez	robert.lopez305@outlook.com	685-275-9446	f	f	t	2025-06-04 00:59:23.784292	2025-06-04 00:59:23.784292
226	\N	Andrew Roberts	andrew.roberts571@hotmail.com	545-462-7662	f	f	f	2025-06-04 00:59:23.802877	2025-06-04 00:59:23.802877
227	\N	Steven Jackson	steven.jackson740@yahoo.com	\N	f	f	t	2025-06-04 00:59:23.810074	2025-06-04 00:59:23.810074
228	\N	Matthew Taylor	matthew.taylor521@yahoo.com	\N	f	f	f	2025-06-04 00:59:23.825367	2025-06-04 00:59:23.825367
229	\N	Helen Anderson	helen.anderson155@yahoo.com	611-968-7333	f	f	f	2025-06-04 00:59:23.839812	2025-06-04 00:59:23.839812
230	\N	Susan Lee	susan.lee643@telus.net	651-551-7855	f	f	f	2025-06-04 00:59:23.847452	2025-06-04 00:59:23.847452
231	\N	James Martin	james.martin609@hotmail.com	233-874-3730	f	f	f	2025-06-04 00:59:23.866754	2025-06-04 00:59:23.866754
232	\N	Nancy Li	nancy.li431@gmail.com	557-697-7216	f	t	t	2025-06-04 00:59:23.874135	2025-06-04 00:59:23.874135
233	\N	Susan Jackson	susan.jackson71@gmail.com	605-768-6061	f	t	t	2025-06-04 00:59:23.889731	2025-06-04 00:59:23.889731
234	\N	Kenneth White	kenneth.white992@telus.net	886-890-3934	f	f	f	2025-06-04 00:59:23.897511	2025-06-04 00:59:23.897511
235	\N	Christopher Jackson	christopher.jackson907@shaw.ca	\N	f	f	f	2025-06-04 00:59:23.920401	2025-06-04 00:59:23.920401
236	\N	Joshua Walker	joshua.walker113@outlook.com	\N	f	f	f	2025-06-04 00:59:23.9281	2025-06-04 00:59:23.9281
237	\N	William Jones	william.jones143@outlook.com	964-573-5629	f	t	t	2025-06-04 00:59:23.943378	2025-06-04 00:59:23.943378
238	\N	Deborah Torres	deborah.torres712@gmail.com	\N	f	t	f	2025-06-04 00:59:23.95086	2025-06-04 00:59:23.95086
239	\N	Daniel Campbell	daniel.campbell91@shaw.ca	\N	f	f	f	2025-06-04 00:59:23.966408	2025-06-04 00:59:23.966408
240	\N	Christopher Baker	christopher.baker944@yahoo.com	212-995-5813	f	f	t	2025-06-04 00:59:23.973992	2025-06-04 00:59:23.973992
241	\N	George Smith	george.smith496@telus.net	473-437-9642	f	f	t	2025-06-04 00:59:23.989055	2025-06-04 00:59:23.989055
242	\N	Carol Hill	carol.hill324@yahoo.com	411-766-7784	f	f	f	2025-06-04 00:59:24.005097	2025-06-04 00:59:24.005097
243	\N	Sandra Perez	sandra.perez88@hotmail.com	904-359-4823	f	f	f	2025-06-04 00:59:24.012351	2025-06-04 00:59:24.012351
244	\N	Susan Young	susan.young111@telus.net	\N	f	t	f	2025-06-04 00:59:24.028063	2025-06-04 00:59:24.028063
245	\N	Barbara Adams	barbara.adams890@outlook.com	288-334-2259	f	t	f	2025-06-04 00:59:24.035414	2025-06-04 00:59:24.035414
246	\N	John Jackson	john.jackson237@yahoo.com	\N	f	f	t	2025-06-04 00:59:24.051038	2025-06-04 00:59:24.051038
247	\N	Ronald King	ronald.king668@shaw.ca	\N	f	t	f	2025-06-04 00:59:24.057921	2025-06-04 00:59:24.057921
248	\N	Christopher Wang	christopher.wang293@yahoo.com	511-362-1644	f	f	f	2025-06-04 00:59:24.076124	2025-06-04 00:59:24.076124
249	\N	Anthony Clark	anthony.clark692@shaw.ca	954-295-6836	f	t	f	2025-06-04 00:59:24.083554	2025-06-04 00:59:24.083554
250	\N	Jennifer King	jennifer.king501@telus.net	339-248-3946	f	f	f	2025-06-04 00:59:24.105823	2025-06-04 00:59:24.105823
251	\N	Betty Moore	betty.moore419@hotmail.com	217-413-4322	f	f	f	2025-06-04 00:59:24.125451	2025-06-04 00:59:24.125451
252	\N	Jennifer Garcia	jennifer.garcia375@telus.net	\N	f	t	f	2025-06-04 00:59:24.132774	2025-06-04 00:59:24.132774
253	\N	Jennifer White	jennifer.white983@outlook.com	\N	f	f	f	2025-06-04 00:59:24.156952	2025-06-04 00:59:24.156952
254	\N	William Hernandez	william.hernandez685@shaw.ca	\N	f	f	t	2025-06-04 00:59:24.164383	2025-06-04 00:59:24.164383
255	\N	Matthew Lee	matthew.lee429@telus.net	533-422-8661	f	f	t	2025-06-04 00:59:24.183018	2025-06-04 00:59:24.183018
256	\N	Sandra Thomas	sandra.thomas765@telus.net	958-997-1132	f	f	f	2025-06-04 00:59:24.190346	2025-06-04 00:59:24.190346
257	\N	Lisa Gonzalez	lisa.gonzalez155@gmail.com	634-971-1799	f	f	f	2025-06-04 01:00:25.306238	2025-06-04 01:00:25.306238
258	\N	Jessica Anderson	jessica.anderson198@outlook.com	\N	f	f	f	2025-06-04 01:00:25.31841	2025-06-04 01:00:25.31841
259	\N	John Lee	john.lee434@yahoo.com	\N	f	t	f	2025-06-04 01:00:25.34723	2025-06-04 01:00:25.34723
260	\N	Emily Sanchez	emily.sanchez454@shaw.ca	928-899-6902	f	f	f	2025-06-04 01:00:25.367016	2025-06-04 01:00:25.367016
261	\N	George Perez	george.perez391@shaw.ca	\N	f	f	f	2025-06-04 01:00:25.376412	2025-06-04 01:00:25.376412
262	\N	Sarah Campbell	sarah.campbell257@gmail.com	935-588-1722	f	f	t	2025-06-04 01:00:25.399386	2025-06-04 01:00:25.399386
263	\N	James Martinez	james.martinez999@telus.net	675-526-9862	f	f	t	2025-06-04 01:00:25.408448	2025-06-04 01:00:25.408448
264	\N	Jennifer Torres	jennifer.torres294@shaw.ca	899-963-7879	f	t	f	2025-06-04 01:00:25.426339	2025-06-04 01:00:25.426339
265	\N	Mark Lopez	mark.lopez617@telus.net	\N	f	t	f	2025-06-04 01:00:25.434601	2025-06-04 01:00:25.434601
266	\N	Mark Lopez	mark.lopez13@shaw.ca	538-720-5967	f	f	f	2025-06-04 01:00:25.455759	2025-06-04 01:00:25.455759
267	\N	Linda Nelson	linda.nelson712@outlook.com	798-605-5258	f	t	f	2025-06-04 01:00:25.473949	2025-06-04 01:00:25.473949
268	\N	Richard Hall	richard.hall493@shaw.ca	487-970-9708	f	f	f	2025-06-04 01:00:25.500067	2025-06-04 01:00:25.500067
269	\N	Emily Taylor	emily.taylor299@gmail.com	951-994-4079	f	f	f	2025-06-04 01:00:25.526108	2025-06-04 01:00:25.526108
270	\N	Sandra Roberts	sandra.roberts198@yahoo.com	\N	f	f	f	2025-06-04 01:00:25.535697	2025-06-04 01:00:25.535697
271	\N	Lisa Sanchez	lisa.sanchez260@yahoo.com	807-327-4799	f	f	t	2025-06-04 01:00:25.558239	2025-06-04 01:00:25.558239
272	\N	Emily Taylor	emily.taylor811@outlook.com	791-866-6784	f	f	t	2025-06-04 01:00:25.5687	2025-06-04 01:00:25.5687
273	\N	Sandra Hill	sandra.hill570@hotmail.com	372-943-3315	f	t	f	2025-06-04 01:00:25.581936	2025-06-04 01:00:25.581936
274	\N	Anthony Nguyen	anthony.nguyen258@hotmail.com	652-213-7461	f	f	t	2025-06-04 01:00:25.592135	2025-06-04 01:00:25.592135
275	\N	Brian Mitchell	brian.mitchell364@hotmail.com	\N	f	f	f	2025-06-04 01:00:25.612789	2025-06-04 01:00:25.612789
276	\N	Ruth Perez	ruth.perez543@gmail.com	544-256-4801	f	f	f	2025-06-04 01:00:25.620656	2025-06-04 01:00:25.620656
277	\N	Helen Baker	helen.baker298@gmail.com	991-950-7748	f	f	t	2025-06-04 01:00:25.642333	2025-06-04 01:00:25.642333
278	\N	Sharon Smith	sharon.smith818@yahoo.com	569-690-3837	f	f	t	2025-06-04 01:00:25.650944	2025-06-04 01:00:25.650944
279	\N	Patricia Davis	patricia.davis626@gmail.com	\N	f	f	t	2025-06-04 01:00:25.675892	2025-06-04 01:00:25.675892
280	\N	Deborah Jones	deborah.jones316@hotmail.com	709-300-8799	f	f	f	2025-06-04 01:00:25.684429	2025-06-04 01:00:25.684429
281	\N	Mary Allen	mary.allen147@yahoo.com	714-933-4519	f	f	f	2025-06-04 01:00:25.697413	2025-06-04 01:00:25.697413
282	\N	Jessica Li	jessica.li253@outlook.com	685-858-4410	f	t	f	2025-06-04 01:00:25.705131	2025-06-04 01:00:25.705131
283	\N	James Walker	james.walker492@hotmail.com	545-839-6669	f	f	f	2025-06-04 01:00:25.721391	2025-06-04 01:00:25.721391
284	\N	Carol King	carol.king52@outlook.com	341-952-1347	f	f	f	2025-06-04 01:00:25.729067	2025-06-04 01:00:25.729067
285	\N	Matthew Flores	matthew.flores434@telus.net	853-705-5327	f	t	f	2025-06-04 01:00:25.754018	2025-06-04 01:00:25.754018
286	\N	Andrew Flores	andrew.flores485@yahoo.com	214-264-7735	f	f	f	2025-06-04 01:00:25.772638	2025-06-04 01:00:25.772638
287	\N	Steven Walker	steven.walker707@telus.net	859-692-5369	f	t	f	2025-06-04 01:00:25.78454	2025-06-04 01:00:25.78454
288	\N	Richard White	richard.white32@outlook.com	313-237-8797	f	f	f	2025-06-04 01:00:25.791975	2025-06-04 01:00:25.791975
289	\N	Kenneth Thomas	kenneth.thomas438@gmail.com	566-797-9837	f	f	f	2025-06-04 01:00:25.816021	2025-06-04 01:00:25.816021
290	\N	Michael Taylor	michael.taylor324@shaw.ca	317-314-7349	f	f	f	2025-06-04 01:00:25.829826	2025-06-04 01:00:25.829826
291	\N	Betty Davis	betty.davis789@outlook.com	\N	f	f	f	2025-06-04 01:00:25.837988	2025-06-04 01:00:25.837988
292	\N	Matthew Carter	matthew.carter275@outlook.com	\N	f	f	f	2025-06-04 01:00:25.851519	2025-06-04 01:00:25.851519
293	\N	Linda Smith	linda.smith723@hotmail.com	\N	f	f	t	2025-06-04 01:00:25.858087	2025-06-04 01:00:25.858087
294	\N	Richard Green	richard.green59@gmail.com	702-909-1808	f	f	f	2025-06-04 01:00:25.875771	2025-06-04 01:00:25.875771
295	\N	Anthony Hernandez	anthony.hernandez185@shaw.ca	410-794-8993	f	f	t	2025-06-04 01:00:25.888771	2025-06-04 01:00:25.888771
296	\N	Anthony Roberts	anthony.roberts166@telus.net	964-550-3762	f	f	t	2025-06-04 01:00:25.89704	2025-06-04 01:00:25.89704
297	\N	Michael Nguyen	michael.nguyen889@telus.net	\N	f	t	t	2025-06-04 01:00:25.924843	2025-06-04 01:00:25.924843
298	\N	Dorothy Smith	dorothy.smith349@yahoo.com	554-459-7254	f	t	f	2025-06-04 01:00:25.932832	2025-06-04 01:00:25.932832
299	\N	Jennifer Baker	jennifer.baker26@gmail.com	230-613-8442	f	f	f	2025-06-04 01:00:25.952811	2025-06-04 01:00:25.952811
300	\N	Sarah Gonzalez	sarah.gonzalez911@shaw.ca	405-982-6319	f	f	f	2025-06-04 01:00:25.96965	2025-06-04 01:00:25.96965
301	\N	Jane Sanchez	jane.sanchez226@yahoo.com	740-534-6033	f	t	t	2025-06-04 01:00:25.977533	2025-06-04 01:00:25.977533
302	\N	Linda Baker	linda.baker348@outlook.com	398-530-9401	f	f	f	2025-06-04 01:00:26.001892	2025-06-04 01:00:26.001892
303	\N	Sandra Martin	sandra.martin726@telus.net	495-595-4986	f	f	t	2025-06-04 01:00:26.015544	2025-06-04 01:00:26.015544
304	\N	Mary Brown	mary.brown410@telus.net	386-701-5453	f	f	f	2025-06-04 01:00:26.023185	2025-06-04 01:00:26.023185
305	\N	Jennifer Rodriguez	jennifer.rodriguez327@shaw.ca	364-795-4412	f	f	f	2025-06-04 01:00:26.039684	2025-06-04 01:00:26.039684
306	\N	Sandra Wright	sandra.wright16@telus.net	434-307-1313	f	f	t	2025-06-04 01:00:26.048021	2025-06-04 01:00:26.048021
307	\N	Timothy Green	timothy.green558@shaw.ca	675-211-8616	f	f	t	2025-06-04 01:00:26.071928	2025-06-04 01:00:26.071928
308	\N	Edward Johnson	edward.johnson772@telus.net	993-412-7935	f	f	f	2025-06-04 01:00:26.080183	2025-06-04 01:00:26.080183
309	\N	Michelle Robinson	michelle.robinson801@telus.net	513-374-2793	f	f	f	2025-06-04 01:00:26.097262	2025-06-04 01:00:26.097262
310	\N	Daniel Perez	daniel.perez644@shaw.ca	821-558-8729	f	f	f	2025-06-04 01:00:26.10534	2025-06-04 01:00:26.10534
311	\N	Jennifer Li	jennifer.li200@hotmail.com	\N	f	f	f	2025-06-04 01:00:26.117739	2025-06-04 01:00:26.117739
312	\N	Emily Davis	emily.davis475@shaw.ca	728-222-1364	f	t	f	2025-06-04 01:00:26.134923	2025-06-04 01:00:26.134923
313	\N	Karen Taylor	karen.taylor693@telus.net	445-743-4880	f	f	f	2025-06-04 01:00:26.144282	2025-06-04 01:00:26.144282
314	\N	Daniel Campbell	daniel.campbell359@shaw.ca	536-655-5003	f	f	t	2025-06-04 01:00:26.160804	2025-06-04 01:00:26.160804
315	\N	Patricia Campbell	patricia.campbell757@gmail.com	529-206-1323	f	f	f	2025-06-04 01:00:26.168415	2025-06-04 01:00:26.168415
316	\N	Mark Hernandez	mark.hernandez794@gmail.com	996-317-7514	f	f	t	2025-06-04 01:00:26.184377	2025-06-04 01:00:26.184377
317	\N	Daniel Gonzalez	daniel.gonzalez454@shaw.ca	338-660-8937	f	f	f	2025-06-04 01:00:26.192357	2025-06-04 01:00:26.192357
318	\N	Donald Garcia	donald.garcia710@hotmail.com	544-492-1470	f	f	t	2025-06-04 01:00:26.204839	2025-06-04 01:00:26.204839
319	\N	Ruth White	ruth.white935@telus.net	366-750-9708	f	t	t	2025-06-04 01:00:26.221474	2025-06-04 01:00:26.221474
320	\N	Steven White	steven.white777@hotmail.com	\N	f	f	t	2025-06-04 01:00:26.229092	2025-06-04 01:00:26.229092
321	\N	Kimberly Nelson	kimberly.nelson919@telus.net	325-479-4445	f	f	f	2025-06-04 01:00:26.246371	2025-06-04 01:00:26.246371
322	\N	Mary Martinez	mary.martinez371@telus.net	344-594-1732	f	f	f	2025-06-04 01:00:26.254351	2025-06-04 01:00:26.254351
323	\N	Donna Flores	donna.flores773@gmail.com	744-859-7705	f	f	f	2025-06-04 01:00:26.274794	2025-06-04 01:00:26.274794
324	\N	Ruth Allen	ruth.allen654@hotmail.com	942-200-5915	f	f	f	2025-06-04 01:00:26.302539	2025-06-04 01:00:26.302539
325	\N	Carol Martin	carol.martin218@outlook.com	562-526-1155	f	f	f	2025-06-04 01:00:26.311364	2025-06-04 01:00:26.311364
326	\N	Richard Roberts	richard.roberts452@yahoo.com	\N	f	f	f	2025-06-04 01:00:26.331848	2025-06-04 01:00:26.331848
327	\N	Daniel Flores	daniel.flores939@outlook.com	\N	f	f	f	2025-06-04 01:00:26.352817	2025-06-04 01:00:26.352817
328	\N	Sharon Wang	sharon.wang860@shaw.ca	520-669-3968	f	t	f	2025-06-04 01:00:26.36093	2025-06-04 01:00:26.36093
329	\N	George Walker	george.walker255@gmail.com	233-213-9230	f	f	f	2025-06-04 01:00:26.383924	2025-06-04 01:00:26.383924
330	\N	Kenneth Perez	kenneth.perez474@shaw.ca	563-445-3987	f	f	f	2025-06-04 01:00:26.396045	2025-06-04 01:00:26.396045
331	\N	Michael Johnson	michael.johnson899@shaw.ca	762-348-4573	f	f	f	2025-06-04 01:00:26.40364	2025-06-04 01:00:26.40364
332	\N	Jason Garcia	jason.garcia672@shaw.ca	367-714-7944	f	f	f	2025-06-04 01:00:26.419376	2025-06-04 01:00:26.419376
333	\N	Mary Wilson	mary.wilson64@yahoo.com	979-712-6688	f	f	t	2025-06-04 01:00:26.426329	2025-06-04 01:00:26.426329
334	\N	Linda Jones	linda.jones209@telus.net	\N	f	f	f	2025-06-04 01:00:26.447103	2025-06-04 01:00:26.447103
335	\N	Anthony Flores	anthony.flores402@gmail.com	900-630-3634	f	f	f	2025-06-04 01:00:26.455102	2025-06-04 01:00:26.455102
336	\N	Sharon Adams	sharon.adams285@hotmail.com	\N	f	f	f	2025-06-04 01:00:26.467711	2025-06-04 01:00:26.467711
337	\N	Jane Moore	jane.moore540@outlook.com	752-354-5850	f	f	t	2025-06-04 01:00:26.479851	2025-06-04 01:00:26.479851
338	\N	Jeffrey Carter	jeffrey.carter145@gmail.com	\N	f	f	f	2025-06-04 01:00:26.49938	2025-06-04 01:00:26.49938
339	\N	Ruth Clark	ruth.clark767@telus.net	\N	f	f	f	2025-06-04 01:00:26.507039	2025-06-04 01:00:26.507039
340	\N	Jessica Li	jessica.li60@telus.net	638-521-2519	f	f	f	2025-06-04 01:00:26.527241	2025-06-04 01:00:26.527241
341	\N	Jennifer Wright	jennifer.wright818@gmail.com	613-792-8417	f	f	f	2025-06-04 01:00:26.535115	2025-06-04 01:00:26.535115
342	\N	Brian Martin	brian.martin914@yahoo.com	452-594-1654	f	f	f	2025-06-04 01:00:26.556611	2025-06-04 01:00:26.556611
343	\N	Susan Miller	susan.miller476@shaw.ca	376-900-7431	f	f	f	2025-06-04 01:00:26.577569	2025-06-04 01:00:26.577569
344	\N	Carol Davis	carol.davis446@telus.net	978-991-5985	f	t	t	2025-06-04 01:00:26.584932	2025-06-04 01:00:26.584932
345	\N	Helen King	helen.king151@hotmail.com	926-239-5598	f	f	f	2025-06-04 01:00:26.599227	2025-06-04 01:00:26.599227
346	\N	Jason Mitchell	jason.mitchell457@gmail.com	290-359-4237	f	f	f	2025-06-04 01:00:26.606793	2025-06-04 01:00:26.606793
347	\N	David Lopez	david.lopez491@telus.net	393-921-5548	f	f	f	2025-06-04 01:00:26.618658	2025-06-04 01:00:26.618658
348	\N	Ruth Wilson	ruth.wilson852@shaw.ca	333-671-7993	f	t	f	2025-06-04 01:00:26.625369	2025-06-04 01:00:26.625369
349	\N	John Wang	john.wang783@yahoo.com	296-884-6069	f	f	f	2025-06-04 01:00:26.637216	2025-06-04 01:00:26.637216
350	\N	Susan Williams	susan.williams592@outlook.com	\N	f	f	f	2025-06-04 01:00:26.644728	2025-06-04 01:00:26.644728
351	\N	Jane Rodriguez	jane.rodriguez842@outlook.com	266-270-7103	f	t	f	2025-06-04 01:00:26.668386	2025-06-04 01:00:26.668386
352	\N	Emily Roberts	emily.roberts138@telus.net	338-892-6809	f	f	f	2025-06-04 01:00:26.675978	2025-06-04 01:00:26.675978
353	\N	Karen Wang	karen.wang71@telus.net	418-666-9703	f	f	f	2025-06-04 01:00:26.696656	2025-06-04 01:00:26.696656
354	\N	Barbara Hall	barbara.hall637@shaw.ca	643-289-3814	f	f	f	2025-06-04 01:00:26.713128	2025-06-04 01:00:26.713128
355	\N	Edward Harris	edward.harris42@yahoo.com	\N	f	f	f	2025-06-04 01:00:26.721157	2025-06-04 01:00:26.721157
356	\N	Jason Perez	jason.perez817@hotmail.com	972-914-6878	f	f	f	2025-06-04 01:00:26.736466	2025-06-04 01:00:26.736466
357	\N	Sharon Lopez	sharon.lopez842@shaw.ca	\N	f	f	f	2025-06-04 01:00:26.752726	2025-06-04 01:00:26.752726
358	\N	Elizabeth Carter	elizabeth.carter285@gmail.com	282-501-7096	f	f	f	2025-06-04 01:00:26.760439	2025-06-04 01:00:26.760439
359	\N	Jennifer Gonzalez	jennifer.gonzalez916@yahoo.com	968-846-3718	f	f	f	2025-06-04 01:00:26.780059	2025-06-04 01:00:26.780059
360	\N	James Rodriguez	james.rodriguez932@yahoo.com	406-458-7423	f	f	t	2025-06-04 01:00:26.795558	2025-06-04 01:00:26.795558
361	\N	Sarah Baker	sarah.baker445@telus.net	319-468-7532	f	f	f	2025-06-04 01:00:26.803581	2025-06-04 01:00:26.803581
362	\N	Matthew Flores	matthew.flores766@gmail.com	526-375-7255	f	f	f	2025-06-04 01:00:26.819721	2025-06-04 01:00:26.819721
363	\N	Timothy Mitchell	timothy.mitchell132@outlook.com	\N	f	f	t	2025-06-04 01:00:26.828357	2025-06-04 01:00:26.828357
364	\N	Charles Allen	charles.allen430@yahoo.com	893-807-3699	f	f	f	2025-06-04 01:00:26.848621	2025-06-04 01:00:26.848621
365	\N	Laura Davis	laura.davis209@telus.net	902-685-8414	f	f	t	2025-06-04 01:00:26.868053	2025-06-04 01:00:26.868053
366	\N	Jennifer Anderson	jennifer.anderson574@hotmail.com	336-802-7412	f	f	t	2025-06-04 01:00:26.87596	2025-06-04 01:00:26.87596
367	\N	Sarah Sanchez	sarah.sanchez174@gmail.com	662-998-2458	f	f	f	2025-06-04 01:00:26.903595	2025-06-04 01:00:26.903595
368	\N	Brian Sanchez	brian.sanchez404@outlook.com	850-724-2199	f	t	f	2025-06-04 01:00:26.911128	2025-06-04 01:00:26.911128
369	\N	Donna Flores	donna.flores574@outlook.com	381-484-1534	f	t	f	2025-06-04 01:00:26.933602	2025-06-04 01:00:26.933602
370	\N	Karen Young	karen.young350@shaw.ca	\N	f	f	f	2025-06-04 01:00:26.941142	2025-06-04 01:00:26.941142
371	\N	Kevin Martin	kevin.martin899@outlook.com	524-795-1957	f	f	f	2025-06-04 01:00:26.961378	2025-06-04 01:00:26.961378
372	\N	Edward Li	edward.li921@hotmail.com	\N	f	f	t	2025-06-04 01:00:26.969374	2025-06-04 01:00:26.969374
373	\N	Brian Flores	brian.flores938@yahoo.com	235-549-8069	f	f	f	2025-06-04 01:00:26.985368	2025-06-04 01:00:26.985368
374	\N	Daniel White	daniel.white376@yahoo.com	\N	f	f	f	2025-06-04 01:00:26.993082	2025-06-04 01:00:26.993082
375	\N	Kimberly Martinez	kimberly.martinez858@outlook.com	861-288-7470	f	f	t	2025-06-04 01:00:27.008673	2025-06-04 01:00:27.008673
376	\N	Barbara Jones	barbara.jones873@hotmail.com	644-960-1887	f	t	t	2025-06-04 01:00:27.020129	2025-06-04 01:00:27.020129
377	\N	Helen Roberts	helen.roberts863@shaw.ca	405-814-3495	f	f	f	2025-06-04 01:00:27.02783	2025-06-04 01:00:27.02783
378	\N	Helen Jones	helen.jones272@yahoo.com	870-678-5194	f	f	f	2025-06-04 01:00:27.042733	2025-06-04 01:00:27.042733
379	\N	Dorothy Flores	dorothy.flores50@yahoo.com	838-553-8913	f	t	f	2025-06-04 01:00:27.050781	2025-06-04 01:00:27.050781
380	\N	Nancy Mitchell	nancy.mitchell663@outlook.com	352-938-9498	f	f	f	2025-06-04 01:00:27.070356	2025-06-04 01:00:27.070356
381	\N	Daniel Rodriguez	daniel.rodriguez536@outlook.com	838-713-4150	f	f	f	2025-06-04 01:00:27.086183	2025-06-04 01:00:27.086183
382	\N	Kevin Garcia	kevin.garcia59@shaw.ca	\N	f	t	f	2025-06-04 01:00:27.093717	2025-06-04 01:00:27.093717
383	\N	Ruth Ramirez	ruth.ramirez429@yahoo.com	855-524-3192	f	f	f	2025-06-04 01:00:27.118457	2025-06-04 01:00:27.118457
384	\N	Kimberly Martinez	kimberly.martinez751@outlook.com	610-271-5965	f	t	f	2025-06-04 01:00:27.138996	2025-06-04 01:00:27.138996
385	\N	John Lopez	john.lopez148@hotmail.com	587-328-9806	f	f	f	2025-06-04 01:00:27.14637	2025-06-04 01:00:27.14637
386	\N	Andrew Perez	andrew.perez100@shaw.ca	527-708-7802	f	f	f	2025-06-04 01:00:27.167393	2025-06-04 01:00:27.167393
387	\N	Jason Adams	jason.adams783@hotmail.com	868-560-1833	f	t	t	2025-06-04 01:00:27.174961	2025-06-04 01:00:27.174961
388	\N	Charles Taylor	charles.taylor197@shaw.ca	\N	f	f	t	2025-06-04 01:00:27.191119	2025-06-04 01:00:27.191119
389	\N	Jessica Sanchez	jessica.sanchez346@outlook.com	\N	f	f	f	2025-06-04 01:00:27.198738	2025-06-04 01:00:27.198738
390	\N	Michelle Harris	michelle.harris667@shaw.ca	264-474-1311	f	t	t	2025-06-04 01:00:27.218217	2025-06-04 01:00:27.218217
391	\N	Sarah Mitchell	sarah.mitchell871@shaw.ca	306-868-8804	f	f	t	2025-06-04 01:00:27.225684	2025-06-04 01:00:27.225684
392	\N	Matthew Thomas	matthew.thomas372@hotmail.com	\N	f	f	f	2025-06-04 01:00:27.240179	2025-06-04 01:00:27.240179
393	\N	Anthony White	anthony.white934@telus.net	236-477-7188	f	f	f	2025-06-04 01:00:27.247745	2025-06-04 01:00:27.247745
394	\N	Sarah Nelson	sarah.nelson297@telus.net	627-654-6861	f	t	t	2025-06-04 01:00:27.267418	2025-06-04 01:00:27.267418
395	\N	Elizabeth Miller	elizabeth.miller342@gmail.com	\N	f	t	f	2025-06-04 01:00:27.277617	2025-06-04 01:00:27.277617
396	\N	Sharon Brown	sharon.brown262@outlook.com	\N	f	f	f	2025-06-04 01:00:27.299057	2025-06-04 01:00:27.299057
397	\N	William Baker	william.baker731@gmail.com	521-242-4478	f	f	f	2025-06-04 01:00:27.31991	2025-06-04 01:00:27.31991
398	\N	Kimberly Martinez	kimberly.martinez18@outlook.com	481-644-2022	f	f	f	2025-06-04 01:00:27.346706	2025-06-04 01:00:27.346706
399	\N	Jessica Rodriguez	jessica.rodriguez810@telus.net	\N	f	f	f	2025-06-04 01:00:27.355959	2025-06-04 01:00:27.355959
400	\N	Susan Roberts	susan.roberts511@outlook.com	488-574-2263	f	f	f	2025-06-04 01:00:27.374106	2025-06-04 01:00:27.374106
401	\N	Ruth Nguyen	ruth.nguyen981@yahoo.com	884-972-4510	f	t	f	2025-06-04 01:00:27.382535	2025-06-04 01:00:27.382535
402	\N	Carol Green	carol.green519@outlook.com	367-779-7711	f	f	f	2025-06-04 01:00:27.407977	2025-06-04 01:00:27.407977
403	\N	Richard Hernandez	richard.hernandez743@hotmail.com	\N	f	f	f	2025-06-04 01:00:27.41817	2025-06-04 01:00:27.41817
404	\N	Deborah Torres	deborah.torres907@gmail.com	217-342-8329	f	t	t	2025-06-04 01:00:27.437071	2025-06-04 01:00:27.437071
405	\N	Sarah Campbell	sarah.campbell240@hotmail.com	368-709-6937	f	t	t	2025-06-04 01:00:27.44607	2025-06-04 01:00:27.44607
406	\N	George Williams	george.williams193@outlook.com	582-206-3277	f	f	f	2025-06-04 01:00:27.458886	2025-06-04 01:00:27.458886
407	\N	Christopher King	christopher.king781@outlook.com	444-638-8615	f	f	t	2025-06-04 01:00:27.468392	2025-06-04 01:00:27.468392
408	\N	Anthony Miller	anthony.miller350@telus.net	765-645-7525	f	f	t	2025-06-04 01:00:27.489443	2025-06-04 01:00:27.489443
409	\N	Jessica Campbell	jessica.campbell217@shaw.ca	\N	f	f	f	2025-06-04 01:00:27.498037	2025-06-04 01:00:27.498037
410	\N	Linda Brown	linda.brown470@gmail.com	375-725-7652	f	f	f	2025-06-04 01:00:27.517854	2025-06-04 01:00:27.517854
411	\N	Jessica King	jessica.king806@outlook.com	\N	f	t	t	2025-06-04 01:00:27.525997	2025-06-04 01:00:27.525997
412	\N	Laura Martin	laura.martin305@yahoo.com	580-961-9284	f	t	f	2025-06-04 01:00:27.549138	2025-06-04 01:00:27.549138
413	\N	Jeffrey Wright	jeffrey.wright881@gmail.com	655-774-2486	f	f	f	2025-06-04 01:00:27.569137	2025-06-04 01:00:27.569137
414	\N	Elizabeth Sanchez	elizabeth.sanchez518@gmail.com	750-986-5525	f	f	t	2025-06-04 01:00:27.588179	2025-06-04 01:00:27.588179
415	\N	Kenneth Hill	kenneth.hill338@hotmail.com	907-298-2060	f	f	f	2025-06-04 01:00:27.59573	2025-06-04 01:00:27.59573
416	\N	Donald Taylor	donald.taylor84@gmail.com	589-554-8497	f	t	f	2025-06-04 01:00:27.615389	2025-06-04 01:00:27.615389
417	\N	Richard Carter	richard.carter623@shaw.ca	818-919-5411	f	t	f	2025-06-04 01:00:27.623035	2025-06-04 01:00:27.623035
418	\N	Brian Smith	brian.smith365@telus.net	671-413-1999	f	f	f	2025-06-04 01:00:27.638548	2025-06-04 01:00:27.638548
419	\N	Jane Baker	jane.baker384@yahoo.com	494-329-3564	f	f	f	2025-06-04 01:00:27.646042	2025-06-04 01:00:27.646042
420	\N	Joshua Gonzalez	joshua.gonzalez84@gmail.com	519-347-6315	f	t	f	2025-06-04 01:00:27.662	2025-06-04 01:00:27.662
421	\N	Susan Lee	susan.lee966@gmail.com	\N	f	f	f	2025-06-04 01:00:27.6694	2025-06-04 01:00:27.6694
422	\N	John King	john.king985@hotmail.com	382-638-3912	f	f	t	2025-06-04 01:00:27.68141	2025-06-04 01:00:27.68141
423	\N	Emily Baker	emily.baker993@hotmail.com	552-336-4095	f	f	t	2025-06-04 01:00:27.688986	2025-06-04 01:00:27.688986
424	\N	Helen Taylor	helen.taylor584@outlook.com	875-435-9869	f	f	f	2025-06-04 01:00:27.708131	2025-06-04 01:00:27.708131
425	\N	Anthony Carter	anthony.carter986@yahoo.com	229-452-9406	f	f	f	2025-06-04 01:00:27.715744	2025-06-04 01:00:27.715744
426	\N	Barbara Lee	barbara.lee654@gmail.com	583-902-6760	f	t	f	2025-06-04 01:00:27.738622	2025-06-04 01:00:27.738622
427	\N	Sarah Scott	sarah.scott507@gmail.com	\N	f	f	t	2025-06-04 01:00:27.746548	2025-06-04 01:00:27.746548
428	\N	Ruth Perez	ruth.perez683@shaw.ca	851-546-2494	f	f	f	2025-06-04 01:00:27.765383	2025-06-04 01:00:27.765383
429	\N	Kimberly Brown	kimberly.brown158@outlook.com	\N	f	f	f	2025-06-04 01:00:27.790569	2025-06-04 01:00:27.790569
430	\N	Daniel Smith	daniel.smith131@hotmail.com	291-408-4128	f	f	f	2025-06-04 01:00:27.79822	2025-06-04 01:00:27.79822
431	\N	Sandra Smith	sandra.smith736@hotmail.com	407-963-1056	f	f	f	2025-06-04 01:00:27.822105	2025-06-04 01:00:27.822105
432	\N	Edward Brown	edward.brown287@yahoo.com	406-936-4188	f	f	f	2025-06-04 01:00:27.830624	2025-06-04 01:00:27.830624
433	\N	Sharon Williams	sharon.williams58@outlook.com	\N	f	f	t	2025-06-04 01:00:27.851167	2025-06-04 01:00:27.851167
434	\N	Kevin Walker	kevin.walker297@hotmail.com	667-646-9374	f	f	f	2025-06-04 01:00:27.875374	2025-06-04 01:00:27.875374
435	\N	Paul Mitchell	paul.mitchell440@yahoo.com	\N	f	f	t	2025-06-04 01:00:27.891767	2025-06-04 01:00:27.891767
436	\N	Sharon Wright	sharon.wright677@telus.net	\N	f	f	f	2025-06-04 01:00:27.900095	2025-06-04 01:00:27.900095
437	\N	Ronald Wright	ronald.wright390@shaw.ca	\N	f	f	t	2025-06-04 01:00:27.920364	2025-06-04 01:00:27.920364
438	\N	Sandra Sanchez	sandra.sanchez927@yahoo.com	903-670-4735	f	f	t	2025-06-04 01:00:27.928873	2025-06-04 01:00:27.928873
439	\N	Jeffrey Sanchez	jeffrey.sanchez569@outlook.com	325-908-2122	f	f	t	2025-06-04 01:00:27.94182	2025-06-04 01:00:27.94182
440	\N	Christopher Campbell	christopher.campbell752@outlook.com	822-731-2171	f	t	f	2025-06-04 01:00:27.951888	2025-06-04 01:00:27.951888
441	\N	Joshua Sanchez	joshua.sanchez629@shaw.ca	205-526-3500	f	f	f	2025-06-04 01:00:27.968743	2025-06-04 01:00:27.968743
442	\N	James Williams	james.williams391@outlook.com	660-718-2378	f	f	f	2025-06-04 01:00:27.977164	2025-06-04 01:00:27.977164
443	\N	John Hall	john.hall254@yahoo.com	\N	f	f	t	2025-06-04 01:00:27.993675	2025-06-04 01:00:27.993675
444	\N	Susan Allen	susan.allen37@telus.net	936-943-6002	f	t	f	2025-06-04 01:00:28.011417	2025-06-04 01:00:28.011417
445	\N	Robert Li	robert.li368@telus.net	780-276-2904	f	t	t	2025-06-04 01:00:28.019423	2025-06-04 01:00:28.019423
446	\N	Sarah Chen	sarah.chen710@shaw.ca	969-384-6004	f	f	f	2025-06-04 01:00:28.042646	2025-06-04 01:00:28.042646
447	\N	George Harris	george.harris895@hotmail.com	766-399-3041	f	f	t	2025-06-04 01:00:28.065839	2025-06-04 01:00:28.065839
448	\N	Andrew Ramirez	andrew.ramirez532@gmail.com	965-200-9805	f	f	f	2025-06-04 01:00:28.08238	2025-06-04 01:00:28.08238
449	\N	Sharon Perez	sharon.perez647@outlook.com	218-395-6783	f	f	t	2025-06-04 01:00:28.103474	2025-06-04 01:00:28.103474
450	\N	Laura Green	laura.green549@telus.net	\N	f	f	f	2025-06-04 01:00:28.135341	2025-06-04 01:00:28.135341
451	\N	William Jackson	william.jackson943@hotmail.com	984-852-4472	f	t	f	2025-06-04 01:00:28.143714	2025-06-04 01:00:28.143714
452	\N	Ronald Walker	ronald.walker429@outlook.com	866-625-8473	f	f	f	2025-06-04 01:00:28.166431	2025-06-04 01:00:28.166431
453	\N	Carol Garcia	carol.garcia323@gmail.com	752-935-8909	f	f	t	2025-06-04 01:00:28.189695	2025-06-04 01:00:28.189695
454	\N	Robert Lee	robert.lee304@hotmail.com	336-447-9096	f	f	f	2025-06-04 01:00:28.197939	2025-06-04 01:00:28.197939
455	\N	Sharon Smith	sharon.smith954@yahoo.com	915-270-6298	f	f	f	2025-06-04 01:00:28.217517	2025-06-04 01:00:28.217517
456	\N	David Allen	david.allen412@outlook.com	264-973-7475	f	f	f	2025-06-04 01:00:28.224419	2025-06-04 01:00:28.224419
457	\N	Paul Thompson	paul.thompson186@hotmail.com	335-891-8793	f	f	f	2025-06-04 01:00:28.245081	2025-06-04 01:00:28.245081
458	\N	Richard Allen	richard.allen798@shaw.ca	\N	f	f	f	2025-06-04 01:00:28.253	2025-06-04 01:00:28.253
459	\N	Kevin Clark	kevin.clark40@gmail.com	215-809-1040	f	t	t	2025-06-04 01:00:28.273177	2025-06-04 01:00:28.273177
460	\N	Elizabeth Wang	elizabeth.wang422@hotmail.com	685-424-3069	f	f	f	2025-06-04 01:00:28.2819	2025-06-04 01:00:28.2819
461	\N	Jason Torres	jason.torres477@telus.net	457-680-3370	f	f	f	2025-06-04 01:00:28.300939	2025-06-04 01:00:28.300939
462	\N	Susan Roberts	susan.roberts632@yahoo.com	411-528-2895	f	f	f	2025-06-04 01:00:28.307839	2025-06-04 01:00:28.307839
463	\N	James Robinson	james.robinson747@hotmail.com	\N	f	f	f	2025-06-04 01:00:28.328704	2025-06-04 01:00:28.328704
464	\N	Laura Torres	laura.torres729@telus.net	\N	f	f	f	2025-06-04 01:00:28.334048	2025-06-04 01:00:28.334048
465	\N	Brian Nguyen	brian.nguyen77@hotmail.com	\N	f	f	f	2025-06-04 01:00:28.347243	2025-06-04 01:00:28.347243
466	\N	Dorothy Wilson	dorothy.wilson468@gmail.com	357-458-1319	f	f	t	2025-06-04 01:00:28.354853	2025-06-04 01:00:28.354853
467	\N	Kenneth King	kenneth.king440@yahoo.com	608-609-3086	f	f	t	2025-06-04 01:00:28.373898	2025-06-04 01:00:28.373898
468	\N	Dorothy Sanchez	dorothy.sanchez847@yahoo.com	\N	f	f	f	2025-06-04 01:00:28.380382	2025-06-04 01:00:28.380382
469	\N	Edward Perez	edward.perez877@shaw.ca	932-844-6764	f	f	t	2025-06-04 01:00:28.389599	2025-06-04 01:00:28.389599
470	\N	Deborah Harris	deborah.harris173@yahoo.com	870-803-8001	f	f	f	2025-06-04 01:00:28.395388	2025-06-04 01:00:28.395388
471	\N	Donald Baker	donald.baker694@outlook.com	\N	f	f	f	2025-06-04 01:00:28.40464	2025-06-04 01:00:28.40464
472	\N	Ronald Rivera	ronald.rivera98@telus.net	575-225-2465	f	f	f	2025-06-04 01:00:28.410422	2025-06-04 01:00:28.410422
473	\N	Linda Scott	linda.scott700@telus.net	\N	f	f	t	2025-06-04 01:00:28.423061	2025-06-04 01:00:28.423061
474	\N	Laura Wilson	laura.wilson761@shaw.ca	963-916-7364	f	t	f	2025-06-04 01:00:28.442471	2025-06-04 01:00:28.442471
475	\N	Patricia Scott	patricia.scott696@shaw.ca	393-575-5075	f	t	t	2025-06-04 01:00:28.456364	2025-06-04 01:00:28.456364
476	\N	Robert Li	robert.li520@shaw.ca	336-593-9866	f	t	f	2025-06-04 01:00:28.464381	2025-06-04 01:00:28.464381
477	\N	Michael Campbell	michael.campbell594@gmail.com	956-918-4440	f	t	f	2025-06-04 01:00:28.470406	2025-06-04 01:00:28.470406
478	\N	Paul Campbell	paul.campbell888@gmail.com	415-265-9413	f	f	f	2025-06-04 01:00:28.485723	2025-06-04 01:00:28.485723
479	\N	Linda Clark	linda.clark624@shaw.ca	634-422-1448	f	f	f	2025-06-04 01:00:28.491749	2025-06-04 01:00:28.491749
480	\N	Nancy Hill	nancy.hill986@gmail.com	596-926-3687	f	f	f	2025-06-04 01:00:28.504759	2025-06-04 01:00:28.504759
481	\N	Mary Perez	mary.perez469@hotmail.com	806-672-8941	f	f	f	2025-06-04 01:00:28.519059	2025-06-04 01:00:28.519059
482	\N	Barbara Robinson	barbara.robinson857@telus.net	\N	f	f	f	2025-06-04 01:00:28.524872	2025-06-04 01:00:28.524872
483	\N	Mary Nguyen	mary.nguyen941@yahoo.com	805-842-1390	f	f	t	2025-06-04 01:00:28.539433	2025-06-04 01:00:28.539433
484	\N	Ronald Young	ronald.young448@gmail.com	\N	f	f	t	2025-06-04 01:00:28.545249	2025-06-04 01:00:28.545249
485	\N	Karen Jones	karen.jones708@telus.net	977-447-9227	f	f	f	2025-06-04 01:00:28.558028	2025-06-04 01:00:28.558028
486	\N	Anthony Wang	anthony.wang513@telus.net	574-495-4700	f	f	f	2025-06-04 01:00:28.565085	2025-06-04 01:00:28.565085
487	\N	David Garcia	david.garcia760@outlook.com	\N	f	f	t	2025-06-04 01:00:28.574956	2025-06-04 01:00:28.574956
488	\N	Michael Garcia	michael.garcia340@gmail.com	\N	f	f	f	2025-06-04 01:00:28.581436	2025-06-04 01:00:28.581436
489	\N	Sarah Wright	sarah.wright623@telus.net	230-833-1527	f	f	f	2025-06-04 01:00:28.591728	2025-06-04 01:00:28.591728
490	\N	Michelle Lee	michelle.lee54@gmail.com	551-348-9793	f	t	f	2025-06-04 01:00:28.601675	2025-06-04 01:00:28.601675
491	\N	Andrew Taylor	andrew.taylor39@shaw.ca	448-210-1260	f	f	f	2025-06-04 01:00:28.62124	2025-06-04 01:00:28.62124
492	\N	Patricia Green	patricia.green759@telus.net	917-655-9459	f	f	t	2025-06-04 01:00:28.633776	2025-06-04 01:00:28.633776
493	\N	Joshua Thomas	joshua.thomas626@yahoo.com	678-874-5606	f	f	f	2025-06-04 01:00:28.645857	2025-06-04 01:00:28.645857
494	\N	Betty Baker	betty.baker496@shaw.ca	820-561-8760	f	f	f	2025-06-04 01:00:28.651463	2025-06-04 01:00:28.651463
495	\N	Christopher Williams	christopher.williams650@hotmail.com	977-312-2918	f	f	f	2025-06-04 01:00:28.663431	2025-06-04 01:00:28.663431
496	\N	Sandra Wright	sandra.wright278@shaw.ca	988-965-3599	f	f	f	2025-06-04 01:00:28.669344	2025-06-04 01:00:28.669344
497	\N	Deborah Li	deborah.li9@yahoo.com	664-259-4641	f	f	t	2025-06-04 01:00:28.678726	2025-06-04 01:00:28.678726
498	\N	William Davis	william.davis553@shaw.ca	\N	f	t	f	2025-06-04 01:00:28.684933	2025-06-04 01:00:28.684933
499	\N	Donna Allen	donna.allen368@hotmail.com	\N	f	f	t	2025-06-04 01:00:28.705101	2025-06-04 01:00:28.705101
500	\N	Michael Martin	michael.martin292@hotmail.com	598-613-6298	f	f	f	2025-06-04 01:00:28.710994	2025-06-04 01:00:28.710994
501	\N	Donald Roberts	donald.roberts236@hotmail.com	201-810-7148	f	f	f	2025-06-04 01:00:28.726022	2025-06-04 01:00:28.726022
502	\N	Jennifer Sanchez	jennifer.sanchez271@shaw.ca	310-859-8871	f	f	t	2025-06-04 01:00:28.738865	2025-06-04 01:00:28.738865
503	\N	Kimberly Williams	kimberly.williams863@gmail.com	\N	f	f	f	2025-06-04 01:00:28.744404	2025-06-04 01:00:28.744404
504	\N	Paul Martinez	paul.martinez896@outlook.com	308-701-7511	f	f	f	2025-06-04 01:00:28.756353	2025-06-04 01:00:28.756353
505	\N	Ruth Hernandez	ruth.hernandez349@yahoo.com	382-797-9019	f	f	f	2025-06-04 01:00:28.762371	2025-06-04 01:00:28.762371
506	\N	Joshua Lopez	joshua.lopez867@hotmail.com	716-751-2365	f	f	t	2025-06-04 01:00:28.777357	2025-06-04 01:00:28.777357
507	\N	Laura Adams	laura.adams576@telus.net	588-550-8778	f	t	t	2025-06-04 01:00:28.783366	2025-06-04 01:00:28.783366
508	\N	Susan Perez	susan.perez214@hotmail.com	383-948-6976	f	f	f	2025-06-04 01:00:28.797933	2025-06-04 01:00:28.797933
509	\N	Sandra Nguyen	sandra.nguyen84@outlook.com	474-303-4597	f	t	f	2025-06-04 01:00:28.815408	2025-06-04 01:00:28.815408
510	\N	Elizabeth Adams	elizabeth.adams702@telus.net	915-849-1986	f	f	f	2025-06-04 01:00:28.821339	2025-06-04 01:00:28.821339
511	\N	Jeffrey Perez	jeffrey.perez350@hotmail.com	577-575-8669	f	f	f	2025-06-04 01:00:28.833344	2025-06-04 01:00:28.833344
512	\N	Ruth Thompson	ruth.thompson101@shaw.ca	238-289-6830	f	f	f	2025-06-04 01:00:28.839048	2025-06-04 01:00:28.839048
513	\N	William Torres	william.torres695@outlook.com	561-369-1347	f	f	t	2025-06-04 01:00:28.84804	2025-06-04 01:00:28.84804
514	\N	Linda White	linda.white891@telus.net	725-737-3675	f	t	t	2025-06-04 01:00:28.868896	2025-06-04 01:00:28.868896
515	\N	Jeffrey Campbell	jeffrey.campbell63@outlook.com	571-386-6629	f	f	t	2025-06-04 01:00:28.874394	2025-06-04 01:00:28.874394
516	\N	George Li	george.li694@telus.net	471-478-8399	f	f	f	2025-06-04 01:00:28.886159	2025-06-04 01:00:28.886159
517	\N	David Allen	david.allen935@gmail.com	660-833-1769	f	f	f	2025-06-04 01:00:28.891606	2025-06-04 01:00:28.891606
518	\N	Joshua Davis	joshua.davis581@outlook.com	779-866-4558	f	t	f	2025-06-04 01:00:28.905391	2025-06-04 01:00:28.905391
519	\N	Kimberly Garcia	kimberly.garcia258@gmail.com	922-912-2340	f	t	f	2025-06-04 01:00:28.910966	2025-06-04 01:00:28.910966
520	\N	Ruth Scott	ruth.scott146@shaw.ca	523-807-8647	f	f	f	2025-06-04 01:00:28.925065	2025-06-04 01:00:28.925065
521	\N	Lisa Adams	lisa.adams196@gmail.com	\N	f	t	f	2025-06-04 01:00:28.930336	2025-06-04 01:00:28.930336
522	\N	Joshua Johnson	joshua.johnson937@hotmail.com	434-208-8655	f	t	f	2025-06-04 01:00:28.946377	2025-06-04 01:00:28.946377
523	\N	Jennifer Green	jennifer.green886@outlook.com	\N	f	f	t	2025-06-04 01:00:28.951792	2025-06-04 01:00:28.951792
524	\N	Charles Williams	charles.williams553@shaw.ca	\N	f	f	f	2025-06-04 01:00:28.969043	2025-06-04 01:00:28.969043
525	\N	Betty Johnson	betty.johnson801@gmail.com	\N	f	f	f	2025-06-04 01:00:28.975435	2025-06-04 01:00:28.975435
526	\N	Michelle Roberts	michelle.roberts165@gmail.com	974-768-9195	f	f	t	2025-06-04 01:00:28.989912	2025-06-04 01:00:28.989912
527	\N	Christopher Rodriguez	christopher.rodriguez472@gmail.com	\N	f	f	f	2025-06-04 01:00:28.995728	2025-06-04 01:00:28.995728
528	\N	Sarah King	sarah.king949@outlook.com	372-384-4064	f	f	f	2025-06-04 01:00:29.007412	2025-06-04 01:00:29.007412
529	\N	Richard Harris	richard.harris410@shaw.ca	951-903-2078	f	t	f	2025-06-04 01:00:29.013161	2025-06-04 01:00:29.013161
530	\N	Brian Wright	brian.wright977@yahoo.com	522-748-8222	f	t	f	2025-06-04 01:00:29.024374	2025-06-04 01:00:29.024374
531	\N	Jason Garcia	jason.garcia697@telus.net	827-517-7341	f	f	f	2025-06-04 01:00:29.032997	2025-06-04 01:00:29.032997
532	\N	Nancy Carter	nancy.carter944@outlook.com	544-395-8255	f	f	f	2025-06-04 01:00:29.046382	2025-06-04 01:00:29.046382
533	\N	Richard Lewis	richard.lewis909@gmail.com	305-765-9995	f	f	t	2025-06-04 01:00:29.051757	2025-06-04 01:00:29.051757
534	\N	Lisa Johnson	lisa.johnson982@telus.net	665-501-4400	f	f	t	2025-06-04 01:00:29.062736	2025-06-04 01:00:29.062736
535	\N	Steven White	steven.white849@telus.net	384-988-1681	f	f	f	2025-06-04 01:00:29.07581	2025-06-04 01:00:29.07581
536	\N	Betty Harris	betty.harris143@gmail.com	308-262-4204	f	t	t	2025-06-04 01:00:29.086806	2025-06-04 01:00:29.086806
537	\N	Laura Robinson	laura.robinson657@outlook.com	875-461-9909	f	f	f	2025-06-04 01:00:29.092109	2025-06-04 01:00:29.092109
538	\N	Patricia Lopez	patricia.lopez285@outlook.com	686-245-2075	f	t	f	2025-06-04 01:00:29.105636	2025-06-04 01:00:29.105636
539	\N	Ruth Clark	ruth.clark900@yahoo.com	919-346-6629	f	f	f	2025-06-04 01:00:29.111633	2025-06-04 01:00:29.111633
540	\N	Charles Brown	charles.brown975@hotmail.com	\N	f	f	t	2025-06-04 01:00:29.122841	2025-06-04 01:00:29.122841
541	\N	Emily Adams	emily.adams788@shaw.ca	909-230-4214	f	f	f	2025-06-04 01:00:29.137077	2025-06-04 01:00:29.137077
542	\N	Donna Robinson	donna.robinson216@yahoo.com	763-773-7205	f	t	f	2025-06-04 01:00:29.142875	2025-06-04 01:00:29.142875
543	\N	Sandra Smith	sandra.smith737@yahoo.com	\N	f	f	t	2025-06-04 01:00:29.154384	2025-06-04 01:00:29.154384
544	\N	Michael Walker	michael.walker132@hotmail.com	567-326-2794	f	t	f	2025-06-04 01:00:29.168941	2025-06-04 01:00:29.168941
545	\N	Michelle Garcia	michelle.garcia129@gmail.com	\N	f	f	f	2025-06-04 01:00:29.174549	2025-06-04 01:00:29.174549
546	\N	Patricia Taylor	patricia.taylor119@gmail.com	288-625-8851	f	f	f	2025-06-04 01:00:29.188666	2025-06-04 01:00:29.188666
547	\N	Michael Gonzalez	michael.gonzalez606@shaw.ca	649-755-4567	f	f	f	2025-06-04 01:00:29.202806	2025-06-04 01:00:29.202806
548	\N	Deborah Ramirez	deborah.ramirez616@yahoo.com	\N	f	f	t	2025-06-04 01:00:29.217133	2025-06-04 01:00:29.217133
549	\N	Lisa Taylor	lisa.taylor271@outlook.com	513-946-6089	f	f	t	2025-06-04 01:00:29.222777	2025-06-04 01:00:29.222777
550	\N	Helen Brown	helen.brown631@shaw.ca	\N	f	f	t	2025-06-04 01:00:29.232147	2025-06-04 01:00:29.232147
551	\N	Ronald Davis	ronald.davis60@yahoo.com	283-276-2446	f	f	f	2025-06-04 01:00:29.243389	2025-06-04 01:00:29.243389
552	\N	Helen Johnson	helen.johnson506@outlook.com	425-682-2932	f	t	t	2025-06-04 01:00:29.249613	2025-06-04 01:00:29.249613
553	\N	Laura Green	laura.green510@outlook.com	204-861-2631	f	f	f	2025-06-04 01:00:29.25852	2025-06-04 01:00:29.25852
554	\N	Deborah Flores	deborah.flores975@outlook.com	734-630-2860	f	f	f	2025-06-04 01:00:29.270216	2025-06-04 01:00:29.270216
555	\N	Edward Brown	edward.brown585@yahoo.com	575-602-5363	f	t	f	2025-06-04 01:00:29.276141	2025-06-04 01:00:29.276141
556	\N	Mark Ramirez	mark.ramirez149@outlook.com	956-740-8203	f	f	f	2025-06-04 01:00:29.292791	2025-06-04 01:00:29.292791
557	\N	Sarah Thompson	sarah.thompson365@hotmail.com	237-700-8567	f	f	f	2025-06-04 01:00:29.298097	2025-06-04 01:00:29.298097
558	\N	Patricia King	patricia.king337@gmail.com	634-298-6269	f	f	f	2025-06-04 01:00:29.306169	2025-06-04 01:00:29.306169
559	\N	Sharon Nguyen	sharon.nguyen246@yahoo.com	742-629-3871	f	f	f	2025-06-04 01:00:29.32218	2025-06-04 01:00:29.32218
560	\N	Elizabeth Johnson	elizabeth.johnson696@outlook.com	\N	f	f	f	2025-06-04 01:00:29.328993	2025-06-04 01:00:29.328993
561	\N	Sandra Flores	sandra.flores810@telus.net	983-465-4640	f	f	t	2025-06-04 01:00:29.345561	2025-06-04 01:00:29.345561
562	\N	Sarah Gonzalez	sarah.gonzalez309@yahoo.com	304-754-8134	f	f	f	2025-06-04 01:00:29.352973	2025-06-04 01:00:29.352973
563	\N	Laura Jackson	laura.jackson463@outlook.com	951-811-7960	f	f	f	2025-06-04 01:00:29.367869	2025-06-04 01:00:29.367869
564	\N	Donna Johnson	donna.johnson661@outlook.com	\N	f	f	f	2025-06-04 01:00:29.37887	2025-06-04 01:00:29.37887
565	\N	John Thompson	john.thompson518@yahoo.com	791-902-1023	f	t	f	2025-06-04 01:00:29.385949	2025-06-04 01:00:29.385949
566	\N	Deborah Baker	deborah.baker470@telus.net	461-499-3221	f	f	f	2025-06-04 01:00:29.396833	2025-06-04 01:00:29.396833
567	\N	Patricia Robinson	patricia.robinson792@gmail.com	\N	f	t	f	2025-06-04 01:00:29.404359	2025-06-04 01:00:29.404359
568	\N	John Moore	john.moore2@outlook.com	626-552-8603	f	t	t	2025-06-04 01:00:29.415863	2025-06-04 01:00:29.415863
569	\N	Timothy Brown	timothy.brown877@outlook.com	\N	f	f	t	2025-06-04 01:00:29.424356	2025-06-04 01:00:29.424356
570	\N	Michael King	michael.king77@gmail.com	726-944-8436	f	f	t	2025-06-04 01:00:29.444282	2025-06-04 01:00:29.444282
571	\N	Sharon Harris	sharon.harris514@outlook.com	358-664-7843	f	f	f	2025-06-04 01:00:29.453967	2025-06-04 01:00:29.453967
572	\N	Steven Garcia	steven.garcia911@yahoo.com	824-643-7442	f	f	f	2025-06-04 01:00:29.460556	2025-06-04 01:00:29.460556
573	\N	Anthony Flores	anthony.flores470@shaw.ca	939-248-1512	f	t	f	2025-06-04 01:00:29.47385	2025-06-04 01:00:29.47385
574	\N	Timothy Miller	timothy.miller197@outlook.com	\N	f	t	f	2025-06-04 01:00:29.479821	2025-06-04 01:00:29.479821
575	\N	Laura Rodriguez	laura.rodriguez836@gmail.com	667-354-6135	f	t	f	2025-06-04 01:00:29.500918	2025-06-04 01:00:29.500918
576	\N	Anthony Garcia	anthony.garcia372@yahoo.com	602-299-8225	f	f	f	2025-06-04 01:00:29.509341	2025-06-04 01:00:29.509341
577	\N	Betty Robinson	betty.robinson803@yahoo.com	315-545-3849	f	f	f	2025-06-04 01:00:29.521312	2025-06-04 01:00:29.521312
578	\N	Deborah Robinson	deborah.robinson563@shaw.ca	429-393-9135	f	f	f	2025-06-04 01:00:29.529771	2025-06-04 01:00:29.529771
579	\N	Timothy Young	timothy.young196@gmail.com	953-219-2904	f	f	f	2025-06-04 01:00:29.546345	2025-06-04 01:00:29.546345
580	\N	Ruth Moore	ruth.moore640@yahoo.com	\N	f	f	t	2025-06-04 01:00:29.553928	2025-06-04 01:00:29.553928
581	\N	John Anderson	john.anderson774@shaw.ca	601-649-5428	f	t	f	2025-06-04 01:00:29.57282	2025-06-04 01:00:29.57282
582	\N	Jessica Mitchell	jessica.mitchell629@hotmail.com	964-223-2226	f	f	t	2025-06-04 01:00:29.58059	2025-06-04 01:00:29.58059
583	\N	Matthew Thompson	matthew.thompson115@hotmail.com	\N	f	f	t	2025-06-04 01:00:29.598943	2025-06-04 01:00:29.598943
584	\N	Jessica Chen	jessica.chen401@gmail.com	616-956-1016	f	f	f	2025-06-04 01:00:29.606517	2025-06-04 01:00:29.606517
585	\N	Ruth Torres	ruth.torres274@telus.net	796-938-6817	f	f	f	2025-06-04 01:00:29.627074	2025-06-04 01:00:29.627074
586	\N	Jane Mitchell	jane.mitchell968@yahoo.com	900-310-5942	f	f	f	2025-06-04 01:00:29.634564	2025-06-04 01:00:29.634564
587	\N	Christopher Anderson	christopher.anderson650@outlook.com	454-762-6431	f	f	f	2025-06-04 01:00:29.646665	2025-06-04 01:00:29.646665
588	\N	Betty Jones	betty.jones762@yahoo.com	958-629-3279	f	f	t	2025-06-04 01:00:29.671179	2025-06-04 01:00:29.671179
589	\N	Donna Smith	donna.smith799@hotmail.com	900-298-3974	f	f	f	2025-06-04 01:00:29.686374	2025-06-04 01:00:29.686374
590	\N	Linda Thomas	linda.thomas682@telus.net	783-796-2960	f	f	f	2025-06-04 01:00:29.693807	2025-06-04 01:00:29.693807
591	\N	Nancy Walker	nancy.walker545@telus.net	466-905-5956	f	f	t	2025-06-04 01:00:29.712089	2025-06-04 01:00:29.712089
592	\N	Sharon Clark	sharon.clark149@gmail.com	634-970-9010	f	f	f	2025-06-04 01:00:29.719554	2025-06-04 01:00:29.719554
593	\N	Sandra Lewis	sandra.lewis956@outlook.com	988-677-9538	f	f	t	2025-06-04 01:00:29.731035	2025-06-04 01:00:29.731035
594	\N	Linda Gonzalez	linda.gonzalez693@gmail.com	\N	f	f	t	2025-06-04 01:00:29.746418	2025-06-04 01:00:29.746418
1	\N	Daniel Cook	danielcook111@gmail.com	7789182701	f	t	f	2025-05-27 21:55:43.554636	2025-06-05 15:53:41.142
\.


--
-- Data for Name: property_units; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.property_units (id, customer_id, unit_number, floor, owner_name, owner_email, tenant_name, tenant_email, created_at, updated_at, strata_lot, mailing_street1, mailing_street2, mailing_city, mailing_state_province, mailing_postal_code, mailing_country, phone, notes, townhouse) FROM stdin;
2	\N	1106	11	\N	\N	\N	\N	2025-05-29 23:41:38.264344	2025-05-29 23:41:38.264344	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
3	\N	1107	11	\N	\N	\N	\N	2025-05-29 23:41:38.264344	2025-05-29 23:41:38.264344	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
4	\N	201	15	\N	\N	\N	\N	2025-06-04 00:59:20.823337	2025-06-04 00:59:20.823337	SL245	5184 Tyler Ave	\N	Burnaby	BC	V5Z 1P7	Canada	772-606-1436	\N	f
5	\N	502	8	\N	\N	\N	\N	2025-06-04 00:59:20.856668	2025-06-04 00:59:20.856668	SL182	5665 Fourth St	Unit 13	Delta	BC	V5X 8U9	Canada	281-860-7015	\N	f
6	\N	803	12	\N	\N	\N	\N	2025-06-04 00:59:20.90033	2025-06-04 00:59:20.90033	SL30	545 Elm St	\N	Vancouver	BC	V6H 5D5	Canada	918-774-7993	\N	f
7	\N	1604	12	\N	\N	\N	\N	2025-06-04 00:59:20.930134	2025-06-04 00:59:20.930134	SL329	834 Fifth St	\N	West Vancouver	BC	V6E 1L1	Canada	\N	\N	f
8	\N	1805	9	\N	\N	\N	\N	2025-06-04 00:59:20.944071	2025-06-04 00:59:20.944071	SL425	732 Polk St	\N	Port Moody	BC	V5T 9C3	Canada	673-542-6202	\N	f
9	\N	1206	5	\N	\N	\N	\N	2025-06-04 00:59:20.976718	2025-06-04 00:59:20.976718	SL153	1352 Van Buren Dr	\N	North Vancouver	BC	V5Y 8E3	Canada	359-481-4954	\N	f
10	\N	1007	4	\N	\N	\N	\N	2025-06-04 00:59:20.99778	2025-06-04 00:59:20.99778	SL160	1200 Fifth St	\N	Coquitlam	BC	V6L 8I1	Canada	573-451-1798	Unit 1007 - Renovated	f
11	\N	408	4	\N	\N	\N	\N	2025-06-04 00:59:21.024131	2025-06-04 00:59:21.024131	SL54	2508 Sixth St	\N	Surrey	BC	V5Z 0P7	Canada	628-557-8517	\N	f
12	\N	1109	16	\N	\N	\N	\N	2025-06-04 00:59:21.047493	2025-06-04 00:59:21.047493	SL294	8582 Fourth St	\N	Vancouver	BC	V6L 4X3	Canada	\N	\N	f
13	\N	110	3	\N	\N	\N	\N	2025-06-04 00:59:21.071087	2025-06-04 00:59:21.071087	SL131	8436 Pierce St	\N	Langley	BC	V5P 6V5	Canada	586-615-3550	Unit 110 - Renovated	f
14	\N	1611	5	\N	\N	\N	\N	2025-06-04 00:59:21.096052	2025-06-04 00:59:21.096052	SL43	1420 Buchanan Ave	\N	Coquitlam	BC	V5T 2I0	Canada	839-571-4756	Unit 1611 - Mountain view	f
15	\N	1312	12	\N	\N	\N	\N	2025-06-04 00:59:21.108165	2025-06-04 00:59:21.108165	SL399	5211 Buchanan Ave	Unit 25	Bowen Island	BC	V5S 9K2	Canada	579-844-4541	\N	f
16	\N	1113	7	\N	\N	\N	\N	2025-06-04 00:59:21.144736	2025-06-04 00:59:21.144736	SL264	243 Cedar Ave	\N	Port Coquitlam	BC	V6N 6H6	Canada	274-686-5142	Unit 1113 - City view	f
17	\N	1214	10	\N	\N	\N	\N	2025-06-04 00:59:21.178011	2025-06-04 00:59:21.178011	SL437	7389 Fifth St	Unit 22	Burnaby	BC	V6V 0T5	Canada	891-798-4382	Unit 1214 - Renovated	f
18	\N	2015	18	\N	\N	\N	\N	2025-06-04 00:59:21.204721	2025-06-04 00:59:21.204721	SL266	5910 Pine St	Unit 9	White Rock	BC	V5W 4L0	Canada	\N	\N	f
19	\N	1216	10	\N	\N	\N	\N	2025-06-04 00:59:21.236505	2025-06-04 00:59:21.236505	SL238	1710 Van Buren Dr	\N	Lions Bay	BC	V5T 2A4	Canada	288-440-7363	Unit 1216 - Mountain view	f
20	\N	417	10	\N	\N	\N	\N	2025-06-04 00:59:21.261698	2025-06-04 00:59:21.261698	SL204	8817 Grant St	\N	White Rock	BC	V6Z 7E7	Canada	578-758-2687	\N	f
21	\N	2018	16	\N	\N	\N	\N	2025-06-04 00:59:21.285996	2025-06-04 00:59:21.285996	SL393	6958 Harrison St	\N	Burnaby	BC	V5M 2E6	Canada	247-600-4510	\N	f
22	\N	1619	17	\N	\N	\N	\N	2025-06-04 00:59:21.306531	2025-06-04 00:59:21.306531	SL460	2228 Eighth St	\N	Lions Bay	BC	V6S 3D2	Canada	969-828-6992	\N	f
23	\N	1020	7	\N	\N	\N	\N	2025-06-04 00:59:21.336529	2025-06-04 00:59:21.336529	SL336	3781 Eighth St	\N	Delta	BC	V5R 9A5	Canada	508-883-5788	Unit 1020 - Corner unit	f
24	\N	1121	1	\N	\N	\N	\N	2025-06-04 00:59:21.360511	2025-06-04 00:59:21.360511	SL257	2684 Eighth St	\N	Port Coquitlam	BC	V6J 8H5	Canada	809-599-1685	\N	f
25	\N	322	12	\N	\N	\N	\N	2025-06-04 00:59:21.389717	2025-06-04 00:59:21.389717	SL206	2247 Cedar Ave	\N	Maple Ridge	BC	V7E 4X2	Canada	315-729-2973	\N	f
26	\N	323	6	\N	\N	\N	\N	2025-06-04 00:59:21.404608	2025-06-04 00:59:21.404608	SL222	3441 Fifth St	\N	Maple Ridge	BC	V5K 8E4	Canada	\N	\N	f
27	\N	1724	3	\N	\N	\N	\N	2025-06-04 00:59:21.434196	2025-06-04 00:59:21.434196	SL266	7654 Elm St	Unit 13	Vancouver	BC	V5L 3A0	Canada	350-991-7929	Unit 1724 - City view	f
28	\N	725	20	\N	\N	\N	\N	2025-06-04 00:59:21.464347	2025-06-04 00:59:21.464347	SL450	4785 Monroe Ave	\N	Maple Ridge	BC	V6J 7Q3	Canada	220-863-4124	\N	f
29	\N	1926	6	\N	\N	\N	\N	2025-06-04 00:59:21.495993	2025-06-04 00:59:21.495993	SL131	7510 Taylor Dr	\N	Anmore	BC	V7A 1V7	Canada	\N	Unit 1926 - Mountain view	f
30	\N	1927	3	\N	\N	\N	\N	2025-06-04 00:59:21.521964	2025-06-04 00:59:21.521964	SL248	6765 Buchanan Ave	\N	New Westminster	BC	V5L 8O5	Canada	306-367-9535	\N	f
31	\N	328	9	\N	\N	\N	\N	2025-06-04 00:59:21.551323	2025-06-04 00:59:21.551323	SL256	987 Seventh St	\N	Belcarra	BC	V6H 3P7	Canada	\N	Unit 328 - Mountain view	f
32	\N	1529	11	\N	\N	\N	\N	2025-06-04 00:59:21.580349	2025-06-04 00:59:21.580349	SL169	6732 Johnson Dr	Unit 49	Bowen Island	BC	V6G 5U7	Canada	807-900-1665	\N	f
33	\N	1930	8	\N	\N	\N	\N	2025-06-04 00:59:21.606823	2025-06-04 00:59:21.606823	SL464	2161 Monroe Ave	\N	Belcarra	BC	V6P 2H7	Canada	463-786-2813	\N	f
34	\N	231	13	\N	\N	\N	\N	2025-06-04 00:59:21.634033	2025-06-04 00:59:21.634033	SL95	3310 Seventh St	\N	Pitt Meadows	BC	V6A 6V6	Canada	750-842-6530	\N	f
35	\N	1532	12	\N	\N	\N	\N	2025-06-04 00:59:21.662083	2025-06-04 00:59:21.662083	SL472	9793 Jefferson Dr	\N	Anmore	BC	V6R 4E7	Canada	\N	Unit 1532 - Original condition	f
36	\N	433	2	\N	\N	\N	\N	2025-06-04 00:59:21.684327	2025-06-04 00:59:21.684327	SL277	6516 Cedar Ave	\N	Anmore	BC	V5V 3N7	Canada	738-976-6940	Unit 433 - Original condition	f
37	\N	1134	1	\N	\N	\N	\N	2025-06-04 00:59:21.705565	2025-06-04 00:59:21.705565	SL167	3662 Oak Ave	\N	Coquitlam	BC	V5T 7K3	Canada	528-474-1020	\N	f
38	\N	1335	16	\N	\N	\N	\N	2025-06-04 00:59:21.717939	2025-06-04 00:59:21.717939	SL349	3388 Eighth St	\N	Langley	BC	V7E 2U4	Canada	930-645-3833	Unit 1335 - Garden view	f
39	\N	436	13	\N	\N	\N	\N	2025-06-04 00:59:21.750498	2025-06-04 00:59:21.750498	SL406	6151 First St	\N	Coquitlam	BC	V6W 0R3	Canada	704-371-1786	\N	f
40	\N	1137	14	\N	\N	\N	\N	2025-06-04 00:59:21.77295	2025-06-04 00:59:21.77295	SL464	7433 Lincoln Ave	\N	Pitt Meadows	BC	V6S 3Y0	Canada	413-385-2564	Unit 1137 - Original condition	f
41	\N	638	15	\N	\N	\N	\N	2025-06-04 00:59:21.825096	2025-06-04 00:59:21.825096	SL141	3054 Pine St	\N	Surrey	BC	V7C 2U4	Canada	\N	Unit 638 - City view	f
42	\N	339	15	\N	\N	\N	\N	2025-06-04 00:59:21.838069	2025-06-04 00:59:21.838069	SL17	1219 First St	\N	Surrey	BC	V6K 6K1	Canada	454-616-8484	Unit 339 - Original condition	f
43	\N	1940	7	\N	\N	\N	\N	2025-06-04 00:59:21.853471	2025-06-04 00:59:21.853471	SL63	6250 Fifth St	\N	Delta	BC	V6G 3J1	Canada	335-848-2612	\N	f
44	\N	1741	4	\N	\N	\N	\N	2025-06-04 00:59:21.876659	2025-06-04 00:59:21.876659	SL484	7444 Fillmore Ave	\N	White Rock	BC	V6C 0K0	Canada	934-742-1241	\N	f
45	\N	2042	18	\N	\N	\N	\N	2025-06-04 00:59:21.906326	2025-06-04 00:59:21.906326	SL453	1044 Seventh St	\N	Bowen Island	BC	V5V 4P9	Canada	427-207-6310	\N	f
46	\N	1643	9	\N	\N	\N	\N	2025-06-04 00:59:21.921949	2025-06-04 00:59:21.921949	SL298	6184 Grant St	\N	Maple Ridge	BC	V6T 1V7	Canada	606-347-5725	\N	f
47	\N	1544	9	\N	\N	\N	\N	2025-06-04 00:59:21.935909	2025-06-04 00:59:21.935909	SL323	5229 Jackson Ave	Unit 38	Lions Bay	BC	V6P 8B2	Canada	\N	Unit 1544 - City view	f
48	\N	1845	3	\N	\N	\N	\N	2025-06-04 00:59:21.952527	2025-06-04 00:59:21.952527	SL154	8419 Maple Dr	\N	Langley	BC	V6A 0H8	Canada	\N	\N	f
49	\N	1146	12	\N	\N	\N	\N	2025-06-04 00:59:21.974093	2025-06-04 00:59:21.974093	SL136	8011 Washington St	\N	Bowen Island	BC	V7E 8X9	Canada	941-836-5169	\N	f
50	\N	1747	8	\N	\N	\N	\N	2025-06-04 00:59:22.0023	2025-06-04 00:59:22.0023	SL99	6089 Maple Dr	\N	Coquitlam	BC	V5X 3F1	Canada	857-999-6170	\N	f
51	\N	1848	17	\N	\N	\N	\N	2025-06-04 00:59:22.022975	2025-06-04 00:59:22.022975	SL32	9801 Jefferson Dr	\N	Maple Ridge	BC	V6A 6F0	Canada	365-221-3226	\N	f
52	\N	2049	1	\N	\N	\N	\N	2025-06-04 00:59:22.040584	2025-06-04 00:59:22.040584	SL188	7624 Oak Ave	\N	North Vancouver	BC	V5Y 9Z1	Canada	\N	\N	f
53	\N	1250	15	\N	\N	\N	\N	2025-06-04 00:59:22.064708	2025-06-04 00:59:22.064708	SL129	4947 Grant St	\N	White Rock	BC	V7G 8N0	Canada	285-967-5188	Unit 1250 - Renovated	f
54	\N	751	2	\N	\N	\N	\N	2025-06-04 00:59:22.092471	2025-06-04 00:59:22.092471	SL48	5664 Pierce St	\N	Pitt Meadows	BC	V5Z 6T1	Canada	942-445-2290	Unit 751 - Corner unit	f
55	\N	1352	12	\N	\N	\N	\N	2025-06-04 00:59:22.108823	2025-06-04 00:59:22.108823	SL105	5337 Taylor Dr	\N	Port Coquitlam	BC	V6K 0N7	Canada	856-983-4112	Unit 1352 - Mountain view	f
56	\N	353	9	\N	\N	\N	\N	2025-06-04 00:59:22.132559	2025-06-04 00:59:22.132559	SL251	9990 Monroe Ave	Unit 17	Maple Ridge	BC	V5S 5B4	Canada	581-321-8883	\N	f
57	\N	154	16	\N	\N	\N	\N	2025-06-04 00:59:22.151577	2025-06-04 00:59:22.151577	SL366	7579 Tyler Ave	\N	Belcarra	BC	V5Y 2O0	Canada	229-893-4923	\N	f
58	\N	1755	2	\N	\N	\N	\N	2025-06-04 00:59:22.176169	2025-06-04 00:59:22.176169	SL73	3989 Taylor Dr	\N	Richmond	BC	V6P 9W0	Canada	268-769-5796	Unit 1755 - Renovated	f
59	\N	2056	7	\N	\N	\N	\N	2025-06-04 00:59:22.20172	2025-06-04 00:59:22.20172	SL416	3257 Second St	\N	Belcarra	BC	V6E 1R8	Canada	\N	Unit 2056 - Original condition	f
60	\N	457	12	\N	\N	\N	\N	2025-06-04 00:59:22.222812	2025-06-04 00:59:22.222812	SL96	2407 Washington St	\N	Langley	BC	V5Y 9D4	Canada	559-831-1151	\N	f
61	\N	1258	8	\N	\N	\N	\N	2025-06-04 00:59:22.237976	2025-06-04 00:59:22.237976	SL276	4033 Fifth St	\N	New Westminster	BC	V6L 5S5	Canada	891-689-5222	Unit 1258 - Garden view	f
62	\N	1459	10	\N	\N	\N	\N	2025-06-04 00:59:22.261074	2025-06-04 00:59:22.261074	SL156	300 Madison St	\N	Langley	BC	V6S 3P1	Canada	\N	\N	f
63	\N	1960	6	\N	\N	\N	\N	2025-06-04 00:59:22.279988	2025-06-04 00:59:22.279988	SL89	6765 Third St	\N	Delta	BC	V6G 5Y6	Canada	534-798-3734	\N	f
64	\N	661	16	\N	\N	\N	\N	2025-06-04 00:59:22.306824	2025-06-04 00:59:22.306824	SL465	1237 Oak Ave	\N	Port Moody	BC	V6E 4L5	Canada	529-445-3886	Unit 661 - Garden view	f
65	\N	562	7	\N	\N	\N	\N	2025-06-04 00:59:22.335116	2025-06-04 00:59:22.335116	SL481	7110 Cedar Ave	Unit 31	West Vancouver	BC	V6X 4I1	Canada	\N	Unit 562 - Renovated	f
66	\N	2063	3	\N	\N	\N	\N	2025-06-04 00:59:22.364715	2025-06-04 00:59:22.364715	SL156	3356 Tyler Ave	\N	Belcarra	BC	V5X 6B6	Canada	492-377-4577	\N	f
67	\N	964	2	\N	\N	\N	\N	2025-06-04 00:59:22.399082	2025-06-04 00:59:22.399082	SL236	3410 Cedar Ave	\N	North Vancouver	BC	V6K 9E4	Canada	\N	\N	f
68	\N	765	16	\N	\N	\N	\N	2025-06-04 00:59:22.424382	2025-06-04 00:59:22.424382	SL309	6997 Eighth St	\N	White Rock	BC	V6J 4E8	Canada	\N	\N	f
69	\N	1066	14	\N	\N	\N	\N	2025-06-04 00:59:22.435984	2025-06-04 00:59:22.435984	SL364	4397 Fourth St	Unit 38	Delta	BC	V6E 0J3	Canada	326-647-5373	\N	f
70	\N	2067	7	\N	\N	\N	\N	2025-06-04 00:59:22.461197	2025-06-04 00:59:22.461197	SL88	8249 Fifth St	Unit 15	Belcarra	BC	V7C 2R5	Canada	818-765-7506	Unit 2067 - City view	f
71	\N	1568	9	\N	\N	\N	\N	2025-06-04 00:59:22.48679	2025-06-04 00:59:22.48679	SL103	4244 Cedar Ave	\N	Delta	BC	V7G 2V1	Canada	739-659-7146	\N	f
72	\N	969	2	\N	\N	\N	\N	2025-06-04 00:59:22.506726	2025-06-04 00:59:22.506726	SL30	6581 Seventh St	\N	Richmond	BC	V7E 2Q4	Canada	572-985-3588	\N	f
73	\N	1770	13	\N	\N	\N	\N	2025-06-04 00:59:22.522161	2025-06-04 00:59:22.522161	SL490	6509 Monroe Ave	\N	Langley	BC	V7G 6E1	Canada	948-517-8001	\N	f
74	\N	1971	13	\N	\N	\N	\N	2025-06-04 00:59:22.55084	2025-06-04 00:59:22.55084	SL173	8148 Maple Dr	\N	Port Coquitlam	BC	V5S 6U1	Canada	964-783-2829	\N	f
75	\N	2072	13	\N	\N	\N	\N	2025-06-04 00:59:22.58005	2025-06-04 00:59:22.58005	SL199	9198 Fillmore Ave	Unit 8	Lions Bay	BC	V6E 4P0	Canada	698-200-8682	\N	f
76	\N	1973	16	\N	\N	\N	\N	2025-06-04 00:59:22.595565	2025-06-04 00:59:22.595565	SL452	6224 Grant St	\N	West Vancouver	BC	V6A 0X7	Canada	\N	\N	f
77	\N	1474	20	\N	\N	\N	\N	2025-06-04 00:59:22.629158	2025-06-04 00:59:22.629158	SL466	4632 Adams St	\N	Langley	BC	V5T 4L1	Canada	446-608-8521	Unit 1474 - Renovated	f
78	\N	1575	16	\N	\N	\N	\N	2025-06-04 00:59:22.648078	2025-06-04 00:59:22.648078	SL220	2834 Jefferson Dr	\N	Coquitlam	BC	V5S 8B4	Canada	\N	\N	f
79	\N	1276	9	\N	\N	\N	\N	2025-06-04 00:59:22.677353	2025-06-04 00:59:22.677353	SL477	1346 Fifth St	\N	Langley	BC	V6V 0A8	Canada	698-955-4975	\N	f
80	\N	1577	3	\N	\N	\N	\N	2025-06-04 00:59:22.700607	2025-06-04 00:59:22.700607	SL96	4721 Fillmore Ave	Unit 3	Vancouver	BC	V5T 7Q7	Canada	699-529-7998	\N	f
81	\N	1278	19	\N	\N	\N	\N	2025-06-04 00:59:22.727362	2025-06-04 00:59:22.727362	SL17	6753 Buchanan Ave	\N	Lions Bay	BC	V5Y 9G8	Canada	471-478-7655	\N	f
82	\N	1079	19	\N	\N	\N	\N	2025-06-04 00:59:22.746134	2025-06-04 00:59:22.746134	SL58	7536 Third St	\N	Maple Ridge	BC	V6A 8W2	Canada	558-917-6027	\N	f
83	\N	380	3	\N	\N	\N	\N	2025-06-04 00:59:22.760621	2025-06-04 00:59:22.760621	SL406	2396 Sixth St	\N	Burnaby	BC	V5W 8X8	Canada	416-955-8130	Unit 380 - Corner unit	f
84	\N	1081	18	\N	\N	\N	\N	2025-06-04 00:59:22.78411	2025-06-04 00:59:22.78411	SL247	348 Seventh St	\N	Anmore	BC	V6V 1D0	Canada	833-898-7806	\N	f
85	\N	1882	7	\N	\N	\N	\N	2025-06-04 00:59:22.804095	2025-06-04 00:59:22.804095	SL480	6929 Monroe Ave	\N	Pitt Meadows	BC	V6M 5R3	Canada	793-821-3061	Unit 1882 - City view	f
86	\N	1683	18	\N	\N	\N	\N	2025-06-04 00:59:22.830441	2025-06-04 00:59:22.830441	SL63	1846 Pierce St	\N	Surrey	BC	V6Y 7L6	Canada	\N	Unit 1683 - Renovated	f
87	\N	384	2	\N	\N	\N	\N	2025-06-04 00:59:22.861781	2025-06-04 00:59:22.861781	SL7	1144 Second St	\N	Vancouver	BC	V6C 8Z6	Canada	\N	\N	f
88	\N	785	20	\N	\N	\N	\N	2025-06-04 00:59:22.879921	2025-06-04 00:59:22.879921	SL415	8100 Grant St	\N	Surrey	BC	V5P 8T4	Canada	816-455-7097	\N	f
89	\N	886	20	\N	\N	\N	\N	2025-06-04 00:59:22.910624	2025-06-04 00:59:22.910624	SL340	3165 Main St	\N	West Vancouver	BC	V7C 7Y0	Canada	817-411-6960	\N	f
90	\N	287	4	\N	\N	\N	\N	2025-06-04 00:59:22.933628	2025-06-04 00:59:22.933628	SL112	8279 Eighth St	Unit 22	Port Moody	BC	V6N 0A7	Canada	\N	\N	f
91	\N	1388	10	\N	\N	\N	\N	2025-06-04 00:59:22.957899	2025-06-04 00:59:22.957899	SL64	4090 Maple Dr	\N	Langley	BC	V5W 8P6	Canada	730-260-2068	\N	f
92	\N	989	10	\N	\N	\N	\N	2025-06-04 00:59:22.98437	2025-06-04 00:59:22.98437	SL1	3595 Buchanan Ave	\N	Maple Ridge	BC	V6W 5A3	Canada	533-866-9457	\N	f
93	\N	1090	12	\N	\N	\N	\N	2025-06-04 00:59:23.00236	2025-06-04 00:59:23.00236	SL75	4646 Elm St	\N	Burnaby	BC	V6S 9W1	Canada	949-218-5285	Unit 1090 - Original condition	f
94	\N	291	6	\N	\N	\N	\N	2025-06-04 00:59:23.025233	2025-06-04 00:59:23.025233	SL430	7506 Sixth St	Unit 44	Surrey	BC	V6C 6S5	Canada	266-835-8525	\N	f
95	\N	1892	8	\N	\N	\N	\N	2025-06-04 00:59:23.054347	2025-06-04 00:59:23.054347	SL282	7642 Monroe Ave	\N	Belcarra	BC	V5Y 8M0	Canada	704-570-6153	Unit 1892 - City view	f
96	\N	1393	12	\N	\N	\N	\N	2025-06-04 00:59:23.072312	2025-06-04 00:59:23.072312	SL87	2371 Oak Ave	Unit 10	Port Coquitlam	BC	V6R 5A0	Canada	541-771-9928	\N	f
97	\N	1294	7	\N	\N	\N	\N	2025-06-04 00:59:23.093913	2025-06-04 00:59:23.093913	SL202	5567 Adams St	\N	Surrey	BC	V6H 4Z5	Canada	949-333-1229	Unit 1294 - Mountain view	f
98	\N	1295	8	\N	\N	\N	\N	2025-06-04 00:59:23.113665	2025-06-04 00:59:23.113665	SL350	4100 Third St	\N	Port Coquitlam	BC	V6S 0B1	Canada	230-564-3948	\N	f
99	\N	396	5	\N	\N	\N	\N	2025-06-04 00:59:23.131922	2025-06-04 00:59:23.131922	SL394	2510 Adams St	\N	Port Coquitlam	BC	V5N 6F9	Canada	429-841-4452	\N	f
100	\N	797	17	\N	\N	\N	\N	2025-06-04 00:59:23.156706	2025-06-04 00:59:23.156706	SL17	8732 Fillmore Ave	\N	Delta	BC	V6T 0F9	Canada	667-348-8397	\N	f
101	\N	398	12	\N	\N	\N	\N	2025-06-04 00:59:23.182442	2025-06-04 00:59:23.182442	SL268	2967 Park Ave	\N	New Westminster	BC	V5M 5J9	Canada	447-304-5001	\N	f
102	\N	399	5	\N	\N	\N	\N	2025-06-04 00:59:23.200352	2025-06-04 00:59:23.200352	SL381	5277 Cedar Ave	\N	Surrey	BC	V6A 3U0	Canada	486-908-8993	\N	f
103	\N	2100	19	\N	\N	\N	\N	2025-06-04 00:59:23.222442	2025-06-04 00:59:23.222442	SL46	6364 Pierce St	Unit 40	Delta	BC	V6B 7T5	Canada	\N	Unit 2100 - City view	f
104	\N	8101	19	\N	\N	\N	\N	2025-06-04 00:59:23.246554	2025-06-04 00:59:23.246554	SL418	565 Seventh St	Unit 28	Vancouver	BC	V5M 2O8	Canada	253-706-1835	\N	f
105	\N	14102	3	\N	\N	\N	\N	2025-06-04 00:59:23.268993	2025-06-04 00:59:23.268993	SL144	1772 Pine St	\N	Maple Ridge	BC	V5N 3T5	Canada	910-790-9183	\N	f
106	\N	5103	6	\N	\N	\N	\N	2025-06-04 00:59:23.287014	2025-06-04 00:59:23.287014	SL365	8398 Park Ave	\N	New Westminster	BC	V6C 3O4	Canada	362-318-8761	\N	f
107	\N	6104	4	\N	\N	\N	\N	2025-06-04 00:59:23.313215	2025-06-04 00:59:23.313215	SL144	2720 Monroe Ave	\N	North Vancouver	BC	V6R 8W5	Canada	857-365-8100	Unit 6104 - Renovated	f
108	\N	18105	4	\N	\N	\N	\N	2025-06-04 00:59:23.333662	2025-06-04 00:59:23.333662	SL210	5003 Main St	\N	Burnaby	BC	V5Y 0L4	Canada	305-791-1848	\N	f
109	\N	3106	13	\N	\N	\N	\N	2025-06-04 00:59:23.344164	2025-06-04 00:59:23.344164	SL494	3631 Monroe Ave	\N	Surrey	BC	V6M 8Q4	Canada	\N	Unit 3106 - Corner unit	f
110	\N	14107	6	\N	\N	\N	\N	2025-06-04 00:59:23.361347	2025-06-04 00:59:23.361347	SL103	3893 Sixth St	Unit 14	Delta	BC	V5T 1G0	Canada	\N	\N	f
111	\N	4108	5	\N	\N	\N	\N	2025-06-04 00:59:23.377809	2025-06-04 00:59:23.377809	SL416	5069 Oak Ave	\N	Pitt Meadows	BC	V7B 2P7	Canada	\N	Unit 4108 - Corner unit	f
112	\N	9109	17	\N	\N	\N	\N	2025-06-04 00:59:23.403436	2025-06-04 00:59:23.403436	SL116	8076 Grant St	\N	Bowen Island	BC	V6J 5Z5	Canada	775-963-8738	\N	f
113	\N	5110	16	\N	\N	\N	\N	2025-06-04 00:59:23.414536	2025-06-04 00:59:23.414536	SL220	9683 Washington St	\N	Anmore	BC	V7A 6M9	Canada	375-233-4232	Unit 5110 - Garden view	f
114	\N	12111	8	\N	\N	\N	\N	2025-06-04 00:59:23.432983	2025-06-04 00:59:23.432983	SL110	540 Eighth St	\N	Bowen Island	BC	V5R 3N9	Canada	473-692-1013	\N	f
115	\N	1112	3	\N	\N	\N	\N	2025-06-04 00:59:23.456598	2025-06-04 00:59:23.456598	SL101	7621 Fifth St	\N	Surrey	BC	V5T 5C1	Canada	971-574-5700	\N	f
116	\N	19113	13	\N	\N	\N	\N	2025-06-04 00:59:23.47198	2025-06-04 00:59:23.47198	SL244	3808 Grant St	\N	Pitt Meadows	BC	V6K 3J0	Canada	547-640-7276	Unit 19113 - Garden view	f
117	\N	9114	4	\N	\N	\N	\N	2025-06-04 00:59:23.491308	2025-06-04 00:59:23.491308	SL264	4935 Sixth St	\N	North Vancouver	BC	V6G 4E9	Canada	\N	Unit 9114 - Mountain view	f
118	\N	6115	16	\N	\N	\N	\N	2025-06-04 00:59:23.513391	2025-06-04 00:59:23.513391	SL399	9285 Hayes Ave	Unit 41	Delta	BC	V5K 4U8	Canada	\N	\N	f
119	\N	19116	20	\N	\N	\N	\N	2025-06-04 00:59:23.538905	2025-06-04 00:59:23.538905	SL51	7262 Elm St	\N	Pitt Meadows	BC	V5P 7L5	Canada	\N	\N	f
120	\N	11117	4	\N	\N	\N	\N	2025-06-04 00:59:23.568628	2025-06-04 00:59:23.568628	SL359	1533 Fifth St	Unit 30	Delta	BC	V6L 1I4	Canada	\N	\N	f
121	\N	17118	19	\N	\N	\N	\N	2025-06-04 00:59:23.592564	2025-06-04 00:59:23.592564	SL187	6813 Third St	\N	Lions Bay	BC	V6V 4X4	Canada	774-293-6812	Unit 17118 - Renovated	f
122	\N	1119	12	\N	\N	\N	\N	2025-06-04 00:59:23.613456	2025-06-04 00:59:23.613456	SL206	5089 Main St	\N	Burnaby	BC	V6A 4D8	Canada	389-437-3938	Unit 1119 - Original condition	f
123	\N	16120	2	\N	\N	\N	\N	2025-06-04 00:59:23.644445	2025-06-04 00:59:23.644445	SL7	4400 Polk St	\N	White Rock	BC	V7A 2V4	Canada	866-753-6429	Unit 16120 - Corner unit	f
124	\N	14121	11	\N	\N	\N	\N	2025-06-04 00:59:23.655644	2025-06-04 00:59:23.655644	SL204	3480 Pine St	\N	North Vancouver	BC	V6H 4T6	Canada	384-201-2524	\N	f
125	\N	7122	11	\N	\N	\N	\N	2025-06-04 00:59:23.678122	2025-06-04 00:59:23.678122	SL342	6398 Jackson Ave	\N	Surrey	BC	V7C 5E2	Canada	257-655-3481	Unit 7122 - Renovated	f
126	\N	13123	6	\N	\N	\N	\N	2025-06-04 00:59:23.692047	2025-06-04 00:59:23.692047	SL149	2304 Eighth St	\N	Maple Ridge	BC	V5N 9C8	Canada	\N	Unit 13123 - Corner unit	f
127	\N	7124	7	\N	\N	\N	\N	2025-06-04 00:59:23.703942	2025-06-04 00:59:23.703942	SL230	1382 Taylor Dr	\N	Port Coquitlam	BC	V5R 1L9	Canada	\N	Unit 7124 - City view	f
128	\N	8125	13	\N	\N	\N	\N	2025-06-04 00:59:23.722735	2025-06-04 00:59:23.722735	SL55	3054 Tyler Ave	\N	Belcarra	BC	V5K 6R7	Canada	251-293-6523	\N	f
129	\N	20126	14	\N	\N	\N	\N	2025-06-04 00:59:23.750035	2025-06-04 00:59:23.750035	SL3	3975 Hayes Ave	\N	Pitt Meadows	BC	V6H 7F3	Canada	385-468-1407	Unit 20126 - Original condition	f
130	\N	1127	16	\N	\N	\N	\N	2025-06-04 00:59:23.761741	2025-06-04 00:59:23.761741	SL310	1464 Pine St	Unit 41	Burnaby	BC	V6W 6S1	Canada	376-797-1459	\N	f
131	\N	7128	10	\N	\N	\N	\N	2025-06-04 00:59:23.780096	2025-06-04 00:59:23.780096	SL183	3221 Johnson Dr	Unit 8	Surrey	BC	V6E 2S5	Canada	\N	Unit 7128 - Garden view	f
132	\N	13129	12	\N	\N	\N	\N	2025-06-04 00:59:23.798821	2025-06-04 00:59:23.798821	SL213	1602 Jackson Ave	\N	Port Coquitlam	BC	V6A 4F5	Canada	\N	\N	f
133	\N	9130	2	\N	\N	\N	\N	2025-06-04 00:59:23.820973	2025-06-04 00:59:23.820973	SL351	9615 Taylor Dr	\N	Pitt Meadows	BC	V6A 3S2	Canada	\N	Unit 9130 - Corner unit	f
134	\N	14131	5	\N	\N	\N	\N	2025-06-04 00:59:23.835711	2025-06-04 00:59:23.835711	SL182	8655 Lincoln Ave	Unit 37	Belcarra	BC	V6B 7R0	Canada	\N	\N	f
135	\N	14132	14	\N	\N	\N	\N	2025-06-04 00:59:23.862746	2025-06-04 00:59:23.862746	SL315	9302 Grant St	Unit 47	Vancouver	BC	V6S 9B0	Canada	970-406-6232	\N	f
136	\N	4133	7	\N	\N	\N	\N	2025-06-04 00:59:23.885417	2025-06-04 00:59:23.885417	SL103	9688 Buchanan Ave	\N	Bowen Island	BC	V6T 3V8	Canada	949-395-1762	\N	f
137	\N	19134	6	\N	\N	\N	\N	2025-06-04 00:59:23.915973	2025-06-04 00:59:23.915973	SL169	3960 Hayes Ave	Unit 46	Coquitlam	BC	V6R 8S4	Canada	329-783-2067	\N	f
138	\N	10135	8	\N	\N	\N	\N	2025-06-04 00:59:23.939162	2025-06-04 00:59:23.939162	SL12	834 Fifth St	\N	Bowen Island	BC	V6H 3K5	Canada	769-911-9132	\N	f
139	\N	6136	2	\N	\N	\N	\N	2025-06-04 00:59:23.96222	2025-06-04 00:59:23.96222	SL165	4634 Jackson Ave	\N	Burnaby	BC	V6P 2M8	Canada	809-938-3177	\N	f
140	\N	5137	3	\N	\N	\N	\N	2025-06-04 00:59:23.984583	2025-06-04 00:59:23.984583	SL379	8155 Second St	\N	North Vancouver	BC	V7B 2D5	Canada	491-818-6591	\N	f
141	\N	15138	11	\N	\N	\N	\N	2025-06-04 00:59:24.00067	2025-06-04 00:59:24.00067	SL85	6028 Washington St	\N	North Vancouver	BC	V5S 7F2	Canada	488-263-6130	\N	f
142	\N	8139	13	\N	\N	\N	\N	2025-06-04 00:59:24.023713	2025-06-04 00:59:24.023713	SL152	6996 Washington St	\N	Pitt Meadows	BC	V5L 2O5	Canada	843-253-2882	\N	f
143	\N	18140	14	\N	\N	\N	\N	2025-06-04 00:59:24.046792	2025-06-04 00:59:24.046792	SL75	4849 Pine St	\N	Langley	BC	V6W 6Z5	Canada	704-272-7301	Unit 18140 - Original condition	f
144	\N	3141	2	\N	\N	\N	\N	2025-06-04 00:59:24.072251	2025-06-04 00:59:24.072251	SL496	1662 Fifth St	Unit 21	Surrey	BC	V7B 5H6	Canada	923-685-3169	\N	f
145	\N	1142	12	\N	\N	\N	\N	2025-06-04 00:59:24.101714	2025-06-04 00:59:24.101714	SL207	8229 Jefferson Dr	\N	Pitt Meadows	BC	V5L 0P9	Canada	\N	\N	f
146	\N	5143	1	\N	\N	\N	\N	2025-06-04 00:59:24.121461	2025-06-04 00:59:24.121461	SL119	2279 Cedar Ave	\N	Coquitlam	BC	V5L 8U9	Canada	\N	\N	f
147	\N	15144	10	\N	\N	\N	\N	2025-06-04 00:59:24.152246	2025-06-04 00:59:24.152246	SL302	5950 Oak Ave	\N	Port Coquitlam	BC	V6M 0C6	Canada	779-393-5948	Unit 15144 - Garden view	f
148	\N	9145	9	\N	\N	\N	\N	2025-06-04 00:59:24.178964	2025-06-04 00:59:24.178964	SL347	2580 Fillmore Ave	\N	Pitt Meadows	BC	V6L 2G2	Canada	228-740-2518	\N	f
150	\N	17621	27	\N	\N	\N	\N	2025-06-04 01:00:25.297251	2025-06-04 01:00:25.297251	SL155	8429 Polk St	\N	Vancouver	BC	V6T 2E5	Canada	\N	\N	f
151	\N	15102	15	\N	\N	\N	\N	2025-06-04 01:00:25.339887	2025-06-04 01:00:25.339887	SL428	2410 Madison St	\N	Belcarra	BC	V6S 5A8	Canada	287-288-2634	\N	f
152	\N	17403	30	\N	\N	\N	\N	2025-06-04 01:00:25.361761	2025-06-04 01:00:25.361761	SL344	6833 Main St	\N	White Rock	BC	V6P 7D3	Canada	961-481-4267	Unit 17403 - Mountain view	f
153	\N	1704	3	\N	\N	\N	\N	2025-06-04 01:00:25.394086	2025-06-04 01:00:25.394086	SL263	1078 Second St	\N	Delta	BC	V7E 2M8	Canada	614-811-2374	\N	f
154	\N	28332	22	\N	\N	\N	\N	2025-06-04 01:00:25.420971	2025-06-04 01:00:25.420971	SL322	3388 Oak Ave	\N	Richmond	BC	V6R 9B2	Canada	628-382-6311	\N	f
155	\N	11680	20	\N	\N	\N	\N	2025-06-04 01:00:25.450695	2025-06-04 01:00:25.450695	SL145	5636 Fifth St	Unit 26	Coquitlam	BC	V6B 2N9	Canada	725-519-2161	Unit 11680 - Original condition	f
156	\N	1275	18	\N	\N	\N	\N	2025-06-04 01:00:25.468806	2025-06-04 01:00:25.468806	SL315	4813 Oak Ave	\N	Anmore	BC	V7E 0Y9	Canada	923-476-2074	Unit 1275 - Renovated	f
157	\N	12338	15	\N	\N	\N	\N	2025-06-04 01:00:25.494764	2025-06-04 01:00:25.494764	SL392	2996 Pierce St	\N	Pitt Meadows	BC	V6B 8O5	Canada	\N	\N	f
158	\N	24929	18	\N	\N	\N	\N	2025-06-04 01:00:25.520647	2025-06-04 01:00:25.520647	SL381	8805 Maple Dr	\N	Maple Ridge	BC	V6G 3D0	Canada	255-992-6036	\N	f
159	\N	19346	10	\N	\N	\N	\N	2025-06-04 01:00:25.551095	2025-06-04 01:00:25.551095	SL196	2764 Washington St	\N	Anmore	BC	V6M 4P3	Canada	855-945-3929	Unit 19346 - Mountain view	f
160	\N	21430	7	\N	\N	\N	\N	2025-06-04 01:00:25.577359	2025-06-04 01:00:25.577359	SL146	4378 Tyler Ave	\N	White Rock	BC	V7A 3P4	Canada	390-867-6323	\N	f
161	\N	30901	14	\N	\N	\N	\N	2025-06-04 01:00:25.608616	2025-06-04 01:00:25.608616	SL343	3714 Adams St	\N	Port Moody	BC	V5V 4L9	Canada	829-759-2229	Unit 30901 - Mountain view	f
162	\N	7588	6	\N	\N	\N	\N	2025-06-04 01:00:25.637231	2025-06-04 01:00:25.637231	SL38	9743 First St	\N	Surrey	BC	V6S 2Y8	Canada	\N	\N	f
163	\N	2755	13	\N	\N	\N	\N	2025-06-04 01:00:25.671328	2025-06-04 01:00:25.671328	SL155	7115 Grant St	Unit 20	Port Moody	BC	V6B 8L0	Canada	\N	Unit 2755 - Mountain view	f
164	\N	9449	6	\N	\N	\N	\N	2025-06-04 01:00:25.693018	2025-06-04 01:00:25.693018	SL300	3030 Jefferson Dr	\N	Pitt Meadows	BC	V7B 2S4	Canada	271-868-4594	Unit 9449 - City view	f
165	\N	6814	21	\N	\N	\N	\N	2025-06-04 01:00:25.717453	2025-06-04 01:00:25.717453	SL72	1281 Johnson Dr	\N	New Westminster	BC	V5L 1H9	Canada	\N	\N	f
166	\N	16665	19	\N	\N	\N	\N	2025-06-04 01:00:25.749206	2025-06-04 01:00:25.749206	SL432	8625 Elm St	\N	Langley	BC	V6B 9P1	Canada	638-988-4079	Unit 16665 - City view	f
167	\N	19700	6	\N	\N	\N	\N	2025-06-04 01:00:25.767565	2025-06-04 01:00:25.767565	SL360	9298 Grant St	\N	North Vancouver	BC	V7H 8Q7	Canada	373-856-6842	Unit 19700 - Corner unit	f
168	\N	2677	4	\N	\N	\N	\N	2025-06-04 01:00:25.780916	2025-06-04 01:00:25.780916	SL444	5427 Harrison St	Unit 16	New Westminster	BC	V5M 2J2	Canada	\N	\N	f
169	\N	21989	4	\N	\N	\N	\N	2025-06-04 01:00:25.811429	2025-06-04 01:00:25.811429	SL242	2544 Monroe Ave	\N	North Vancouver	BC	V6W 7E2	Canada	349-439-4362	Unit 21989 - Corner unit	f
170	\N	11530	8	\N	\N	\N	\N	2025-06-04 01:00:25.825307	2025-06-04 01:00:25.825307	SL173	4444 Monroe Ave	Unit 16	Port Coquitlam	BC	V5V 1J9	Canada	\N	\N	f
171	\N	9167	29	\N	\N	\N	\N	2025-06-04 01:00:25.847677	2025-06-04 01:00:25.847677	SL233	7816 Adams St	\N	Bowen Island	BC	V7E 0N8	Canada	382-614-5235	Unit 9167 - Mountain view	f
172	\N	29250	5	\N	\N	\N	\N	2025-06-04 01:00:25.871425	2025-06-04 01:00:25.871425	SL229	3458 Fillmore Ave	Unit 22	Bowen Island	BC	V6B 4Y3	Canada	287-867-6985	\N	f
173	\N	20987	28	\N	\N	\N	\N	2025-06-04 01:00:25.884203	2025-06-04 01:00:25.884203	SL425	6692 Jefferson Dr	\N	West Vancouver	BC	V5T 2G9	Canada	275-778-3999	\N	f
174	\N	27197	24	\N	\N	\N	\N	2025-06-04 01:00:25.919796	2025-06-04 01:00:25.919796	SL363	1468 Taylor Dr	\N	Maple Ridge	BC	V7H 7Z4	Canada	556-982-3372	\N	f
175	\N	26290	28	\N	\N	\N	\N	2025-06-04 01:00:25.948316	2025-06-04 01:00:25.948316	SL302	461 Park Ave	\N	Belcarra	BC	V6H 4L2	Canada	695-311-7525	\N	f
176	\N	19963	30	\N	\N	\N	\N	2025-06-04 01:00:25.965207	2025-06-04 01:00:25.965207	SL112	3200 Maple Dr	\N	Lions Bay	BC	V6G 0K5	Canada	634-715-6410	Unit 19963 - Mountain view	f
177	\N	21264	28	\N	\N	\N	\N	2025-06-04 01:00:25.997334	2025-06-04 01:00:25.997334	SL100	4499 Van Buren Dr	Unit 40	Richmond	BC	V5T 8B4	Canada	590-493-2043	\N	f
178	\N	21544	13	\N	\N	\N	\N	2025-06-04 01:00:26.011017	2025-06-04 01:00:26.011017	SL219	2020 Jackson Ave	Unit 9	West Vancouver	BC	V5R 2J2	Canada	393-344-9362	Unit 21544 - Corner unit	f
179	\N	12667	29	\N	\N	\N	\N	2025-06-04 01:00:26.035145	2025-06-04 01:00:26.035145	SL388	9238 Jackson Ave	\N	Delta	BC	V6C 1Q7	Canada	\N	\N	f
180	\N	4530	29	\N	\N	\N	\N	2025-06-04 01:00:26.067434	2025-06-04 01:00:26.067434	SL251	211 Eighth St	\N	Maple Ridge	BC	V6M 7Y4	Canada	\N	\N	f
181	\N	1559	23	\N	\N	\N	\N	2025-06-04 01:00:26.092546	2025-06-04 01:00:26.092546	SL244	233 Third St	\N	Belcarra	BC	V6J 9Z4	Canada	214-824-9826	Unit 1559 - Original condition	f
182	\N	9373	13	\N	\N	\N	\N	2025-06-04 01:00:26.11309	2025-06-04 01:00:26.11309	SL170	9124 Jefferson Dr	\N	Bowen Island	BC	V5N 0M0	Canada	\N	\N	f
183	\N	1565	27	\N	\N	\N	\N	2025-06-04 01:00:26.130204	2025-06-04 01:00:26.130204	SL297	5051 Johnson Dr	\N	Delta	BC	V7C 8P3	Canada	694-405-3741	\N	f
184	\N	639	18	\N	\N	\N	\N	2025-06-04 01:00:26.156542	2025-06-04 01:00:26.156542	SL133	9543 Maple Dr	\N	Port Coquitlam	BC	V5L 5K7	Canada	416-981-3215	\N	f
185	\N	16306	17	\N	\N	\N	\N	2025-06-04 01:00:26.179574	2025-06-04 01:00:26.179574	SL331	6510 Maple Dr	\N	Belcarra	BC	V7A 5E2	Canada	469-247-1447	\N	f
186	\N	29348	26	\N	\N	\N	\N	2025-06-04 01:00:26.200649	2025-06-04 01:00:26.200649	SL443	1122 Oak Ave	\N	North Vancouver	BC	V6L 1O9	Canada	\N	\N	f
187	\N	20115	28	\N	\N	\N	\N	2025-06-04 01:00:26.216733	2025-06-04 01:00:26.216733	SL16	7406 Oak Ave	\N	Port Moody	BC	V6J 2W5	Canada	985-986-3100	Unit 20115 - Corner unit	f
188	\N	16129	20	\N	\N	\N	\N	2025-06-04 01:00:26.241553	2025-06-04 01:00:26.241553	SL259	2597 Monroe Ave	Unit 4	Maple Ridge	BC	V6Y 6Z5	Canada	\N	\N	f
189	\N	1104	14	\N	\N	\N	\N	2025-06-04 01:00:26.270153	2025-06-04 01:00:26.270153	SL317	7291 Jackson Ave	\N	Surrey	BC	V6E 6K5	Canada	531-697-2817	\N	f
190	\N	19772	9	\N	\N	\N	\N	2025-06-04 01:00:26.292954	2025-06-04 01:00:26.292954	SL118	9973 Polk St	\N	White Rock	BC	V7E 0W6	Canada	\N	\N	f
191	\N	11828	24	\N	\N	\N	\N	2025-06-04 01:00:26.32737	2025-06-04 01:00:26.32737	SL116	239 Hayes Ave	Unit 12	Vancouver	BC	V6R 3K5	Canada	\N	Unit 11828 - City view	f
192	\N	10204	5	\N	\N	\N	\N	2025-06-04 01:00:26.348353	2025-06-04 01:00:26.348353	SL300	1603 Fourth St	\N	Pitt Meadows	BC	V6S 4I9	Canada	\N	Unit 10204 - Renovated	f
193	\N	21809	24	\N	\N	\N	\N	2025-06-04 01:00:26.379435	2025-06-04 01:00:26.379435	SL198	5815 Eighth St	\N	Coquitlam	BC	V6J 4I7	Canada	354-865-3465	\N	f
194	\N	24276	25	\N	\N	\N	\N	2025-06-04 01:00:26.391688	2025-06-04 01:00:26.391688	SL81	7716 Polk St	\N	Coquitlam	BC	V6N 0R2	Canada	\N	\N	f
195	\N	24236	9	\N	\N	\N	\N	2025-06-04 01:00:26.415538	2025-06-04 01:00:26.415538	SL339	8802 Cedar Ave	\N	Maple Ridge	BC	V5M 7B5	Canada	\N	Unit 24236 - Renovated	f
196	\N	1986	3	\N	\N	\N	\N	2025-06-04 01:00:26.442677	2025-06-04 01:00:26.442677	SL117	6774 Lincoln Ave	\N	Port Coquitlam	BC	V6H 3W0	Canada	\N	Unit 1986 - Original condition	f
197	\N	2108	15	\N	\N	\N	\N	2025-06-04 01:00:26.463667	2025-06-04 01:00:26.463667	SL344	5013 Pierce St	\N	Bowen Island	BC	V6W 9B1	Canada	355-468-2243	\N	f
198	\N	11164	11	\N	\N	\N	\N	2025-06-04 01:00:26.475744	2025-06-04 01:00:26.475744	SL370	3382 Adams St	\N	Richmond	BC	V7B 0Z6	Canada	290-560-9995	\N	f
199	\N	15582	15	\N	\N	\N	\N	2025-06-04 01:00:26.494988	2025-06-04 01:00:26.494988	SL60	7703 Maple Dr	\N	Richmond	BC	V5Y 3B4	Canada	\N	Unit 15582 - City view	f
200	\N	7777	24	\N	\N	\N	\N	2025-06-04 01:00:26.522809	2025-06-04 01:00:26.522809	SL83	4982 Fillmore Ave	\N	Coquitlam	BC	V7B 5P1	Canada	\N	Unit 7777 - Mountain view	f
201	\N	14518	26	\N	\N	\N	\N	2025-06-04 01:00:26.551372	2025-06-04 01:00:26.551372	SL460	6981 Lincoln Ave	Unit 29	Langley	BC	V5N 9Q3	Canada	648-635-9169	Unit 14518 - Garden view	f
202	\N	22867	17	\N	\N	\N	\N	2025-06-04 01:00:26.572993	2025-06-04 01:00:26.572993	SL49	4998 Taylor Dr	\N	Delta	BC	V7B 8F4	Canada	\N	Unit 22867 - City view	f
203	\N	3755	16	\N	\N	\N	\N	2025-06-04 01:00:26.596097	2025-06-04 01:00:26.596097	SL95	1634 Madison St	\N	Pitt Meadows	BC	V5M 1U2	Canada	\N	Unit 3755 - City view	f
204	\N	2130	19	\N	\N	\N	\N	2025-06-04 01:00:26.614596	2025-06-04 01:00:26.614596	SL224	2191 Pierce St	Unit 28	West Vancouver	BC	V6E 2J3	Canada	201-247-7084	\N	f
205	\N	20492	7	\N	\N	\N	\N	2025-06-04 01:00:26.633139	2025-06-04 01:00:26.633139	SL126	8164 Monroe Ave	\N	Belcarra	BC	V7C 6V5	Canada	516-922-1691	Unit 20492 - Corner unit	f
206	\N	8578	15	\N	\N	\N	\N	2025-06-04 01:00:26.664026	2025-06-04 01:00:26.664026	SL393	9432 Buchanan Ave	\N	Richmond	BC	V5N 9Y3	Canada	\N	\N	f
207	\N	7660	25	\N	\N	\N	\N	2025-06-04 01:00:26.692444	2025-06-04 01:00:26.692444	SL486	6677 Fourth St	Unit 2	Maple Ridge	BC	V5S 7W9	Canada	239-831-7041	\N	f
208	\N	4384	7	\N	\N	\N	\N	2025-06-04 01:00:26.708666	2025-06-04 01:00:26.708666	SL114	7382 Jefferson Dr	\N	Coquitlam	BC	V6C 4M5	Canada	308-620-4850	Unit 4384 - Garden view	f
209	\N	21629	7	\N	\N	\N	\N	2025-06-04 01:00:26.733089	2025-06-04 01:00:26.733089	SL162	2868 Harrison St	\N	Port Moody	BC	V7B 8R6	Canada	219-690-2309	\N	f
210	\N	23103	27	\N	\N	\N	\N	2025-06-04 01:00:26.748448	2025-06-04 01:00:26.748448	SL240	6142 First St	\N	Port Coquitlam	BC	V6C 9C8	Canada	\N	\N	f
211	\N	9305	5	\N	\N	\N	\N	2025-06-04 01:00:26.775869	2025-06-04 01:00:26.775869	SL22	8521 Lincoln Ave	Unit 43	West Vancouver	BC	V6W 4G9	Canada	976-594-3494	Unit 9305 - Garden view	f
212	\N	28666	20	\N	\N	\N	\N	2025-06-04 01:00:26.791141	2025-06-04 01:00:26.791141	SL31	2384 Park Ave	\N	Surrey	BC	V5N 9F9	Canada	\N	\N	f
213	\N	13245	7	\N	\N	\N	\N	2025-06-04 01:00:26.815374	2025-06-04 01:00:26.815374	SL4	1982 Second St	\N	Surrey	BC	V5K 3L5	Canada	\N	\N	f
214	\N	11311	23	\N	\N	\N	\N	2025-06-04 01:00:26.844387	2025-06-04 01:00:26.844387	SL73	9597 Second St	\N	White Rock	BC	V6W 6N2	Canada	383-384-1510	\N	f
215	\N	7837	21	\N	\N	\N	\N	2025-06-04 01:00:26.863777	2025-06-04 01:00:26.863777	SL380	765 Fifth St	\N	Pitt Meadows	BC	V6T 7S7	Canada	\N	\N	f
216	\N	2540	21	\N	\N	\N	\N	2025-06-04 01:00:26.899405	2025-06-04 01:00:26.899405	SL184	7967 Polk St	\N	Coquitlam	BC	V5X 6D5	Canada	452-404-6431	Unit 2540 - Corner unit	f
217	\N	6857	7	\N	\N	\N	\N	2025-06-04 01:00:26.929531	2025-06-04 01:00:26.929531	SL115	9663 Oak Ave	\N	North Vancouver	BC	V6V 9F7	Canada	927-337-9304	Unit 6857 - Mountain view	f
218	\N	20734	13	\N	\N	\N	\N	2025-06-04 01:00:26.956969	2025-06-04 01:00:26.956969	SL5	5758 Madison St	\N	Richmond	BC	V7G 4Z8	Canada	535-371-9867	Unit 20734 - Garden view	f
219	\N	25348	25	\N	\N	\N	\N	2025-06-04 01:00:26.981147	2025-06-04 01:00:26.981147	SL245	2545 Polk St	\N	New Westminster	BC	V6W 2Y8	Canada	735-455-4863	\N	f
220	\N	21358	20	\N	\N	\N	\N	2025-06-04 01:00:27.004397	2025-06-04 01:00:27.004397	SL352	1667 Oak Ave	\N	Langley	BC	V6N 9E6	Canada	\N	Unit 21358 - City view	f
221	\N	29464	15	\N	\N	\N	\N	2025-06-04 01:00:27.015763	2025-06-04 01:00:27.015763	SL276	2222 Fillmore Ave	\N	Coquitlam	BC	V6N 4M1	Canada	849-815-4810	Unit 29464 - City view	f
222	\N	7744	28	\N	\N	\N	\N	2025-06-04 01:00:27.038465	2025-06-04 01:00:27.038465	SL424	8604 Adams St	\N	Lions Bay	BC	V5X 7X8	Canada	924-539-2475	\N	f
223	\N	16880	5	\N	\N	\N	\N	2025-06-04 01:00:27.06581	2025-06-04 01:00:27.06581	SL450	8500 Eighth St	\N	North Vancouver	BC	V7C 5V0	Canada	\N	\N	f
224	\N	24337	27	\N	\N	\N	\N	2025-06-04 01:00:27.081867	2025-06-04 01:00:27.081867	SL352	8486 Pierce St	\N	Burnaby	BC	V6S 1X0	Canada	\N	\N	f
225	\N	25396	27	\N	\N	\N	\N	2025-06-04 01:00:27.113545	2025-06-04 01:00:27.113545	SL450	6318 Main St	\N	Anmore	BC	V7E 5I4	Canada	\N	Unit 25396 - Corner unit	f
226	\N	17424	3	\N	\N	\N	\N	2025-06-04 01:00:27.134435	2025-06-04 01:00:27.134435	SL423	6199 Second St	\N	White Rock	BC	V7E 7Y2	Canada	791-840-9873	Unit 17424 - Garden view	f
227	\N	4969	10	\N	\N	\N	\N	2025-06-04 01:00:27.16287	2025-06-04 01:00:27.16287	SL74	1109 Tyler Ave	\N	Port Coquitlam	BC	V5R 2W6	Canada	984-518-4389	\N	f
228	\N	12882	30	\N	\N	\N	\N	2025-06-04 01:00:27.186392	2025-06-04 01:00:27.186392	SL177	7360 Sixth St	\N	Pitt Meadows	BC	V5N 7V8	Canada	838-647-4079	\N	f
229	\N	3954	18	\N	\N	\N	\N	2025-06-04 01:00:27.213884	2025-06-04 01:00:27.213884	SL220	221 Johnson Dr	\N	White Rock	BC	V6S 4R8	Canada	\N	\N	f
230	\N	2131	5	\N	\N	\N	\N	2025-06-04 01:00:27.23683	2025-06-04 01:00:27.23683	SL258	9642 Elm St	\N	Coquitlam	BC	V7C 9E9	Canada	732-931-8705	Unit 2131 - Original condition	f
231	\N	26969	4	\N	\N	\N	\N	2025-06-04 01:00:27.263013	2025-06-04 01:00:27.263013	SL158	5102 Pine St	\N	Port Coquitlam	BC	V6R 1F7	Canada	673-956-4709	\N	f
232	\N	19815	9	\N	\N	\N	\N	2025-06-04 01:00:27.294392	2025-06-04 01:00:27.294392	SL157	2891 Taylor Dr	\N	Pitt Meadows	BC	V5M 3C8	Canada	784-745-1412	\N	f
233	\N	12565	25	\N	\N	\N	\N	2025-06-04 01:00:27.315507	2025-06-04 01:00:27.315507	SL133	9271 Washington St	\N	West Vancouver	BC	V7E 2S5	Canada	413-210-6209	Unit 12565 - City view	f
234	\N	12317	26	\N	\N	\N	\N	2025-06-04 01:00:27.340746	2025-06-04 01:00:27.340746	SL477	9800 Second St	\N	Belcarra	BC	V6L 2A7	Canada	288-334-9004	\N	f
235	\N	27449	2	\N	\N	\N	\N	2025-06-04 01:00:27.369595	2025-06-04 01:00:27.369595	SL64	1365 Pine St	\N	Maple Ridge	BC	V6H 4V4	Canada	411-463-6289	\N	f
236	\N	13583	21	\N	\N	\N	\N	2025-06-04 01:00:27.403363	2025-06-04 01:00:27.403363	SL457	765 Fourth St	Unit 50	West Vancouver	BC	V5P 1J2	Canada	385-505-8092	\N	f
237	\N	9864	19	\N	\N	\N	\N	2025-06-04 01:00:27.432044	2025-06-04 01:00:27.432044	SL245	7650 Washington St	\N	North Vancouver	BC	V6S 3M7	Canada	349-812-6708	\N	f
238	\N	2994	10	\N	\N	\N	\N	2025-06-04 01:00:27.454637	2025-06-04 01:00:27.454637	SL120	7985 Tyler Ave	\N	Richmond	BC	V5K 3A5	Canada	504-249-2849	\N	f
239	\N	9754	1	\N	\N	\N	\N	2025-06-04 01:00:27.485358	2025-06-04 01:00:27.485358	SL27	5126 Hayes Ave	\N	Maple Ridge	BC	V6M 5A0	Canada	\N	Unit 9754 - Mountain view	f
240	\N	30969	14	\N	\N	\N	\N	2025-06-04 01:00:27.513651	2025-06-04 01:00:27.513651	SL47	2216 Taylor Dr	Unit 13	West Vancouver	BC	V5K 9R1	Canada	266-253-9619	\N	f
241	\N	24870	6	\N	\N	\N	\N	2025-06-04 01:00:27.544596	2025-06-04 01:00:27.544596	SL492	678 Johnson Dr	Unit 6	Coquitlam	BC	V6X 2O5	Canada	868-927-2242	\N	f
242	\N	1406	30	\N	\N	\N	\N	2025-06-04 01:00:27.564906	2025-06-04 01:00:27.564906	SL183	8193 Cedar Ave	Unit 33	Maple Ridge	BC	V6B 3N6	Canada	556-231-7486	\N	f
243	\N	10154	25	\N	\N	\N	\N	2025-06-04 01:00:27.583982	2025-06-04 01:00:27.583982	SL25	916 Taylor Dr	Unit 24	Port Coquitlam	BC	V5N 1J8	Canada	\N	Unit 10154 - Corner unit	f
244	\N	17260	27	\N	\N	\N	\N	2025-06-04 01:00:27.611085	2025-06-04 01:00:27.611085	SL50	8957 Eighth St	Unit 40	Delta	BC	V7B 4C8	Canada	\N	Unit 17260 - City view	f
245	\N	16345	3	\N	\N	\N	\N	2025-06-04 01:00:27.634349	2025-06-04 01:00:27.634349	SL26	1399 Third St	\N	Lions Bay	BC	V5L 9H3	Canada	465-895-6784	\N	f
246	\N	17987	3	\N	\N	\N	\N	2025-06-04 01:00:27.657767	2025-06-04 01:00:27.657767	SL180	1787 Cedar Ave	Unit 32	White Rock	BC	V5X 4O1	Canada	799-505-1985	Unit 17987 - Mountain view	f
247	\N	14431	25	\N	\N	\N	\N	2025-06-04 01:00:27.677391	2025-06-04 01:00:27.677391	SL444	5435 Harrison St	\N	Vancouver	BC	V6H 4G6	Canada	924-805-2064	Unit 14431 - Garden view	f
248	\N	9113	27	\N	\N	\N	\N	2025-06-04 01:00:27.704008	2025-06-04 01:00:27.704008	SL405	254 Third St	Unit 27	Langley	BC	V6M 5Z8	Canada	910-202-7418	\N	f
249	\N	20720	20	\N	\N	\N	\N	2025-06-04 01:00:27.734087	2025-06-04 01:00:27.734087	SL286	3853 Eighth St	\N	Port Moody	BC	V5Y 0I5	Canada	970-864-2750	\N	f
250	\N	2245	7	\N	\N	\N	\N	2025-06-04 01:00:27.761371	2025-06-04 01:00:27.761371	SL70	9905 Maple Dr	\N	Belcarra	BC	V5K 9N4	Canada	462-859-7026	Unit 2245 - Garden view	f
251	\N	8134	6	\N	\N	\N	\N	2025-06-04 01:00:27.784869	2025-06-04 01:00:27.784869	SL443	1430 Jefferson Dr	\N	White Rock	BC	V7E 2N4	Canada	242-403-5610	\N	f
252	\N	12548	6	\N	\N	\N	\N	2025-06-04 01:00:27.817264	2025-06-04 01:00:27.817264	SL239	4700 First St	\N	Coquitlam	BC	V5W 0G3	Canada	697-705-7872	Unit 12548 - Original condition	f
253	\N	10578	14	\N	\N	\N	\N	2025-06-04 01:00:27.846397	2025-06-04 01:00:27.846397	SL334	8727 Buchanan Ave	\N	Port Coquitlam	BC	V5V 3L5	Canada	\N	\N	f
254	\N	3659	13	\N	\N	\N	\N	2025-06-04 01:00:27.87095	2025-06-04 01:00:27.87095	SL222	6672 Elm St	\N	Burnaby	BC	V6Y 9F3	Canada	200-980-9903	\N	f
255	\N	29599	26	\N	\N	\N	\N	2025-06-04 01:00:27.887468	2025-06-04 01:00:27.887468	SL230	1195 Washington St	\N	Bowen Island	BC	V6K 2F8	Canada	\N	\N	f
256	\N	7506	7	\N	\N	\N	\N	2025-06-04 01:00:27.916034	2025-06-04 01:00:27.916034	SL252	3293 Harrison St	\N	White Rock	BC	V6Z 2N4	Canada	730-463-8489	Unit 7506 - City view	f
257	\N	11703	3	\N	\N	\N	\N	2025-06-04 01:00:27.937605	2025-06-04 01:00:27.937605	SL423	9602 First St	\N	Pitt Meadows	BC	V5N 4D6	Canada	328-492-7229	\N	f
258	\N	2622	24	\N	\N	\N	\N	2025-06-04 01:00:27.964268	2025-06-04 01:00:27.964268	SL150	3812 Elm St	\N	Bowen Island	BC	V6S 5G8	Canada	503-855-5516	\N	f
259	\N	25741	1	\N	\N	\N	\N	2025-06-04 01:00:27.989016	2025-06-04 01:00:27.989016	SL363	947 Washington St	\N	Bowen Island	BC	V5Y 5M5	Canada	\N	\N	f
260	\N	12495	2	\N	\N	\N	\N	2025-06-04 01:00:28.006893	2025-06-04 01:00:28.006893	SL255	2306 Fourth St	\N	Delta	BC	V6P 9C4	Canada	\N	\N	f
261	\N	16921	11	\N	\N	\N	\N	2025-06-04 01:00:28.038213	2025-06-04 01:00:28.038213	SL174	7274 Johnson Dr	\N	Coquitlam	BC	V6G 7H6	Canada	434-521-5207	Unit 16921 - Garden view	f
262	\N	19906	13	\N	\N	\N	\N	2025-06-04 01:00:28.061436	2025-06-04 01:00:28.061436	SL105	2228 Fillmore Ave	\N	Coquitlam	BC	V6B 7C8	Canada	688-755-8515	\N	f
263	\N	3775	15	\N	\N	\N	\N	2025-06-04 01:00:28.077573	2025-06-04 01:00:28.077573	SL348	2347 Lincoln Ave	\N	Richmond	BC	V5L 7M7	Canada	540-345-6006	\N	f
264	\N	14929	30	\N	\N	\N	\N	2025-06-04 01:00:28.099157	2025-06-04 01:00:28.099157	SL241	3685 Seventh St	Unit 19	Port Coquitlam	BC	V7B 5Q8	Canada	\N	\N	f
265	\N	22891	11	\N	\N	\N	\N	2025-06-04 01:00:28.130733	2025-06-04 01:00:28.130733	SL354	4550 Polk St	Unit 40	Lions Bay	BC	V7B 4B8	Canada	\N	\N	f
266	\N	18409	16	\N	\N	\N	\N	2025-06-04 01:00:28.161864	2025-06-04 01:00:28.161864	SL332	8922 Washington St	\N	Coquitlam	BC	V6J 3M2	Canada	240-257-5881	\N	f
267	\N	5668	4	\N	\N	\N	\N	2025-06-04 01:00:28.185343	2025-06-04 01:00:28.185343	SL91	2908 Washington St	\N	Richmond	BC	V5V 9P8	Canada	974-907-9102	\N	f
268	\N	1252	7	\N	\N	\N	\N	2025-06-04 01:00:28.213338	2025-06-04 01:00:28.213338	SL196	2072 Park Ave	\N	Belcarra	BC	V6C 1J8	Canada	396-373-8646	\N	f
269	\N	2953	25	\N	\N	\N	\N	2025-06-04 01:00:28.240896	2025-06-04 01:00:28.240896	SL452	2686 Buchanan Ave	\N	Lions Bay	BC	V5W 0W1	Canada	\N	\N	f
270	\N	24368	7	\N	\N	\N	\N	2025-06-04 01:00:28.268609	2025-06-04 01:00:28.268609	SL430	8210 Adams St	Unit 48	Pitt Meadows	BC	V5X 0C5	Canada	510-885-2572	\N	f
271	\N	17786	2	\N	\N	\N	\N	2025-06-04 01:00:28.297178	2025-06-04 01:00:28.297178	SL144	9722 Elm St	Unit 16	Lions Bay	BC	V6N 4A0	Canada	\N	\N	f
272	\N	20143	3	\N	\N	\N	\N	2025-06-04 01:00:28.325385	2025-06-04 01:00:28.325385	SL327	4021 Polk St	\N	Richmond	BC	V6C 3N1	Canada	\N	\N	f
273	\N	5985	21	\N	\N	\N	\N	2025-06-04 01:00:28.342973	2025-06-04 01:00:28.342973	SL460	5688 Fifth St	\N	New Westminster	BC	V6W 2P7	Canada	\N	Unit 5985 - Renovated	f
274	\N	29159	18	\N	\N	\N	\N	2025-06-04 01:00:28.37033	2025-06-04 01:00:28.37033	SL213	7569 Buchanan Ave	\N	Langley	BC	V6W 9T4	Canada	914-215-8042	Unit 29159 - Corner unit	f
275	\N	26271	12	\N	\N	\N	\N	2025-06-04 01:00:28.386376	2025-06-04 01:00:28.386376	SL136	5995 Fourth St	Unit 20	Lions Bay	BC	V6G 6I7	Canada	907-285-1528	\N	f
276	\N	2813	10	\N	\N	\N	\N	2025-06-04 01:00:28.401577	2025-06-04 01:00:28.401577	SL307	670 Jackson Ave	\N	Anmore	BC	V5Z 1W3	Canada	561-658-7268	\N	f
277	\N	26711	15	\N	\N	\N	\N	2025-06-04 01:00:28.419716	2025-06-04 01:00:28.419716	SL212	9707 Jefferson Dr	\N	Bowen Island	BC	V6C 9L6	Canada	\N	\N	f
278	\N	11690	1	\N	\N	\N	\N	2025-06-04 01:00:28.438217	2025-06-04 01:00:28.438217	SL375	7696 Harrison St	\N	Vancouver	BC	V7H 3U9	Canada	654-579-8012	\N	f
279	\N	27894	11	\N	\N	\N	\N	2025-06-04 01:00:28.453724	2025-06-04 01:00:28.453724	SL8	1552 Taylor Dr	\N	Port Moody	BC	V5V 7V8	Canada	901-723-6775	\N	f
280	\N	1525	2	\N	\N	\N	\N	2025-06-04 01:00:28.461634	2025-06-04 01:00:28.461634	SL252	7009 Van Buren Dr	Unit 4	New Westminster	BC	V5M 6F4	Canada	629-694-2499	\N	f
281	\N	21324	22	\N	\N	\N	\N	2025-06-04 01:00:28.482415	2025-06-04 01:00:28.482415	SL286	937 Jefferson Dr	Unit 36	Anmore	BC	V7H 0Z0	Canada	326-428-3125	\N	f
282	\N	30153	13	\N	\N	\N	\N	2025-06-04 01:00:28.501113	2025-06-04 01:00:28.501113	SL498	807 Taylor Dr	Unit 37	Richmond	BC	V6B 4P6	Canada	591-468-2393	\N	f
283	\N	27186	8	\N	\N	\N	\N	2025-06-04 01:00:28.515869	2025-06-04 01:00:28.515869	SL329	8276 First St	\N	West Vancouver	BC	V5L 9V0	Canada	276-593-8406	Unit 27186 - Original condition	f
284	\N	7193	3	\N	\N	\N	\N	2025-06-04 01:00:28.53635	2025-06-04 01:00:28.53635	SL353	181 Lincoln Ave	\N	Port Coquitlam	BC	V5M 3V9	Canada	728-294-9378	\N	f
285	\N	30453	18	\N	\N	\N	\N	2025-06-04 01:00:28.554705	2025-06-04 01:00:28.554705	SL237	2126 Fillmore Ave	Unit 32	New Westminster	BC	V6A 3C7	Canada	\N	\N	f
286	\N	24592	21	\N	\N	\N	\N	2025-06-04 01:00:28.57162	2025-06-04 01:00:28.57162	SL448	1218 Fillmore Ave	\N	Anmore	BC	V6A 3X4	Canada	\N	\N	f
287	\N	5944	13	\N	\N	\N	\N	2025-06-04 01:00:28.588027	2025-06-04 01:00:28.588027	SL254	1701 Van Buren Dr	Unit 26	Pitt Meadows	BC	V6G 5K6	Canada	673-638-6434	\N	f
288	\N	1170	20	\N	\N	\N	\N	2025-06-04 01:00:28.615223	2025-06-04 01:00:28.615223	SL288	7198 Pine St	\N	Richmond	BC	V6B 8W9	Canada	985-897-8533	Unit 1170 - Renovated	f
289	\N	16470	29	\N	\N	\N	\N	2025-06-04 01:00:28.642764	2025-06-04 01:00:28.642764	SL384	1331 Fourth St	\N	Port Coquitlam	BC	V5V 7I8	Canada	654-542-9646	Unit 16470 - City view	f
290	\N	1444	12	\N	\N	\N	\N	2025-06-04 01:00:28.660242	2025-06-04 01:00:28.660242	SL387	5491 Fourth St	\N	West Vancouver	BC	V7E 0X5	Canada	630-838-9543	Unit 1444 - City view	f
291	\N	8679	23	\N	\N	\N	\N	2025-06-04 01:00:28.675357	2025-06-04 01:00:28.675357	SL207	2159 Jackson Ave	Unit 37	North Vancouver	BC	V5K 8A1	Canada	280-408-2550	\N	f
292	\N	1957	25	\N	\N	\N	\N	2025-06-04 01:00:28.702049	2025-06-04 01:00:28.702049	SL151	2668 Taylor Dr	Unit 34	Bowen Island	BC	V6V 7P9	Canada	583-731-5964	\N	f
293	\N	23685	19	\N	\N	\N	\N	2025-06-04 01:00:28.722787	2025-06-04 01:00:28.722787	SL292	6858 Fifth St	\N	Pitt Meadows	BC	V6W 9Q7	Canada	596-235-5620	\N	f
294	\N	28700	5	\N	\N	\N	\N	2025-06-04 01:00:28.735715	2025-06-04 01:00:28.735715	SL104	3570 Grant St	\N	Coquitlam	BC	V6J 7A3	Canada	589-224-6345	\N	f
295	\N	20119	26	\N	\N	\N	\N	2025-06-04 01:00:28.753087	2025-06-04 01:00:28.753087	SL369	3963 Eighth St	\N	Vancouver	BC	V5K 9L3	Canada	749-354-5204	Unit 20119 - Original condition	f
296	\N	15822	13	\N	\N	\N	\N	2025-06-04 01:00:28.774005	2025-06-04 01:00:28.774005	SL467	7687 Tyler Ave	\N	North Vancouver	BC	V6A 2B1	Canada	960-916-7377	Unit 15822 - Garden view	f
297	\N	12750	1	\N	\N	\N	\N	2025-06-04 01:00:28.794725	2025-06-04 01:00:28.794725	SL331	6471 Harrison St	\N	Belcarra	BC	V7E 5V2	Canada	433-557-8281	Unit 12750 - City view	f
298	\N	26641	17	\N	\N	\N	\N	2025-06-04 01:00:28.81235	2025-06-04 01:00:28.81235	SL393	8295 Fourth St	\N	Maple Ridge	BC	V5Y 7Y7	Canada	227-674-5105	\N	f
299	\N	2917	5	\N	\N	\N	\N	2025-06-04 01:00:28.83011	2025-06-04 01:00:28.83011	SL449	6743 Second St	\N	Burnaby	BC	V6G 2R5	Canada	727-584-7460	Unit 2917 - City view	f
300	\N	283	20	\N	\N	\N	\N	2025-06-04 01:00:28.844948	2025-06-04 01:00:28.844948	SL154	4898 Jackson Ave	\N	Langley	BC	V6W 0P5	Canada	361-856-8030	Unit 283 - Mountain view	f
301	\N	29821	8	\N	\N	\N	\N	2025-06-04 01:00:28.865756	2025-06-04 01:00:28.865756	SL491	7921 Maple Dr	\N	Bowen Island	BC	V6W 5E7	Canada	\N	\N	f
302	\N	27272	8	\N	\N	\N	\N	2025-06-04 01:00:28.8831	2025-06-04 01:00:28.8831	SL244	1525 Sixth St	\N	White Rock	BC	V5M 0U9	Canada	\N	\N	f
303	\N	19410	2	\N	\N	\N	\N	2025-06-04 01:00:28.902443	2025-06-04 01:00:28.902443	SL442	5959 Van Buren Dr	\N	Langley	BC	V6B 6V9	Canada	928-753-3032	\N	f
304	\N	27292	15	\N	\N	\N	\N	2025-06-04 01:00:28.922027	2025-06-04 01:00:28.922027	SL14	8758 Fifth St	\N	Coquitlam	BC	V5N 0P6	Canada	788-773-1548	\N	f
305	\N	2960	21	\N	\N	\N	\N	2025-06-04 01:00:28.943674	2025-06-04 01:00:28.943674	SL354	6074 Maple Dr	\N	Maple Ridge	BC	V6X 8M7	Canada	899-427-2877	\N	f
306	\N	1313	10	\N	\N	\N	\N	2025-06-04 01:00:28.965482	2025-06-04 01:00:28.965482	SL168	4284 Buchanan Ave	\N	Pitt Meadows	BC	V7A 4Z4	Canada	534-906-8425	Unit 1313 - City view	f
307	\N	23890	14	\N	\N	\N	\N	2025-06-04 01:00:28.9868	2025-06-04 01:00:28.9868	SL218	6881 Polk St	\N	New Westminster	BC	V7B 3D8	Canada	895-971-7814	\N	f
308	\N	9588	21	\N	\N	\N	\N	2025-06-04 01:00:29.00436	2025-06-04 01:00:29.00436	SL232	9492 Pierce St	\N	Vancouver	BC	V5L 7V9	Canada	419-498-9220	\N	f
309	\N	14806	23	\N	\N	\N	\N	2025-06-04 01:00:29.021209	2025-06-04 01:00:29.021209	SL251	9488 Adams St	\N	Port Moody	BC	V7B 8V5	Canada	590-476-1350	Unit 14806 - City view	f
310	\N	29236	12	\N	\N	\N	\N	2025-06-04 01:00:29.030065	2025-06-04 01:00:29.030065	SL133	1689 Second St	Unit 17	Delta	BC	V7C 6I7	Canada	801-213-6382	\N	f
311	\N	2939	22	\N	\N	\N	\N	2025-06-04 01:00:29.043658	2025-06-04 01:00:29.043658	SL353	8771 Taylor Dr	\N	Surrey	BC	V6J 0O2	Canada	647-589-7570	\N	f
312	\N	26135	2	\N	\N	\N	\N	2025-06-04 01:00:29.059831	2025-06-04 01:00:29.059831	SL492	2261 Fifth St	\N	Surrey	BC	V6M 4S3	Canada	\N	\N	f
313	\N	1311	23	\N	\N	\N	\N	2025-06-04 01:00:29.072881	2025-06-04 01:00:29.072881	SL280	2506 Oak Ave	\N	Pitt Meadows	BC	V7G 4E4	Canada	429-289-6772	Unit 1311 - Renovated	f
314	\N	22168	1	\N	\N	\N	\N	2025-06-04 01:00:29.083947	2025-06-04 01:00:29.083947	SL373	2359 Third St	\N	Pitt Meadows	BC	V5Y 8R8	Canada	\N	\N	f
315	\N	23972	15	\N	\N	\N	\N	2025-06-04 01:00:29.102779	2025-06-04 01:00:29.102779	SL266	1477 Park Ave	\N	North Vancouver	BC	V5Y 7X1	Canada	\N	\N	f
316	\N	6687	20	\N	\N	\N	\N	2025-06-04 01:00:29.11918	2025-06-04 01:00:29.11918	SL57	7479 Fifth St	\N	Belcarra	BC	V6L 4I1	Canada	650-409-6709	\N	f
317	\N	8548	8	\N	\N	\N	\N	2025-06-04 01:00:29.132913	2025-06-04 01:00:29.132913	SL81	1758 Fillmore Ave	\N	Maple Ridge	BC	V5S 5P4	Canada	533-653-1677	Unit 8548 - City view	f
318	\N	9540	18	\N	\N	\N	\N	2025-06-04 01:00:29.151483	2025-06-04 01:00:29.151483	SL483	8031 First St	\N	Port Coquitlam	BC	V6J 1Z8	Canada	456-443-6056	\N	f
319	\N	22913	4	\N	\N	\N	\N	2025-06-04 01:00:29.165785	2025-06-04 01:00:29.165785	SL409	8264 Third St	\N	Lions Bay	BC	V5T 4Y0	Canada	692-715-1537	\N	f
320	\N	26975	16	\N	\N	\N	\N	2025-06-04 01:00:29.185591	2025-06-04 01:00:29.185591	SL83	4388 Cedar Ave	Unit 18	Pitt Meadows	BC	V6S 3H0	Canada	894-477-2104	Unit 26975 - Renovated	f
321	\N	13556	15	\N	\N	\N	\N	2025-06-04 01:00:29.199693	2025-06-04 01:00:29.199693	SL441	1611 Jackson Ave	\N	Maple Ridge	BC	V6W 0O9	Canada	735-542-8933	\N	f
322	\N	1526	7	\N	\N	\N	\N	2025-06-04 01:00:29.214016	2025-06-04 01:00:29.214016	SL92	2602 Second St	Unit 17	Richmond	BC	V6L 1X8	Canada	\N	Unit 1526 - Renovated	f
323	\N	21919	23	\N	\N	\N	\N	2025-06-04 01:00:29.228945	2025-06-04 01:00:29.228945	SL374	6772 Johnson Dr	\N	Lions Bay	BC	V6M 9L4	Canada	\N	\N	f
324	\N	5525	10	\N	\N	\N	\N	2025-06-04 01:00:29.240366	2025-06-04 01:00:29.240366	SL6	1212 Fifth St	\N	Richmond	BC	V7E 9O4	Canada	820-234-7914	Unit 5525 - Original condition	f
325	\N	24629	28	\N	\N	\N	\N	2025-06-04 01:00:29.255389	2025-06-04 01:00:29.255389	SL484	9432 Pierce St	\N	Belcarra	BC	V6B 6I6	Canada	701-782-2829	Unit 24629 - Original condition	f
326	\N	30688	17	\N	\N	\N	\N	2025-06-04 01:00:29.267102	2025-06-04 01:00:29.267102	SL341	6728 First St	\N	Coquitlam	BC	V5R 3V9	Canada	247-499-5367	\N	f
327	\N	4684	2	\N	\N	\N	\N	2025-06-04 01:00:29.289771	2025-06-04 01:00:29.289771	SL253	4248 Hayes Ave	\N	Surrey	BC	V6X 7W7	Canada	891-943-3109	\N	f
328	\N	14950	8	\N	\N	\N	\N	2025-06-04 01:00:29.303363	2025-06-04 01:00:29.303363	SL162	2446 Jefferson Dr	\N	Coquitlam	BC	V7E 4B1	Canada	\N	Unit 14950 - Garden view	f
329	\N	8523	3	\N	\N	\N	\N	2025-06-04 01:00:29.319079	2025-06-04 01:00:29.319079	SL117	3463 Pierce St	\N	Delta	BC	V5N 7L0	Canada	\N	\N	f
330	\N	5306	29	\N	\N	\N	\N	2025-06-04 01:00:29.342159	2025-06-04 01:00:29.342159	SL137	6967 Grant St	\N	Pitt Meadows	BC	V6V 8E4	Canada	502-979-9754	\N	f
331	\N	9839	28	\N	\N	\N	\N	2025-06-04 01:00:29.363842	2025-06-04 01:00:29.363842	SL100	9531 Taylor Dr	\N	Burnaby	BC	V5R 8D4	Canada	699-473-5971	\N	f
332	\N	12800	8	\N	\N	\N	\N	2025-06-04 01:00:29.37533	2025-06-04 01:00:29.37533	SL258	4679 Pine St	\N	North Vancouver	BC	V6M 4I7	Canada	966-607-3514	Unit 12800 - Corner unit	f
333	\N	5383	29	\N	\N	\N	\N	2025-06-04 01:00:29.393176	2025-06-04 01:00:29.393176	SL402	8621 Washington St	\N	Port Moody	BC	V7C 0U7	Canada	\N	Unit 5383 - Corner unit	f
334	\N	1101	23	\N	\N	\N	\N	2025-06-04 01:00:29.411025	2025-06-04 01:00:29.411025	SL229	2850 Fourth St	Unit 33	Bowen Island	BC	V5M 5S3	Canada	736-937-2765	\N	f
335	\N	2177	27	\N	\N	\N	\N	2025-06-04 01:00:29.440765	2025-06-04 01:00:29.440765	SL348	4083 Harrison St	\N	Anmore	BC	V6S 0A6	Canada	232-786-1286	Unit 2177 - Original condition	f
336	\N	18927	20	\N	\N	\N	\N	2025-06-04 01:00:29.450686	2025-06-04 01:00:29.450686	SL440	3791 Third St	\N	New Westminster	BC	V5X 1C0	Canada	273-414-2321	\N	f
337	\N	637	20	\N	\N	\N	\N	2025-06-04 01:00:29.470307	2025-06-04 01:00:29.470307	SL427	1096 Polk St	\N	West Vancouver	BC	V7A 7K7	Canada	570-848-9125	Unit 637 - Original condition	f
338	\N	16864	25	\N	\N	\N	\N	2025-06-04 01:00:29.495883	2025-06-04 01:00:29.495883	SL12	820 Monroe Ave	\N	Belcarra	BC	V5V 4P4	Canada	424-914-9103	\N	f
339	\N	30342	2	\N	\N	\N	\N	2025-06-04 01:00:29.517174	2025-06-04 01:00:29.517174	SL449	6830 Lincoln Ave	\N	White Rock	BC	V6X 2O9	Canada	\N	Unit 30342 - Mountain view	f
340	\N	27478	4	\N	\N	\N	\N	2025-06-04 01:00:29.542007	2025-06-04 01:00:29.542007	SL259	9973 Johnson Dr	\N	Richmond	BC	V7B 1D0	Canada	\N	\N	f
341	\N	19891	28	\N	\N	\N	\N	2025-06-04 01:00:29.569813	2025-06-04 01:00:29.569813	SL70	1235 Taylor Dr	\N	Port Coquitlam	BC	V5N 3Y9	Canada	\N	\N	f
342	\N	6164	26	\N	\N	\N	\N	2025-06-04 01:00:29.595896	2025-06-04 01:00:29.595896	SL393	4755 Fourth St	\N	New Westminster	BC	V5X 2R8	Canada	712-318-9133	\N	f
343	\N	12155	17	\N	\N	\N	\N	2025-06-04 01:00:29.623035	2025-06-04 01:00:29.623035	SL140	3262 Polk St	\N	Surrey	BC	V7E 8O7	Canada	741-319-9593	\N	f
344	\N	18261	6	\N	\N	\N	\N	2025-06-04 01:00:29.642163	2025-06-04 01:00:29.642163	SL9	2959 Lincoln Ave	Unit 37	Maple Ridge	BC	V6N 1A5	Canada	616-803-8693	\N	f
345	\N	14460	1	\N	\N	\N	\N	2025-06-04 01:00:29.667952	2025-06-04 01:00:29.667952	SL83	3285 Elm St	\N	Bowen Island	BC	V6A 0L1	Canada	453-687-1285	Unit 14460 - Corner unit	f
346	\N	11839	20	\N	\N	\N	\N	2025-06-04 01:00:29.681978	2025-06-04 01:00:29.681978	SL156	8656 Fourth St	\N	White Rock	BC	V6Y 4V4	Canada	499-578-1201	Unit 11839 - City view	f
347	\N	15317	5	\N	\N	\N	\N	2025-06-04 01:00:29.707986	2025-06-04 01:00:29.707986	SL170	3396 Adams St	Unit 20	West Vancouver	BC	V6H 7R9	Canada	470-780-9162	\N	f
348	\N	2501	7	\N	\N	\N	\N	2025-06-04 01:00:29.727203	2025-06-04 01:00:29.727203	SL303	4568 Jackson Ave	\N	Coquitlam	BC	V7G 4Z1	Canada	620-613-2842	\N	f
349	\N	10844	14	\N	\N	\N	\N	2025-06-04 01:00:29.742423	2025-06-04 01:00:29.742423	SL330	5691 Fifth St	\N	Burnaby	BC	V6T 2D9	Canada	800-283-7201	\N	f
350	\N	1105		\N	\N	\N	\N	2025-06-05 15:53:41.126361	2025-06-05 15:53:41.126361	554			VANCOUVER	BC	V6B 1X2	Canada			f
\.


--
-- Data for Name: storage_lockers; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.storage_lockers (id, unit_id, identifier, created_at, updated_at) FROM stdin;
7	4	S191	2025-06-04 00:59:20.851768	2025-06-04 00:59:20.851768
8	8	S15	2025-06-04 00:59:20.971903	2025-06-04 00:59:20.971903
9	13	S79	2025-06-04 00:59:21.08935	2025-06-04 00:59:21.08935
10	15	S145	2025-06-04 00:59:21.135637	2025-06-04 00:59:21.135637
11	23	S105	2025-06-04 00:59:21.355721	2025-06-04 00:59:21.355721
12	27	S37	2025-06-04 00:59:21.459261	2025-06-04 00:59:21.459261
13	28	S28	2025-06-04 00:59:21.487563	2025-06-04 00:59:21.487563
14	29	S22	2025-06-04 00:59:21.517206	2025-06-04 00:59:21.517206
15	31	S91	2025-06-04 00:59:21.572095	2025-06-04 00:59:21.572095
16	32	S81	2025-06-04 00:59:21.603209	2025-06-04 00:59:21.603209
17	36	S21	2025-06-04 00:59:21.700959	2025-06-04 00:59:21.700959
18	38	S2	2025-06-04 00:59:21.741684	2025-06-04 00:59:21.741684
19	39	S27	2025-06-04 00:59:21.769083	2025-06-04 00:59:21.769083
20	40	S184	2025-06-04 00:59:21.81623	2025-06-04 00:59:21.81623
21	47	S30	2025-06-04 00:59:21.94961	2025-06-04 00:59:21.94961
22	48	S172	2025-06-04 00:59:21.968586	2025-06-04 00:59:21.968586
23	49	S122	2025-06-04 00:59:21.995718	2025-06-04 00:59:21.995718
24	50	S16	2025-06-04 00:59:22.017067	2025-06-04 00:59:22.017067
25	52	S188	2025-06-04 00:59:22.060483	2025-06-04 00:59:22.060483
26	53	S183	2025-06-04 00:59:22.086004	2025-06-04 00:59:22.086004
27	54	S123	2025-06-04 00:59:22.105392	2025-06-04 00:59:22.105392
28	55	S6	2025-06-04 00:59:22.129186	2025-06-04 00:59:22.129186
29	58	S180	2025-06-04 00:59:22.198191	2025-06-04 00:59:22.198191
30	61	S43	2025-06-04 00:59:22.256912	2025-06-04 00:59:22.256912
31	63	S52	2025-06-04 00:59:22.298872	2025-06-04 00:59:22.298872
32	65	S185	2025-06-04 00:59:22.356852	2025-06-04 00:59:22.356852
33	66	S132	2025-06-04 00:59:22.391438	2025-06-04 00:59:22.391438
34	69	S164	2025-06-04 00:59:22.453736	2025-06-04 00:59:22.453736
35	72	S191	2025-06-04 00:59:22.517996	2025-06-04 00:59:22.517996
36	73	S100	2025-06-04 00:59:22.546509	2025-06-04 00:59:22.546509
37	74	S132	2025-06-04 00:59:22.575983	2025-06-04 00:59:22.575983
38	76	S10	2025-06-04 00:59:22.621497	2025-06-04 00:59:22.621497
39	78	S72	2025-06-04 00:59:22.673485	2025-06-04 00:59:22.673485
40	79	S113	2025-06-04 00:59:22.69657	2025-06-04 00:59:22.69657
41	81	S126	2025-06-04 00:59:22.742349	2025-06-04 00:59:22.742349
42	86	S179	2025-06-04 00:59:22.857449	2025-06-04 00:59:22.857449
43	88	S43	2025-06-04 00:59:22.905874	2025-06-04 00:59:22.905874
44	91	S118	2025-06-04 00:59:22.979155	2025-06-04 00:59:22.979155
45	94	S180	2025-06-04 00:59:23.050481	2025-06-04 00:59:23.050481
46	100	S79	2025-06-04 00:59:23.175079	2025-06-04 00:59:23.175079
47	103	S80	2025-06-04 00:59:23.24288	2025-06-04 00:59:23.24288
48	106	S184	2025-06-04 00:59:23.305077	2025-06-04 00:59:23.305077
49	111	S45	2025-06-04 00:59:23.399114	2025-06-04 00:59:23.399114
50	118	S73	2025-06-04 00:59:23.53452	2025-06-04 00:59:23.53452
51	119	S123	2025-06-04 00:59:23.563142	2025-06-04 00:59:23.563142
52	122	S62	2025-06-04 00:59:23.640062	2025-06-04 00:59:23.640062
53	124	S181	2025-06-04 00:59:23.674188	2025-06-04 00:59:23.674188
54	128	S177	2025-06-04 00:59:23.741786	2025-06-04 00:59:23.741786
55	130	S100	2025-06-04 00:59:23.776169	2025-06-04 00:59:23.776169
56	134	S128	2025-06-04 00:59:23.858327	2025-06-04 00:59:23.858327
57	135	S140	2025-06-04 00:59:23.881433	2025-06-04 00:59:23.881433
58	136	S143	2025-06-04 00:59:23.908749	2025-06-04 00:59:23.908749
59	138	S6	2025-06-04 00:59:23.95837	2025-06-04 00:59:23.95837
60	140	S74	2025-06-04 00:59:23.996432	2025-06-04 00:59:23.996432
61	148	S142	2025-06-04 00:59:24.197669	2025-06-04 00:59:24.197669
62	157	S175	2025-06-04 01:00:25.509665	2025-06-04 01:00:25.509665
63	162	S99	2025-06-04 01:00:25.662607	2025-06-04 01:00:25.662607
64	166	S150	2025-06-04 01:00:25.762631	2025-06-04 01:00:25.762631
65	171	S140	2025-06-04 01:00:25.866853	2025-06-04 01:00:25.866853
66	173	S186	2025-06-04 01:00:25.911878	2025-06-04 01:00:25.911878
67	174	S150	2025-06-04 01:00:25.943646	2025-06-04 01:00:25.943646
68	175	S117	2025-06-04 01:00:25.960795	2025-06-04 01:00:25.960795
69	176	S115	2025-06-04 01:00:25.992826	2025-06-04 01:00:25.992826
70	178	S26	2025-06-04 01:00:26.030737	2025-06-04 01:00:26.030737
71	179	S42	2025-06-04 01:00:26.060771	2025-06-04 01:00:26.060771
72	182	S41	2025-06-04 01:00:26.125171	2025-06-04 01:00:26.125171
73	183	S122	2025-06-04 01:00:26.152353	2025-06-04 01:00:26.152353
74	188	S19	2025-06-04 01:00:26.265596	2025-06-04 01:00:26.265596
75	190	S137	2025-06-04 01:00:26.319035	2025-06-04 01:00:26.319035
76	192	S169	2025-06-04 01:00:26.375171	2025-06-04 01:00:26.375171
77	195	S78	2025-06-04 01:00:26.434114	2025-06-04 01:00:26.434114
78	198	S99	2025-06-04 01:00:26.487293	2025-06-04 01:00:26.487293
79	200	S145	2025-06-04 01:00:26.54614	2025-06-04 01:00:26.54614
80	205	S154	2025-06-04 01:00:26.659794	2025-06-04 01:00:26.659794
81	206	S70	2025-06-04 01:00:26.688104	2025-06-04 01:00:26.688104
82	209	S126	2025-06-04 01:00:26.744053	2025-06-04 01:00:26.744053
83	212	S42	2025-06-04 01:00:26.810999	2025-06-04 01:00:26.810999
84	214	S84	2025-06-04 01:00:26.859743	2025-06-04 01:00:26.859743
85	215	S42	2025-06-04 01:00:26.890927	2025-06-04 01:00:26.890927
86	218	S21	2025-06-04 01:00:26.976924	2025-06-04 01:00:26.976924
87	219	S184	2025-06-04 01:00:27.000397	2025-06-04 01:00:27.000397
88	222	S56	2025-06-04 01:00:27.061409	2025-06-04 01:00:27.061409
89	224	S86	2025-06-04 01:00:27.107928	2025-06-04 01:00:27.107928
90	225	S52	2025-06-04 01:00:27.125949	2025-06-04 01:00:27.125949
91	228	S141	2025-06-04 01:00:27.205714	2025-06-04 01:00:27.205714
92	231	S106	2025-06-04 01:00:27.289006	2025-06-04 01:00:27.289006
93	233	S108	2025-06-04 01:00:27.331883	2025-06-04 01:00:27.331883
94	234	S147	2025-06-04 01:00:27.36461	2025-06-04 01:00:27.36461
95	235	S63	2025-06-04 01:00:27.39863	2025-06-04 01:00:27.39863
96	239	S145	2025-06-04 01:00:27.509446	2025-06-04 01:00:27.509446
97	240	S134	2025-06-04 01:00:27.540484	2025-06-04 01:00:27.540484
98	245	S80	2025-06-04 01:00:27.653728	2025-06-04 01:00:27.653728
99	249	S181	2025-06-04 01:00:27.757194	2025-06-04 01:00:27.757194
100	251	S5	2025-06-04 01:00:27.809116	2025-06-04 01:00:27.809116
101	253	S142	2025-06-04 01:00:27.866655	2025-06-04 01:00:27.866655
102	255	S68	2025-06-04 01:00:27.911421	2025-06-04 01:00:27.911421
103	258	S1	2025-06-04 01:00:27.984787	2025-06-04 01:00:27.984787
104	259	S70	2025-06-04 01:00:28.001344	2025-06-04 01:00:28.001344
105	260	S170	2025-06-04 01:00:28.034086	2025-06-04 01:00:28.034086
106	263	S102	2025-06-04 01:00:28.09468	2025-06-04 01:00:28.09468
107	264	S26	2025-06-04 01:00:28.122606	2025-06-04 01:00:28.122606
108	266	S107	2025-06-04 01:00:28.181258	2025-06-04 01:00:28.181258
109	268	S37	2025-06-04 01:00:28.23611	2025-06-04 01:00:28.23611
110	270	S40	2025-06-04 01:00:28.292944	2025-06-04 01:00:28.292944
111	277	S190	2025-06-04 01:00:28.43188	2025-06-04 01:00:28.43188
112	278	S25	2025-06-04 01:00:28.4511	2025-06-04 01:00:28.4511
113	280	S146	2025-06-04 01:00:28.476113	2025-06-04 01:00:28.476113
114	284	S199	2025-06-04 01:00:28.551367	2025-06-04 01:00:28.551367
115	287	S11	2025-06-04 01:00:28.611405	2025-06-04 01:00:28.611405
116	288	S137	2025-06-04 01:00:28.640586	2025-06-04 01:00:28.640586
117	291	S129	2025-06-04 01:00:28.695976	2025-06-04 01:00:28.695976
118	294	S15	2025-06-04 01:00:28.749852	2025-06-04 01:00:28.749852
119	296	S87	2025-06-04 01:00:28.79142	2025-06-04 01:00:28.79142
120	297	S30	2025-06-04 01:00:28.806556	2025-06-04 01:00:28.806556
121	298	S200	2025-06-04 01:00:28.826935	2025-06-04 01:00:28.826935
122	300	S4	2025-06-04 01:00:28.859765	2025-06-04 01:00:28.859765
123	303	S25	2025-06-04 01:00:28.916522	2025-06-04 01:00:28.916522
124	304	S34	2025-06-04 01:00:28.940418	2025-06-04 01:00:28.940418
125	305	S100	2025-06-04 01:00:28.962061	2025-06-04 01:00:28.962061
126	308	S49	2025-06-04 01:00:29.018113	2025-06-04 01:00:29.018113
127	310	S49	2025-06-04 01:00:29.03807	2025-06-04 01:00:29.03807
128	311	S141	2025-06-04 01:00:29.056867	2025-06-04 01:00:29.056867
129	313	S130	2025-06-04 01:00:29.081018	2025-06-04 01:00:29.081018
130	314	S6	2025-06-04 01:00:29.099838	2025-06-04 01:00:29.099838
131	316	S198	2025-06-04 01:00:29.129599	2025-06-04 01:00:29.129599
132	319	S172	2025-06-04 01:00:29.182586	2025-06-04 01:00:29.182586
133	325	S110	2025-06-04 01:00:29.263844	2025-06-04 01:00:29.263844
134	326	S80	2025-06-04 01:00:29.286741	2025-06-04 01:00:29.286741
135	328	S84	2025-06-04 01:00:29.316077	2025-06-04 01:00:29.316077
136	334	S113	2025-06-04 01:00:29.435847	2025-06-04 01:00:29.435847
137	336	S135	2025-06-04 01:00:29.466858	2025-06-04 01:00:29.466858
138	337	S75	2025-06-04 01:00:29.490934	2025-06-04 01:00:29.490934
139	340	S75	2025-06-04 01:00:29.565116	2025-06-04 01:00:29.565116
140	341	S136	2025-06-04 01:00:29.587874	2025-06-04 01:00:29.587874
141	344	S187	2025-06-04 01:00:29.660405	2025-06-04 01:00:29.660405
142	345	S31	2025-06-04 01:00:29.678545	2025-06-04 01:00:29.678545
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.system_settings (id, setting_key, setting_value, description, updated_at, updated_by_id) FROM stdin;
11	default_language	en	\N	2025-06-02 22:11:54.463	1
12	strata_logo		\N	2025-06-02 22:11:54.712	1
13	email_config	{"host":"mail.smtp2go.com","port":2525,"secure":false,"auth":{"user":"spectrum4.ca","pass":"1DXzEJY4XqySY55z"},"from":"no-reply@spectrum4.ca"}	\N	2025-05-29 22:43:05.178428	1
14	email_sender_name	Spectrum 4 	\N	2025-06-05 15:11:14.584	1
15	email_sender_address	no-reply@spectrum4.ca	\N	2025-06-05 15:11:15.207	1
16	email_notifications_enabled	true	\N	2025-06-05 15:11:15.5	1
17	email_logo_enabled	false	\N	2025-06-05 15:11:16.117	1
18	email_footer_text	© Strata Management System	\N	2025-06-05 15:11:16.397	1
19	violation_submitted_subject	New Violation Report	\N	2025-06-05 15:11:17.266	1
20	violation_approved_subject	Violation Approved - Action Required	\N	2025-06-05 15:11:17.517	1
21	violation_disputed_subject	Violation Disputed	\N	2025-06-05 15:11:18.148	1
22	violation_rejected_subject	Violation Rejected	\N	2025-06-05 15:11:18.415	1
1	strata_name	Spectrum 4 (BCS2611)	\N	2025-06-02 22:11:50.077	1
2	property_address	{"streetLine1":"602 Citadel Parade","streetLine2":"","city":"Vancouver","province":"BC","postalCode":"V6B 1X2","country":"Canada"}	\N	2025-06-02 22:11:50.342	1
3	admin_first_name	Daniel	\N	2025-06-02 22:11:50.957	1
4	admin_last_name	Cook	\N	2025-06-02 22:11:51.208	1
5	admin_email	dcook@spectrum4.ca	\N	2025-06-02 22:11:51.817	1
6	admin_phone	7789182701	\N	2025-06-02 22:11:52.089	1
7	property_managers	[{"name":"Daniel Cook","email":"danielcook111@gmail.com","phone":"7789182701","receiveAllViolationEmails":true}]	\N	2025-06-02 22:11:52.684	1
8	caretakers	[{"name":"Daniel Cook","email":"dcook@spectrum4.ca","phone":"7789182701","receiveAllViolationEmails":true}]	\N	2025-06-02 22:11:52.961	1
9	council_members	[{"name":"Daniel Mathew Laimon Cook","email":"Daniel.cook111@protonmail.com","phone":"7789182701","receiveAllViolationEmails":true}]	\N	2025-06-02 22:11:53.574	1
10	default_timezone	America/Vancouver	\N	2025-06-02 22:11:53.837	1
\.


--
-- Data for Name: unit_facilities; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.unit_facilities (id, unit_id, parking_spots, storage_lockers, bike_lockers, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: unit_person_roles; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.unit_person_roles (id, unit_id, person_id, role, receive_email_notifications, created_at) FROM stdin;
2	4	2	owner	t	2025-06-04 00:59:20.837132
3	5	3	owner	t	2025-06-04 00:59:20.867271
4	5	4	tenant	t	2025-06-04 00:59:20.879616
5	6	5	owner	t	2025-06-04 00:59:20.912576
6	6	6	tenant	f	2025-06-04 00:59:20.920951
7	7	7	owner	t	2025-06-04 00:59:20.939067
8	8	8	owner	f	2025-06-04 00:59:20.95269
9	8	9	tenant	t	2025-06-04 00:59:20.960624
10	9	10	owner	t	2025-06-04 00:59:20.985201
11	9	11	tenant	t	2025-06-04 00:59:20.993048
12	10	12	owner	t	2025-06-04 00:59:21.005944
13	10	13	tenant	t	2025-06-04 00:59:21.014668
14	11	14	owner	f	2025-06-04 00:59:21.033381
15	11	15	tenant	t	2025-06-04 00:59:21.042372
16	12	16	owner	t	2025-06-04 00:59:21.059579
17	13	17	owner	t	2025-06-04 00:59:21.079454
18	13	18	tenant	t	2025-06-04 00:59:21.086279
19	14	19	owner	t	2025-06-04 00:59:21.103736
20	15	20	owner	t	2025-06-04 00:59:21.11696
21	15	21	tenant	t	2025-06-04 00:59:21.124721
22	16	22	owner	f	2025-06-04 00:59:21.154113
23	16	23	tenant	f	2025-06-04 00:59:21.163016
24	17	24	owner	f	2025-06-04 00:59:21.186809
25	17	25	tenant	t	2025-06-04 00:59:21.195839
26	18	26	owner	t	2025-06-04 00:59:21.213386
27	18	27	tenant	t	2025-06-04 00:59:21.220995
28	19	28	owner	t	2025-06-04 00:59:21.244791
29	19	29	tenant	t	2025-06-04 00:59:21.252842
30	20	30	owner	t	2025-06-04 00:59:21.26993
31	20	31	tenant	t	2025-06-04 00:59:21.277702
32	21	32	owner	t	2025-06-04 00:59:21.293835
33	21	33	tenant	f	2025-06-04 00:59:21.301869
34	22	34	owner	t	2025-06-04 00:59:21.314997
35	22	35	tenant	f	2025-06-04 00:59:21.322485
36	23	36	owner	t	2025-06-04 00:59:21.34469
37	23	37	tenant	t	2025-06-04 00:59:21.352061
38	24	38	owner	t	2025-06-04 00:59:21.368853
39	24	39	tenant	t	2025-06-04 00:59:21.376688
40	25	40	owner	t	2025-06-04 00:59:21.396607
41	26	41	owner	t	2025-06-04 00:59:21.413231
42	26	42	tenant	f	2025-06-04 00:59:21.421648
43	27	43	owner	t	2025-06-04 00:59:21.442998
44	27	44	tenant	f	2025-06-04 00:59:21.451554
45	28	45	owner	t	2025-06-04 00:59:21.474099
46	28	46	tenant	f	2025-06-04 00:59:21.483683
47	29	47	owner	t	2025-06-04 00:59:21.504928
48	29	48	tenant	t	2025-06-04 00:59:21.5128
49	30	49	owner	t	2025-06-04 00:59:21.530379
50	30	50	tenant	t	2025-06-04 00:59:21.538823
51	31	51	owner	t	2025-06-04 00:59:21.560564
52	32	52	owner	t	2025-06-04 00:59:21.588068
53	32	53	tenant	t	2025-06-04 00:59:21.595774
54	33	54	owner	t	2025-06-04 00:59:21.615114
55	33	55	tenant	t	2025-06-04 00:59:21.622779
56	34	56	owner	t	2025-06-04 00:59:21.642379
57	34	57	tenant	f	2025-06-04 00:59:21.650435
58	35	58	owner	t	2025-06-04 00:59:21.670491
59	35	59	tenant	f	2025-06-04 00:59:21.679414
60	36	60	owner	t	2025-06-04 00:59:21.691771
61	36	61	tenant	t	2025-06-04 00:59:21.698031
62	37	62	owner	t	2025-06-04 00:59:21.713337
63	38	63	owner	t	2025-06-04 00:59:21.72635
64	38	64	tenant	t	2025-06-04 00:59:21.734117
65	39	65	owner	t	2025-06-04 00:59:21.757892
66	39	66	tenant	f	2025-06-04 00:59:21.766118
67	40	67	owner	t	2025-06-04 00:59:21.781999
68	40	68	tenant	t	2025-06-04 00:59:21.80712
69	41	69	owner	t	2025-06-04 00:59:21.833419
70	42	70	owner	t	2025-06-04 00:59:21.846048
71	43	71	owner	t	2025-06-04 00:59:21.861861
72	43	72	tenant	t	2025-06-04 00:59:21.869052
73	44	73	owner	t	2025-06-04 00:59:21.885765
74	44	74	tenant	t	2025-06-04 00:59:21.894249
75	45	75	owner	t	2025-06-04 00:59:21.913167
76	45	76	tenant	t	2025-06-04 00:59:21.91929
77	46	77	owner	t	2025-06-04 00:59:21.927523
78	47	78	owner	t	2025-06-04 00:59:21.941622
79	47	79	tenant	f	2025-06-04 00:59:21.946958
80	48	80	owner	t	2025-06-04 00:59:21.957673
81	48	81	tenant	t	2025-06-04 00:59:21.963375
82	49	82	owner	t	2025-06-04 00:59:21.979951
83	49	83	tenant	f	2025-06-04 00:59:21.986333
84	50	84	owner	t	2025-06-04 00:59:22.008928
85	50	85	tenant	t	2025-06-04 00:59:22.014561
86	51	86	owner	f	2025-06-04 00:59:22.029892
87	51	87	tenant	f	2025-06-04 00:59:22.036588
88	52	88	owner	t	2025-06-04 00:59:22.047943
89	52	89	tenant	f	2025-06-04 00:59:22.055886
90	53	90	owner	t	2025-06-04 00:59:22.071356
91	53	91	tenant	f	2025-06-04 00:59:22.077518
92	54	92	owner	f	2025-06-04 00:59:22.098441
93	55	93	owner	t	2025-06-04 00:59:22.116635
94	55	94	tenant	f	2025-06-04 00:59:22.123009
95	56	95	owner	t	2025-06-04 00:59:22.138928
96	56	96	tenant	t	2025-06-04 00:59:22.145062
97	57	97	owner	f	2025-06-04 00:59:22.15792
98	57	98	tenant	t	2025-06-04 00:59:22.164951
99	58	99	owner	t	2025-06-04 00:59:22.182783
100	58	100	tenant	t	2025-06-04 00:59:22.189098
101	59	101	owner	t	2025-06-04 00:59:22.209268
102	59	102	tenant	t	2025-06-04 00:59:22.215743
103	60	103	owner	t	2025-06-04 00:59:22.230398
104	61	104	owner	t	2025-06-04 00:59:22.245631
105	61	105	tenant	t	2025-06-04 00:59:22.253304
106	62	106	owner	t	2025-06-04 00:59:22.269404
107	62	107	tenant	t	2025-06-04 00:59:22.275866
108	63	108	owner	t	2025-06-04 00:59:22.287816
109	63	109	tenant	t	2025-06-04 00:59:22.295348
110	64	110	owner	t	2025-06-04 00:59:22.31539
111	64	111	tenant	f	2025-06-04 00:59:22.322988
112	65	112	owner	t	2025-06-04 00:59:22.342669
113	65	113	tenant	t	2025-06-04 00:59:22.349995
114	66	114	owner	f	2025-06-04 00:59:22.372742
115	66	115	tenant	t	2025-06-04 00:59:22.380347
116	67	116	owner	f	2025-06-04 00:59:22.406903
117	67	117	tenant	t	2025-06-04 00:59:22.414052
118	68	118	owner	f	2025-06-04 00:59:22.431818
119	69	119	owner	t	2025-06-04 00:59:22.443629
120	70	120	owner	t	2025-06-04 00:59:22.468118
121	70	121	tenant	t	2025-06-04 00:59:22.475439
122	71	122	owner	t	2025-06-04 00:59:22.493528
123	71	123	tenant	f	2025-06-04 00:59:22.49967
124	72	124	owner	t	2025-06-04 00:59:22.514414
125	73	125	owner	t	2025-06-04 00:59:22.531174
126	73	126	tenant	t	2025-06-04 00:59:22.539121
127	74	127	owner	f	2025-06-04 00:59:22.558448
128	74	128	tenant	t	2025-06-04 00:59:22.566072
129	75	129	owner	t	2025-06-04 00:59:22.587872
130	76	130	owner	t	2025-06-04 00:59:22.60258
131	76	131	tenant	t	2025-06-04 00:59:22.610342
132	77	132	owner	t	2025-06-04 00:59:22.63698
133	78	133	owner	t	2025-06-04 00:59:22.655646
134	78	134	tenant	t	2025-06-04 00:59:22.662984
135	79	135	owner	f	2025-06-04 00:59:22.685041
136	79	136	tenant	t	2025-06-04 00:59:22.692813
137	80	137	owner	t	2025-06-04 00:59:22.708568
138	80	138	tenant	t	2025-06-04 00:59:22.716397
139	81	139	owner	t	2025-06-04 00:59:22.735333
140	82	140	owner	t	2025-06-04 00:59:22.753014
141	83	141	owner	t	2025-06-04 00:59:22.768359
142	83	142	tenant	t	2025-06-04 00:59:22.776108
143	84	143	owner	t	2025-06-04 00:59:22.792104
144	84	144	tenant	t	2025-06-04 00:59:22.799801
145	85	145	owner	t	2025-06-04 00:59:22.811864
146	85	146	tenant	t	2025-06-04 00:59:22.819002
147	86	147	owner	t	2025-06-04 00:59:22.840594
148	86	148	tenant	t	2025-06-04 00:59:22.849982
149	87	149	owner	t	2025-06-04 00:59:22.871304
150	88	150	owner	t	2025-06-04 00:59:22.887734
151	88	151	tenant	t	2025-06-04 00:59:22.895084
152	89	152	owner	t	2025-06-04 00:59:22.918131
153	89	153	tenant	f	2025-06-04 00:59:22.925683
154	90	154	owner	t	2025-06-04 00:59:22.941934
155	90	155	tenant	t	2025-06-04 00:59:22.949884
156	91	156	owner	t	2025-06-04 00:59:22.966743
157	91	157	tenant	t	2025-06-04 00:59:22.974852
158	92	158	owner	t	2025-06-04 00:59:22.993727
159	93	159	owner	t	2025-06-04 00:59:23.010085
160	93	160	tenant	t	2025-06-04 00:59:23.017374
161	94	161	owner	f	2025-06-04 00:59:23.032573
162	94	162	tenant	t	2025-06-04 00:59:23.039761
163	95	163	owner	f	2025-06-04 00:59:23.061789
164	95	164	tenant	t	2025-06-04 00:59:23.068306
165	96	165	owner	f	2025-06-04 00:59:23.079644
166	96	166	tenant	t	2025-06-04 00:59:23.086462
167	97	167	owner	t	2025-06-04 00:59:23.101757
168	97	168	tenant	t	2025-06-04 00:59:23.109043
169	98	169	owner	t	2025-06-04 00:59:23.121446
170	98	170	tenant	t	2025-06-04 00:59:23.127803
171	99	171	owner	t	2025-06-04 00:59:23.139224
172	99	172	tenant	t	2025-06-04 00:59:23.146169
173	100	173	owner	f	2025-06-04 00:59:23.164002
174	100	174	tenant	f	2025-06-04 00:59:23.171175
175	101	175	owner	t	2025-06-04 00:59:23.189419
176	101	176	tenant	t	2025-06-04 00:59:23.19664
177	102	177	owner	t	2025-06-04 00:59:23.207831
178	102	178	tenant	t	2025-06-04 00:59:23.215085
179	103	179	owner	t	2025-06-04 00:59:23.231168
180	103	180	tenant	t	2025-06-04 00:59:23.239191
181	104	181	owner	t	2025-06-04 00:59:23.253431
182	104	182	tenant	t	2025-06-04 00:59:23.258959
183	105	183	owner	t	2025-06-04 00:59:23.276389
184	106	184	owner	t	2025-06-04 00:59:23.294659
185	106	185	tenant	t	2025-06-04 00:59:23.300908
186	107	186	owner	t	2025-06-04 00:59:23.32158
187	107	187	tenant	t	2025-06-04 00:59:23.329726
188	108	188	owner	t	2025-06-04 00:59:23.340618
189	109	189	owner	t	2025-06-04 00:59:23.350803
190	109	190	tenant	f	2025-06-04 00:59:23.357614
191	110	191	owner	t	2025-06-04 00:59:23.367934
192	110	192	tenant	t	2025-06-04 00:59:23.373974
193	111	193	owner	t	2025-06-04 00:59:23.384865
194	111	194	tenant	t	2025-06-04 00:59:23.392169
195	112	195	owner	t	2025-06-04 00:59:23.410977
196	113	196	owner	t	2025-06-04 00:59:23.422018
197	114	197	owner	t	2025-06-04 00:59:23.440974
198	114	198	tenant	t	2025-06-04 00:59:23.448651
199	115	199	owner	t	2025-06-04 00:59:23.464322
200	116	200	owner	t	2025-06-04 00:59:23.479357
201	116	201	tenant	t	2025-06-04 00:59:23.486577
202	117	202	owner	t	2025-06-04 00:59:23.498909
203	117	203	tenant	t	2025-06-04 00:59:23.505913
204	118	204	owner	t	2025-06-04 00:59:23.520106
205	118	205	tenant	f	2025-06-04 00:59:23.527335
206	119	206	owner	t	2025-06-04 00:59:23.547345
207	119	207	tenant	t	2025-06-04 00:59:23.554457
208	120	208	owner	t	2025-06-04 00:59:23.578691
209	120	209	tenant	t	2025-06-04 00:59:23.587654
210	121	210	owner	f	2025-06-04 00:59:23.601474
211	121	211	tenant	t	2025-06-04 00:59:23.609038
212	122	212	owner	t	2025-06-04 00:59:23.621831
213	122	213	tenant	t	2025-06-04 00:59:23.629408
214	123	214	owner	t	2025-06-04 00:59:23.65235
215	124	215	owner	t	2025-06-04 00:59:23.663399
216	124	216	tenant	f	2025-06-04 00:59:23.670425
217	125	217	owner	t	2025-06-04 00:59:23.687728
218	126	218	owner	t	2025-06-04 00:59:23.699801
219	127	219	owner	t	2025-06-04 00:59:23.711452
220	127	220	tenant	t	2025-06-04 00:59:23.718647
221	128	221	owner	t	2025-06-04 00:59:23.729934
222	128	222	tenant	f	2025-06-04 00:59:23.737462
223	129	223	owner	t	2025-06-04 00:59:23.757652
224	130	224	owner	f	2025-06-04 00:59:23.769422
225	131	225	owner	t	2025-06-04 00:59:23.787919
226	132	226	owner	t	2025-06-04 00:59:23.806404
227	132	227	tenant	t	2025-06-04 00:59:23.813448
228	133	228	owner	t	2025-06-04 00:59:23.828936
229	134	229	owner	t	2025-06-04 00:59:23.843434
230	134	230	tenant	t	2025-06-04 00:59:23.850916
231	135	231	owner	t	2025-06-04 00:59:23.870389
232	135	232	tenant	t	2025-06-04 00:59:23.877531
233	136	233	owner	t	2025-06-04 00:59:23.89354
234	136	234	tenant	f	2025-06-04 00:59:23.900451
235	137	235	owner	f	2025-06-04 00:59:23.923881
236	137	236	tenant	t	2025-06-04 00:59:23.931706
237	138	237	owner	t	2025-06-04 00:59:23.946804
238	138	238	tenant	t	2025-06-04 00:59:23.954464
239	139	239	owner	t	2025-06-04 00:59:23.969958
240	139	240	tenant	t	2025-06-04 00:59:23.977628
241	140	241	owner	t	2025-06-04 00:59:23.992611
242	141	242	owner	f	2025-06-04 00:59:24.00865
243	141	243	tenant	t	2025-06-04 00:59:24.015802
244	142	244	owner	t	2025-06-04 00:59:24.031658
245	142	245	tenant	t	2025-06-04 00:59:24.039003
246	143	246	owner	t	2025-06-04 00:59:24.054733
247	143	247	tenant	f	2025-06-04 00:59:24.060926
248	144	248	owner	t	2025-06-04 00:59:24.079741
249	144	249	tenant	t	2025-06-04 00:59:24.086934
250	145	250	owner	t	2025-06-04 00:59:24.108981
251	146	251	owner	f	2025-06-04 00:59:24.129023
252	146	252	tenant	t	2025-06-04 00:59:24.136334
253	147	253	owner	t	2025-06-04 00:59:24.160665
254	147	254	tenant	t	2025-06-04 00:59:24.167839
255	148	255	owner	t	2025-06-04 00:59:24.186569
256	148	256	tenant	f	2025-06-04 00:59:24.193957
257	150	257	owner	t	2025-06-04 01:00:25.310978
258	150	258	tenant	t	2025-06-04 01:00:25.32328
259	151	259	owner	t	2025-06-04 01:00:25.351557
260	152	260	owner	f	2025-06-04 01:00:25.371074
261	152	261	tenant	t	2025-06-04 01:00:25.380432
262	153	262	owner	t	2025-06-04 01:00:25.403581
263	153	263	tenant	t	2025-06-04 01:00:25.412598
264	154	264	owner	t	2025-06-04 01:00:25.429984
265	154	265	tenant	t	2025-06-04 01:00:25.438595
266	155	266	owner	t	2025-06-04 01:00:25.459881
267	156	267	owner	t	2025-06-04 01:00:25.477206
268	157	268	owner	t	2025-06-04 01:00:25.504594
269	158	269	owner	t	2025-06-04 01:00:25.530873
270	158	270	tenant	t	2025-06-04 01:00:25.539731
271	159	271	owner	t	2025-06-04 01:00:25.563784
272	159	272	tenant	t	2025-06-04 01:00:25.572663
273	160	273	owner	t	2025-06-04 01:00:25.585663
274	160	274	tenant	t	2025-06-04 01:00:25.59587
275	161	275	owner	t	2025-06-04 01:00:25.616535
276	161	276	tenant	f	2025-06-04 01:00:25.624359
277	162	277	owner	t	2025-06-04 01:00:25.646373
278	162	278	tenant	t	2025-06-04 01:00:25.654947
279	163	279	owner	t	2025-06-04 01:00:25.679835
280	163	280	tenant	t	2025-06-04 01:00:25.688208
281	164	281	owner	f	2025-06-04 01:00:25.701062
282	164	282	tenant	t	2025-06-04 01:00:25.708802
283	165	283	owner	t	2025-06-04 01:00:25.72504
284	165	284	tenant	t	2025-06-04 01:00:25.732757
285	166	285	owner	t	2025-06-04 01:00:25.758061
286	167	286	owner	f	2025-06-04 01:00:25.776368
287	168	287	owner	t	2025-06-04 01:00:25.788422
288	168	288	tenant	f	2025-06-04 01:00:25.795218
289	169	289	owner	t	2025-06-04 01:00:25.820317
290	170	290	owner	f	2025-06-04 01:00:25.833658
291	170	291	tenant	t	2025-06-04 01:00:25.841823
292	171	292	owner	t	2025-06-04 01:00:25.854601
293	171	293	tenant	t	2025-06-04 01:00:25.860414
294	172	294	owner	t	2025-06-04 01:00:25.87964
295	173	295	owner	t	2025-06-04 01:00:25.892714
296	173	296	tenant	t	2025-06-04 01:00:25.900752
297	174	297	owner	t	2025-06-04 01:00:25.928446
298	174	298	tenant	t	2025-06-04 01:00:25.936721
299	175	299	owner	t	2025-06-04 01:00:25.956989
300	176	300	owner	t	2025-06-04 01:00:25.973308
301	176	301	tenant	t	2025-06-04 01:00:25.981824
302	177	302	owner	f	2025-06-04 01:00:26.005967
303	178	303	owner	t	2025-06-04 01:00:26.019137
304	178	304	tenant	t	2025-06-04 01:00:26.026776
305	179	305	owner	t	2025-06-04 01:00:26.043749
306	179	306	tenant	t	2025-06-04 01:00:26.051733
307	180	307	owner	t	2025-06-04 01:00:26.075822
308	180	308	tenant	t	2025-06-04 01:00:26.084077
309	181	309	owner	t	2025-06-04 01:00:26.100964
310	181	310	tenant	f	2025-06-04 01:00:26.108905
311	182	311	owner	t	2025-06-04 01:00:26.121632
312	183	312	owner	t	2025-06-04 01:00:26.139032
313	183	313	tenant	t	2025-06-04 01:00:26.14871
314	184	314	owner	t	2025-06-04 01:00:26.164214
315	184	315	tenant	t	2025-06-04 01:00:26.171146
316	185	316	owner	t	2025-06-04 01:00:26.187963
317	185	317	tenant	t	2025-06-04 01:00:26.195924
318	186	318	owner	t	2025-06-04 01:00:26.208659
319	187	319	owner	t	2025-06-04 01:00:26.224786
320	187	320	tenant	t	2025-06-04 01:00:26.232853
321	188	321	owner	t	2025-06-04 01:00:26.250344
322	188	322	tenant	t	2025-06-04 01:00:26.258081
323	189	323	owner	t	2025-06-04 01:00:26.28
324	190	324	owner	t	2025-06-04 01:00:26.306582
325	190	325	tenant	f	2025-06-04 01:00:26.315166
326	191	326	owner	t	2025-06-04 01:00:26.336411
327	192	327	owner	t	2025-06-04 01:00:26.356704
328	192	328	tenant	t	2025-06-04 01:00:26.364677
329	193	329	owner	t	2025-06-04 01:00:26.38672
330	194	330	owner	f	2025-06-04 01:00:26.399658
331	194	331	tenant	t	2025-06-04 01:00:26.407081
332	195	332	owner	f	2025-06-04 01:00:26.422915
333	195	333	tenant	t	2025-06-04 01:00:26.429988
334	196	334	owner	t	2025-06-04 01:00:26.450913
335	196	335	tenant	f	2025-06-04 01:00:26.458857
336	197	336	owner	f	2025-06-04 01:00:26.471367
337	198	337	owner	t	2025-06-04 01:00:26.483683
338	199	338	owner	t	2025-06-04 01:00:26.503108
339	199	339	tenant	t	2025-06-04 01:00:26.51071
340	200	340	owner	t	2025-06-04 01:00:26.530859
341	200	341	tenant	t	2025-06-04 01:00:26.538654
342	201	342	owner	t	2025-06-04 01:00:26.560524
343	202	343	owner	t	2025-06-04 01:00:26.581081
344	202	344	tenant	t	2025-06-04 01:00:26.588454
345	203	345	owner	f	2025-06-04 01:00:26.602802
346	203	346	tenant	t	2025-06-04 01:00:26.610343
347	204	347	owner	t	2025-06-04 01:00:26.622382
348	204	348	tenant	t	2025-06-04 01:00:26.628728
349	205	349	owner	t	2025-06-04 01:00:26.640699
350	205	350	tenant	t	2025-06-04 01:00:26.648366
351	206	351	owner	t	2025-06-04 01:00:26.671835
352	206	352	tenant	t	2025-06-04 01:00:26.680012
353	207	353	owner	t	2025-06-04 01:00:26.700422
354	208	354	owner	t	2025-06-04 01:00:26.716818
355	208	355	tenant	t	2025-06-04 01:00:26.724826
356	209	356	owner	t	2025-06-04 01:00:26.740123
357	210	357	owner	t	2025-06-04 01:00:26.756345
358	210	358	tenant	t	2025-06-04 01:00:26.764329
359	211	359	owner	t	2025-06-04 01:00:26.782884
360	212	360	owner	f	2025-06-04 01:00:26.799561
361	212	361	tenant	t	2025-06-04 01:00:26.807184
362	213	362	owner	t	2025-06-04 01:00:26.823772
363	213	363	tenant	t	2025-06-04 01:00:26.832187
364	214	364	owner	f	2025-06-04 01:00:26.85239
365	215	365	owner	t	2025-06-04 01:00:26.871899
366	215	366	tenant	t	2025-06-04 01:00:26.879659
367	216	367	owner	t	2025-06-04 01:00:26.907209
368	216	368	tenant	t	2025-06-04 01:00:26.914818
369	217	369	owner	t	2025-06-04 01:00:26.936959
370	217	370	tenant	t	2025-06-04 01:00:26.944845
371	218	371	owner	t	2025-06-04 01:00:26.965451
372	218	372	tenant	f	2025-06-04 01:00:26.97305
373	219	373	owner	t	2025-06-04 01:00:26.988822
374	219	374	tenant	f	2025-06-04 01:00:26.996641
375	220	375	owner	t	2025-06-04 01:00:27.012093
376	221	376	owner	t	2025-06-04 01:00:27.02377
377	221	377	tenant	f	2025-06-04 01:00:27.031373
378	222	378	owner	t	2025-06-04 01:00:27.04635
379	222	379	tenant	t	2025-06-04 01:00:27.053735
380	223	380	owner	t	2025-06-04 01:00:27.07388
381	224	381	owner	t	2025-06-04 01:00:27.089566
382	224	382	tenant	t	2025-06-04 01:00:27.097346
383	225	383	owner	t	2025-06-04 01:00:27.12187
384	226	384	owner	t	2025-06-04 01:00:27.142799
385	226	385	tenant	t	2025-06-04 01:00:27.149475
386	227	386	owner	t	2025-06-04 01:00:27.17098
387	227	387	tenant	f	2025-06-04 01:00:27.178453
388	228	388	owner	t	2025-06-04 01:00:27.194881
389	228	389	tenant	t	2025-06-04 01:00:27.201693
390	229	390	owner	f	2025-06-04 01:00:27.221759
391	229	391	tenant	t	2025-06-04 01:00:27.229102
392	230	392	owner	t	2025-06-04 01:00:27.243641
393	230	393	tenant	t	2025-06-04 01:00:27.251156
394	231	394	owner	t	2025-06-04 01:00:27.272138
395	231	395	tenant	t	2025-06-04 01:00:27.281106
396	232	396	owner	t	2025-06-04 01:00:27.303125
397	233	397	owner	t	2025-06-04 01:00:27.323917
398	234	398	owner	t	2025-06-04 01:00:27.351202
399	234	399	tenant	f	2025-06-04 01:00:27.360117
400	235	400	owner	t	2025-06-04 01:00:27.377974
401	235	401	tenant	t	2025-06-04 01:00:27.386443
402	236	402	owner	t	2025-06-04 01:00:27.413874
403	236	403	tenant	t	2025-06-04 01:00:27.422426
404	237	404	owner	t	2025-06-04 01:00:27.441509
405	237	405	tenant	t	2025-06-04 01:00:27.4501
406	238	406	owner	f	2025-06-04 01:00:27.462902
407	238	407	tenant	t	2025-06-04 01:00:27.472383
408	239	408	owner	t	2025-06-04 01:00:27.493364
409	239	409	tenant	f	2025-06-04 01:00:27.501856
410	240	410	owner	t	2025-06-04 01:00:27.52178
411	240	411	tenant	f	2025-06-04 01:00:27.529686
412	241	412	owner	t	2025-06-04 01:00:27.552974
413	242	413	owner	t	2025-06-04 01:00:27.572715
414	243	414	owner	t	2025-06-04 01:00:27.591659
415	243	415	tenant	t	2025-06-04 01:00:27.599101
416	244	416	owner	f	2025-06-04 01:00:27.61887
417	244	417	tenant	t	2025-06-04 01:00:27.626521
418	245	418	owner	f	2025-06-04 01:00:27.641971
419	245	419	tenant	t	2025-06-04 01:00:27.649911
420	246	420	owner	t	2025-06-04 01:00:27.665374
421	246	421	tenant	t	2025-06-04 01:00:27.672936
422	247	422	owner	t	2025-06-04 01:00:27.684984
423	247	423	tenant	t	2025-06-04 01:00:27.692385
424	248	424	owner	t	2025-06-04 01:00:27.711665
425	248	425	tenant	f	2025-06-04 01:00:27.71907
426	249	426	owner	t	2025-06-04 01:00:27.742458
427	249	427	tenant	t	2025-06-04 01:00:27.749937
428	250	428	owner	t	2025-06-04 01:00:27.768886
429	251	429	owner	t	2025-06-04 01:00:27.794022
430	251	430	tenant	t	2025-06-04 01:00:27.801645
431	252	431	owner	t	2025-06-04 01:00:27.826253
432	252	432	tenant	t	2025-06-04 01:00:27.834558
433	253	433	owner	t	2025-06-04 01:00:27.85518
434	254	434	owner	t	2025-06-04 01:00:27.879165
435	255	435	owner	t	2025-06-04 01:00:27.895654
436	255	436	tenant	t	2025-06-04 01:00:27.904051
437	256	437	owner	t	2025-06-04 01:00:27.924355
438	256	438	tenant	t	2025-06-04 01:00:27.93274
439	257	439	owner	t	2025-06-04 01:00:27.94712
440	257	440	tenant	t	2025-06-04 01:00:27.955604
441	258	441	owner	t	2025-06-04 01:00:27.97299
442	258	442	tenant	t	2025-06-04 01:00:27.980691
443	259	443	owner	t	2025-06-04 01:00:27.99733
444	260	444	owner	t	2025-06-04 01:00:28.015168
445	260	445	tenant	t	2025-06-04 01:00:28.022858
446	261	446	owner	t	2025-06-04 01:00:28.046327
447	262	447	owner	t	2025-06-04 01:00:28.069385
448	263	448	owner	f	2025-06-04 01:00:28.086407
449	264	449	owner	f	2025-06-04 01:00:28.107137
450	265	450	owner	t	2025-06-04 01:00:28.1396
451	265	451	tenant	t	2025-06-04 01:00:28.146543
452	266	452	owner	t	2025-06-04 01:00:28.169993
453	267	453	owner	t	2025-06-04 01:00:28.193666
454	267	454	tenant	t	2025-06-04 01:00:28.201618
455	268	455	owner	f	2025-06-04 01:00:28.221031
456	268	456	tenant	t	2025-06-04 01:00:28.228109
457	269	457	owner	t	2025-06-04 01:00:28.248908
458	269	458	tenant	t	2025-06-04 01:00:28.256548
459	270	459	owner	t	2025-06-04 01:00:28.277215
460	270	460	tenant	t	2025-06-04 01:00:28.285458
461	271	461	owner	t	2025-06-04 01:00:28.304505
462	271	462	tenant	t	2025-06-04 01:00:28.311157
463	272	463	owner	t	2025-06-04 01:00:28.331072
464	272	464	tenant	t	2025-06-04 01:00:28.336816
465	273	465	owner	t	2025-06-04 01:00:28.350438
466	273	466	tenant	f	2025-06-04 01:00:28.359241
467	274	467	owner	t	2025-06-04 01:00:28.376798
468	274	468	tenant	t	2025-06-04 01:00:28.383137
469	275	469	owner	t	2025-06-04 01:00:28.392177
470	275	470	tenant	t	2025-06-04 01:00:28.39815
471	276	471	owner	t	2025-06-04 01:00:28.407137
472	276	472	tenant	t	2025-06-04 01:00:28.413093
473	277	473	owner	t	2025-06-04 01:00:28.425938
474	278	474	owner	t	2025-06-04 01:00:28.44495
475	279	475	owner	t	2025-06-04 01:00:28.458762
476	280	476	owner	t	2025-06-04 01:00:28.467183
477	280	477	tenant	t	2025-06-04 01:00:28.473093
478	281	478	owner	t	2025-06-04 01:00:28.488535
479	281	479	tenant	t	2025-06-04 01:00:28.494519
480	282	480	owner	t	2025-06-04 01:00:28.507415
481	283	481	owner	t	2025-06-04 01:00:28.521687
482	283	482	tenant	t	2025-06-04 01:00:28.527561
483	284	483	owner	f	2025-06-04 01:00:28.542096
484	284	484	tenant	t	2025-06-04 01:00:28.548122
485	285	485	owner	t	2025-06-04 01:00:28.561025
486	285	486	tenant	t	2025-06-04 01:00:28.567987
487	286	487	owner	f	2025-06-04 01:00:28.57789
488	286	488	tenant	t	2025-06-04 01:00:28.58415
489	287	489	owner	t	2025-06-04 01:00:28.594389
490	287	490	tenant	t	2025-06-04 01:00:28.604931
491	288	491	owner	t	2025-06-04 01:00:28.631051
492	288	492	tenant	t	2025-06-04 01:00:28.635934
493	289	493	owner	t	2025-06-04 01:00:28.648386
494	289	494	tenant	t	2025-06-04 01:00:28.654103
495	290	495	owner	t	2025-06-04 01:00:28.66614
496	290	496	tenant	f	2025-06-04 01:00:28.672038
497	291	497	owner	t	2025-06-04 01:00:28.681735
498	291	498	tenant	t	2025-06-04 01:00:28.687546
499	292	499	owner	t	2025-06-04 01:00:28.707794
500	292	500	tenant	t	2025-06-04 01:00:28.71388
501	293	501	owner	t	2025-06-04 01:00:28.728694
502	294	502	owner	t	2025-06-04 01:00:28.741442
503	294	503	tenant	t	2025-06-04 01:00:28.747006
504	295	504	owner	t	2025-06-04 01:00:28.759231
505	295	505	tenant	t	2025-06-04 01:00:28.764935
506	296	506	owner	t	2025-06-04 01:00:28.780026
507	296	507	tenant	f	2025-06-04 01:00:28.785939
508	297	508	owner	t	2025-06-04 01:00:28.800731
509	298	509	owner	t	2025-06-04 01:00:28.818103
510	298	510	tenant	t	2025-06-04 01:00:28.824054
511	299	511	owner	t	2025-06-04 01:00:28.835937
512	299	512	tenant	t	2025-06-04 01:00:28.841687
513	300	513	owner	t	2025-06-04 01:00:28.851668
514	301	514	owner	t	2025-06-04 01:00:28.87153
515	301	515	tenant	t	2025-06-04 01:00:28.8769
516	302	516	owner	f	2025-06-04 01:00:28.88865
517	302	517	tenant	t	2025-06-04 01:00:28.894026
518	303	518	owner	t	2025-06-04 01:00:28.907917
519	303	519	tenant	f	2025-06-04 01:00:28.913632
520	304	520	owner	t	2025-06-04 01:00:28.927388
521	304	521	tenant	f	2025-06-04 01:00:28.932959
522	305	522	owner	t	2025-06-04 01:00:28.948812
523	305	523	tenant	t	2025-06-04 01:00:28.954212
524	306	524	owner	t	2025-06-04 01:00:28.972057
525	306	525	tenant	t	2025-06-04 01:00:28.977942
526	307	526	owner	t	2025-06-04 01:00:28.992524
527	307	527	tenant	t	2025-06-04 01:00:28.998246
528	308	528	owner	t	2025-06-04 01:00:29.009948
529	308	529	tenant	f	2025-06-04 01:00:29.015564
530	309	530	owner	t	2025-06-04 01:00:29.026848
531	310	531	owner	t	2025-06-04 01:00:29.035389
532	311	532	owner	t	2025-06-04 01:00:29.048792
533	311	533	tenant	t	2025-06-04 01:00:29.054173
534	312	534	owner	t	2025-06-04 01:00:29.065041
535	313	535	owner	f	2025-06-04 01:00:29.078091
536	314	536	owner	t	2025-06-04 01:00:29.089126
537	314	537	tenant	t	2025-06-04 01:00:29.094378
538	315	538	owner	t	2025-06-04 01:00:29.108168
539	315	539	tenant	t	2025-06-04 01:00:29.114925
540	316	540	owner	t	2025-06-04 01:00:29.126186
541	317	541	owner	t	2025-06-04 01:00:29.139697
542	317	542	tenant	f	2025-06-04 01:00:29.145594
543	318	543	owner	f	2025-06-04 01:00:29.157116
544	319	544	owner	t	2025-06-04 01:00:29.171579
545	319	545	tenant	f	2025-06-04 01:00:29.176994
546	320	546	owner	t	2025-06-04 01:00:29.191075
547	321	547	owner	t	2025-06-04 01:00:29.20538
548	322	548	owner	t	2025-06-04 01:00:29.219729
549	322	549	tenant	t	2025-06-04 01:00:29.225604
550	323	550	owner	t	2025-06-04 01:00:29.234638
551	324	551	owner	t	2025-06-04 01:00:29.246451
552	324	552	tenant	f	2025-06-04 01:00:29.252074
553	325	553	owner	t	2025-06-04 01:00:29.260939
554	326	554	owner	t	2025-06-04 01:00:29.272892
555	326	555	tenant	f	2025-06-04 01:00:29.278768
556	327	556	owner	t	2025-06-04 01:00:29.295366
557	327	557	tenant	t	2025-06-04 01:00:29.300399
558	328	558	owner	f	2025-06-04 01:00:29.308344
559	329	559	owner	t	2025-06-04 01:00:29.325338
560	329	560	tenant	f	2025-06-04 01:00:29.332652
561	330	561	owner	t	2025-06-04 01:00:29.348991
562	330	562	tenant	t	2025-06-04 01:00:29.355921
563	331	563	owner	t	2025-06-04 01:00:29.37106
564	332	564	owner	t	2025-06-04 01:00:29.382377
565	332	565	tenant	t	2025-06-04 01:00:29.389098
566	333	566	owner	t	2025-06-04 01:00:29.400404
567	333	567	tenant	t	2025-06-04 01:00:29.407739
568	334	568	owner	t	2025-06-04 01:00:29.419643
569	334	569	tenant	t	2025-06-04 01:00:29.427937
570	335	570	owner	t	2025-06-04 01:00:29.447233
571	336	571	owner	f	2025-06-04 01:00:29.457094
572	336	572	tenant	t	2025-06-04 01:00:29.463581
573	337	573	owner	t	2025-06-04 01:00:29.476122
574	337	574	tenant	t	2025-06-04 01:00:29.483364
575	338	575	owner	t	2025-06-04 01:00:29.504996
576	338	576	tenant	t	2025-06-04 01:00:29.512675
577	339	577	owner	t	2025-06-04 01:00:29.524774
578	339	578	tenant	f	2025-06-04 01:00:29.533427
579	340	579	owner	f	2025-06-04 01:00:29.549761
580	340	580	tenant	t	2025-06-04 01:00:29.557562
581	341	581	owner	t	2025-06-04 01:00:29.5767
582	341	582	tenant	t	2025-06-04 01:00:29.583937
583	342	583	owner	t	2025-06-04 01:00:29.602588
584	342	584	tenant	t	2025-06-04 01:00:29.611283
585	343	585	owner	t	2025-06-04 01:00:29.63057
586	343	586	tenant	t	2025-06-04 01:00:29.637934
587	344	587	owner	t	2025-06-04 01:00:29.650137
588	345	588	owner	t	2025-06-04 01:00:29.67477
589	346	589	owner	t	2025-06-04 01:00:29.689765
590	346	590	tenant	t	2025-06-04 01:00:29.696774
591	347	591	owner	t	2025-06-04 01:00:29.71557
592	347	592	tenant	t	2025-06-04 01:00:29.722928
593	348	593	owner	t	2025-06-04 01:00:29.73457
594	349	594	owner	f	2025-06-04 01:00:29.749773
595	350	1	owner	t	2025-06-05 15:53:41.126361
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.users (id, uuid, email, username, password, full_name, is_council_member, is_admin, is_user, last_login, failed_login_attempts, account_locked, lock_reason, password_reset_token, password_reset_expires, force_password_change, created_at, updated_at) FROM stdin;
4	af9d7cfc-bdfe-43bf-819b-7d23236dadab	danielcook111@gmail.com	danielcook111@gmail.com	9c47acfd0976010daa656a538b559b118600402d9fb082e23a7c417dc3bfb5e6ad73f4c46f95ba4b6809d94bb2b6a4a239e81d48451ac3003bcdefea54d3aa23.12bd12d95c4b588659c1fec33f4553ee	bandan	f	t	f	\N	0	f	\N	\N	\N	f	2025-06-02 15:43:53.983185	2025-06-04 17:02:07.579
1	e200a3b5-55df-4ce7-9fb8-235c0f5c657b	tester@test.com	tester@test.com	a76b45a7cb4f01fce58e0aed33c77a3e7e9bb581334ee0d445fcbd0ea9635ac94091a5f7ca47585755b685e1bfa22c58652d9e50871b4b31479ee398706692d9.7ba640feec8f7c8e51bd417b75bc6285	Tester Admin	t	t	t	2025-06-06 00:49:24.622	0	f	\N	\N	\N	f	2025-05-27 21:43:12.714	2025-05-27 21:43:12.714
\.


--
-- Data for Name: violation_access_links; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.violation_access_links (id, violation_id, recipient_email, token, expires_at, used_at, created_at, violation_uuid) FROM stdin;
4	7	danielcook111@gmail.com	f996e1a7-dea8-4a2f-a5cd-469ad401b9d5	2025-07-05 18:38:12.358	\N	2025-06-05 18:38:12.359405	f8bbfb4b-b7e6-43bb-b4ea-9a421f845d45
\.


--
-- Data for Name: violation_categories; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.violation_categories (id, name, description, bylaw_reference, default_fine_amount, active, created_at, updated_at) FROM stdin;
1	Illegal Move	testing 	3.4.2	500	t	2025-05-27 21:44:42.048653	2025-05-27 21:44:42.046
2	Elevator	asdasdasdasd	3.5.1	100	t	2025-06-01 16:58:17.845902	2025-06-01 16:58:17.842
3	Noise Disturbance	Noise disturbance asdasd asdasd	2.11	0	t	2025-06-04 00:15:05.192291	2025-06-04 00:15:05.19
\.


--
-- Data for Name: violation_histories; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.violation_histories (id, violation_id, user_id, action, comment, commenter_name, created_at, violation_uuid, rejection_reason) FROM stdin;
6	3	1	created	Violation reported.	\N	2025-06-04 00:16:30.247	db3f2438-eab3-4f20-b383-e54765b6b2ff	\N
7	3	1	fine_set	Fine amount set to $700	\N	2025-06-04 01:23:00.325	db3f2438-eab3-4f20-b383-e54765b6b2ff	\N
8	3	1	status_changed_to_approved	\N	\N	2025-06-04 01:23:01.006	db3f2438-eab3-4f20-b383-e54765b6b2ff	\N
\.


--
-- Data for Name: violations; Type: TABLE DATA; Schema: public; Owner: spectrum4
--

COPY public.violations (id, reference_number, unit_id, reported_by_id, category_id, violation_type, violation_date, violation_time, description, bylaw_reference, status, fine_amount, created_at, updated_at, attachments, pdf_generated, pdf_path, uuid, incident_area, concierge_name, people_involved, noticed_by, damage_to_property, damage_details, police_involved, police_details) FROM stdin;
3	945f6ee0-a857-4604-8303-5569ec6f4592	2	1	3	Noise Disturbance	2025-06-02 00:00:00	18:15	asdasdas asdasdasd asdasdasdasd		approved	700	2025-06-04 00:16:30.232	2025-06-04 01:23:00.999	[]	f	\N	db3f2438-eab3-4f20-b383-e54765b6b2ff	\N	\N	\N	\N	\N	\N	\N	\N
7	3a6e123e-4a6a-4e00-9424-6c283edb8c42	350	1	2	Elevator	2025-06-05 00:00:00	11:42	asdasd asda asd asd as da sda sd asd asd asd as		pending_approval	\N	2025-06-05 18:38:12.339	2025-06-05 18:38:12.339	["fd31f5f5-a3ef-4a76-9d2f-01cd49de5f15.jpeg"]	f	\N	f8bbfb4b-b7e6-43bb-b4ea-9a421f845d45	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: bike_lockers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.bike_lockers_id_seq', 106, true);


--
-- Name: bylaw_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.bylaw_categories_id_seq', 1, false);


--
-- Name: bylaw_category_links_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.bylaw_category_links_id_seq', 1, false);


--
-- Name: bylaw_revisions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.bylaw_revisions_id_seq', 1, false);


--
-- Name: bylaws_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.bylaws_id_seq', 19, true);


--
-- Name: communication_campaigns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.communication_campaigns_id_seq', 5, true);


--
-- Name: communication_recipients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.communication_recipients_id_seq', 5, true);


--
-- Name: communication_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.communication_templates_id_seq', 1, false);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.customers_id_seq', 1, false);


--
-- Name: email_deduplication_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.email_deduplication_log_id_seq', 1, false);


--
-- Name: email_idempotency_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.email_idempotency_keys_id_seq', 14, true);


--
-- Name: email_send_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.email_send_attempts_id_seq', 14, true);


--
-- Name: email_tracking_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.email_tracking_events_id_seq', 1, false);


--
-- Name: email_verification_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.email_verification_codes_id_seq', 1, false);


--
-- Name: manual_email_recipients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.manual_email_recipients_id_seq', 1, false);


--
-- Name: parking_spots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.parking_spots_id_seq', 295, true);


--
-- Name: persons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.persons_id_seq', 594, true);


--
-- Name: property_units_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.property_units_id_seq', 350, true);


--
-- Name: storage_lockers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.storage_lockers_id_seq', 142, true);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 22, true);


--
-- Name: unit_facilities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.unit_facilities_id_seq', 1, true);


--
-- Name: unit_person_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.unit_person_roles_id_seq', 595, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- Name: violation_access_links_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.violation_access_links_id_seq', 4, true);


--
-- Name: violation_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.violation_categories_id_seq', 3, true);


--
-- Name: violation_histories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.violation_histories_id_seq', 8, true);


--
-- Name: violations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: spectrum4
--

SELECT pg_catalog.setval('public.violations_id_seq', 7, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bike_lockers bike_lockers_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bike_lockers
    ADD CONSTRAINT bike_lockers_pkey PRIMARY KEY (id);


--
-- Name: bylaw_categories bylaw_categories_name_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaw_categories
    ADD CONSTRAINT bylaw_categories_name_unique UNIQUE (name);


--
-- Name: bylaw_categories bylaw_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaw_categories
    ADD CONSTRAINT bylaw_categories_pkey PRIMARY KEY (id);


--
-- Name: bylaw_category_links bylaw_category_links_bylaw_id_category_id_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaw_category_links
    ADD CONSTRAINT bylaw_category_links_bylaw_id_category_id_unique UNIQUE (bylaw_id, category_id);


--
-- Name: bylaw_category_links bylaw_category_links_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaw_category_links
    ADD CONSTRAINT bylaw_category_links_pkey PRIMARY KEY (id);


--
-- Name: bylaw_revisions bylaw_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaw_revisions
    ADD CONSTRAINT bylaw_revisions_pkey PRIMARY KEY (id);


--
-- Name: bylaws bylaws_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaws
    ADD CONSTRAINT bylaws_pkey PRIMARY KEY (id);


--
-- Name: bylaws bylaws_section_number_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaws
    ADD CONSTRAINT bylaws_section_number_unique UNIQUE (section_number);


--
-- Name: bylaws bylaws_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaws
    ADD CONSTRAINT bylaws_uuid_unique UNIQUE (uuid);


--
-- Name: communication_campaigns communication_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.communication_campaigns
    ADD CONSTRAINT communication_campaigns_pkey PRIMARY KEY (id);


--
-- Name: communication_campaigns communication_campaigns_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.communication_campaigns
    ADD CONSTRAINT communication_campaigns_uuid_unique UNIQUE (uuid);


--
-- Name: communication_recipients communication_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.communication_recipients
    ADD CONSTRAINT communication_recipients_pkey PRIMARY KEY (id);


--
-- Name: communication_recipients communication_recipients_tracking_id_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.communication_recipients
    ADD CONSTRAINT communication_recipients_tracking_id_unique UNIQUE (tracking_id);


--
-- Name: communication_templates communication_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.communication_templates
    ADD CONSTRAINT communication_templates_pkey PRIMARY KEY (id);


--
-- Name: communication_templates communication_templates_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.communication_templates
    ADD CONSTRAINT communication_templates_uuid_unique UNIQUE (uuid);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: customers customers_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_uuid_unique UNIQUE (uuid);


--
-- Name: email_deduplication_log email_deduplication_log_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.email_deduplication_log
    ADD CONSTRAINT email_deduplication_log_pkey PRIMARY KEY (id);


--
-- Name: email_idempotency_keys email_idempotency_keys_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.email_idempotency_keys
    ADD CONSTRAINT email_idempotency_keys_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: email_idempotency_keys email_idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.email_idempotency_keys
    ADD CONSTRAINT email_idempotency_keys_pkey PRIMARY KEY (id);


--
-- Name: email_send_attempts email_send_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.email_send_attempts
    ADD CONSTRAINT email_send_attempts_pkey PRIMARY KEY (id);


--
-- Name: email_tracking_events email_tracking_events_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.email_tracking_events
    ADD CONSTRAINT email_tracking_events_pkey PRIMARY KEY (id);


--
-- Name: email_verification_codes email_verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.email_verification_codes
    ADD CONSTRAINT email_verification_codes_pkey PRIMARY KEY (id);


--
-- Name: manual_email_recipients manual_email_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.manual_email_recipients
    ADD CONSTRAINT manual_email_recipients_pkey PRIMARY KEY (id);


--
-- Name: parking_spots parking_spots_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.parking_spots
    ADD CONSTRAINT parking_spots_pkey PRIMARY KEY (id);


--
-- Name: persons persons_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.persons
    ADD CONSTRAINT persons_pkey PRIMARY KEY (id);


--
-- Name: property_units property_units_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.property_units
    ADD CONSTRAINT property_units_pkey PRIMARY KEY (id);


--
-- Name: property_units property_units_unit_number_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.property_units
    ADD CONSTRAINT property_units_unit_number_unique UNIQUE (unit_number);


--
-- Name: storage_lockers storage_lockers_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.storage_lockers
    ADD CONSTRAINT storage_lockers_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_unique UNIQUE (setting_key);


--
-- Name: unit_facilities unit_facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.unit_facilities
    ADD CONSTRAINT unit_facilities_pkey PRIMARY KEY (id);


--
-- Name: unit_facilities unit_facilities_unit_id_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.unit_facilities
    ADD CONSTRAINT unit_facilities_unit_id_unique UNIQUE (unit_id);


--
-- Name: unit_person_roles unit_person_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.unit_person_roles
    ADD CONSTRAINT unit_person_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_uuid_unique UNIQUE (uuid);


--
-- Name: violation_access_links violation_access_links_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violation_access_links
    ADD CONSTRAINT violation_access_links_pkey PRIMARY KEY (id);


--
-- Name: violation_access_links violation_access_links_token_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violation_access_links
    ADD CONSTRAINT violation_access_links_token_unique UNIQUE (token);


--
-- Name: violation_categories violation_categories_name_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violation_categories
    ADD CONSTRAINT violation_categories_name_unique UNIQUE (name);


--
-- Name: violation_categories violation_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violation_categories
    ADD CONSTRAINT violation_categories_pkey PRIMARY KEY (id);


--
-- Name: violation_histories violation_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violation_histories
    ADD CONSTRAINT violation_histories_pkey PRIMARY KEY (id);


--
-- Name: violations violations_pkey; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violations
    ADD CONSTRAINT violations_pkey PRIMARY KEY (id);


--
-- Name: violations violations_reference_number_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violations
    ADD CONSTRAINT violations_reference_number_unique UNIQUE (reference_number);


--
-- Name: violations violations_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violations
    ADD CONSTRAINT violations_uuid_unique UNIQUE (uuid);


--
-- Name: idx_email_dedup_log_content_hash; Type: INDEX; Schema: public; Owner: spectrum4
--

CREATE INDEX idx_email_dedup_log_content_hash ON public.email_deduplication_log USING btree (content_hash);


--
-- Name: idx_email_dedup_log_prevented; Type: INDEX; Schema: public; Owner: spectrum4
--

CREATE INDEX idx_email_dedup_log_prevented ON public.email_deduplication_log USING btree (prevented_at);


--
-- Name: idx_email_dedup_log_recipient; Type: INDEX; Schema: public; Owner: spectrum4
--

CREATE INDEX idx_email_dedup_log_recipient ON public.email_deduplication_log USING btree (recipient_email);


--
-- Name: idx_email_dedup_log_type; Type: INDEX; Schema: public; Owner: spectrum4
--

CREATE INDEX idx_email_dedup_log_type ON public.email_deduplication_log USING btree (email_type);


--
-- Name: idx_email_idempotency_keys_created; Type: INDEX; Schema: public; Owner: spectrum4
--

CREATE INDEX idx_email_idempotency_keys_created ON public.email_idempotency_keys USING btree (created_at);


--
-- Name: idx_email_idempotency_keys_expires; Type: INDEX; Schema: public; Owner: spectrum4
--

CREATE INDEX idx_email_idempotency_keys_expires ON public.email_idempotency_keys USING btree (expires_at);


--
-- Name: idx_email_idempotency_keys_hash; Type: INDEX; Schema: public; Owner: spectrum4
--

CREATE INDEX idx_email_idempotency_keys_hash ON public.email_idempotency_keys USING btree (email_hash);


--
-- Name: idx_email_idempotency_keys_key; Type: INDEX; Schema: public; Owner: spectrum4
--

CREATE INDEX idx_email_idempotency_keys_key ON public.email_idempotency_keys USING btree (idempotency_key);


--
-- Name: idx_email_idempotency_keys_recipient_type; Type: INDEX; Schema: public; Owner: spectrum4
--

CREATE INDEX idx_email_idempotency_keys_recipient_type ON public.email_idempotency_keys USING btree (recipient_email, email_type);


--
-- Name: idx_email_idempotency_keys_status; Type: INDEX; Schema: public; Owner: spectrum4
--

CREATE INDEX idx_email_idempotency_keys_status ON public.email_idempotency_keys USING btree (status);


--
-- Name: idx_email_send_attempts_attempted; Type: INDEX; Schema: public; Owner: spectrum4
--

CREATE INDEX idx_email_send_attempts_attempted ON public.email_send_attempts USING btree (attempted_at);


--
-- Name: idx_email_send_attempts_key; Type: INDEX; Schema: public; Owner: spectrum4
--

CREATE INDEX idx_email_send_attempts_key ON public.email_send_attempts USING btree (idempotency_key);


--
-- Name: idx_email_send_attempts_status; Type: INDEX; Schema: public; Owner: spectrum4
--

CREATE INDEX idx_email_send_attempts_status ON public.email_send_attempts USING btree (status);


--
-- Name: idx_violations_damage_to_property; Type: INDEX; Schema: public; Owner: spectrum4
--

CREATE INDEX idx_violations_damage_to_property ON public.violations USING btree (damage_to_property);


--
-- Name: idx_violations_police_involved; Type: INDEX; Schema: public; Owner: spectrum4
--

CREATE INDEX idx_violations_police_involved ON public.violations USING btree (police_involved);


--
-- Name: bike_lockers bike_lockers_unit_id_property_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bike_lockers
    ADD CONSTRAINT bike_lockers_unit_id_property_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.property_units(id) ON DELETE CASCADE;


--
-- Name: bylaw_category_links bylaw_category_links_bylaw_id_bylaws_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaw_category_links
    ADD CONSTRAINT bylaw_category_links_bylaw_id_bylaws_id_fk FOREIGN KEY (bylaw_id) REFERENCES public.bylaws(id) ON DELETE CASCADE;


--
-- Name: bylaw_category_links bylaw_category_links_category_id_bylaw_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaw_category_links
    ADD CONSTRAINT bylaw_category_links_category_id_bylaw_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.bylaw_categories(id) ON DELETE CASCADE;


--
-- Name: bylaw_revisions bylaw_revisions_bylaw_id_bylaws_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaw_revisions
    ADD CONSTRAINT bylaw_revisions_bylaw_id_bylaws_id_fk FOREIGN KEY (bylaw_id) REFERENCES public.bylaws(id) ON DELETE CASCADE;


--
-- Name: bylaw_revisions bylaw_revisions_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaw_revisions
    ADD CONSTRAINT bylaw_revisions_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: bylaws bylaws_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaws
    ADD CONSTRAINT bylaws_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: bylaws bylaws_parent_section_id_bylaws_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaws
    ADD CONSTRAINT bylaws_parent_section_id_bylaws_id_fk FOREIGN KEY (parent_section_id) REFERENCES public.bylaws(id);


--
-- Name: bylaws bylaws_updated_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.bylaws
    ADD CONSTRAINT bylaws_updated_by_id_users_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.users(id);


--
-- Name: communication_campaigns communication_campaigns_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.communication_campaigns
    ADD CONSTRAINT communication_campaigns_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: communication_recipients communication_recipients_campaign_id_communication_campaigns_id; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.communication_recipients
    ADD CONSTRAINT communication_recipients_campaign_id_communication_campaigns_id FOREIGN KEY (campaign_id) REFERENCES public.communication_campaigns(id) ON DELETE CASCADE;


--
-- Name: communication_recipients communication_recipients_person_id_persons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.communication_recipients
    ADD CONSTRAINT communication_recipients_person_id_persons_id_fk FOREIGN KEY (person_id) REFERENCES public.persons(id);


--
-- Name: communication_recipients communication_recipients_unit_id_property_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.communication_recipients
    ADD CONSTRAINT communication_recipients_unit_id_property_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.property_units(id);


--
-- Name: communication_templates communication_templates_created_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.communication_templates
    ADD CONSTRAINT communication_templates_created_by_id_users_id_fk FOREIGN KEY (created_by_id) REFERENCES public.users(id);


--
-- Name: email_send_attempts email_send_attempts_idempotency_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.email_send_attempts
    ADD CONSTRAINT email_send_attempts_idempotency_key_fkey FOREIGN KEY (idempotency_key) REFERENCES public.email_idempotency_keys(idempotency_key) ON DELETE CASCADE;


--
-- Name: email_tracking_events email_tracking_events_campaign_id_communication_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.email_tracking_events
    ADD CONSTRAINT email_tracking_events_campaign_id_communication_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.communication_campaigns(id) ON DELETE CASCADE;


--
-- Name: email_tracking_events email_tracking_events_recipient_id_communication_recipients_id_; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.email_tracking_events
    ADD CONSTRAINT email_tracking_events_recipient_id_communication_recipients_id_ FOREIGN KEY (recipient_id) REFERENCES public.communication_recipients(id) ON DELETE CASCADE;


--
-- Name: manual_email_recipients manual_email_recipients_campaign_id_communication_campaigns_id_; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.manual_email_recipients
    ADD CONSTRAINT manual_email_recipients_campaign_id_communication_campaigns_id_ FOREIGN KEY (campaign_id) REFERENCES public.communication_campaigns(id) ON DELETE CASCADE;


--
-- Name: parking_spots parking_spots_unit_id_property_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.parking_spots
    ADD CONSTRAINT parking_spots_unit_id_property_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.property_units(id) ON DELETE CASCADE;


--
-- Name: property_units property_units_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.property_units
    ADD CONSTRAINT property_units_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: storage_lockers storage_lockers_unit_id_property_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.storage_lockers
    ADD CONSTRAINT storage_lockers_unit_id_property_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.property_units(id) ON DELETE CASCADE;


--
-- Name: system_settings system_settings_updated_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_id_users_id_fk FOREIGN KEY (updated_by_id) REFERENCES public.users(id);


--
-- Name: unit_facilities unit_facilities_unit_id_property_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.unit_facilities
    ADD CONSTRAINT unit_facilities_unit_id_property_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.property_units(id) ON DELETE CASCADE;


--
-- Name: unit_person_roles unit_person_roles_person_id_persons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.unit_person_roles
    ADD CONSTRAINT unit_person_roles_person_id_persons_id_fk FOREIGN KEY (person_id) REFERENCES public.persons(id);


--
-- Name: unit_person_roles unit_person_roles_unit_id_property_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.unit_person_roles
    ADD CONSTRAINT unit_person_roles_unit_id_property_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.property_units(id);


--
-- Name: violation_access_links violation_access_links_violation_id_violations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violation_access_links
    ADD CONSTRAINT violation_access_links_violation_id_violations_id_fk FOREIGN KEY (violation_id) REFERENCES public.violations(id);


--
-- Name: violation_access_links violation_access_links_violation_uuid_violations_uuid_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violation_access_links
    ADD CONSTRAINT violation_access_links_violation_uuid_violations_uuid_fk FOREIGN KEY (violation_uuid) REFERENCES public.violations(uuid);


--
-- Name: violation_histories violation_histories_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violation_histories
    ADD CONSTRAINT violation_histories_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: violation_histories violation_histories_violation_id_violations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violation_histories
    ADD CONSTRAINT violation_histories_violation_id_violations_id_fk FOREIGN KEY (violation_id) REFERENCES public.violations(id);


--
-- Name: violation_histories violation_histories_violation_uuid_violations_uuid_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violation_histories
    ADD CONSTRAINT violation_histories_violation_uuid_violations_uuid_fk FOREIGN KEY (violation_uuid) REFERENCES public.violations(uuid);


--
-- Name: violations violations_category_id_violation_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violations
    ADD CONSTRAINT violations_category_id_violation_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.violation_categories(id);


--
-- Name: violations violations_reported_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violations
    ADD CONSTRAINT violations_reported_by_id_users_id_fk FOREIGN KEY (reported_by_id) REFERENCES public.users(id);


--
-- Name: violations violations_unit_id_property_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: spectrum4
--

ALTER TABLE ONLY public.violations
    ADD CONSTRAINT violations_unit_id_property_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.property_units(id);


--
-- PostgreSQL database dump complete
--

