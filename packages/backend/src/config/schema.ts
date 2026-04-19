// packages/backend/src/config/schema.ts
import { z } from 'zod';

// Base definitions
const BaseNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const GatheringNodeSchema = BaseNodeSchema.extend({
  ttsPrompt: z.string(),
  valName: z.string(),
  variableName: z.string(),
});

// Specific Nodes
const MenuNodeSchema = GatheringNodeSchema.extend({
  type: z.literal('menu'),
  choices: z.record(z.string(), z.string()), // Record<string, string>
});

const TargetNodeSchema = GatheringNodeSchema.extend({
  type: z.literal('target'),
  entityMap: z.record(z.string(), z.string()),
  maxDigits: z.number().optional(),
  nextNodeId: z.string(),
});

const ServiceSelectNodeSchema = GatheringNodeSchema.extend({
  type: z.literal('service_select'),
  choices: z.record(
    z.string(), // The DTMF digit (key)
    z.object({
      service: z.string(),
      nextNodeId: z.string(),
    }))
});

const InputNodeSchema = GatheringNodeSchema.extend({
  type: z.literal('input'),
  minDigits: z.number().optional(),
  maxDigits: z.number().optional(),
  nextNodeId: z.string(),
});

const ActionNodeSchema = BaseNodeSchema.extend({
  type: z.literal('action'),
  targetVariableName: z.string(),
  actionVariableName: z.string().optional(),
  hardcodedAction: z.string().optional(),
  dataPayloadTemplate: z.record(z.string() ,z.any()).optional(),
  successTts: z.string(),
  failTts: z.string().optional(),
  nextNodeId: z.string().optional(),
});

const ReadNodeSchema = BaseNodeSchema.extend({
  type: z.literal('read'),
  targetVariableName: z.string().optional(),
  hardcodedEntityId: z.string().optional(),
  attribute: z.string().optional(),
  ttsTemplate: z.string(),
  nextNodeId: z.string().optional(),
});

// Discriminated Union for IVRNode
// This tells Zod to look at the "type" field to figure out which schema to use
export const IVRNodeSchema = z.discriminatedUnion('type', [
  MenuNodeSchema,
  TargetNodeSchema,
  ServiceSelectNodeSchema,
  InputNodeSchema,
  ActionNodeSchema,
  ReadNodeSchema,
]);

// The Global Config Schema
export const IVRSystemConfigSchema = z.object({
  version: z.string(),
  host: z.string().url(),
  token: z.string(),
  nodes: z.record(z.string(), IVRNodeSchema),
  rootNodeId: z.string(),
});