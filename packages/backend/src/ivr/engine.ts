// packages/backend/src/ivr/engine.ts
import { Call, ExitError } from '../../node_modules/yemot-router2';
import { logger } from '../utils/logger';
import { configManager } from '../config/config.service';
import { haService } from '../ha/ha.service';
import type { IVRNode } from '@ha-yemot/shared';

export async function processNode(nodeId: string, call: Call, state: Record<string, any> = {}): Promise<void> {
  const config = configManager.getConfig();
  const node = config.nodes[nodeId];

  if (!node) {
    logger.error({ callId: call.callId, nodeId }, 'Attempted to process a non-existent node.');
    return call.hangup();
  }

  // LOG THE EXACT STATE AT THE START OF EVERY NODE
  logger.info({ callId: call.callId, nodeId, type: node.type, state }, `Executing Node: ${node.name}`);

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
  const rawInput = await call.read([{ type: 'text', data: node.ttsPrompt }], 'tap', {
    val_name: node.valName,
    max_digits: 1,
  });

  const nextNodeId = node.choices[rawInput as string];

  if (!nextNodeId) {
    await call.id_list_message([{ type: 'text', data: 'בחירה שגויה.' }], { prependToNextAction: true });
    return processNode(node.id, call, state);
  }

  return processNode(nextNodeId, call, state);
}

// ==========================================
// 2. DATA GATHERING & PARSING NODES
// ==========================================
async function handleTargetNode(node: Extract<IVRNode, { type: 'target' }>, call: Call, state: Record<string, any>) {
  const rawInput = await call.read([{ type: 'text', data: node.ttsPrompt }], 'tap', {
    val_name: node.valName,
    max_digits: node.maxDigits || 15,
  });

  logger.info({ rawInput }, `TargetNode received raw input from Yemot`);

  const parsedEntities = String(rawInput)
    .split('*')
    .map((digit) => node.entityMap[digit])
    .filter(Boolean);

  logger.info({ parsedEntities }, `TargetNode successfully parsed entities`);

  state[node.variableName] = parsedEntities;

  return processNode(node.nextNodeId, call, state);
}

async function handleServiceSelectNode(node: Extract<IVRNode, { type: 'service_select' }>, call: Call, state: Record<string, any>) {
  const rawInput = await call.read([{ type: 'text', data: node.ttsPrompt }], 'tap', {
    val_name: node.valName,
    max_digits: 1,
  });

  const choice = node.choices[rawInput as string];

  if (!choice) {
    await call.id_list_message([{ type: 'text', data: 'בחירה שגויה.' }], { prependToNextAction: true });
    return processNode(node.id, call, state);
  }

  state[node.variableName] = choice.service;

  return processNode(choice.nextNodeId, call, state);
}

async function handleInputNode(node: Extract<IVRNode, { type: 'input' }>, call: Call, state: Record<string, any>) {
  const rawInput = await call.read([{ type: 'text', data: node.ttsPrompt }], 'tap', {
    val_name: node.valName,
    min_digits: node.minDigits,
    max_digits: node.maxDigits,
  });

  state[node.variableName] = String(rawInput);

  return processNode(node.nextNodeId, call, state);
}

// ==========================================
// 3. EXECUTION & READ NODES
// ==========================================
async function handleReadNode(node: Extract<IVRNode, { type: 'read' }>, call: Call, state: Record<string, any>) {
  try {
    let entityIdToRead = node.hardcodedEntityId;

    if (node.targetVariableName && state[node.targetVariableName]) {
      const targets = state[node.targetVariableName];
      if (Array.isArray(targets) && targets.length > 0) {
        entityIdToRead = targets[0];
      }
    }

    let valueToRead = 'לא ידוע';

    if (entityIdToRead) {
      const entityObj = haService.getEntityState(entityIdToRead);
      if (entityObj) {
        valueToRead = node.attribute ? entityObj.attributes[node.attribute] : entityObj.state;
      }
    }

    const spokenSentence = node.ttsTemplate.replace('{{value}}', String(valueToRead));

    if (node.nextNodeId) {
      await call.id_list_message([{ type: 'text', data: spokenSentence }], { prependToNextAction: true });
      return processNode(node.nextNodeId, call, state);
    } else {
      return call.id_list_message([{ type: 'text', data: spokenSentence }]);
    }
  } catch (err) {
    // MUST IGNORE EXIT ERROR
    if (err instanceof ExitError) throw err;
    logger.error({ err }, 'ReadNode Error');
    return call.hangup();
  }
}

async function handleActionNode(node: Extract<IVRNode, { type: 'action' }>, call: Call, state: Record<string, any>) {
  try {
    const targets = state[node.targetVariableName] || [];
    
    if (targets.length === 0) {
      logger.warn({ callId: call.callId, targetVariableName: node.targetVariableName, state }, 'ActionNode executed but target array was empty.');
      // This throws ExitError!
      return call.hangup();
    }

    let fullAction = node.hardcodedAction;
    if (node.actionVariableName && state[node.actionVariableName]) {
      fullAction = state[node.actionVariableName];
    }

    if (!fullAction || !fullAction.includes('.')) {
      throw new Error(`Invalid HA Action string: ${fullAction}`);
    }

    const [domain, service] = fullAction.split('.');

    let finalPayload: Record<string, any> = {};
    if (node.dataPayloadTemplate) {
      let templateString = JSON.stringify(node.dataPayloadTemplate);
      templateString = templateString.replace(/\{\{([^}]+)\}\}/g, (_, varName) => {
        return state[varName] !== undefined ? String(state[varName]) : '';
      });
      finalPayload = JSON.parse(templateString);
    }

    await haService.executeAction(domain, service, targets, finalPayload);

    if (node.nextNodeId) {
      await call.id_list_message([{ type: 'text', data: node.successTts }], { prependToNextAction: true });
      return processNode(node.nextNodeId, call, state);
    } else {
      // This throws ExitError!
      return call.id_list_message([{ type: 'text', data: node.successTts }]);
    }

  } catch (err) {
    // MUST IGNORE EXIT ERROR TO ALLOW YEMOT TO HANG UP CLEANLY
    if (err instanceof ExitError) throw err;
    
    logger.error({ err, callId: call.callId }, 'Failed to execute ActionNode');
    if (node.failTts) {
      await call.id_list_message([{ type: 'text', data: node.failTts }]);
    } else {
      await call.hangup();
    }
  }
}