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
		<hr />
		<p>Fill level requirement (complete shared progress):</p>
		<div class="row">
			<label>Map ID:</label>
			<input class="input" type="number" v-model.number="fillMapId" min="1" max="5" />
			<button class="btn" @click="fillLevel" :disabled="loadingFill">{{ loadingFill ? 'Filling…' : 'Complete Level' }}</button>
			<button class="btn" @click="announceUnlock" :disabled="loadingFill">Announce Unlock</button>
		</div>
		<p v-if="fillMessage" :class="['banner', fillType]">{{ fillMessage }}</p>
		<hr />
		<p>Moderation: Block / Unblock / Kick</p>
		<div class="row">
			<label>Username:</label>
			<input class="input" type="text" v-model="targetUsername" />
			<button class="btn" @click="blockUser">Block</button>
			<button class="btn" @click="unblockUser">Unblock</button>
			<button class="btn" @click="kickUser">Kick (current room)</button>
		</div>
		<p v-if="moderationMessage" :class="['banner', moderationType]">{{ moderationMessage }}</p>
		<hr />
		<p>Grant all tools to user (blank = self):</p>
		<div class="row">
			<label>Username:</label>
			<input class="input" type="text" v-model="toolsUsername" />
			<button class="btn" @click="giveAllTools">Give All Tools</button>
		</div>
		<p v-if="toolsMessage" :class="['banner', toolsType]">{{ toolsMessage }}</p>
	</div>
	</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api.js';
import { useAuthStore } from '../store/auth.store.js';
import { useGameStore } from '../store/game.store.js';

const auth = useAuthStore();
const game = useGameStore();
const router = useRouter();
const loading = ref(false);
const message = ref('');
const messageType = ref('');
const loadingGrant = ref(false);
const grantMessage = ref('');
const grantType = ref('');
const fillMapId = ref(1);
const loadingFill = ref(false);
const fillMessage = ref('');
const fillType = ref('');
const targetUsername = ref('');
const moderationMessage = ref('');
const moderationType = ref('');
const toolsUsername = ref('');
const toolsMessage = ref('');
const toolsType = ref('');

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
			// Update local user map and reconnect to Map 1
			if (auth.user) {
				auth.user = { ...auth.user, id_map: 1 };
				try { localStorage.setItem('auth_user', JSON.stringify(auth.user)); } catch {}
				try {
					await game.switchRoom(auth.user.username, 1);
				} catch {}
			}
			// Navigate back to Game view
			try { router.push('/game'); } catch {}
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

async function fillLevel() {
	fillMessage.value = '';
	fillType.value = '';
	if ((auth.user?.role || 'user') !== 'admin') {
		fillMessage.value = 'Admin required.';
		fillType.value = 'error';
		return;
	}
	try {
		loadingFill.value = true;
		const res = await api.post('/api/admin/fill-level', { mapId: fillMapId.value });
		if (res.data?.success) {
			fillMessage.value = `Completed level for map ${fillMapId.value}.`;
			fillType.value = 'success';
		} else {
			fillMessage.value = res.data?.message || 'Fill failed';
			fillType.value = 'error';
		}
	} catch (err) {
		fillMessage.value = err?.response?.data?.message || 'Fill failed';
		fillType.value = 'error';
	} finally {
		loadingFill.value = false;
	}
}

async function announceUnlock() {
	if (!game.room) { fillMessage.value = 'Not connected to room.'; fillType.value = 'error'; return; }
	try { game.room.send('adminAnnounceUnlock', { mapId: fillMapId.value }); fillMessage.value = 'Unlock announced.'; fillType.value = 'success'; } catch { fillMessage.value = 'Announce failed'; fillType.value = 'error'; }
}

async function blockUser() {
	moderationMessage.value = '';
	moderationType.value = '';
	if ((auth.user?.role || 'user') !== 'admin') { moderationMessage.value = 'Admin required.'; moderationType.value = 'error'; return; }
	if (!targetUsername.value) { moderationMessage.value = 'Enter a username.'; moderationType.value = 'error'; return; }
	try {
		const res = await api.post('/api/admin/block-user', { username: targetUsername.value });
		moderationMessage.value = res.data?.success ? `Blocked ${targetUsername.value}.` : (res.data?.message || 'Block failed');
		moderationType.value = res.data?.success ? 'success' : 'error';
	} catch (err) {
		moderationMessage.value = err?.response?.data?.message || 'Block failed';
		moderationType.value = 'error';
	}
}

async function unblockUser() {
	moderationMessage.value = '';
	moderationType.value = '';
	if ((auth.user?.role || 'user') !== 'admin') { moderationMessage.value = 'Admin required.'; moderationType.value = 'error'; return; }
	if (!targetUsername.value) { moderationMessage.value = 'Enter a username.'; moderationType.value = 'error'; return; }
	try {
		const res = await api.post('/api/admin/unblock-user', { username: targetUsername.value });
		moderationMessage.value = res.data?.success ? `Unblocked ${targetUsername.value}.` : (res.data?.message || 'Unblock failed');
		moderationType.value = res.data?.success ? 'success' : 'error';
	} catch (err) {
		moderationMessage.value = err?.response?.data?.message || 'Unblock failed';
		moderationType.value = 'error';
	}
}

async function kickUser() {
	if (!game.room) { moderationMessage.value = 'Not connected to room.'; moderationType.value = 'error'; return; }
	if (!targetUsername.value) { moderationMessage.value = 'Enter a username.'; moderationType.value = 'error'; return; }
	try { game.room.send('adminKickUser', { username: targetUsername.value }); moderationMessage.value = 'Kick sent.'; moderationType.value = 'success'; } catch { moderationMessage.value = 'Kick failed'; moderationType.value = 'error'; }
}

async function giveAllTools() {
	toolsMessage.value = '';
	toolsType.value = '';
	if ((auth.user?.role || 'user') !== 'admin') { toolsMessage.value = 'Admin required.'; toolsType.value = 'error'; return; }
	try {
		const res = await api.post('/api/admin/give-all-tools', { username: toolsUsername.value || undefined });
		toolsMessage.value = res.data?.success ? `Granted all tools to ${res.data?.username || (toolsUsername.value || auth.user?.username)}` : (res.data?.message || 'Grant tools failed');
		toolsType.value = res.data?.success ? 'success' : 'error';
	} catch (err) {
		toolsMessage.value = err?.response?.data?.message || 'Grant tools failed';
		toolsType.value = 'error';
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
.row { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
.input { padding: 6px 8px; border: 1px solid #ccc; border-radius: 6px; }
</style>
