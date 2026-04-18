<!-- packages/frontend/src/views/TreeEditorView.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useIvrStore } from '../store/ivr';
import { useI18n } from 'vue-i18n';
import { createNewNode } from '../utils/nodeFactory';
import type { IVRNode } from '@ha-yemot/shared';

// PrimeVue Components
import OrganizationChart from 'primevue/organizationchart';
import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import Select from 'primevue/select'; // Formally Dropdown in v4
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
// Nodes Components
import MenuNodeEditor from '../components/nodes/MenuNodeEditor.vue';
import TargetNodeEditor from '../components/nodes/TargetNodeEditor.vue';
import ServiceSelectNodeEditor from '../components/nodes/ServiceSelectNodeEditor.vue';
import InputNodeEditor from '../components/nodes/InputNodeEditor.vue';

const ivrStore = useIvrStore();
const { t } = useI18n();

// The currently selected node ID for the Inspector (Right Pane)
const selectedNodeIds = ref<Record<string, boolean>>({});

// Compute the currently selected node object
const activeNode = computed(() => {
  const selectedId = Object.keys(selectedNodeIds.value)[0];
  return selectedId && ivrStore.config ? ivrStore.config.nodes[selectedId] : null;
});

// --- NODE CREATION LOGIC ---
const showAddModal = ref(false);
const selectedNewNodeType = ref<IVRNode['type'] | null>(null);
const nodeTypeOptions = [
  { label: t('editor.node_types.menu'), value: 'menu' },
  { label: t('editor.node_types.target'), value: 'target' },
  { label: t('editor.node_types.service_select'), value: 'service_select' },
  { label: t('editor.node_types.input'), value: 'input' },
  { label: t('editor.node_types.action'), value: 'action' },
  { label: t('editor.node_types.read'), value: 'read' },
];

const addNewNode = () => {
  if (!selectedNewNodeType.value || !ivrStore.config) return;
  
  const newNode = createNewNode(selectedNewNodeType.value);
  // Add to the flat dictionary
  ivrStore.config.nodes[newNode.id] = newNode;
  
  // Select it instantly
  selectedNodeIds.value = { [newNode.id]: true };
  showAddModal.value = false;
  selectedNewNodeType.value = null;
};

// --- TREE RENDERING LOGIC (Flat Dictionary -> Nested Tree) ---
// PrimeVue OrganizationChart requires a nested TreeNode structure.
// We recursively build this from our flat dictionary starting at the rootNodeId.
const chartData = computed(() => {
  if (!ivrStore.config || !ivrStore.config.rootNodeId) return null;

  const buildTree = (nodeId: string): any => {
    const node = ivrStore.config!.nodes[nodeId];
    
    // Provide a mock `data` object so the HTML template doesn't crash!
    if (!node) {
      return { 
        key: nodeId, 
        data: { name: 'Broken Link', type: 'error' }, 
        children: [] 
      }; 
    }

    const treeNode: any = {
      key: node.id,
      data: node, // Attach full node data for custom templating
      children: []
    };

    // Follow the specific branching logic for each node type
    if (node.type === 'menu') {
      for (const nextId of Object.values(node.choices)) {
        treeNode.children.push(buildTree(nextId));
      }
    } else if (node.type === 'service_select') {
      for (const choiceObj of Object.values(node.choices)) {
        treeNode.children.push(buildTree(choiceObj.nextNodeId));
      }
    } else if ('nextNodeId' in node && node.nextNodeId) {
      // Target, Input, Action, Read nodes all have a single nextNodeId
      treeNode.children.push(buildTree(node.nextNodeId));
    }

    return treeNode;
  };

  return buildTree(ivrStore.config.rootNodeId);
});

// Calculate nodes that exist in the dictionary but aren't linked in the tree yet
const unlinkedNodes = computed(() => {
  if (!ivrStore.config) return [];
  const allIds = Object.keys(ivrStore.config.nodes);
  
  // A quick helper to traverse the chartData and find all linked IDs
  const linkedIds = new Set<string>();
  const traverse = (n: any) => {
    if (!n) return;
    linkedIds.add(n.key);
    n.children?.forEach(traverse);
  };
  traverse(chartData.value);

  return allIds.filter(id => !linkedIds.has(id)).map(id => ivrStore.config!.nodes[id]);
});

const saveConfiguration = async () => {
  try {
    await ivrStore.saveConfig();
    alert('Tree saved successfully!');
  } catch (e: any) {
    alert(`Save failed: ${e.message}`);
  }
};

const deleteActiveNode = () => {
  if (!ivrStore.config || !activeNode.value) return;
  const idToDelete = activeNode.value.id;

  if (!confirm(t('editor.delete_confirm'))) return;

  // 1. Remove the node from the dictionary
  delete ivrStore.config.nodes[idToDelete];

  // 2. Clean up any broken links in other nodes
  for (const node of Object.values(ivrStore.config.nodes)) {
    if (node.type === 'menu') {
      for (const [dtmf, nextId] of Object.entries(node.choices)) {
        if (nextId === idToDelete) delete node.choices[dtmf];
      }
    } else if (node.type === 'service_select') {
      for (const [dtmf, choice] of Object.entries(node.choices)) {
        if (choice.nextNodeId === idToDelete) delete node.choices[dtmf];
      }
    } else if ('nextNodeId' in node && node.nextNodeId === idToDelete) {
      node.nextNodeId = ''; // Clear the link
    }
  }

  // 3. Clear selection and root if needed
  selectedNodeIds.value = {};
  if (ivrStore.config.rootNodeId === idToDelete) {
    ivrStore.config.rootNodeId = '';
  }
};
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <!-- Top Toolbar -->
    <Toolbar class="bg-white border border-slate-200 rounded-lg shadow-sm">
      <template #start>
        <div class="flex items-center gap-4">
          <Button :label="t('editor.add_node')" icon="pi pi-plus" @click="showAddModal = true" />
          
          <!-- Root Node Selector (If building from scratch) -->
          <div class="flex items-center gap-2" v-if="ivrStore.config">
            <span class="font-bold text-slate-700">{{ t('editor.root_node_label') }}:</span>
            <Select 
              v-model="ivrStore.config.rootNodeId" 
              :options="Object.values(ivrStore.config.nodes)" 
              optionLabel="name" 
              optionValue="id" 
              placeholder="Select Root" 
              class="w-48"
            />
          </div>
        </div>
      </template>
      <template #end>
        <Button 
          :label="t('editor.save_tree')" 
          icon="pi pi-save" 
          severity="success" 
          :loading="ivrStore.isSaving" 
          @click="saveConfiguration" 
        />
      </template>
    </Toolbar>

    <!-- Split Pane Area -->
    <Splitter class="flex-1 border border-slate-200 rounded-lg shadow-sm overflow-hidden bg-white">
      
      <!-- LEFT PANE: The Visual Tree -->
      <SplitterPanel :size="70" class="overflow-auto bg-slate-50 relative p-4">
        
        <!-- Render the IVR Flow -->
        <OrganizationChart 
          v-if="chartData"
          :value="chartData" 
          v-model:selectionKeys="selectedNodeIds" 
          selectionMode="single"
          class="w-full"
        >
          <!-- Custom Template for Nodes in the Chart -->
          <template #default="slotProps">
            <div class="p-2 border rounded shadow-sm cursor-pointer min-w-[150px]"
                 :class="slotProps.node.data?.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' : 'bg-white border-slate-300 hover:border-blue-500'">
              <div class="font-bold border-b pb-1 mb-1 truncate" :class="slotProps.node.data?.type === 'error' ? 'text-red-800 border-red-200' : 'text-slate-800 border-slate-200'">
                {{ slotProps.node.data?.name || 'Unknown' }}
              </div>
              <div class="text-xs uppercase" :class="slotProps.node.data?.type === 'error' ? 'text-red-600' : 'text-slate-500'">
                {{ slotProps.node.data?.type || 'Unknown' }}
              </div>
            </div>
          </template>
        </OrganizationChart>

        <div v-else class="text-slate-400 p-8 text-center">
          No root node selected. Create a node and set it as root.
        </div>

        <!-- Render Unlinked Nodes (Nodes created but not connected to the main tree) -->
        <div v-if="unlinkedNodes.length > 0" class="mt-12 p-4 border-t-2 border-dashed border-slate-300">
          <h3 class="font-bold text-slate-700 mb-4"><i class="pi pi-link-slash mr-2"></i>{{ t('editor.unlinked_nodes') }}</h3>
          <div class="flex flex-wrap gap-4">
            <div 
              v-for="node in unlinkedNodes" 
              :key="node.id"
              @click="selectedNodeIds = { [node.id]: true }"
              class="p-2 border-2 rounded shadow-sm cursor-pointer min-w-[150px]"
              :class="selectedNodeIds[node.id] ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-300'"
            >
              <div class="font-bold text-slate-800 truncate">{{ node.name }}</div>
              <div class="text-xs text-slate-500 uppercase">{{ node.type }}</div>
            </div>
          </div>
        </div>

      </SplitterPanel>

      <!-- RIGHT PANE: The Node Inspector -->
      <SplitterPanel :size="30" class="overflow-y-auto p-4 bg-white border-l border-slate-200">
        <div v-if="activeNode" class="flex flex-col gap-4">
          <h2 class="text-xl font-bold text-slate-800 border-b pb-2">
            <i class="pi pi-pencil mr-2 text-slate-500"></i> Edit Node
          </h2>
          
          <!-- Shared Properties for ALL nodes -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-bold text-slate-500 uppercase">Node Name</label>
            <!-- Bind directly to the dictionary to allow writing -->
            <InputText v-model="activeNode.name" />
          </div>

          <!-- DYNAMIC FORMS -->
          <MenuNodeEditor v-if="activeNode.type === 'menu'" v-model="(ivrStore.config!.nodes[activeNode.id] as any)" />
          <TargetNodeEditor v-else-if="activeNode.type === 'target'" v-model="(ivrStore.config!.nodes[activeNode.id] as any)" />
          <ServiceSelectNodeEditor v-else-if="activeNode.type === 'service_select'" v-model="(ivrStore.config!.nodes[activeNode.id] as any)" />
          <InputNodeEditor v-else-if="activeNode.type === 'input'" v-model="(ivrStore.config!.nodes[activeNode.id] as any)" />
          <div v-else class="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded text-sm">
            Form for {{ activeNode.type }} node is under construction.
          </div>

          <!-- Delete Button -->
          <div class="mt-8 border-t pt-4">
            <Button 
              :label="t('editor.delete_node')" 
              icon="pi pi-trash" 
              severity="danger" 
              outlined 
              class="w-full" 
              @click="deleteActiveNode" 
            />
          </div>
        </div>
        
        <div v-else class="h-full flex items-center justify-center text-slate-400 text-center px-4">
          <i class="pi pi-arrow-left mr-2"></i> {{ t('editor.no_node_selected') }}
        </div>
      </SplitterPanel>

    </Splitter>

    <!-- Add Node Modal -->
    <Dialog v-model:visible="showAddModal" modal :header="t('editor.add_node')" :style="{ width: '30rem' }">
      <div class="flex flex-col gap-4 py-4">
        <Select 
          v-model="selectedNewNodeType" 
          :options="nodeTypeOptions" 
          optionLabel="label" 
          optionValue="value" 
          :placeholder="t('editor.select_type')" 
          class="w-full" 
        />
        <Button label="Create" icon="pi pi-check" @click="addNewNode" :disabled="!selectedNewNodeType" />
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
/* Minor fix for OrganizationChart connecting lines */
:deep(.p-organizationchart .p-organizationchart-line-down) {
  background: #cbd5e1; /* slate-300 */
}
:deep(.p-organizationchart .p-organizationchart-line-left) {
  border-top-color: #cbd5e1;
}
:deep(.p-organizationchart .p-organizationchart-line-right) {
  border-top-color: #cbd5e1;
}
</style>