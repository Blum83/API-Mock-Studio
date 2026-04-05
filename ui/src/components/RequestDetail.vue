<template>
  <div class="request-detail">
    <!-- Empty state -->
    <div v-if="!request" class="empty">
      Select a request to inspect it.
    </div>

    <template v-else>
      <!-- Request summary bar -->
      <div class="summary-bar">
        <span :class="['method', 'method-' + request.method.toLowerCase()]">{{ request.method }}</span>
        <span class="url mono">{{ request.url }}</span>
        <span class="spacer" />
        <span v-if="request.mocked" class="mock-badge">MOCKED — {{ request.mockName }}</span>
        <span :class="['status-badge', statusClass(request.status)]">{{ request.status }}</span>
        <span class="duration">{{ request.duration }}ms</span>
        <button class="btn-primary" @click="$emit('save-as-mock', request)">Save as mock</button>
      </div>

      <div class="panels">
        <!-- Request panel -->
        <section class="panel">
          <div class="panel-title">Request</div>
          <div class="panel-body">
            <div class="section-label">Headers</div>
            <pre class="code-block">{{ formatHeaders(request.requestHeaders) }}</pre>
            <template v-if="request.requestBody != null">
              <div class="section-label">Body</div>
              <pre class="code-block">{{ prettyJSON(request.requestBody) }}</pre>
            </template>
          </div>
        </section>

        <!-- Response panel -->
        <section class="panel">
          <div class="panel-title">Response</div>
          <div class="panel-body">
            <div class="section-label">Headers</div>
            <pre class="code-block">{{ formatHeaders(request.responseHeaders) }}</pre>
            <template v-if="request.responseBody != null">
              <div class="section-label">Body</div>
              <pre class="code-block">{{ prettyJSON(request.responseBody) }}</pre>
            </template>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  request: Object,
});
defineEmits(['save-as-mock']);

function prettyJSON(val) {
  if (typeof val === 'string') {
    try { return JSON.stringify(JSON.parse(val), null, 2); } catch { return val; }
  }
  return JSON.stringify(val, null, 2);
}

function formatHeaders(headers) {
  if (!headers) return '';
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

function statusClass(s) {
  if (!s) return '';
  if (s >= 500) return 'err';
  if (s >= 400) return 'warn';
  return 'ok';
}
</script>

<style scoped>
.request-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 13px;
}

.summary-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.method {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--surface-2);
  flex-shrink: 0;
}
.method-get    { color: var(--get);    border: 1px solid var(--get); }
.method-post   { color: var(--post);   border: 1px solid var(--post); }
.method-put    { color: var(--put);    border: 1px solid var(--put); }
.method-delete { color: var(--delete); border: 1px solid var(--delete); }
.method-patch  { color: var(--patch);  border: 1px solid var(--patch); }

.url {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.spacer { flex: 1; }

.mock-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--mocked);
  border: 1px solid var(--mocked);
  border-radius: 3px;
  padding: 2px 6px;
  flex-shrink: 0;
}

.status-badge {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}
.status-badge.ok   { color: var(--ok); }
.status-badge.warn { color: var(--warn); }
.status-badge.err  { color: var(--err); }

.duration {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.btn-primary {
  background: var(--accent);
  color: #0d0d0d;
  font-weight: 600;
  flex-shrink: 0;
}

/* Panels */
.panels {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 1px;
  background: var(--border);
}

.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
}

.panel-title {
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.code-block {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.6;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 10px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
