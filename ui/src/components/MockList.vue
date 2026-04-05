<template>
  <div class="mock-list">
    <div class="list-header">
      <span class="list-title">Mocks</span>
      <button class="btn-new" @click="$emit('select', newMockTemplate())">+ New</button>
    </div>

    <div class="list-body">
      <div v-if="mocks.length === 0" class="empty-state">
        No mocks yet.<br />
        Intercept a request and click "Save as mock".
      </div>

      <div
        v-for="mock in mocks"
        :key="mock.id"
        :class="['row', { selected: mock.id === selectedId, disabled: !mock.enabled }]"
        @click="$emit('select', mock)"
      >
        <label class="toggle-wrap" @click.stop>
          <input type="checkbox" :checked="mock.enabled" @change="toggle(mock)" />
          <span class="dot" :class="{ on: mock.enabled }" />
        </label>

        <span :class="['method', 'method-' + mock.method.toLowerCase()]">{{ mock.method }}</span>
        <span class="path mono" :title="mock.path">{{ mock.path }}</span>
        <span class="spacer" />
        <span class="status-code">{{ mock.response?.status }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  selectedId: String,
  refreshKey: Number,
});
const emit = defineEmits(['select', 'count']);

const mocks = ref([]);

onMounted(loadMocks);
watch(() => props.refreshKey, loadMocks);

async function loadMocks() {
  const res = await fetch('/api/mocks');
  mocks.value = await res.json();
  emit('count', mocks.value.length);
}

async function toggle(mock) {
  const res = await fetch(`/api/mocks/${mock.id}/toggle`, { method: 'POST' });
  if (res.ok) {
    const updated = await res.json();
    const idx = mocks.value.findIndex(m => m.id === mock.id);
    if (idx !== -1) mocks.value[idx] = updated;
  }
}

function newMockTemplate() {
  return {
    name: 'New mock',
    method: 'GET',
    path: '/api/',
    enabled: true,
    response: { status: 200, headers: { 'Content-Type': 'application/json' }, body: {} },
  };
}
</script>

<style scoped>
.mock-list {
  display: flex;
  flex-direction: column;
  width: 340px;
  min-width: 240px;
  border-right: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}

.list-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  gap: 8px;
  flex-shrink: 0;
}

.list-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.btn-new {
  margin-left: auto;
  background: var(--accent-dim);
  color: var(--accent);
  border: 1px solid var(--accent);
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
}

.list-body { flex: 1; overflow-y: auto; }

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
  line-height: 2;
}

.row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  cursor: pointer;
  border-bottom: 1px solid transparent;
  transition: background 0.1s;
}
.row:hover { background: var(--surface-2); }
.row.selected { background: var(--accent-dim); border-left: 2px solid var(--accent); padding-left: 8px; }
.row.disabled { opacity: 0.45; }

/* Toggle dot */
.toggle-wrap { display: flex; align-items: center; cursor: pointer; flex-shrink: 0; }
.toggle-wrap input { display: none; }
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  border: 1px solid #444;
  flex-shrink: 0;
}
.dot.on { background: var(--ok); border-color: var(--ok); }

.method {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  padding: 2px 5px;
  border-radius: 3px;
  flex-shrink: 0;
  min-width: 46px;
  text-align: center;
  background: var(--surface-2);
}
.method-get    { color: var(--get);    border: 1px solid var(--get); }
.method-post   { color: var(--post);   border: 1px solid var(--post); }
.method-put    { color: var(--put);    border: 1px solid var(--put); }
.method-delete { color: var(--delete); border: 1px solid var(--delete); }
.method-patch  { color: var(--patch);  border: 1px solid var(--patch); }

.path {
  font-family: var(--font-mono);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 165px;
}

.spacer { flex: 1; }

.status-code {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}
</style>
