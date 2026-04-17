// packages/frontend/src/utils/nodeFactory.ts
import { v4 as uuidv4 } from 'uuid';
import type { IVRNode } from '@ha-yemot/shared';

export function createNewNode(type: IVRNode['type']): IVRNode {
  const id = uuidv4();
  
  // A helper to generate short variable names based on the UUID
  const shortId = id.substring(0, 4);
  
  const base = {
    id,
    name: `New ${type} Node`,
    type,
  };

  switch (type) {
    case 'menu':
      return { 
        ...base, 
        type: 'menu', 
        ttsPrompt: 'Please select an option',
        variableName: `selected_node_${shortId}`, 
        valName: `menu_val_${shortId}`, 
        choices: {} 
      };
      
    case 'target':
      return { 
        ...base, 
        type: 'target', 
        ttsPrompt: 'Please select devices', 
        valName: `target_val_${shortId}`, 
        variableName: `selected_targets_${shortId}`, 
        entityMap: {}, 
        nextNodeId: '' 
      };
      
    case 'service_select':
      return { 
        ...base, 
        type: 'service_select', 
        ttsPrompt: 'Please select an action', 
        valName: `service_val_${shortId}`, 
        variableName: `selected_service_${shortId}`,
        choices: {}
      };
      
    case 'input':
      return { 
        ...base, 
        type: 'input', 
        ttsPrompt: 'Please enter a value', 
        valName: `input_val_${shortId}`, 
        variableName: `input_param_${shortId}`,      
        minDigits: 1,
        nextNodeId: '' 
      };
      
    case 'action':
      return { 
        ...base, 
        type: 'action', 
        targetVariableName: '', // Admin MUST select this in the UI
        successTts: 'Action completed successfully' 
      };
      
    case 'read':
      return { 
        ...base, 
        type: 'read', 
        ttsTemplate: 'The state is {{value}}' 
      };
      
    default:
      throw new Error('Unknown node type');
  }
}