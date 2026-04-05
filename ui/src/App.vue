<template>
  <div class="app">
    <!-- Header -->
    <header class="app-header">
      <span class="logo">API Mock Studio</span>
      <nav class="tabs">
        <button
          :class="['tab', { active: activeTab === 'traffic' }]"
          @click="activeTab = 'traffic'"
        >Traffic</button>
        <button
          :class="['tab', { active: activeTab === 'mocks' }]"
          @click="activeTab = 'mocks'"
        >Mocks <span v-if="mockCount" class="badge">{{ mockCount }}</span></button>
      </nav>
      <span class="proxy-info">
        Proxy&nbsp;
        <span class="mono">:8080</span>
        &nbsp;→&nbsp;
        <span class="mono target">{{ target }}</span>
      </span>
    </header>

    <!-- Traffic tab -->
    <div v-if="activeTab === 'traffic'" class="view traffic-view">
      <RequestList
        :selected-id="selectedRequest?.id"
        @select="onSelectRequest"
        @clear="selectedRequest = null"
      />
      <div class="detail-column">
        <RequestDetail
          :request="selectedRequest"
          @save-as-mock="openMockEditorFromRequest"
        />
        <MockEditor
          v-if="pendingMock"
          :mock="pendingMock"
          @saved="onMockSaved"
          @cancel="pendingMock = null"
        />
      </div>
    </div>

    <!-- Mocks tab -->
    <div v-if="activeTab === 'mocks'" class="view mocks-view">
      <MockList
        :selected-id="selectedMock?.id"
        :refresh-key="mockRefreshKey"
        @select="onSelectMock"
        @count="mockCount = $event"
      />
      <MockEditor
        :mock="selectedMock"
        @saved="onMockSavedFromList"
        @deleted="onMockDeleted"
        @cancel="selectedMock = null"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import RequestList from './components/RequestList.vue';
import RequestDetail from './components/RequestDetail.vue';
import MockEditor from './components/MockEditor.vue';
import MockList from './components/MockList.vue';

const activeTab = ref('traffic');
const selectedRequest = ref(null);
const pendingMock = ref(null);   // mock being created from a request
const selectedMock = ref(null);  // mock being edited in the Mocks tab
const mockCount = ref(0);
const mockRefreshKey = ref(0);
const target = ref('...');

onMounted(async () => {
  // Read proxy target from a simple endpoint we can add, or just show placeholder
  // We'll derive it from the page URL context – left as placeholder for now
});

function onSelectRequest(req) {
  selectedRequest.value = req;
  pendingMock.value = null;
}

function openMockEditorFromRequest(req) {
  pendingMock.value = {
    name: `${req.method} ${req.path}`,
    method: req.method,
    path: req.path,
    enabled: true,
    response: {
      status: req.status || 200,
      headers: { 'Content-Type': 'application/json' },
      body: req.responseBody,
    },
  };
}

function onMockSaved() {
  pendingMock.value = null;
  mockRefreshKey.value++;
}

function onSelectMock(mock) {
  selectedMock.value = mock;
}

function onMockSavedFromList() {
  mockRefreshKey.value++;
}

function onMockDeleted() {
  selectedMock.value = null;
  mockRefreshKey.value++;
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  height: 44px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.logo {
  font-weight: 600;
  font-size: 14px;
  color: var(--accent);
  letter-spacing: 0.02em;
}

.tabs { display: flex; gap: 2px; }

.tab {
  background: transparent;
  color: var(--text-muted);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
}
.tab.active { background: var(--accent-dim); color: var(--accent); }
.tab:hover:not(.active) { color: var(--text); }

.badge {
  display: inline-block;
  background: var(--accent-dim);
  color: var(--accent);
  border-radius: 10px;
  padding: 0 5px;
  font-size: 11px;
  margin-left: 4px;
}

.proxy-info {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 12px;
}
.mono { font-family: var(--font-mono); }
.target { color: var(--text); }

/* Views */
.view {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.traffic-view {
  flex-direction: row;
}

.detail-column {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.mocks-view {
  flex-direction: row;
}
</style>
