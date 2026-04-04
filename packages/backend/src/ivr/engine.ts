// packages/backend/src/ivr/engine.ts
import type { Call } from '../../node_modules/yemot-router2';
import { logger } from '../utils/logger';
import { configManager } from '../config/config.service';
import { haService } from '../ha/ha.service';
import type { IVRNode } from '@ha-yemot/shared';

/**
 * The core recursive engine that traverses the IVR Tree.
 * @param nodeId The ID of the node to execute.
 * @param call The Yemot Call object.
 * @param state The accumulated, parsed variables from previous nodes.
 */
export async function processNode(nodeId: string, call: Call, state: Record<string, any> = {}): Promise<void> {
  const config = configManager.getConfig();
  const node = config.nodes[nodeId];

  if (!node) {
    logger.error({ callId: call.callId, nodeId }, 'Attempted to process a non-existent node.');
    return call.hangup();
  }

  logger.info({ callId: call.callId, nodeId, type: node.type }, `Executing Node: ${node.name}`);

  switch (node.type) {
    case 'menu':
      return handleMenuNode(node, call, state);
    case 'target':
      return handleTargetNode(node, call, state);
    case 'service_select':
      return handleServiceSelectNode(node, call, state);
    case 'input':
      return handleInputNode(node, call, state);
    case 'read':
      return handleReadNode(node, call, state);
    case 'action':
      return handleActionNode(node, call, state);
    default:
      logger.error({ nodeId }, 'Unknown node type encountered.');
      return call.hangup();
  }
}




// ==========================================
// 1. ROUTING NODE
// ==========================================
async function handleMenuNode(node: Extract<IVRNode, { type: 'menu' }>, call: Call, state: Record<string, any>) {
  // 1. Ask for 1 digit
  const rawInput = await call.read([{ type: 'text', data: node.ttsPrompt }], 'tap', {
    val_name: node.valName,
    max_digits: 1,
  });

  // 2. Find the next node based on the DTMF key pressed
  const nextNodeId = node.choices[rawInput as string];

  if (!nextNodeId) {
    // If user pressed a key not in the menu, repeat the node
    await call.id_list_message([{ type: 'text', data: 'בחירה שגויה.' }], { prependToNextAction: true });
    return processNode(node.id, call, state);
  }

  // 3. Move to the next node
  return processNode(nextNodeId, call, state);
}

// ==========================================
// 2. DATA GATHERING & PARSING NODES
// ==========================================
async function handleTargetNode(node: Extract<IVRNode, { type: 'target' }>, call: Call, state: Record<string, any>) {
  // 1. Get raw input (e.g., "1*2")
  const rawInput = await call.read([{ type: 'text', data: node.ttsPrompt }], 'tap', {
    val_name: node.valName,
    max_digits: node.maxDigits || 15,
  });

  // 2. Parse by star delimiter and map to entities
  const parsedEntities = (rawInput as string)
    .split('*')
    .map((digit) => node.entityMap[digit])
    .filter(Boolean); // Remove undefined/invalid inputs

  // 3. Save to internal state
  state[node.valName] = parsedEntities;

  return processNode(node.nextNodeId, call, state);
}

async function handleServiceSelectNode(node: Extract<IVRNode, { type: 'service_select' }>, call: Call, state: Record<string, any>) {
  const rawInput = await call.read([{ type: 'text', data: node.ttsPrompt }], 'tap', {
    val_name: node.valName,
    max_digits: 1,
  });

  const parsedAction = node.actionMap[rawInput as string];
  if (parsedAction) {
    state[node.valName] = parsedAction;
  }

  return processNode(node.nextNodeId, call, state);
}

async function handleInputNode(node: Extract<IVRNode, { type: 'input' }>, call: Call, state: Record<string, any>) {
  const rawInput = await call.read([{ type: 'text', data: node.ttsPrompt }], 'tap', {
    val_name: node.valName,
    min_digits: node.minDigits,
    max_digits: node.maxDigits,
  });

  // Just save the raw number (e.g., "24")
  state[node.valName] = rawInput;

  return processNode(node.nextNodeId, call, state);
}

// ==========================================
// 3. EXECUTION & READ NODES
// ==========================================
async function handleReadNode(node: Extract<IVRNode, { type: 'read' }>, call: Call, state: Record<string, any>) {
  let entityIdToRead = node.hardcodedEntityId;

  // If using dynamic state, grab the FIRST entity from the array
  if (node.targetVariableName && state[node.targetVariableName]) {
    const targets = state[node.targetVariableName];
    if (Array.isArray(targets) && targets.length > 0) {
      entityIdToRead = targets[0];
    }
  }

  let valueToRead = 'לא ידוע'; // "Unknown"

  if (entityIdToRead) {
    const entityObj = haService.getEntityState(entityIdToRead);
    if (entityObj) {
      valueToRead = node.attribute ? entityObj.attributes[node.attribute] : entityObj.state;
    }
  }

  // Inject the value into the template string
  const spokenSentence = node.ttsTemplate.replace('{{value}}', String(valueToRead));

  if (node.nextNodeId) {
    // Keep call alive and move to next
    await call.id_list_message([{ type: 'text', data: spokenSentence }], { prependToNextAction: true });
    return processNode(node.nextNodeId, call, state);
  } else {
    // Speak and hang up
    return call.id_list_message([{ type: 'text', data: spokenSentence }]);
  }
}

async function handleActionNode(node: Extract<IVRNode, { type: 'action' }>, call: Call, state: Record<string, any>) {
  try {
    // 1. Get Targets array
    const targets = state[node.targetVariableName] || [];
    
    if (targets.length === 0) {
      logger.warn({ callId: call.callId }, 'ActionNode executed but target array was empty.');
      return call.hangup();
    }

    // 2. Determine Action (domain.service)
    let fullAction = node.hardcodedAction;
    if (node.actionVariableName && state[node.actionVariableName]) {
      fullAction = state[node.actionVariableName];
    }

    if (!fullAction || !fullAction.includes('.')) {
      throw new Error(`Invalid HA Action string: ${fullAction}`);
    }

    const [domain, service] = fullAction.split('.');

    // 3. Hydrate the JSON payload template with values from state
    let finalPayload: Record<string, any> = {};
    if (node.dataPayloadTemplate) {
      let templateString = JSON.stringify(node.dataPayloadTemplate);
      
      // Find all {{variable}} patterns and replace them
      templateString = templateString.replace(/\{\{([^}]+)\}\}/g, (_, varName) => {
        return state[varName] !== undefined ? String(state[varName]) : '';
      });
      
      finalPayload = JSON.parse(templateString);
    }

    // 4. FIRE COMMAND TO HOME ASSISTANT
    await haService.executeAction(domain, service, targets, finalPayload);

    // 5. Success Feedback
    if (node.nextNodeId) {
      await call.id_list_message([{ type: 'text', data: node.successTts }], { prependToNextAction: true });
      return processNode(node.nextNodeId, call, state);
    } else {
      return call.id_list_message([{ type: 'text', data: node.successTts }]);
    }

  } catch (err) {
    logger.error({ err, callId: call.callId }, 'Failed to execute ActionNode');
    if (node.failTts) {
      await call.id_list_message([{ type: 'text', data: node.failTts }]);
    } else {
      await call.hangup();
    }
  }
}
