<template>
  <div class="mock-editor">
    <div v-if="!mock" class="empty">
      Select a mock to edit, or click "Save as mock" on a request.
    </div>

    <template v-else>
      <div class="editor-header">
        <span class="editor-title">{{ isNew ? 'New Mock' : 'Edit Mock' }}</span>
        <label class="toggle" title="Enable / disable mock">
          <input type="checkbox" v-model="form.enabled" />
          <span :class="['toggle-label', form.enabled ? 'on' : 'off']">
            {{ form.enabled ? 'Enabled' : 'Disabled' }}
          </span>
        </label>
        <button class="btn-ghost" @click="$emit('cancel')">✕</button>
      </div>

      <div class="editor-body">
        <div class="field-row">
          <label>Name</label>
          <input v-model="form.name" placeholder="Descriptive name" class="full-width" />
        </div>

        <div class="field-row two-col">
          <div>
            <label>Method</label>
            <select v-model="form.method">
              <option v-for="m in METHODS" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
          <div class="flex-1">
            <label>Path <span class="hint">(supports * glob)</span></label>
            <input v-model="form.path" placeholder="/api/v1/resource/*" class="full-width" />
          </div>
        </div>

        <div class="field-row">
          <label>Response status</label>
          <input
            v-model.number="form.response.status"
            type="number"
            min="100"
            max="599"
            style="width: 80px"
          />
        </div>

        <div class="field-row">
          <label>Response body <span class="hint">(JSON)</span></label>
          <textarea
            v-model="bodyText"
            :class="['full-width', 'body-area', { error: bodyError }]"
            rows="8"
            spellcheck="false"
            placeholder='{"key": "value"}'
          />
          <span v-if="bodyError" class="error-msg">{{ bodyError }}</span>
        </div>
      </div>

      <div class="editor-footer">
        <button class="btn-primary" @click="save">{{ isNew ? 'Create mock' : 'Save' }}</button>
        <button v-if="!isNew" class="btn-danger" @click="remove">Delete</button>
        <span v-if="saveMsg" class="save-msg">{{ saveMsg }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({ mock: Object });
const emit = defineEmits(['saved', 'deleted', 'cancel']);

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const form = ref(blankForm());
const bodyText = ref('');
const bodyError = ref('');
const saveMsg = ref('');

const isNew = computed(() => !props.mock?.id);

watch(
  () => props.mock,
  (m) => {
    if (!m) return;
    form.value = {
      name: m.name || '',
      method: m.method || 'GET',
      path: m.path || '/',
      enabled: m.enabled !== undefined ? m.enabled : true,
      response: {
        status: m.response?.status || 200,
        headers: m.response?.headers || { 'Content-Type': 'application/json' },
      },
    };
    bodyText.value = m.response?.body != null
      ? prettyJSON(m.response.body)
      : '';
    bodyError.value = '';
    saveMsg.value = '';
  },
  { immediate: true }
);

function blankForm() {
  return {
    name: '',
    method: 'GET',
    path: '/',
    enabled: true,
    response: { status: 200, headers: { 'Content-Type': 'application/json' } },
  };
}

function prettyJSON(val) {
  try {
    return JSON.stringify(typeof val === 'string' ? JSON.parse(val) : val, null, 2);
  } catch {
    return String(val);
  }
}

function parseBody() {
  const raw = bodyText.value.trim();
  if (!raw) return {};
  try {
    bodyError.value = '';
    return JSON.parse(raw);
  } catch (e) {
    bodyError.value = `Invalid JSON: ${e.message}`;
    return null;
  }
}

async function save() {
  const body = parseBody();
  if (body === null) return;

  const payload = {
    ...form.value,
    response: { ...form.value.response, body },
  };

  const url = isNew.value ? '/api/mocks' : `/api/mocks/${props.mock.id}`;
  const method = isNew.value ? 'POST' : 'PUT';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    saveMsg.value = 'Saved!';
    setTimeout(() => { saveMsg.value = ''; }, 2000);
    emit('saved', await res.json());
  }
}

async function remove() {
  if (!confirm(`Delete mock "${form.value.name}"?`)) return;
  const res = await fetch(`/api/mocks/${props.mock.id}`, { method: 'DELETE' });
  if (res.ok) emit('deleted');
}
</script>

<style scoped>
.mock-editor {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-top: 1px solid var(--border);
  max-height: 420px;
  min-height: 260px;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  padding: 24px;
  text-align: center;
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.editor-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.toggle input { display: none; }
.toggle-label {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 3px;
  font-weight: 600;
}
.toggle-label.on  { color: var(--ok);   background: rgba(74, 222, 128, 0.12); }
.toggle-label.off { color: var(--text-muted); background: var(--surface-2); }

.btn-ghost {
  margin-left: auto;
  background: transparent;
  color: var(--text-muted);
  padding: 2px 7px;
  border: 1px solid var(--border);
  font-size: 12px;
}
.btn-ghost:hover { color: var(--text); }

.editor-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-row { display: flex; flex-direction: column; gap: 4px; }
.field-row.two-col { flex-direction: row; gap: 10px; }
.flex-1 { flex: 1; display: flex; flex-direction: column; gap: 4px; }

label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
}
.hint { font-size: 10px; color: var(--text-muted); font-weight: 400; }

.full-width { width: 100%; }
.body-area { line-height: 1.6; font-size: 11px; }
.body-area.error { border-color: var(--err); }
.error-msg { font-size: 11px; color: var(--err); font-family: var(--font-mono); }

.editor-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.btn-primary {
  background: var(--accent);
  color: #0d0d0d;
  font-weight: 600;
  padding: 5px 14px;
}

.btn-danger {
  background: rgba(248, 113, 113, 0.15);
  color: var(--err);
  border: 1px solid var(--err);
  padding: 5px 12px;
}

.save-msg {
  font-size: 12px;
  color: var(--ok);
  margin-left: 4px;
}
</style>
