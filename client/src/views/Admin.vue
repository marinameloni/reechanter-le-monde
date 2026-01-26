<template>
	<div class="admin-view">
		<h2>Admin Panel</h2>
		<p>This action resets progress for all players.</p>
		<button class="btn" @click="resetAll" :disabled="loading">
			{{ loading ? 'Resetting…' : 'Reset Game (All Players)' }}
		</button>
		<p v-if="message" :class="['banner', messageType]">{{ message }}</p>
		<hr />
		<p>Grant resources to admin:</p>
		<button class="btn" @click="grantRocks" :disabled="loadingGrant">
			{{ loadingGrant ? 'Granting…' : 'Give Me 500 Rocks' }}
		</button>
		<p v-if="grantMessage" :class="['banner', grantType]">{{ grantMessage }}</p>
	</div>
	</template>

<script setup>
import { ref } from 'vue';
import api from '../services/api.js';
import { useAuthStore } from '../store/auth.store.js';

const auth = useAuthStore();
const loading = ref(false);
const message = ref('');
const messageType = ref('');
const loadingGrant = ref(false);
const grantMessage = ref('');
const grantType = ref('');

async function resetAll() {
	message.value = '';
	messageType.value = '';
	if ((auth.user?.role || 'user') !== 'admin') {
		message.value = 'You must be admin to perform this action.';
		messageType.value = 'error';
		return;
	}
	try {
		loading.value = true;
		const res = await api.post('/api/admin/reset');
		if (res.data?.success) {
			message.value = 'Game reset successfully. Please rejoin rooms.';
			messageType.value = 'success';
		} else {
			message.value = res.data?.message || 'Reset failed';
			messageType.value = 'error';
		}
	} catch (err) {
		message.value = err?.response?.data?.message || 'Reset failed';
		messageType.value = 'error';
	} finally {
		loading.value = false;
	}
}

async function grantRocks() {
	grantMessage.value = '';
	grantType.value = '';
	if ((auth.user?.role || 'user') !== 'admin') {
		grantMessage.value = 'You must be admin to perform this action.';
		grantType.value = 'error';
		return;
	}
	try {
		loadingGrant.value = true;
		const res = await api.post('/api/admin/grant-rocks');
		if (res.data?.success) {
			grantMessage.value = `Granted 500 rocks. New rocks: ${res.data?.inventory?.rocks ?? 'updated'}`;
			grantType.value = 'success';
		} else {
			grantMessage.value = res.data?.message || 'Grant failed';
			grantType.value = 'error';
		}
	} catch (err) {
		grantMessage.value = err?.response?.data?.message || 'Grant failed';
		grantType.value = 'error';
	} finally {
		loadingGrant.value = false;
	}
}
</script>

<style scoped>
.admin-view { padding: 16px; }
.btn { padding: 8px 12px; border-radius: 6px; background: #333; color: #fff; cursor: pointer; }
.btn[disabled] { opacity: 0.6; cursor: default; }
.banner { margin-top: 10px; padding: 6px 8px; border-radius: 6px; }
.success { background: #e6ffed; color: #035c1a; border: 1px solid #b8f7c7; }
.error { background: #ffeaea; color: #7a0000; border: 1px solid #ffb0b0; }
</style>
