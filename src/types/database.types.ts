export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          default_timezone: string
          preferred_language: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          default_timezone?: string
          preferred_language?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string | null
          default_timezone?: string
          preferred_language?: string
          created_at?: string
          updated_at?: string
        }
      }
      birth_profiles: {
        Row: {
          id: string
          user_id: string
          name: string
          birth_datetime: string
          timezone: string
          gender: string
          birth_location: string | null
          provided_chart: Json | null
          calculation_policy: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          birth_datetime: string
          timezone?: string
          gender?: string
          birth_location?: string | null
          provided_chart?: Json | null
          calculation_policy: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          birth_datetime?: string
          timezone?: string
          gender?: string
          birth_location?: string | null
          provided_chart?: Json | null
          calculation_policy?: Json
          created_at?: string
          updated_at?: string
        }
      }
      manse_charts: {
        Row: {
          id: string
          user_id: string
          birth_profile_id: string
          pillars: Json
          day_master: Json
          ten_gods: Json
          hidden_stems: Json
          five_element_distribution: Json
          chart_consistency: Json | null
          calculation_policy: Json
          warnings: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          birth_profile_id: string
          pillars: Json
          day_master: Json
          ten_gods?: Json
          hidden_stems?: Json
          five_element_distribution: Json
          chart_consistency?: Json | null
          calculation_policy: Json
          warnings?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          birth_profile_id?: string
          pillars?: Json
          day_master?: Json
          ten_gods?: Json
          hidden_stems?: Json
          five_element_distribution?: Json
          chart_consistency?: Json | null
          calculation_policy?: Json
          warnings?: Json
          created_at?: string
        }
      }
      major_luck_cycles: {
        Row: {
          id: string
          user_id: string
          birth_profile_id: string
          chart_id: string | null
          direction: string
          start_age: number | null
          start_date: string | null
          cycles: Json
          calculation_policy: Json
          warnings: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          birth_profile_id: string
          chart_id?: string | null
          direction: string
          start_age?: number | null
          start_date?: string | null
          cycles?: Json
          calculation_policy: Json
          warnings?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          birth_profile_id?: string
          chart_id?: string | null
          direction?: string
          start_age?: number | null
          start_date?: string | null
          cycles?: Json
          calculation_policy?: Json
          warnings?: Json
          created_at?: string
        }
      }
      vibe_checkins: {
        Row: {
          id: string
          user_id: string
          valence: number
          arousal: number
          energy: number
          focus: number
          social_load: number
          sleep_hours: number | null
          one_line_event: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          valence: number
          arousal: number
          energy: number
          focus: number
          social_load: number
          sleep_hours?: number | null
          one_line_event?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          valence?: number
          arousal?: number
          energy?: number
          focus?: number
          social_load?: number
          sleep_hours?: number | null
          one_line_event?: string | null
          created_at?: string
        }
      }
      forecast_requests: {
        Row: {
          id: string
          user_id: string
          mode: string
          target_date: string | null
          date_range: Json | null
          current_focus: Json
          user_message: string | null
          birth_profile_id: string | null
          vibe_checkin_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mode: string
          target_date?: string | null
          date_range?: Json | null
          current_focus?: Json
          user_message?: string | null
          birth_profile_id?: string | null
          vibe_checkin_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mode?: string
          target_date?: string | null
          date_range?: Json | null
          current_focus?: Json
          user_message?: string | null
          birth_profile_id?: string | null
          vibe_checkin_id?: string | null
          created_at?: string
        }
      }
      context_tensors: {
        Row: {
          id: string
          user_id: string
          forecast_request_id: string
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          forecast_request_id: string
          payload: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          forecast_request_id?: string
          payload?: Json
          created_at?: string
        }
      }
      concept_states: {
        Row: {
          id: string
          user_id: string
          forecast_request_id: string
          payload: Json
          confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          forecast_request_id: string
          payload: Json
          confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          forecast_request_id?: string
          payload?: Json
          confidence?: number | null
          created_at?: string
        }
      }
      risk_vectors: {
        Row: {
          id: string
          user_id: string
          forecast_request_id: string
          payload: Json
          primary_risk: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          forecast_request_id: string
          payload: Json
          primary_risk: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          forecast_request_id?: string
          payload?: Json
          primary_risk?: string
          created_at?: string
        }
      }
      action_policies: {
        Row: {
          id: string
          user_id: string
          forecast_request_id: string
          mode: string
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          forecast_request_id: string
          mode: string
          payload: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          forecast_request_id?: string
          mode?: string
          payload?: Json
          created_at?: string
        }
      }
      forecast_outputs: {
        Row: {
          id: string
          user_id: string
          forecast_request_id: string
          mode: string
          output_json: Json
          output_markdown: string
          grade: string | null
          context_tensor_id: string | null
          concept_state_id: string | null
          risk_vector_id: string | null
          action_policy_id: string | null
          safety_flags: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          forecast_request_id: string
          mode: string
          output_json: Json
          output_markdown: string
          grade?: string | null
          context_tensor_id?: string | null
          concept_state_id?: string | null
          risk_vector_id?: string | null
          action_policy_id?: string | null
          safety_flags?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          forecast_request_id?: string
          mode?: string
          output_json?: Json
          output_markdown?: string
          grade?: string | null
          context_tensor_id?: string | null
          concept_state_id?: string | null
          risk_vector_id?: string | null
          action_policy_id?: string | null
          safety_flags?: Json
          created_at?: string
        }
      }
      run_receipts: {
        Row: {
          id: string
          user_id: string
          forecast_output_id: string
          what_i_did: string
          why_i_chose_it: string | null
          what_ai_helped: string | null
          my_judgment: string | null
          what_i_deferred: string | null
          what_i_learned: string | null
          next_action: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          forecast_output_id: string
          what_i_did: string
          why_i_chose_it?: string | null
          what_ai_helped?: string | null
          my_judgment?: string | null
          what_i_deferred?: string | null
          what_i_learned?: string | null
          next_action?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          forecast_output_id?: string
          what_i_did?: string
          why_i_chose_it?: string | null
          what_ai_helped?: string | null
          my_judgment?: string | null
          what_i_deferred?: string | null
          what_i_learned?: string | null
          next_action?: string | null
          created_at?: string
        }
      }
      safety_events: {
        Row: {
          id: string
          user_id: string | null
          forecast_request_id: string | null
          event_type: string
          severity: string
          input_excerpt: string | null
          action_taken: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          forecast_request_id?: string | null
          event_type: string
          severity: string
          input_excerpt?: string | null
          action_taken: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          forecast_request_id?: string | null
          event_type?: string
          severity?: string
          input_excerpt?: string | null
          action_taken?: string
          created_at?: string
        }
      }
    }
  }
}
