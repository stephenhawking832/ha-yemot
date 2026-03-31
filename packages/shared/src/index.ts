// packages/shared/src/index.ts

// ==========================================
// 1. BASE DEFINITIONS
// ==========================================
export interface BaseNode {
  id: string;          // Unique UUID
  name: string;        // Admin-friendly name (e.g., "Living Room AC Menu")
  type: 'menu' | 'target' | 'service_select' | 'input' | 'action' | 'read';
}

export interface GatheringNode extends BaseNode {
  ttsPrompt: string;   
  valName: string;     // The key Yemot uses AND our parsed state object uses
}

// ==========================================
// 2. ROUTING NODE
// ==========================================
export interface MenuNode extends GatheringNode {
  type: 'menu';
  // Maps the raw DTMF key to the nextNodeId
  choices: Record<string, string>; 
}

// ==========================================
// 3. DATA GATHERING & PARSING NODES
// ==========================================
export interface TargetNode extends GatheringNode {
  type: 'target';
  // Maps DTMF digit to HA entity_id (e.g., "1" -> "climate.living")
  entityMap: Record<string, string>; 
  maxDigits?: number;   
  nextNodeId: string;   
}

export interface ServiceSelectNode extends GatheringNode {
  type: 'service_select';
  // Maps DTMF digit to HA domain.service (e.g., "1" -> "climate.turn_on")
  actionMap: Record<string, string>; 
  nextNodeId: string;
}

export interface InputNode extends GatheringNode {
  type: 'input';
  minDigits?: number;
  maxDigits?: number;
  nextNodeId: string;
}

// ==========================================
// 4. EXECUTION & READ NODES
// ==========================================
export interface ActionNode extends BaseNode {
  type: 'action';
  
  // Look into the internal parsed `state` object for these keys:
  targetVariableName: string;    // Expects an array of entity_ids
  actionVariableName?: string;   // Expects domain.service
  hardcodedAction?: string;      // Fallback/override action
  
  // Template using the internal `state` object
  dataPayloadTemplate?: Record<string, any>; // e.g., { "temperature": "{{target_temp}}" }
  
  successTts: string;  
  failTts?: string;    
  nextNodeId?: string; // If undefined, hang up
}

export interface ReadNode extends BaseNode {
  type: 'read';
  targetVariableName?: string;     
  hardcodedEntityId?: string; 
  attribute?: string;  // If undefined, reads the main 'state'
  ttsTemplate: string; // e.g., "The temperature is {{value}} degrees."
  nextNodeId?: string; // If undefined, hang up
}

// ==========================================
// 5. GLOBAL CONFIGURATION
// ==========================================
export type IVRNode = MenuNode | TargetNode | ServiceSelectNode | InputNode | ActionNode | ReadNode;

export interface IVRSystemConfig {
  version: string;
  host: string;         // HA Host URL (e.g., http://homeassistant.local:8123)
  token: string;        // HA Long-Lived Access Token
  security: {
    requireAuthKey: string;
    allowedPhones: string[]; // Empty array means allow all
  };
  nodes: Record<string, IVRNode>; // Flat dictionary of nodes
  rootNodeId: string;   // Where the call starts
}



// ==========================================
// 6. HOME ASSISTANT CACHE TYPES (For Vue GUI)
// ==========================================

export interface RichEntity {
  entity_id: string;
  state: string;
  friendly_name: string;
  domain: string;
  area_id: string | null;
  area_name: string | null;
}