<template>
  <div class="request-list">
    <div class="list-header">
      <span class="list-title">Requests <span class="count">{{ requests.length }}</span></span>
      <button class="btn-ghost" title="Clear log" @click="clearAll">Clear</button>
    </div>

    <div class="list-body" ref="listEl">
      <div
        v-if="requests.length === 0"
        class="empty-state"
      >
        No traffic yet.<br />
        Point your app to <span class="mono">localhost:8080</span>
      </div>

      <div
        v-for="req in requests"
        :key="req.id"
        :class="['row', { selected: req.id === selectedId }, rowClass(req)]"
        @click="$emit('select', req)"
      >
        <span :class="['method', 'method-' + req.method.toLowerCase()]">{{ req.method }}</span>
        <span class="path" :title="req.url">{{ req.path }}<span v-if="req.query && hasQuery(req.query)" class="query-str">?…</span></span>
        <span class="spacer" />
        <span v-if="req.mocked" class="mock-pill" title="Mocked">MOCK</span>
        <span :class="['status', statusClass(req.status)]">{{ req.status }}</span>
        <span class="duration">{{ req.duration }}ms</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  selectedId: String,
});
const emit = defineEmits(['select', 'clear']);

const requests = ref([]);
const listEl = ref(null);
let es = null;

onMounted(() => {
  connectSSE();
});

onUnmounted(() => {
  if (es) es.close();
});

function connectSSE() {
  es = new EventSource('/api/requests/stream');

  es.addEventListener('init', (e) => {
    requests.value = JSON.parse(e.data).reverse();
  });

  es.addEventListener('request', (e) => {
    const req = JSON.parse(e.data);
    requests.value.unshift(req);
    // Trim display list to match server maxLogSize
    if (requests.value.length > 200) requests.value.pop();
  });

  es.onerror = () => {
    // Reconnect handled automatically by EventSource
  };
}

async function clearAll() {
  await fetch('/api/requests', { method: 'DELETE' });
  requests.value = [];
  emit('clear');
}

function hasQuery(q) {
  return q && Object.keys(q).length > 0;
}

function rowClass(req) {
  if (req.mocked) return 'mocked';
  if (req.status >= 500) return 'err';
  if (req.status >= 400) return 'warn';
  return '';
}

function statusClass(status) {
  if (!status) return '';
  if (status >= 500) return 'err';
  if (status >= 400) return 'warn';
  if (status >= 300) return 'warn';
  return 'ok';
}
</script>

<style scoped>
.request-list {
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

.count {
  font-weight: 400;
  color: var(--text-muted);
}

.btn-ghost {
  margin-left: auto;
  background: transparent;
  color: var(--text-muted);
  padding: 2px 7px;
  font-size: 11px;
  border: 1px solid var(--border);
}
.btn-ghost:hover { color: var(--text); border-color: #444; }

.list-body {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
  line-height: 2;
}
.mono { font-family: var(--font-mono); color: var(--text); }

.row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  border-bottom: 1px solid transparent;
  transition: background 0.1s;
}
.row:hover { background: var(--surface-2); }
.row.selected { background: var(--accent-dim); border-left: 2px solid var(--accent); padding-left: 10px; }
.row.mocked { border-left: 2px solid var(--mocked); padding-left: 10px; }
.row.err { border-left: 2px solid var(--err); padding-left: 10px; }
.row.warn { border-left: 2px solid var(--warn); padding-left: 10px; }

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
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}
.query-str { color: var(--text-muted); }

.spacer { flex: 1; }

.mock-pill {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--mocked);
  border: 1px solid var(--mocked);
  border-radius: 3px;
  padding: 1px 4px;
  flex-shrink: 0;
}

.status {
  font-family: var(--font-mono);
  font-size: 11px;
  flex-shrink: 0;
  min-width: 28px;
  text-align: right;
}
.status.ok   { color: var(--ok); }
.status.warn { color: var(--warn); }
.status.err  { color: var(--err); }

.duration {
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
  min-width: 40px;
  text-align: right;
}
</style>
