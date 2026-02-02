<template>
	<div class="game-map">
		<!-- persistent background audio element (kept mounted so closing modals won't stop playback) -->
		<audio ref="bgMusic" id="bg-music" :src="musicSrc" preload="auto" loop style="display:none"></audio>
		<div class="map-wrapper" :style="wrapperStyle">
			<!-- Top-left quick action buttons inside the game screen -->
			<div class="map-top-left-buttons" role="group" aria-label="Quick actions">
				<button class="ml-btn" title="Settings" @click.prevent="openSettings">
					<span class="ml-inner">
						<img src="../../assets/sprites/settinglogo.png">
					</span>
				</button>
				<button class="ml-btn" title="User" @click.prevent="openUser">
					<span class="ml-inner">👤</span>
				</button>
				<button class="ml-btn" title="Map" @click.prevent>
					<span class="ml-inner">
						<img src="../../assets/sprites/mapicon.png">
					</span>
				</button>
			</div>

			<!-- Top-right resource/value display -->
			<div class="top-right-values" aria-hidden="false">
				<div class="value-card">
					<p v-if="activeMapId === 3">Flowers planted: {{ flowersPlanted }} / {{ flowersTotal }}</p>
					<p v-else-if="activeMapId === 4">Fences built: {{ fencesBuiltCount }} / {{ fencesTotal }}</p>
					<p v-else-if="activeMapId === 5">Houses built: {{ housesBuiltCount }} / {{ housesTotal }} | {{ housesProgressDisplay }}</p>
					<p v-else>Factory Progress: {{ currentFactoryProgress.current }} / {{ currentFactoryProgress.required }}</p>
				</div>
			</div>
			<img :src="mapImage" :alt="mapObj.name" class="map-image" />
			<div class="tiles-overlay" :style="gridStyle">
				<Tile
					v-for="tile in gridTiles"
					:key="tile.id"
					:size="mapObj.tileSize"
					:blocked="isBlocked(tile.x, tile.y)"
					@click="handleTileClick(tile)"
					@mouseenter="handleTileHover(tile)"
					@mouseleave="clearTileHover"
				/>
			</div>
			<!-- NPC exchanger overlay -->
			<img
				:src="npcImg"
				alt="NPC Exchanger"
				class="npc-sprite"
				:style="{ transform: `translate(${npcX * mapObj.tileSize}px, ${npcY * mapObj.tileSize}px)` }"
			/>
			<!-- Gate overlay (only on Map 1) -->
			<img v-if="activeMapId === 1"
				:src="gateImg"
				alt="Gate"
				class="gate-sprite"
				:style="{ transform: `translate(${gateX * mapObj.tileSize - 8}px, ${gateY * mapObj.tileSize - 16}px)` }"
			/>
			<!-- Gate overlay (Map 2 -> Map 3) -->
			<img v-if="activeMapId === 2"
				:src="gateImg"
				alt="Gate to Map 3"
				class="gate-sprite"
				:style="{ transform: `translate(${gate2X * mapObj.tileSize - 8}px, ${gate2Y * mapObj.tileSize - 16}px)` }"
			/>
			<!-- Gate overlay (Map 3 -> Map 4) -->
			<img v-if="activeMapId === 3"
				:src="gateImg"
				alt="Gate to Map 4"
				class="gate-sprite"
				:style="{ transform: `translate(${gate3X * mapObj.tileSize - 8}px, ${gate3Y * mapObj.tileSize - 16}px)` }"
			/>
			<!-- Gate overlay (Map 4 -> Map 5) -->
			<img v-if="activeMapId === 4"
				:src="gateImg"
				alt="Gate to Map 5"
				class="portal-sprite"
				:style="{ transform: `translate(${gate4X * mapObj.tileSize - 16}px, ${gate4Y * mapObj.tileSize - 32}px)` }"
			/>
			<!-- Gate overlay (Map 5 portal) -->
			<img v-if="activeMapId === 5"
				:src="gateImg"
				alt="Portal"
				class="portal-sprite"
				:style="{ transform: `translate(${gate5X * mapObj.tileSize - 16}px, ${gate5Y * mapObj.tileSize - 32}px)` }"
			/>
			<!-- Flowers overlay (Map 3) -->
			<template v-if="activeMapId === 3">
				<img
					v-for="key in floweredTileKeys"
					:key="'flower-' + key"
					:src="flowersImg"
					alt="Flowers"
					class="gate-sprite"
					:style="{
						transform: (() => {
							const [fx, fy] = key.split(',').map(n => parseInt(n));
							return `translate(${fx * mapObj.tileSize - 8}px, ${fy * mapObj.tileSize - 16}px)`;
						})()
					}"
				/>
				<!-- Shining overlay for tiles to water (Map 3) -->
				<div
					v-for="key in waterableTileKeys"
					:key="'shine-' + key"
					class="waterable-shine"
					:style="{
						width: mapObj.tileSize + 'px',
						height: mapObj.tileSize + 'px',
						transform: (() => {
							const [sx, sy] = key.split(',').map(n => parseInt(n));
							return `translate(${sx * mapObj.tileSize}px, ${sy * mapObj.tileSize}px)`;
						})()
					}"
				></div>
			</template>
			<!-- Houses building overlay (Map 5) -->
			<template v-if="activeMapId === 5">
				<!-- Show base placeholder until built -->
				<template v-for="site in houseSites" :key="'house-block-' + site.key">
					<img
						v-if="(houseProgress[site.key] || 0) < houseRequired"
						:src="houseBaseImg"
						alt="House Base"
						class="house-sprite"
						:style="{ width: (mapObj.tileSize * houseWidth) + 'px', height: (mapObj.tileSize * houseHeight) + 'px', transform: `translate(${(site.x - (houseWidth - 1)) * mapObj.tileSize}px, ${(site.y - (houseHeight - 1)) * mapObj.tileSize}px)` }"
					/>
					<!-- Show final house when built -->
					<img
						v-else
						:src="site.img"
						alt="House"
						class="house-sprite"
						:style="{ width: (mapObj.tileSize * houseWidth) + 'px', height: (mapObj.tileSize * houseHeight) + 'px', transform: `translate(${(site.x - (houseWidth - 1)) * mapObj.tileSize}px, ${(site.y - (houseHeight - 1)) * mapObj.tileSize}px)` }"
					/>
					<!-- Progress indicator on hover -->
					<div
						v-if="hoverTile && hoverTile.x === (site.x - (houseWidth - 1)) && hoverTile.y === (site.y - (houseHeight - 1))"
						class="tile-progress"
						:style="{ transform: `translate(${(site.x - (houseWidth - 1)) * mapObj.tileSize}px, ${((site.y - (houseHeight - 1)) * mapObj.tileSize) - 20}px)` }"
					>
						{{ (houseProgress[site.key] || 0) }} / {{ houseRequired }}
					</div>
				</template>
			</template>
			<!-- Fences overlay and highlights (Map 4) -->
			<template v-if="activeMapId === 4">
				<!-- Built fences -->
				<img
					v-for="key in Array.from(fenceBuiltSet)"
					:key="'fence-' + key"
					:src="fenceImg"
					alt="Fence"
					class="gate-sprite"
					:style="{
						transform: (() => {
							const [fx, fy] = key.split(',').map(n => parseInt(n));
							return `translate(${fx * mapObj.tileSize - 8}px, ${fy * mapObj.tileSize - 16}px)`;
						})()
					}"
				/>
				<!-- Fence target highlights (unbuilt) -->
				<div
					v-for="key in map4FenceTargetKeys"
					:key="'fence-target-' + key"
					class="fence-target-shine"
					:style="{
						width: mapObj.tileSize + 'px',
						height: mapObj.tileSize + 'px',
						transform: (() => {
							const [sx, sy] = key.split(',').map(n => parseInt(n));
							return `translate(${sx * mapObj.tileSize}px, ${sy * mapObj.tileSize}px)`;
						})()
					}"
				></div>
			</template>
			<PlayerSprite
				:tile-size="mapObj.tileSize"
				:x="playerX"
				:y="playerY"
				:name="auth.user?.username || ''"
				:color="auth.user?.color"
				:direction="playerDirection"
				:is-walking="isWalking"
			/>
			<!-- My chat bubble -->
			<div v-if="chatBubbles[auth.user?.username || '']" class="chat-bubble"
		     :style="{ transform: `translate(${playerX * mapObj.tileSize}px, ${(playerY * mapObj.tileSize) - 40}px)` }">
				{{ chatBubbles[auth.user?.username || '']?.text }}
			</div>

			<!-- User card popup positioned near player -->
			<div v-if="showUser" class="user-popup" :style="userPopupStyle">
				<div class="user-card">
					<div class="user-left">
						<div class="user-sprite" v-html="userSpriteSvg"></div>
						<div class="player-name">{{ auth.user?.username || 'Player' }}</div>
							<button class="btn small" @click="closeUser">Close</button>

							<!-- Color selector (player color customization) -->
							<div class="color-selector">
								<div v-for="c in colorOptions" :key="c" class="color-option" :class="{ selected: auth.user?.color === c }" :style="{ backgroundColor: colorMap[c] || c }" @click="selectColor(c)"></div>
							</div>
						</div>
					<div class="user-right">
						<h4>Inventory</h4>
						<div class="inv-grid small">
							<div v-for="slot in inventorySlots" :key="slot.key" class="inv-slot small" :title="slot.label + (slot.count != null ? (' x' + slot.count) : '')">
								<div class="inv-inner">
									<img v-if="slot.img" :src="slot.img" class="inv-img" :alt="slot.label" />
									<span v-else class="inv-emoji">{{ slot.emoji || '◻' }}</span>
									<span class="inv-count" v-if="slot.count != null">{{ slot.count }}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<PlayerSprite
				v-for="p in otherPlayers"
				:key="p.sessionId"
				:tile-size="mapObj.tileSize"
				:x="p.x ?? 1"
				:y="p.y ?? 1"
				:name="p.username"
				:color="p.color"
			/>
			<!-- Click overlay for other players -->
			<div
				v-for="p in otherPlayers"
				:key="p.sessionId + '-click'"
				class="player-click"
				:style="{ width: mapObj.tileSize + 'px', height: mapObj.tileSize + 'px', transform: `translate(${(p.x ?? 1) * mapObj.tileSize}px, ${(p.y ?? 1) * mapObj.tileSize}px)` }"
				@click="openPlayerCard(p)"
			></div>
			<!-- Other players chat bubbles -->
			<div
				v-for="p in bubblePlayers"
				:key="p.sessionId + '-bubble'"
				class="chat-bubble"
				:style="{ transform: `translate(${(p.x ?? 1) * mapObj.tileSize}px, ${((p.y ?? 1) * mapObj.tileSize) - 40}px)` }"
			>
				{{ chatBubbles[p.username]?.text }}
			</div>
			<div
				v-if="activeFactory"
				class="factory-progress"
				:style="{
					transform: `translate(${activeFactory.x * mapObj.tileSize}px, ${
						activeFactory.y * mapObj.tileSize - 20
					}px)`,
				}"
			>
				{{ currentFactoryProgress.current }} / {{ currentFactoryProgress.required }}
			</div>
			<!-- Per-tile watering progress (Map 3) -->
			<div
				v-if="activeMapId === 3 && hoverTile && isFactoryTile(hoverTile.x, hoverTile.y)"
				class="tile-progress"
				:style="{ transform: `translate(${hoverTile.x * mapObj.tileSize}px, ${(hoverTile.y * mapObj.tileSize) - 20}px)` }"
			>
				{{ (flowerProgressByTile[`${hoverTile.x},${hoverTile.y}`] || 0) }} / 50
			</div>

			<!-- Flower particles -->
			<div
				v-for="p in flowerParticles"
				:key="p.id"
				class="flower-particle"
				:style="{ transform: `translate(${p.x * mapObj.tileSize + p.ox}px, ${p.y * mapObj.tileSize + p.oy}px)` }"
			></div>
			<!-- Endgame overlay -->
			<div v-if="gameFinished" class="endgame-overlay">
				<h2>Monde Réanchanté! Bravo ! :)</h2>
				<ul class="leaderboard">
					<li>Joueur le plus constructif: {{ leaderboard.mostConstructive || '—' }}</li>
					<li>Harvested the most: {{ leaderboard.mostHarvest || '—' }}</li>
					<li>Pipelette de la partie: {{ leaderboard.mostTalkative || '—' }}</li>
					<li>Did nothing: {{ leaderboard.didNothing || '—' }}</li>
				</ul>
			</div>

			<!-- In-map chat sender (bottom center, styled like classic arcade/chat bar) -->
			<div class="chat-input map-chat" role="form">
				<input type="text" v-model.trim="chatInput" placeholder="Say something..." @keydown.enter="sendChat" />
				<button class="btn" @click="sendChat">Send</button>
			</div>

			<!-- Map debug overlay (appears when map health check fails) -->
			<div v-if="showMapDebug" class="map-debug">
				<div class="map-debug-row"><strong>Map Debug</strong></div>
				<div class="map-debug-row">activeMapId: {{ activeMapId }}</div>
				<div class="map-debug-row">mapImage: {{ mapImage }}</div>
				<div class="map-debug-row">mapObj: {{ mapObj.width }} x {{ mapObj.height }} @ tileSize {{ mapObj.tileSize }}</div>
				<div class="map-debug-row">wrapper: {{ wrapperStyle.width }} x {{ wrapperStyle.height }}</div>
				<div class="map-debug-row">message: {{ mapDebugMessage }}</div>
			</div>
		</div>

				<!-- Settings modal (stone-themed) -->
				<div v-if="showSettings" class="settings-modal" role="dialog" aria-modal="true">
					<div class="settings-card">
						<h3>Settings</h3>
						<div class="settings-row">
							<label>Musique</label>
							<div class="settings-controls">
								<label><input type="radio" name="music" :value="true" v-model="musicEnabled" /> Oui</label>
								<label><input type="radio" name="music" :value="false" v-model="musicEnabled" /> Non</label>
							</div>
							<!-- music placeholder (audio element moved to top-level so closing modal won't stop playback) -->
						</div>
						<div class="settings-row">
							<label>Effets sonores</label>
							<div class="settings-controls">
								<label><input type="radio" name="sfx" :value="true" v-model="sfxEnabled" /> Oui</label>
								<label><input type="radio" name="sfx" :value="false" v-model="sfxEnabled" /> Non</label>
							</div>
						</div>
						<div class="settings-actions">
							<button class="btn logout" @click="handleLogout">Se déconnecter</button>
							<button class="btn" @click="closeSettings">Fermer</button>
						</div>
					</div>
				</div>
				<div class="hud">
			<!-- <p>Position: ({{ playerX }}, {{ playerY }})</p> -->
			<div v-if="bannerMessage" :class="['banner', bannerType]">{{ bannerMessage }}</div>
			
		</div>

		<!-- Simple Exchange Modal -->
		<div v-if="showExchange" class="exchange-modal">
			<div class="exchange-card">
				<h3>Trade with NPC</h3>
				<p class="hint">
					Trade bricks and rocks for tools.
					Watering Can lets you water trees (coming soon).
					Shovel doubles your factory clicks (x2).
				</p>
				<p class="offer">
					<img :src="wateringCanImg" alt="Watering Can" class="inv-icon"/> Watering Can:
					<span>{{ offers.watering.bricks }} bricks + {{ offers.watering.rocks }} rocks</span>
				</p>
				<button
					class="btn"
					:disabled="bricks < offers.watering.bricks || rocks < offers.watering.rocks"
					@click="buyItem('watering')"
				>
					Buy Watering Can
				</button>

				<p class="offer">
					<img :src="shovelImg" alt="Shovel" class="inv-icon"/> Shovel:
					<span>{{ offers.shovel.bricks }} bricks + {{ offers.shovel.rocks }} rocks</span>
				</p>
				<button
					class="btn"
					:disabled="bricks < offers.shovel.bricks || rocks < offers.shovel.rocks"
					@click="buyItem('shovel')"
				>
					Buy Shovel
				</button>

				<!-- Fertilizer (Map 3 only) -->
				<p class="offer" v-if="activeMapId === 3">
					<img :src="fertilizerImg" alt="Fertilizer" class="inv-icon"/> Fertilizer:
					<span>{{ offers.fertilizer.bricks }} bricks + {{ offers.fertilizer.rocks }} rocks</span>
				</p>
				<button
					v-if="activeMapId === 3"
					class="btn"
					:disabled="bricks < offers.fertilizer.bricks || rocks < offers.fertilizer.rocks"
					@click="buyItem('fertilizer')"
				>
					Buy Fertilizer
				</button>

				<button class="btn close" @click="showExchange = false">Close</button>
			</div>
		</div>
	</div>

	<!-- Player Card Modal -->
	<div v-if="showPlayerCard" class="exchange-modal">
		<div class="exchange-card">
			<h3>{{ selectedPlayer?.username }}</h3>
			<p class="hint">Robot color: <strong>{{ selectedPlayer?.color || 'unknown' }}</strong></p>
			<p>Bricks: {{ selectedInventory.bricks }} | Rocks: {{ selectedInventory.rocks }}</p>
			<div>
				<span>Tools: </span>
				<span v-for="(count, type) in selectedInventory.tools" :key="type" style="margin-right:8px;">
					{{ type }} x{{ count }}
				</span>
			</div>
			<button class="btn" @click="requestTrade">Ask to trade</button>
			<button class="btn close" @click="showPlayerCard = false">Close</button>
		</div>
	</div>

	<!-- Incoming Trade Notification -->
	<div v-if="incomingTrade" class="exchange-modal">
		<div class="exchange-card">
			<h3>Trade Request</h3>
			<p>{{ incomingTrade.fromUsername }} wants to trade with you.</p>
			<button class="btn" @click="respondTrade(true)">Accept</button>
			<button class="btn close" @click="respondTrade(false)">Decline</button>
		</div>
	</div>

	<!-- Trade Form Modal for both players -->
	<div v-if="showTradeForm" class="exchange-modal">
		<div class="exchange-card wide">
			<h3>Trading with {{ tradePartner }}</h3>
			<div class="trade-grid">
				<div class="panel">
					<h4>Your Inventory</h4>
					<p>Bricks: {{ bricks }} | Rocks: {{ rocks }}</p>
					<div>
						<span>Tools: </span>
						<span class="tool-badge" v-if="wateringCans">watering_can x{{ wateringCans }}</span>
						<span class="tool-badge" v-if="shovels">shovel x{{ shovels }}</span>
					</div>
					<label>Bricks to send
						<input type="number" v-model.number="bricksToSend" min="0" />
					</label>
					<label>Rocks to send
						<input type="number" v-model.number="rocksToSend" min="0" />
					</label>
						<button class="btn" @click="proposeOffer" :disabled="waitingPartnerConfirm">Propose Offer</button>
					<p v-if="waitingPartnerConfirm" class="hint">Waiting for partner confirmation...</p>
				</div>
				<div class="panel">
					<h4>{{ tradePartner }}'s Inventory</h4>
					<p>Bricks: {{ partnerInventory.bricks }} | Rocks: {{ partnerInventory.rocks }}</p>
					<div>
						<span>Tools: </span>
						<span v-for="(count, type) in partnerInventory.tools" :key="type" class="tool-badge">{{ type }} x{{ count }}</span>
					</div>
				</div>
			</div>
			<button class="btn close" @click="showTradeForm = false">Close</button>
		</div>
	</div>

	<!-- Incoming Offer Modal -->
	<div v-if="incomingOffer" class="exchange-modal">
		<div class="exchange-card">
			<h3>Trade Offer</h3>
			<p>{{ incomingOffer.fromUsername }} proposes sending you:</p>
			<p>Bricks: {{ incomingOffer.bricks }} | Rocks: {{ incomingOffer.rocks }}</p>
			<div style="margin-top:8px;">
				<p class="hint">Propose what you will send back:</p>
				<label>Bricks to give back
					<input type="number" v-model.number="counterBricks" min="0" />
				</label>
				<label>Rocks to give back
					<input type="number" v-model.number="counterRocks" min="0" />
				</label>
			</div>
			<button class="btn" @click="sendCounterOffer">Accept & Propose</button>
			<button class="btn close" @click="declineIncomingOffer">Decline</button>
		</div>
	</div>

	<!-- Final Confirmation Modal (Proposer) -->
	<div v-if="showFinalConfirm && finalOffer" class="exchange-modal">
		<div class="exchange-card">
			<h3>Confirm Trade</h3>
			<p>You will send to {{ tradePartner }}: Bricks {{ bricksToSend }} | Rocks {{ rocksToSend }}</p>
			<p>{{ finalOffer.fromUsername }} will send to you: Bricks {{ finalOffer.bToA?.bricks || 0 }} | Rocks {{ finalOffer.bToA?.rocks || 0 }}</p>
			<button class="btn" @click="executeExchange">Confirm Exchange</button>
			<button class="btn close" @click="cancelFinal">Cancel</button>
		</div>
	</div>
</template>
<script setup>
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../store/auth.store';
import { useGameStore } from '../../store/game.store';
import api from '../../services/api';
import map1 from '../../assets/maps/map1.json';
import map2 from '../../assets/maps/map2.json';
import map3 from '../../assets/maps/map3.json';
import map4 from '../../assets/maps/map4.json';
import map5 from '../../assets/maps/map5.json';
import mapImage1 from '../../assets/maps/maplevel1.png';
import mapImage2 from '../../assets/maps/maplevel2.png';
import mapImage3Asset from '../../assets/maps/maplevel2nofactory.png';
import mapImage4 from '../../assets/maps/maplevel4.png';
import mapImage5 from '../../assets/maps/maplevel5.png';
import npcImg from '../../assets/sprites/npc_exchanger.png';
import gateImg from '../../assets/sprites/gate.png';
import shovelImg from '../../assets/sprites/item_shovel.png';
import wateringCanImg from '../../assets/sprites/item_wateringcan.png';
import fertilizerImg from '../../assets/sprites/fertilizer.png';
import flowersImg from '../../assets/sprites/flowers.png';
import fenceImg from '../../assets/sprites/fence.png';
import houseBaseImg from '../../assets/sprites/housebase.png';
import house1Img from '../../assets/maps/house1.png';
import house2Img from '../../assets/maps/house2.png';
import house3Img from '../../assets/maps/house3.png';
import Tile from './Tile.vue';
import PlayerSprite from './PlayerSprite.vue';
import map1bg from '../../assets/music/map1bg.mp3';
import map2bg from '../../assets/music/map2bg.mp3';
import map3bg from '../../assets/music/map3bg.mp3';
import map4bg from '../../assets/music/map4bg.mp3';
import map5bg from '../../assets/music/map5bg.mp3';
import hit1 from '../../assets/music/hit1.mp3';
import hit2 from '../../assets/music/hit2.mp3';
import hit3 from '../../assets/music/hit3.mp3';
import plantSfx from '../../assets/music/plant.mp3';
import rockSfx from '../../assets/music/rock.mp3';
import chatSfx from '../../assets/music/chatsound.mp3';

const auth = useAuthStore();
const gameStore = useGameStore();
const router = useRouter();

const props = defineProps({
	initialMapId: { type: Number, default: 1 }
});
const activeMapId = ref(props.initialMapId || 1);
// Map 3 background
const mapImage3 = mapImage3Asset;
const mapObj = computed(() => (
	activeMapId.value === 1 ? map1 :
	activeMapId.value === 2 ? map2 :
	activeMapId.value === 3 ? map3 :
	activeMapId.value === 4 ? map4 :
	map5
));
const mapImage = computed(() => (
	activeMapId.value === 1 ? mapImage1 :
	activeMapId.value === 2 ? mapImage2 :
	activeMapId.value === 3 ? mapImage3 :
	activeMapId.value === 4 ? mapImage4 :
	mapImage5
));

// Debug overlay helper: shown automatically when map image or computed wrapper size looks invalid
const showMapDebug = ref(false);
const mapDebugMessage = ref('');

function checkMapHealth() {
	try {
		const mi = mapImage.value;
		const w = parseInt((wrapperStyle.value.width || '').toString(), 10) || 0;
		const h = parseInt((wrapperStyle.value.height || '').toString(), 10) || 0;
		if (!mi) {
			mapDebugMessage.value = 'mapImage is falsy';
			showMapDebug.value = true;
			return;
		}
		if (w <= 0 || h <= 0) {
			mapDebugMessage.value = `wrapper size invalid: ${w}x${h}`;
			showMapDebug.value = true;
			return;
		}
		// otherwise hide debug overlay
		showMapDebug.value = false;
		mapDebugMessage.value = '';
	} catch (e) {
		showMapDebug.value = true;
		mapDebugMessage.value = String(e?.message || e);
	}
}

const wrapperStyle = computed(() => ({
	width: mapObj.value.width * mapObj.value.tileSize + 'px',
	height: mapObj.value.height * mapObj.value.tileSize + 'px',
}));

const gridStyle = computed(() => ({
	display: 'grid',
	gridTemplateColumns: `repeat(${mapObj.value.width}, ${mapObj.value.tileSize}px)`,
	gridTemplateRows: `repeat(${mapObj.value.height}, ${mapObj.value.tileSize}px)`,
	width: '100%',
	height: '100%',
}));

const gridTiles = computed(() => Array.from({ length: mapObj.value.width * mapObj.value.height }, (_, index) => ({
	id: index,
	x: index % mapObj.value.width,
	y: Math.floor(index / mapObj.value.width),
})));

// Map 5 house building: sites and progress
const houseSites = [
		{ x: 14, y: 13, key: '14,13', img: house1Img },
		{ x: 8, y: 7, key: '8,7', img: house2Img },
		{ x: 28, y: 7, key: '28,7', img: house3Img },
];
const houseProgress = ref({}); // { 'x,y': current }
const houseRequired = 50;
const houseWidth = 3; // tiles wide (extends left from anchor)
const houseHeight = 2; // tiles tall (extends upward from anchor)

// Houses overall progress (Map 5)
const housesTotal = houseSites.length;
const housesBuiltCount = computed(() => {
	return houseSites.reduce((acc, s) => acc + (((houseProgress.value[s.key] || 0) >= houseRequired) ? 1 : 0), 0);
});
const housesProgressDisplay = computed(() => {
	return houseSites.map(s => {
		const cur = houseProgress.value[s.key] || 0;
		return `${s.key}: ${cur} / ${houseRequired}`;
	}).join(' | ');
});

// Endgame state
const gameFinished = ref(false);
const leaderboard = ref({ mostConstructive: null, mostHarvest: null, mostTalkative: null, didNothing: null });

const unwalkableCoords = [
	[8, 0],
	[9, 0],
	[10, 0],
	[23, 0],
	[24, 0],
	[25, 0],
	[5, 1],
	[9, 1],
	[10, 1],
	[18, 1],
	[20, 1],
	[21, 1],
	[22, 1],
	[23, 1],
	[24, 1],
	[25, 1],
	[26, 1],
	[27, 1],
	[28, 1],
	[29, 1],
	[30, 1],
	[2, 2],
	[18, 2],
	[19, 2],
	[20, 2],
	[21, 2],
	[22, 2],
	[23, 2],
	[24, 2],
	[25, 2],
	[26, 2],
	[27, 2],
	[28, 2],
	[29, 2],
	[30, 2],
	[0, 3],
	[5, 3],
	[18, 3],
	[20, 3],
	[21, 3],
	[22, 3],
	[23, 3],
	[24, 3],
	[25, 3],
	[26, 3],
	[27, 3],
	[28, 3],
	[29, 3],
	[30, 3],
	[5, 4],
	[6, 4],
	[19, 4],
	[20, 4],
	[21, 4],
	[22, 4],
	[23, 4],
	[24, 4],
	[25, 4],
	[26, 4],
	[27, 4],
	[29, 4],
	[30, 4],
	[5, 5],
	[7, 5],
	[8, 5],
	[20, 5],
	[21, 5],
	[22, 5],
	[23, 5],
	[24, 5],
	[25, 5],
	[26, 5],
	[27, 5],
	[29, 5],
	[30, 5],
	[5, 6],
	[8, 6],
	[15, 6],
	[15, 7],
	[30, 7],
	[17, 8],
	[9, 10],
	[17, 10],
	[30, 10],
	[31, 10],
	[9, 11],
	[10, 11],
	[17, 11],
	[30, 11],
	[31, 11],
	[4, 12],
	[5, 12],
	[9, 12],
	[10, 12],
	[11, 12],
	[13, 12],
	[17, 12],
	[30, 12],
	[1, 13],
	[2, 13],
	[4, 13],
	[5, 13],
	[9, 13],
	[10, 13],
	[11, 13],
	[12, 13],
	[13, 13],
	[16, 13],
	[17, 13],
	[30, 13],
	[0, 14],
	[1, 14],
	[3, 15],
	[5, 16],
	[16, 16],
	[17, 16],
	[18, 16],
	[19, 16],
	[20, 16],
	[1, 17],
	[5, 17],
  // NPC position
  [25, 13],
];

const factoryCoords = [
	[20, 4],
	[20, 5],
	[21, 5],
	[22, 5],
	[23, 5],
	[24, 5],
	[25, 5],
	[26, 5],
	[27, 5],
	[29, 5],
	[30, 5],
	[20, 3],
	[21, 4],
	[22, 4],
	[23, 4],
	[24, 4],
	[25, 4],
	[26, 4],
	[27, 4],
	[29, 4],
	[30, 4],
	[20, 2],
	[21, 3],
	[22, 3],
	[23, 3],
	[24, 3],
	[25, 3],
	[26, 3],
	[27, 3],

];

const debrisCoords = [
	[5, 3],
	[5, 4],
	[6, 4],
	[5, 5],
	[7, 5],
	[8, 5],
	[5, 6],
	[8, 6],
	[9, 10],
	[30, 10],
	[31, 10],
	[9, 11],
	[10, 11],
	[30, 11],
	[9, 12],
	[10, 12],
	[11, 12],
	[30, 12],
	[9, 13],
	[10, 13],
	[11, 13],
	[12, 13],
	[13, 13],
	[16, 13],
	[17, 13],
	[30, 13],
];

const unwalkableSet = new Set(unwalkableCoords.map(([x, y]) => `${x},${y}`));
const factorySet = new Set(factoryCoords.map(([x, y]) => `${x},${y}`));
const debrisSet = new Set(debrisCoords.map(([x, y]) => `${x},${y}`));
const npcX = 25;
const npcY = 13;
const gateX = 19;
const gateY = 0;
// Second gate in Map 2, using same coords for simplicity
const gate2X = 19;
const gate2Y = 0;
// Portal gate in Map 3 -> Map 4
const gate3X = 19;
const gate3Y = 0;
// Portal gate in Map 4 -> Map 5
const gate4X = 14;
const gate4Y = 17;
// Portal on Map 5 (visual only for now)
const gate5X = 19;
const gate5Y = 0;

const playerX = ref(1);
const playerY = ref(1);
const playerDirection = ref('down'); // 'down' | 'up' | 'left' | 'right'
const isWalking = ref(false);
const bricks = ref(0);
const rocks = ref(0);
const wood = ref(0);
const wateringCans = ref(0);
const shovels = ref(0);
const fertilizers = ref(0);
const destroyedTiles = ref([]);
// Map 4: local tree click accumulation (5 clicks = 1 wood)
const map4TreeLocalClicks = ref(0);
// Shared flower progress for Map 3
const flowerProgressByTile = ref({}); // { 'x,y': current }
const floweredSet = ref(new Set());
const hoverTile = ref(null); // { x, y }
const flowerParticles = ref([]); // { id, x, y, ox, oy }
const floweredTileKeys = computed(() => {
	const entries = Object.entries(flowerProgressByTile.value || {});
	return entries.filter(([, v]) => (typeof v === 'number' ? v : 0) >= 50).map(([k]) => k);
});
const flowersPlanted = computed(() => floweredTileKeys.value.length);
const flowersTotal = computed(() => factoryCoords.length);

// Tiles that still need watering (Map 3 only)
const waterableTileKeys = computed(() => {
	if (activeMapId.value !== 3) return [];
	const required = 50;
	return factoryCoords
		.map(([x, y]) => `${x},${y}`)
		.filter((k) => {
			if (floweredSet.value.has(k)) return false;
			const cur = (flowerProgressByTile.value[k] || 0);
			return cur < required;
		});
});

// Map 4: wood resource tiles (blocked) and fence target tiles
const map4WoodCoords = [
	[4,13],[5,17],[3,16],[1,13],[10,6],[10,5],[15,7],[15,6],[15,5],[17,8],[21,3],[23,1],[29,3]
];
const map4FenceCoords = [
	[29,4],[28,4],[13,12],[12,12],[11,12],[10,12],[14,12],[8,6],[7,6],[6,6],[5,6]
];
const map4WoodSet = new Set(map4WoodCoords.map(([x,y]) => `${x},${y}`));
const map4FenceTargetsSet = new Set(map4FenceCoords.map(([x,y]) => `${x},${y}`));
const fenceBuiltSet = ref(new Set());
const fencesBuiltCount = computed(() => fenceBuiltSet.value.size);
const fencesTotal = computed(() => map4FenceTargetsSet.size);
const map4FenceTargetKeys = computed(() => {
	if (activeMapId.value !== 4) return [];
	return Array.from(map4FenceTargetsSet).filter(k => !fenceBuiltSet.value.has(k));
});

// Map 4: explicit walkable exceptions within the tree belt
const map4UnblockedExceptions = new Set(['19,1','19,0','20,1','20,2']);

const clickMultiplier = computed(() => (shovels.value > 0 ? 2 : 1));

const showExchange = ref(false);
const offers = ref({
	watering: { bricks: 0, rocks: 0 },
	shovel: { bricks: 0, rocks: 0 },
	fertilizer: { bricks: 0, rocks: 0 },
});

const factoryLocalClicks = ref(0);
const factoryProgressByMap = ref({}); // { [mapId]: { current, required } }
const currentFactoryProgress = computed(() => {
	const p = factoryProgressByMap.value[activeMapId.value] || { current: 0, required: activeMapId.value === 1 ? 500 : 1000 };
	return p;
});
const activeFactory = ref(null);

function isDestroyed(x, y) {
	return destroyedTiles.value.some((t) => t.x === x && t.y === y);
}

const otherPlayers = computed(() => {
	const me = auth.user?.username;
	return (gameStore.clients || []).filter(
		(p) => p.username && p.username !== me
	);

});

// Players currently showing bubbles
const bubblePlayers = computed(() => otherPlayers.value.filter(p => !!chatBubbles.value[p.username]));
function isFactoryTile(x, y) {
	return factorySet.has(`${x},${y}`);
}

function handleTileHover(tile) {
	if (activeMapId.value === 3 && isFactoryTile(tile.x, tile.y)) {
		hoverTile.value = { x: tile.x, y: tile.y };
	} else if (activeMapId.value === 5) {
		const site = houseSites.find(s => tile.x >= (s.x - (houseWidth - 1)) && tile.x <= s.x && tile.y >= (s.y - (houseHeight - 1)) && tile.y <= s.y);
		if (site) {
			hoverTile.value = { x: site.x - (houseWidth - 1), y: site.y - (houseHeight - 1) };
		} else {
			hoverTile.value = null;
		}
	} else {
		hoverTile.value = null;
	}
}
function clearTileHover() {
	hoverTile.value = null;
}

function spawnFlowerParticles(x, y) {
	const count = 8;
	const baseId = Date.now();
	for (let i = 0; i < count; i++) {
		const ox = (Math.random() - 0.5) * 24; // -12..12
		const oy = (Math.random() - 0.5) * 24; // -12..12
		const id = `${baseId}-${i}`;
		flowerParticles.value.push({ id, x, y, ox, oy });
		setTimeout(() => {
			flowerParticles.value = flowerParticles.value.filter(p => p.id !== id);
		}, 700);
	}
}

// Player card modal state
const showPlayerCard = ref(false);
const selectedPlayer = ref(null);
const selectedInventory = ref({ bricks: 0, rocks: 0, tools: {} });

async function openPlayerCard(p) {
	selectedPlayer.value = p;
	showPlayerCard.value = true;
	try {
		// We need playerId; fetch by username via a small endpoint or query by username.
		// For now, try a lookup API by inventory using username -> id on the server side later.
		const res = await api.get(`/api/player/inventory/${p.id_player || 0}`);
		selectedInventory.value = res.data.inventory || selectedInventory.value;
	} catch (err) {
		// fallback: show empty inventory
		selectedInventory.value = { bricks: 0, rocks: 0, tools: {} };
	}
}

function requestTrade() {
	if (!selectedPlayer.value || !gameStore.room) return;
	try {
		gameStore.room.send('requestTrade', { toUsername: selectedPlayer.value.username });
		showPlayerCard.value = false;
	} catch (err) {
		console.error('Failed to send trade request', err);
	}
}

// Incoming trade notifications
const incomingTrade = ref(null); // { fromUsername }

// Inventory slots for HUD (3x3)
const inventorySlots = computed(() => {
	const slots = [];
	slots.push({ key: 'bricks', label: 'Bricks', count: bricks.value, emoji: '🧱' });
	slots.push({ key: 'rocks', label: 'Rocks', count: rocks.value, emoji: '🪨' });
	slots.push({ key: 'wood', label: 'Wood', count: wood.value, emoji: '🪵' });
	slots.push({ key: 'watering', label: 'Watering Can', count: wateringCans.value, img: wateringCanImg });
	slots.push({ key: 'shovel', label: 'Shovel', count: shovels.value, img: shovelImg });
	slots.push({ key: 'fertilizer', label: 'Fertilizer', count: fertilizers.value, img: fertilizerImg });
	// fill remaining slots with placeholders up to 9
	while (slots.length < 9) slots.push({ key: 'empty-' + slots.length, label: 'Empty', count: null, emoji: '' });
	return slots;
});
const tradePartner = ref(null);
const showTradeForm = ref(false);
const bricksToSend = ref(0);
const rocksToSend = ref(0);
const partnerInventory = ref({ bricks: 0, rocks: 0, tools: {} });
const waitingPartnerConfirm = ref(false);
const incomingOffer = ref(null); // { fromUsername, bricks, rocks }
const counterBricks = ref(0);
const counterRocks = ref(0);
const finalOffer = ref(null); // for proposer: { fromUsername, aToB, bToA }
const showFinalConfirm = ref(false);

const roomHandlersBound = ref(false);
function registerRoomHandlers() {
	if (!gameStore.room || roomHandlersBound.value) return;
	gameStore.room.onMessage('tradeRequest', (data) => {
		incomingTrade.value = data;
	});
	gameStore.room.onMessage('tradeResponse', (data) => {
		if (data.accepted) {
			tradePartner.value = data.fromUsername;
			showTradeForm.value = true;
		}
	});
	gameStore.room.onMessage('tradeOffer', (data) => {
		incomingOffer.value = data; // show modal for partner to accept/decline and propose give-back
		counterBricks.value = 0;
		counterRocks.value = 0;
	});
	gameStore.room.onMessage('tradeOfferResponse', (data) => {
		// partner declined
		if (!data.accepted) {
			waitingPartnerConfirm.value = false;
		}
	});
	gameStore.room.onMessage('tradeCounterOffer', (data) => {
		// proposer receives partner's counter amounts
		finalOffer.value = data; // { fromUsername, aToB, bToA }
		waitingPartnerConfirm.value = false;
		showFinalConfirm.value = true;
	});
	gameStore.room.onMessage('tradeCompleted', async () => {
		// Refresh my inventory and close forms/offers
		const meId = auth.user?.id;
		if (meId) {
			try {
				const res = await api.get(`/api/player/inventory/${meId}`);
				const inv = res.data.inventory;
				bricks.value = inv.bricks;
				rocks.value = inv.rocks;
				wateringCans.value = inv.tools?.watering_can || 0;
				shovels.value = inv.tools?.shovel || 0;
				fertilizers.value = inv.tools?.fertilizer || 0;
			} catch (err) {}
		}
		waitingPartnerConfirm.value = false;
		incomingOffer.value = null;
		showTradeForm.value = false;
		showFinalConfirm.value = false;
		finalOffer.value = null;
	});
	gameStore.room.onMessage('chatMessage', (data) => {
		if (!data || !data.fromUsername || !data.text) return;
		showBubble(data.fromUsername, data.text);
		// play chat sfx on incoming message if SFX enabled
		if (typeof sfxEnabled !== 'undefined' && sfxEnabled.value) {
			try {
				if (!window.__ree_chat_audio) {
					window.__ree_chat_audio = new Audio(chatSfx);
					window.__ree_chat_audio.preload = 'auto';
					window.__ree_chat_audio.volume = 0.9;
				}
				window.__ree_chat_audio.currentTime = 0;
				window.__ree_chat_audio.play().catch(() => {});
			} catch (e) { console.warn('chat sfx failed', e); }
		}
	});
	gameStore.room.onMessage('factoryProgress', (data) => {
		if (!data || typeof data.mapId !== 'number') return;
		const m = data.mapId;
		const cur = typeof data.clicksCurrent === 'number' ? data.clicksCurrent : 0;
		const req = typeof data.clicksRequired === 'number' ? data.clicksRequired : 0;
		factoryProgressByMap.value = { ...factoryProgressByMap.value, [m]: { current: cur, required: req } };
	});
	gameStore.room.onMessage('mapUnlocked', (data) => {
		const nextId = data?.mapId;
		if (!nextId) return;
		showBanner(`Map ${nextId} unlocked!`, 'success');
		if (nextId === 2) {
			tryTravelToMap2();
		} else if (nextId === 3) {
			tryTravelToMap3();
		} else if (nextId === 4) {
			tryTravelToMap4();
		} else if (nextId === 5) {
			tryTravelToMap5();
		}
	});
	// Flower progress for Map 3
	gameStore.room.onMessage('flowerProgress', (data) => {
		if (!data || data.mapId !== 3) return;
		const key = `${data.x},${data.y}`;
		const cur = typeof data.current === 'number' ? data.current : 0;
		flowerProgressByTile.value = { ...flowerProgressByTile.value, [key]: cur };
		if (cur >= (data.required || 50)) {
			floweredSet.value.add(key);
			spawnFlowerParticles(data.x, data.y);
			// play planting sound if SFX enabled
			if (typeof sfxEnabled !== 'undefined' && sfxEnabled.value) {
				try {
					if (!window.__ree_plant_audio) {
						window.__ree_plant_audio = new Audio(plantSfx);
						window.__ree_plant_audio.preload = 'auto';
						window.__ree_plant_audio.volume = 0.9;
					}
					window.__ree_plant_audio.currentTime = 0;
					window.__ree_plant_audio.play().catch(() => {});
				} catch (e) { console.warn('plant sfx failed', e); }
			}
		}
	});
	gameStore.room.onMessage('tileFlowered', (data) => {
		if (!data || data.mapId !== 3) return;
		const key = `${data.x},${data.y}`;
		floweredSet.value.add(key);
		spawnFlowerParticles(data.x, data.y);
		// play planting sound if SFX enabled
		if (typeof sfxEnabled !== 'undefined' && sfxEnabled.value) {
			try {
				if (!window.__ree_plant_audio) {
					window.__ree_plant_audio = new Audio(plantSfx);
					window.__ree_plant_audio.preload = 'auto';
					window.__ree_plant_audio.volume = 0.9;
				}
				window.__ree_plant_audio.currentTime = 0;
				window.__ree_plant_audio.play().catch(() => {});
			} catch (e) { console.warn('plant sfx failed', e); }
		}
	});
	// Fence building progress for Map 4
	gameStore.room.onMessage('fenceBuilt', (data) => {
		if (!data || data.mapId !== 4) return;
		const key = `${data.x},${data.y}`;
		fenceBuiltSet.value.add(key);
	});
	gameStore.room.onMessage('fenceCount', (data) => {
		if (!data || data.mapId !== 4) return;
		// When counts change, keep watcher logic for auto-travel
		// fencesBuiltCount and fencesTotal are computed from current sets; ensure target total reflects server
		// Adjust total by reinitializing map4FenceTargetsSet if server provides `total`
		// Here we trust initial targets; `built` updates come via fenceBuilt events.
	});
	// House progress for Map 5
	gameStore.room.onMessage('houseProgress', (data) => {
		if (!data || data.mapId !== 5) return;
		const key = `${data.x},${data.y}`;
		const cur = typeof data.current === 'number' ? data.current : 0;
		houseProgress.value = { ...houseProgress.value, [key]: cur };
	});
	gameStore.room.onMessage('gameFinished', (data) => {
		gameFinished.value = true;
		if (data && data.leaderboard) {
			leaderboard.value = {
				mostConstructive: data.leaderboard.mostConstructive || null,
				mostHarvest: data.leaderboard.mostHarvest || null,
				mostTalkative: data.leaderboard.mostTalkative || null,
				didNothing: data.leaderboard.didNothing || null,
			};
		}
	});
	gameStore.room.onMessage('houseAllProgress', (data) => {
		if (!data || data.mapId !== 5 || !Array.isArray(data.rows)) return;
		const next = { ...houseProgress.value };
		for (const r of data.rows) {
			const key = `${r.x},${r.y}`;
			next[key] = typeof r.current === 'number' ? r.current : 0;
		}
		houseProgress.value = next;
	});
	gameStore.room.onMessage('houseBuilt', (data) => {
		if (!data || data.mapId !== 5) return;
		const key = `${data.x},${data.y}`;
		houseProgress.value = { ...houseProgress.value, [key]: houseRequired };
		showBanner('A house has been completed!', 'success');
	});
	gameStore.room.onMessage('inventoryUpdate', (data) => {
		if (!data) return;
		if (typeof data.rocks === 'number') rocks.value = data.rocks;
		if (typeof data.bricks === 'number') bricks.value = data.bricks;
	});
	gameStore.room.onMessage('houseError', (data) => {
		if (data?.reason === 'insufficient_rocks') {
			showBanner('You need rocks to contribute.', 'warning');
		}
	});
	roomHandlersBound.value = true;
}

watch(() => gameStore.room, (room) => {
	roomHandlersBound.value = false;
	if (room) registerRoomHandlers();
});

async function loadPartnerInventory() {
	if (!tradePartner.value) return;
	const partner = (gameStore.clients || []).find(c => c.username === tradePartner.value);
	const toId = partner?.id_player;
	if (!toId) return;
	try {
		const res = await api.get(`/api/player/inventory/${toId}`);
		partnerInventory.value = res.data.inventory || partnerInventory.value;
	} catch (err) {
		partnerInventory.value = { bricks: 0, rocks: 0, tools: {} };
	}
}

watch(() => tradePartner.value, () => {
	if (showTradeForm.value) loadPartnerInventory();
});
watch(() => showTradeForm.value, (v) => {
	if (v) loadPartnerInventory();
});

// Auto-travel to Map 5 when all fences are built on Map 4
// Removed auto-travel: player must use the gate to travel

function respondTrade(accepted) {
	if (!incomingTrade.value || !gameStore.room) { incomingTrade.value = null; return; }
	try {
		gameStore.room.send('respondTrade', { toUsername: incomingTrade.value.fromUsername, accepted });
		if (accepted) {
			tradePartner.value = incomingTrade.value.fromUsername;
			showTradeForm.value = true;
		}
	} catch (err) {
		console.error('Failed to respond to trade', err);
	} finally {
		incomingTrade.value = null;
	}
}

function proposeOffer() {
	if (!gameStore.room || !tradePartner.value) return;
	gameStore.room.send('tradeOffer', {
		toUsername: tradePartner.value,
		bricks: bricksToSend.value || 0,
		rocks: rocksToSend.value || 0,
	});
	waitingPartnerConfirm.value = true;
}

function sendCounterOffer() {
	if (!incomingOffer.value || !gameStore.room) return;
	const toUsername = incomingOffer.value.fromUsername;
	gameStore.room.send('tradeCounterOffer', {
		toUsername,
		aToB: { bricks: incomingOffer.value.bricks || 0, rocks: incomingOffer.value.rocks || 0 },
		bToA: { bricks: counterBricks.value || 0, rocks: counterRocks.value || 0 },
	});
	incomingOffer.value = null;
}

function declineIncomingOffer() {
	if (!incomingOffer.value || !gameStore.room) { incomingOffer.value = null; return; }
	gameStore.room.send('tradeOfferResponse', { toUsername: incomingOffer.value.fromUsername, accepted: false });
	incomingOffer.value = null;
	waitingPartnerConfirm.value = false;
}

// Chat state
const chatInput = ref('');
const chatBubbles = ref({}); // { username: { text } }

// Sprite loader for user popup (reuse same Vite glob as PlayerSprite)
const sprites = import.meta.glob('/src/assets/sprites/**/*.svg', { query: '?raw', import: 'default', eager: true });
const userSpriteSvg = ref('');
const userSpriteName = computed(() => 'front');
const userSpritePath = computed(() => {
	const folder = auth.user?.color || 'default';
	return `/src/assets/sprites/${folder}/${userSpriteName.value}.svg`;
});
function loadUserSprite() {
	const path = userSpritePath.value;
	const fallbackPath = `/src/assets/sprites/default/${userSpriteName.value}.svg`;
	const ultimateFallback = `/src/assets/sprites/default/front.svg`;
	if (sprites[path]) userSpriteSvg.value = sprites[path];
	else if (sprites[fallbackPath]) userSpriteSvg.value = sprites[fallbackPath];
	else userSpriteSvg.value = sprites[ultimateFallback] || '';
}
onMounted(loadUserSprite);
watch(() => auth.user?.color, loadUserSprite);

// User popup state (position is captured once when opening so popup doesn't follow player)
const showUser = ref(false);
const userPopupOffset = { x: 0, y: 30 }; // px offset above player
const userPopupPos = ref({ left: '0px', top: '0px' });
const userPopupStyle = computed(() => ({
	position: 'absolute',
	left: userPopupPos.value.left,
	top: userPopupPos.value.top,
	transform: 'translate(-50%, -100%)',
	zIndex: 130,
}));

function openUser() {
	try {
		const tile = mapObj.value.tileSize || 50;
		const px = (playerX.value * tile) + Math.floor(tile / 2) + userPopupOffset.x;
		const py = (playerY.value * tile) + userPopupOffset.y;
		userPopupPos.value = { left: px + 'px', top: py + 'px' };
	} catch (e) {
		userPopupPos.value = { left: '50%', top: '50%' };
	}
	showUser.value = true;
}
function closeUser() { showUser.value = false; }

// Color customization data + handler
const colorOptions = ['blue','green','orange','pink','purple','red','turquoise','yellow'];
const colorMap = {
	blue: '#0b74d1',
	green: '#3cb371',
	orange: '#f39c12',
	pink: '#ff69b4',
	purple: '#8e44ad',
	red: '#e74c3c',
	turquoise: '#1abc9c',
	yellow: '#f1c40f',
};

async function selectColor(c) {
	try {
		// optimistic local update
		if (auth.user) {
			auth.user = { ...auth.user, color: c };
			try { localStorage.setItem('auth_user', JSON.stringify(auth.user)); } catch (e) {}
		}
		// persist to server via gameStore helper
		try { await gameStore.updatePlayerColor(c); } catch (e) { console.warn('color save failed', e); }
		// reload user sprite
		try { loadUserSprite(); } catch (e) {}
	} catch (err) {
		console.error('Failed to select color', err);
	}
}

// Settings modal state
const showSettings = ref(false);
const musicEnabled = ref(localStorage.getItem('musicEnabled') === 'false' ? false : true);
const sfxEnabled = ref(localStorage.getItem('sfxEnabled') === 'false' ? false : true);
const bgMusic = ref(null);
const musicSrc = ref(''); // placeholder for future music file
// per-map background tracks
const mapBgById = {
	1: map1bg,
	2: map2bg,
	3: map3bg,
	4: map4bg,
	5: map5bg,
};

function openSettings() {
	showSettings.value = true;
}
function closeSettings() {
	showSettings.value = false;
}

function handleLogout() {
	try { auth.logout(); } catch (e) { console.warn('logout failed', e); }
	// redirect to auth route
	router.push('/auth');
}

watch(musicEnabled, (v) => {
	localStorage.setItem('musicEnabled', String(!!v));
	// placeholder behavior: if enabling music and there's a src, try to play
	if (v && bgMusic.value && musicSrc.value) {
		try { bgMusic.value.play(); } catch (e) { /* noop */ }
	} else if (bgMusic.value) {
		try { bgMusic.value.pause(); bgMusic.value.currentTime = 0; } catch (e) { /* noop */ }
	}
});
watch(sfxEnabled, (v) => {
	localStorage.setItem('sfxEnabled', String(!!v));
});
// Update background track when switching maps
watch(() => activeMapId.value, (id) => {
	try {
		musicSrc.value = mapBgById[id] || bgTrack;
		if (musicEnabled.value && bgMusic.value && musicSrc.value) {
			try { bgMusic.value.load(); bgMusic.value.play().catch(() => {}); } catch (e) {}
		}
	} catch (e) { /* noop */ }
});
const chatTimers = new Map();

function showBubble(username, text) {
	if (!username) return;
	chatBubbles.value[username] = { text };
	const existing = chatTimers.get(username);
	if (existing) clearTimeout(existing);
	const t = setTimeout(() => {
		// remove bubble after 6 seconds
		const current = chatBubbles.value;
		if (current[username]) {
			delete current[username];
		}
		chatTimers.delete(username);
	}, 6000);
	chatTimers.set(username, t);
}

function sendChat() {
	const text = (chatInput.value || '').trim();
	if (!text || !gameStore.room) return;
	try {
		gameStore.room.send('chatMessage', { text });
		chatInput.value = '';
		// play local chat sfx when sending our own message (respect SFX toggle)
		if (typeof sfxEnabled !== 'undefined' && sfxEnabled.value) {
			try {
				if (!window.__ree_chat_audio) {
					window.__ree_chat_audio = new Audio(chatSfx);
					window.__ree_chat_audio.preload = 'auto';
					window.__ree_chat_audio.volume = 0.9;
				}
				window.__ree_chat_audio.currentTime = 0;
				window.__ree_chat_audio.play().catch(() => {});
			} catch (e) { console.warn('chat sfx failed', e); }
		}
	} catch (err) {
		console.error('Failed to send chat', err);
	}
}

function executeExchange() {
	const aId = auth.user?.id; // proposer (me)
	const bClient = (gameStore.clients || []).find(c => c.username === tradePartner.value);
	const bId = bClient?.id_player;
	if (!aId || !bId || !finalOffer.value) { console.error('Ids or offer missing'); return; }
	api.post('/api/game/trade/exchange', {
		aId,
		bId,
		aToBBricks: bricksToSend.value || 0,
		aToBRocks: rocksToSend.value || 0,
		bToABricks: finalOffer.value.bToA?.bricks || 0,
		bToARocks: finalOffer.value.bToA?.rocks || 0,
	}).then(() => {
		// notify both sides
		gameStore.room.send('tradeCompleted', { otherUsername: finalOffer.value.fromUsername });
	}).catch((err) => {
		console.error('Exchange failed', err);
	});
}

function cancelFinal() {
	showFinalConfirm.value = false;
	finalOffer.value = null;
}

// Small banner helper for user feedback
const bannerMessage = ref('');
const bannerType = ref(''); // '', 'success', 'warning', 'error'
let bannerTimer = null;
function showBanner(msg, type = '') {
	bannerMessage.value = msg;
	bannerType.value = type;
	if (bannerTimer) clearTimeout(bannerTimer);
	bannerTimer = setTimeout(() => {
		bannerMessage.value = '';
		bannerType.value = '';
	}, 3000);
}
function isBlocked(x, y) {
	const key = `${x},${y}`;
	// On Map 5, block tiles occupied by house footprints; otherwise allow
	if (activeMapId.value === 5) {
		for (const s of houseSites) {
			const left = s.x - (houseWidth - 1);
			const top = s.y - (houseHeight - 1);
			if (x >= left && x <= s.x && y >= top && y <= s.y) {
				return true;
			}
		}
		return false;
	}
	// On Map 4, remove all ruins/factory blocking; keep only perimeter trees
	if (activeMapId.value === 4) {
		const w = mapObj.value.width;
		// Always allow stepping on explicit exception tiles
		if (map4UnblockedExceptions.has(key)) return false;
		// Block top belt and side belts (trees): y <= 1, x <= 1, x >= w-2
		if (y <= 1 || x <= 1 || x >= (w - 2)) {
			// Allow stepping on the portal tile and fence target tiles
			if (x === gate4X && y === gate4Y) return false;
			if (map4FenceTargetsSet.has(key)) return false;
			return true;
		}
		// Block wood resource tiles and built fence tiles
		if (map4WoodSet.has(key)) return true;
		if (fenceBuiltSet.value.has(key)) return true;
		return false;
	}
	if (unwalkableSet.has(key) && !isDestroyed(x, y)) return true;
	// Flowered tiles are blocked
	if (floweredSet.value.has(key)) return true;
	return false;
}

async function sendProgress({ deltaBricks = 0, deltaRocks = 0, deltaWorldScore = 0 }) {
	const playerId = auth.user?.id;
	if (!playerId) return;
	try {
		await api.post('/api/game/progress', {
			playerId,
			deltaBricks,
			deltaRocks,
			deltaWorldScore,
		});
	} catch (err) {
		console.error('Failed to persist game progress', err);
	}
}

function doFactoryClick(x, y) {
	activeFactory.value = { x, y };
	// Local resource reward every 20 local clicks
	const beforeClicks = factoryLocalClicks.value;
	factoryLocalClicks.value += clickMultiplier.value;
	const afterClicks = factoryLocalClicks.value;

	// Play SFX when crossing every 5-click threshold. Alternate between three hits every 10 clicks.
	if (sfxEnabled.value) {
		try {
			// prepare audio instances if not already
			if (!window.__ree_sfx_pool) {
				window.__ree_sfx_pool = [new Audio(hit1), new Audio(hit2), new Audio(hit3)];
				window.__ree_sfx_pool.forEach(a => { a.preload = 'auto'; a.volume = 0.85; });
			}
			const pool = window.__ree_sfx_pool;
			const beforeBucket = Math.floor(beforeClicks / 5);
			const afterBucket = Math.floor(afterClicks / 5);
			for (let b = beforeBucket + 1; b <= afterBucket; b++) {
				const countAtThreshold = b * 5;
				const idx = Math.floor(countAtThreshold / 10) % 3; // change every 10 clicks
				const audio = pool[idx % pool.length];
				try { audio.currentTime = 0; audio.play().catch(() => {}); } catch (e) {}
			}
		} catch (e) { console.warn('sfx play failed', e); }
	}
	if (factoryLocalClicks.value % 20 === 0) {
		bricks.value += 1;
		sendProgress({ deltaBricks: 1, deltaWorldScore: 1 });
	}
	// Send shared increment to server so everyone sees the same total
	// Queue click locally and let the store flush batched sends every 500ms.
	// This provides immediate UI feedback while avoiding many concurrent DB writes.
	try {
		// Try to find a matching ruin id by coordinates to keep UI optimistic per-ruin
		let ruinId = null;
		if (gameStore.ruins && Array.isArray(gameStore.ruins)) {
			const r = gameStore.ruins.find(rr => rr && (rr.x === x && rr.y === y));
			if (r) ruinId = r.id_ruin || r.id;
		}
		gameStore.queueFactoryClick(ruinId, clickMultiplier.value);
	} catch (err) {
		console.error('Failed to queue factory click', err);
	}
}

function doWaterTile(x, y) {
	const key = `${x},${y}`;
	if (!factorySet.has(key)) return;
	if (wateringCans.value <= 0) {
		showBanner('You need a watering can to water.', 'warning');
		return;
	}
	if (gameStore.room) {
		try {
			const inc = fertilizers.value > 0 ? 3 : 1;
			gameStore.room.send('waterTile', { mapId: 3, x, y, inc });
		} catch (err) {
			console.error('Failed to send waterTile', err);
		}
	}
}

function handleTileClick(tile) {
	const key = `${tile.x},${tile.y}`;
	// NPC interaction
	if (tile.x === npcX && tile.y === npcY) {
		// randomize offers each time
		offers.value = {
			watering: {
				bricks: Math.floor(Math.random() * 4) + 3, // 3-6 bricks
				rocks: Math.floor(Math.random() * 3) + 2,  // 2-4 rocks
			},
			shovel: {
				bricks: Math.floor(Math.random() * 6) + 5, // 5-10 bricks
				rocks: Math.floor(Math.random() * 5) + 3,  // 3-7 rocks
			},
			fertilizer: activeMapId.value === 3 ? {
				bricks: Math.floor(Math.random() * 11) + 20, // 20-30 bricks
				rocks: Math.floor(Math.random() * 11) + 15,  // 15-25 rocks
			} : { bricks: 0, rocks: 0 },
		};
		showExchange.value = true;
		return;
	}
	if (activeMapId.value !== 4 && factorySet.has(key)) {
		if (activeMapId.value === 3) {
			doWaterTile(tile.x, tile.y);
		} else {
			doFactoryClick(tile.x, tile.y);
		}
		return;
	}
	// Map 4 interactions: gather wood or build fences
	if (activeMapId.value === 4) {
		// Perimeter trees: 5 clicks yield 1 wood
		const w = mapObj.value.width;
		const isTree = (tile.y <= 1 || tile.x <= 1 || tile.x >= (w - 2));
		if (isTree) {
			map4TreeLocalClicks.value += 1;
			if (map4TreeLocalClicks.value % 5 === 0) {
				wood.value += 1;
				showBanner('Gained 1 wood from trees', 'success');
			} else {
				const rem = 5 - (map4TreeLocalClicks.value % 5);
				showBanner(`${rem} more clicks to gain 1 wood`, 'warning');
			}
			return;
		}
		// Gather wood from blocked resource tiles
		if (map4WoodSet.has(key)) {
			wood.value += 1;
			showBanner('Collected 1 wood', 'success');
			return;
		}
		// Build fence if clicking a target tile and have enough wood
		if (map4FenceTargetsSet.has(key)) {
			if (fenceBuiltSet.value.has(key)) {
				showBanner('Fence already built here.', 'warning');
				return;
			}
			if ((wood.value || 0) >= 10) {
				wood.value -= 10;
				// Immediately mark fence built locally so counts update
				fenceBuiltSet.value.add(key);
				if (gameStore.room) {
					try {
						gameStore.room.send('buildFence', { x: tile.x, y: tile.y });
						showBanner('Built a fence (-10 wood)', 'success');
					} catch (err) {
						console.error('Failed to send buildFence', err);
					}
				}
			} else {
				showBanner('Need 10 wood to build a fence.', 'warning');
			}
			return;
		}
	}
	// Map 5 interactions: contribute rocks to build houses
	if (activeMapId.value === 5) {
		const site = houseSites.find(s => tile.x >= (s.x - (houseWidth - 1)) && tile.x <= s.x && tile.y >= (s.y - (houseHeight - 1)) && tile.y <= s.y);
		if (site) {
			const cur = houseProgress.value[site.key] || 0;
			if (cur >= houseRequired) {
				showBanner('House already completed here.', 'success');
				return;
			}
			if ((rocks.value || 0) <= 0) {
				showBanner('You need rocks to contribute.', 'warning');
				return;
			}
			// Optimistic local decrement; server will confirm
			rocks.value = (rocks.value || 0) - 1;
			if (gameStore.room) {
				try {
					// Send canonical site coordinates (anchor) to match server keys
					gameStore.room.send('buildHouse', { x: site.x, y: site.y });
					showBanner('Contributed 1 rock to a house!', 'success');
				} catch (err) {
					console.error('Failed to send buildHouse', err);
				}
			}
			return;
		}
	}
	if (debrisSet.has(key) && !isDestroyed(tile.x, tile.y)) {
		destroyedTiles.value.push({ x: tile.x, y: tile.y });
		rocks.value += 1;
		// Persist 1 rock gained and 1 point of world progress
		sendProgress({ deltaRocks: 1, deltaWorldScore: 1 });
		// play rock pickup SFX
		if (typeof sfxEnabled !== 'undefined' && sfxEnabled.value) {
			try {
				if (!window.__ree_rock_audio) {
					window.__ree_rock_audio = new Audio(rockSfx);
					window.__ree_rock_audio.preload = 'auto';
					window.__ree_rock_audio.volume = 0.9;
				}
				window.__ree_rock_audio.currentTime = 0;
				window.__ree_rock_audio.play().catch(() => {});
			} catch (e) { console.warn('rock sfx failed', e); }
		}
	}
}

function movePlayer(deltaX, deltaY) {
	// Déterminer la direction
	if (deltaX === 1 && deltaY === 0) playerDirection.value = 'right';
	else if (deltaX === -1 && deltaY === 0) playerDirection.value = 'left';
	else if (deltaX === 0 && deltaY === -1) playerDirection.value = 'up';
	else if (deltaX === 0 && deltaY === 1) playerDirection.value = 'down';
	isWalking.value = true;
	const targetX = playerX.value + deltaX;
	const targetY = playerY.value + deltaY;
	if (
		targetX < 0 ||
		targetY < 0 ||
		targetX >= mapObj.value.width ||
		targetY >= mapObj.value.height
	) {
		return;
	}
	if (isBlocked(targetX, targetY)) {
		return;
	}
	playerX.value = targetX;
	playerY.value = targetY;

	// Travel if standing on gate tile (requires shared threshold reached)
	if (activeMapId.value === 1 && playerX.value === gateX && playerY.value === gateY) {
		tryTravelToMap2();
	}
	if (activeMapId.value === 2 && playerX.value === gate2X && playerY.value === gate2Y) {
		tryTravelToMap3();
	}
	if (activeMapId.value === 3 && playerX.value === gate3X && playerY.value === gate3Y) {
		if (flowersPlanted.value >= flowersTotal.value) {
			tryTravelToMap4();
		} else {
			showBanner(`Portal locked: ${flowersPlanted.value}/${flowersTotal.value} flowers`, 'warning');
		}
	}
	if (activeMapId.value === 4 && playerX.value === gate4X && playerY.value === gate4Y) {
		if (fencesTotal.value === 0 || (fencesBuiltCount.value >= fencesTotal.value && fencesTotal.value > 0)) {
			tryTravelToMap5();
		} else {
			showBanner(`Portal locked: ${fencesBuiltCount.value}/${fencesTotal.value} fences`, 'warning');
		}
	}
	setTimeout(() => { isWalking.value = false; }, 200); // reset walk anim after 200ms

	if (gameStore.room) {
		try {
			gameStore.room.send('updatePosition', {
				x: playerX.value,
				y: playerY.value,
			});
		} catch (err) {
			console.error('Failed to send position update', err);
		}
	}
}

function interact() {
	const key = `${playerX.value},${playerY.value}`;
	if (playerX.value === npcX && playerY.value === npcY) {
		// open exchange if standing on NPC
		offers.value = {
			watering: {
				bricks: Math.floor(Math.random() * 4) + 3,
				rocks: Math.floor(Math.random() * 3) + 2,
			},
			shovel: {
				bricks: Math.floor(Math.random() * 6) + 5,
				rocks: Math.floor(Math.random() * 5) + 3,
			},
			fertilizer: activeMapId.value === 3 ? {
				bricks: Math.floor(Math.random() * 11) + 20, // 20-30 bricks
				rocks: Math.floor(Math.random() * 11) + 15,  // 15-25 rocks
			} : { bricks: 0, rocks: 0 },
		};
		showExchange.value = true;
		return;
	}
	if (activeMapId.value !== 4 && factorySet.has(key) && !isDestroyed(playerX.value, playerY.value)) {
		if (activeMapId.value === 3) {
			doWaterTile(playerX.value, playerY.value);
		} else {
			doFactoryClick(playerX.value, playerY.value);
		}
		return;
	}
	// Also allow interact on gates
	if (activeMapId.value === 1 && playerX.value === gateX && playerY.value === gateY) {
		tryTravelToMap2();
		return;
	}
	if (activeMapId.value === 2 && playerX.value === gate2X && playerY.value === gate2Y) {
		tryTravelToMap3();
		return;
	}
	if (activeMapId.value === 3 && playerX.value === gate3X && playerY.value === gate3Y) {
		if (flowersPlanted.value >= flowersTotal.value) {
			tryTravelToMap4();
		} else {
			showBanner(`Portal locked: ${flowersPlanted.value}/${flowersTotal.value} flowers`, 'warning');
		}
		return;
	}
	if (activeMapId.value === 4 && playerX.value === gate4X && playerY.value === gate4Y) {
		if (fencesTotal.value === 0 || (fencesBuiltCount.value >= fencesTotal.value && fencesTotal.value > 0)) {
			tryTravelToMap5();
		} else {
			showBanner(`Portal locked: ${fencesBuiltCount.value}/${fencesTotal.value} fences`, 'warning');
		}
		return;
	}
	if (debrisSet.has(key) && !isDestroyed(playerX.value, playerY.value)) {
		destroyedTiles.value.push({ x: playerX.value, y: playerY.value });
		rocks.value += 1;
		// play rock pickup SFX for interact
		if (typeof sfxEnabled !== 'undefined' && sfxEnabled.value) {
			try {
				if (!window.__ree_rock_audio) {
					window.__ree_rock_audio = new Audio(rockSfx);
					window.__ree_rock_audio.preload = 'auto';
					window.__ree_rock_audio.volume = 0.9;
				}
				window.__ree_rock_audio.currentTime = 0;
				window.__ree_rock_audio.play().catch(() => {});
			} catch (e) { console.warn('rock sfx failed', e); }
		}
	}
}

function buyItem(type) {
	if (type === 'watering') {
		const cost = offers.value.watering;
		const playerId = auth.user?.id;
		if (!playerId) return;
		api.post('/api/player/tools/buy', {
			playerId,
			type: 'watering_can',
			costBricks: cost.bricks,
			costRocks: cost.rocks,
		}).then((res) => {
			const inv = res.data.inventory;
			bricks.value = inv.bricks;
			rocks.value = inv.rocks;
			wateringCans.value = inv.tools?.watering_can || 0;
			shovels.value = inv.tools?.shovel || 0;
			showExchange.value = false;
		}).catch((err) => {
			console.error('Failed to buy watering can', err);
		});
	} else if (type === 'shovel') {
		const cost = offers.value.shovel;
		const playerId = auth.user?.id;
		if (!playerId) return;
		api.post('/api/player/tools/buy', {
			playerId,
			type: 'shovel',
			costBricks: cost.bricks,
			costRocks: cost.rocks,
		}).then((res) => {
			const inv = res.data.inventory;
			bricks.value = inv.bricks;
			rocks.value = inv.rocks;
			wateringCans.value = inv.tools?.watering_can || 0;
			shovels.value = inv.tools?.shovel || 0;
			showExchange.value = false;
		}).catch((err) => {
			console.error('Failed to buy shovel', err);
		});
	}
	else if (type === 'fertilizer') {
		const cost = offers.value.fertilizer;
		const playerId = auth.user?.id;
		if (!playerId) return;
		api.post('/api/player/tools/buy', {
			playerId,
			type: 'fertilizer',
			costBricks: cost.bricks,
			costRocks: cost.rocks,
		}).then((res) => {
			const inv = res.data.inventory;
			bricks.value = inv.bricks;
			rocks.value = inv.rocks;
			wateringCans.value = inv.tools?.watering_can || 0;
			shovels.value = inv.tools?.shovel || 0;
			fertilizers.value = inv.tools?.fertilizer || 0;
			showExchange.value = false;
		}).catch((err) => {
			console.error('Failed to buy fertilizer', err);
		});
	}
}

function handleKeyDown(event) {
	// Prevent movement when typing inside inputs/textareas
	const tag = (event.target && event.target.tagName) || '';
	if (tag === 'INPUT' || tag === 'TEXTAREA') return;

	if (event.key === 'ArrowUp') {
		movePlayer(0, -1);
	} else if (event.key === 'ArrowDown') {
		movePlayer(0, 1);
	} else if (event.key === 'ArrowLeft') {
		movePlayer(-1, 0);
	} else if (event.key === 'ArrowRight') {
		movePlayer(1, 0);
	} else if (
		// AZERTY movement: z (up), s (down), q (left), d (right)
		event.key === 'z' || event.key === 'Z' ||
		event.key === 's' || event.key === 'S' ||
		event.key === 'q' || event.key === 'Q' ||
		event.key === 'd' || event.key === 'D' ||
		// fallback to space / E
		event.key === ' ' || event.key === 'e' || event.key === 'E'
	) {
		// handle AZERTY key movement
		if (event.key === 'z' || event.key === 'Z') movePlayer(0, -1);
		else if (event.key === 's' || event.key === 'S') movePlayer(0, 1);
		else if (event.key === 'q' || event.key === 'Q') movePlayer(-1, 0);
		else if (event.key === 'd' || event.key === 'D') movePlayer(1, 0);
		else interact();
		// no-op: handled above
	}
}

onMounted(async () => {
	// Ensure Colyseus message handlers are bound even if room already exists
	registerRoomHandlers();

	window.addEventListener('keydown', handleKeyDown);

	// Start player in the middle of the current map
	const startCx = Math.floor(mapObj.value.width / 2);
	const startCy = Math.floor(mapObj.value.height / 2);
	playerX.value = startCx;
	playerY.value = startCy;

	// Debug: expose map computed values to console to help diagnose render issues
	try {
		console.debug('GameMap mounted', { activeMapId: activeMapId.value, mapObj: mapObj.value, mapImage: mapImage.value, wrapperStyle: wrapperStyle.value });
	} catch (e) {}

	// Run health check once and again shortly after render to catch async asset loads
	checkMapHealth();
	setTimeout(checkMapHealth, 200);

	// Load inventory + tools from server
	const playerId = auth.user?.id;
	if (playerId) {
		try {
			const res = await api.get(`/api/player/inventory/${playerId}`);
			const inv = res.data.inventory;
			bricks.value = inv.bricks;
			rocks.value = inv.rocks;
			wateringCans.value = inv.tools?.watering_can || 0;
			shovels.value = inv.tools?.shovel || 0;
			fertilizers.value = inv.tools?.fertilizer || 0;
		} catch (err) {
			console.error('Failed to load inventory', err);
		}
	}

	// Envoie la position initiale du joueur au serveur temps réel
	if (gameStore.room) {
		try {
			gameStore.room.send('updatePosition', {
				x: playerX.value,
				y: playerY.value,
			});
		} catch (err) {
			console.error('Failed to send initial position', err);
		}
	}

			// Wire background music if provided (user placed file at client/src/assets/music/bg.mp3)
			try {
				musicSrc.value = mapBgById[activeMapId.value] || bgTrack;
				// If enabled and element available, try to play (may be blocked until user gesture)
				if (musicEnabled.value && bgMusic.value && musicSrc.value) {
					try { bgMusic.value.load(); bgMusic.value.play().catch(() => {}); } catch (e) {}
				}
			} catch (e) {}

			// Ensure we attempt playback on first user interaction as a fallback (autoplay often blocked)
			const tryPlayOnce = () => {
				if (musicEnabled.value && bgMusic.value && musicSrc.value) {
					try { bgMusic.value.play().catch(() => {}); } catch (e) {}
					// remove listener if still present
					document.removeEventListener('pointerdown', tryPlayOnce);
				}
			};
			document.addEventListener('pointerdown', tryPlayOnce, { passive: true });
});

onBeforeUnmount(() => {
	window.removeEventListener('keydown', handleKeyDown);
});

async function tryTravelToMap2() {
	// Optional gate lock: require shared progress threshold
	if (currentFactoryProgress.value.current < currentFactoryProgress.value.required) {
		showBanner(`Gate locked: ${currentFactoryProgress.value.current}/${currentFactoryProgress.value.required} clicks`, 'warning');
		return;
	}
	const playerId = auth.user?.id;
	if (!playerId) return;
	try {
		// Move player to map 2, center position
		const target = map2;
		const cx = Math.floor(target.width / 2);
		const cy = Math.floor(target.height / 2);
		await api.post('/api/player/travel', { playerId, mapId: 2, x: cx, y: cy });
		// Update local position immediately
		playerX.value = cx;
		playerY.value = cy;
		// Switch to per-map room and notify position there
		await gameStore.switchRoom(auth.user?.username, 2);
		try { gameStore.room.send('updatePosition', { x: playerX.value, y: playerY.value }); } catch (err) {}
		activeMapId.value = 2;
		showBanner('Traveled to Map 2!', 'success');
	} catch (err) {
		console.error('Failed to travel to map 2', err);
	}
}

async function tryTravelToMap3() {
	// Require shared progress threshold for Map 3
	if (currentFactoryProgress.value.current < currentFactoryProgress.value.required) {
		showBanner(`Gate locked: ${currentFactoryProgress.value.current}/${currentFactoryProgress.value.required} clicks`, 'warning');
		return;
	}
	const playerId = auth.user?.id;
	if (!playerId) return;
	try {
		// Move player to map 3, center position
		const target = map3;
		const cx = Math.floor(target.width / 2);
		const cy = Math.floor(target.height / 2);
		await api.post('/api/player/travel', { playerId, mapId: 3, x: cx, y: cy });
		playerX.value = cx;
		playerY.value = cy;
		await gameStore.switchRoom(auth.user?.username, 3);
		try { gameStore.room.send('updatePosition', { x: playerX.value, y: playerY.value }); } catch (err) {}
		activeMapId.value = 3;
		showBanner('Traveled to Map 3!', 'success');
	} catch (err) {
		console.error('Failed to travel to map 3', err);
	}
}

async function tryTravelToMap4() {
	const playerId = auth.user?.id;
	if (!playerId) return;
	try {
		const target = map4;
		const cx = Math.floor(target.width / 2);
		const cy = Math.floor(target.height / 2);
		await api.post('/api/player/travel', { playerId, mapId: 4, x: cx, y: cy });
		playerX.value = cx;
		playerY.value = cy;
		await gameStore.switchRoom(auth.user?.username, 4);
		try { gameStore.room.send('updatePosition', { x: playerX.value, y: playerY.value }); } catch (err) {}
		activeMapId.value = 4;
		showBanner('Traveled to Map 4!', 'success');
	} catch (err) {
		console.error('Failed to travel to map 4', err);
	}
}

async function tryTravelToMap5() {
	const playerId = auth.user?.id;
	if (!playerId) return;
	try {
		const target = map5;
		const cx = Math.floor(target.width / 2);
		const cy = Math.floor(target.height / 2);
		await api.post('/api/player/travel', { playerId, mapId: 5, x: cx, y: cy });
		playerX.value = cx;
		playerY.value = cy;
		await gameStore.switchRoom(auth.user?.username, 5);
		try { gameStore.room.send('updatePosition', { x: playerX.value, y: playerY.value }); } catch (err) {}
		activeMapId.value = 5;
		showBanner('Traveled to Map 5!', 'success');
	} catch (err) {
		console.error('Failed to travel to map 5', err);
	}
}
</script>

<style scoped>
.game-map {
	display: flex;
	flex-direction: row;
	gap: 12px;
	align-items: flex-start;
}

.map-wrapper {
	position: relative;
	overflow: hidden;
	border: 2px solid #333;
	border-radius: 8px;
	flex: 0 0 auto;
}

.map-image {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.tiles-overlay {
	position: absolute;
	top: 0;
	left: 0;
	pointer-events: auto;
}

.player-click {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 12;
	cursor: pointer;
}

.npc-sprite {
	position: absolute;
	top: 0;
	left: 0;
	width: 48px;
	height: 48px;
	image-rendering: pixelated;
	z-index: 9;
	pointer-events: none;
}

.gate-sprite {
	position: absolute;
	top: 0;
	left: 0;
	width: 48px;
	height: 48px;
	image-rendering: pixelated;
	z-index: 9;
	pointer-events: none;
}

.portal-sprite {
	position: absolute;
	top: 0;
	left: 0;
	width: 64px;
	height: 64px;
	image-rendering: pixelated;
	z-index: 9;
	pointer-events: none;
}

.house-sprite {
	position: absolute;
	top: 0;
	left: 0;
	image-rendering: pixelated;
	z-index: 9;
	pointer-events: none;
}

.chat-bubble {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 13;
	max-width: 180px;
	padding: 6px 8px;
	border-radius: 12px;
	background: rgba(255,255,255,0.95);
	color: #222;
	font-size: 12px;
	box-shadow: 0 2px 8px rgba(0,0,0,0.2);
	pointer-events: none;
}
.chat-bubble::after {
	content: '';
	position: absolute;
	bottom: -6px;
	left: 12px;
	width: 0;
	height: 0;
	border-left: 6px solid transparent;
	border-right: 6px solid transparent;
	border-top: 6px solid rgba(255,255,255,0.95);
}

.chat-input {
	display: block;
}

/* In-map chat: bottom-centered stone-themed bar using a 4-column grid.
   Input spans 3 columns (3/4) and send button spans 1 column (1/4). */
.chat-input.map-chat {
	position: absolute;
	bottom: 12px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 60;
	width: min(720px, calc(100% - 48px));
	max-width: 720px;
	padding: 6px;
	border-radius: 16px;
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 6px;
	align-items: center;
	background: #514F62; /* stone-themed background */
	border: 1px solid #000; /* outer stroke black */
	box-shadow: 0 6px 12px rgba(0,0,0,0.35);
}
.chat-input.map-chat input[type='text'] {
	grid-column: 1 / span 3; /* spans 3 of 4 columns */
	padding: 8px 10px;
	border-radius: 12px;
	border: 1.5px solid #5b4a33; /* inner earthy stroke */
	outline: none;
	background: rgba(255,255,255,0.98);
	font-size: 13px;
	width: 100%;
}
.chat-input.map-chat button {
	grid-column: 4 / 5; /* takes the last 1/4 column */
	padding: 8px 10px;
	border-radius: 10px;
	border: 1px solid rgba(0,0,0,0.12);
	background: #d6a94a; /* earthy accent send button */
	color: #fff;
	font-weight: 700;
	cursor: pointer;
	font-size: 13px;
}

/* Settings modal (stone-themed) */
.settings-modal {
	position: absolute;
	inset: 0; /* cover map wrapper */
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 120;
	pointer-events: auto;
}
.settings-card {
	width: min(360px, calc(100% - 48px));
	background: #334a37;
	border: 1px solid #5b4a33;
	padding: 14px;
	border-radius: 12px;
	box-shadow: 0 8px 24px rgba(0,0,0,0.5);
	color: #fff;
}
.settings-card h3 { margin: 0 0 8px 0; font-size: 16px; }
.settings-row { display:flex; justify-content:space-between; align-items:center; margin:8px 0; }
.settings-controls label { margin-left:8px; font-size:14px; color:#f3f3f3; }
.settings-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:12px; }
.settings-card .btn.logout { background:#c0392b; border:1px solid rgba(0,0,0,0.2); color:#fff; font-weight:700; }

/* User popup */
.user-popup { pointer-events:auto; }
.user-card { display:flex; gap:18px; align-items:flex-start; background:#334a37; border:1px solid #5b4a33; padding:14px; border-radius:14px; box-shadow:0 10px 28px rgba(0,0,0,0.5); color:#fff; width: min(560px, calc(100% - 48px)); }
.user-left { display:flex; flex-direction:column; gap:12px; align-items:flex-start; min-width:180px; }
.player-name { font-weight:800; font-size:16px; background:rgba(255,255,255,0.06); padding:8px 12px; border-radius:10px; }
.user-right h4 { margin:0 0 8px 0; font-size:16px; }
.inv-grid.small { display:grid; grid-template-columns:repeat(3, 64px); gap:8px; }
.inv-slot.small { width:64px; height:64px; border-radius:8px; }
.inv-inner { display:flex; align-items:center; justify-content:center; width:100%; height:100%; }
.inv-img { max-width:48px; max-height:48px; image-rendering:pixelated; }
.user-sprite { width:64px; height:64px; display:flex; align-items:center; justify-content:center; }
.user-sprite :deep(svg) { width:56px; height:56px; max-width:100%; max-height:100%; display:block; filter:drop-shadow(0 0 6px rgba(0,0,0,0.7)); }

/* color selector styles (reuse existing app pattern) */
.color-selector { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
.color-option { width:28px; height:28px; border:2px solid transparent; cursor:pointer; border-radius:6px; }
.color-option.selected { border-color:#000; box-shadow:0 2px 6px rgba(0,0,0,0.35); }

/* Top-right value display */
.top-right-values { position: absolute; top: 8px; right: 8px; z-index: 110; pointer-events: none; }
.top-right-values .value-card { pointer-events: auto; background: #334a37; border: 1px solid #5b4a33; color: #fff; padding: 8px 12px; border-radius: 10px; box-shadow: 0 6px 18px rgba(0,0,0,0.45); font-size: 13px; }
.top-right-values .value-card p { margin: 4px 0; }


/* Map debug overlay */
.map-debug {
	position: absolute;
	top: 8px;
	left: 8px;
	z-index: 80;
	background: rgba(0,0,0,0.7);
	color: #fff;
	padding: 8px 10px;
	border-radius: 6px;
	font-size: 12px;
	line-height: 1.2;
	max-width: 320px;
}
.map-debug-row { margin: 4px 0; }

.hud {

	margin-top: 8px;
	font-size: 0.9rem;
	color: #555;
}

/* Inventory panel styles */
.game-map {
	display: flex;
	gap: 12px;
	align-items: flex-start;
}
.inventory-panel {
	width: 260px;
	/* background color requested */
	background: #514F62;
	/* outer stroke */
	border: 3px solid #000000;
	border-radius: 14px;
	box-shadow: inset 0 8px 14px rgba(255,255,255,0.06), 0 8px 22px rgba(0,0,0,0.28);
	padding: 12px;
	z-index: 90;
}
.inv-title {
	margin: 0 0 8px 0;
	font-size: 14px;
	text-align: center;
	color: rgb(178, 204, 225);
}
.inv-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 10px;
}
.inv-slot {
	width: 72px;
	height: 72px;
	border-radius: 8px;
	/* outer stroke for each slot */
	border: 2px solid #000000;
	background: linear-gradient(180deg,#584f57,#463f48);
	box-shadow: inset 0 -6px 8px rgba(0,0,0,0.24), 0 4px 10px rgba(0,0,0,0.28);
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}
.inv-inner {
	width: 56px;
	height: 56px;
	border-radius: 6px;
	/* inner stroke (earthy) */
	border: 2px solid #5b4a33;
	background: linear-gradient(180deg,#efeef3,#e6e2ea);
	display:flex;align-items:center;justify-content:center;position:relative;
}
.inv-img { width:32px;height:32px; }
.inv-emoji { font-size:22px; }
.inv-count {
	position: absolute;
	right: -8px;
	bottom: -8px;
	background: rgba(0,0,0,0.85);
	color: #fff;
	font-size: 12px;
	padding: 3px 7px;
	border-radius: 12px;
	box-shadow: 0 3px 6px rgba(0,0,0,0.5);
}

/* Top-left mini-buttons inside map */
.map-top-left-buttons {
	position: absolute;
	top: 10px;
	left: 10px;
	display: flex;
	flex-direction: row;
	gap: 8px;
	z-index: 120;
}
.ml-btn {
	width: 44px;
	height: 44px;
	padding: 0;
	border: 2px solid #000000; /* outer stroke black */
	border-radius: 8px;
	background: #334a37; /* panel background */
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	box-shadow: 0 4px 8px rgba(0,0,0,0.35);
}
.ml-inner {
	display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px;border:2px solid #5b4a33; /* inner earthy stroke */background: linear-gradient(180deg,#efeef3,#e6e2ea);font-size:18px;
}
.ml-btn:active { transform: translateY(1px); }

.banner {
	margin: 6px 0;
	padding: 6px 8px;
	border-radius: 6px;
	font-size: 0.85rem;
}
.banner.success { background: #e6ffed; color: #035c1a; border: 1px solid #b8f7c7; }
.banner.warning { background: #fff8e1; color: #7a5600; border: 1px solid #ffe3a3; }
.banner.error { background: #ffeaea; color: #7a0000; border: 1px solid #ffb0b0; }

.controls {
	font-size: 0.8rem;
	color: #777;
}

.factory-progress {
	position: absolute;
	z-index: 11;
	padding: 2px 4px;
	background: rgba(0, 0, 0, 0.8);
	color: #fff;
	font-size: 10px;
	border-radius: 4px;
	transform-origin: bottom center;
}

.tile-progress {
	position: absolute;
	z-index: 12;
	padding: 2px 4px;
	background: rgba(0, 0, 0, 0.75);
	color: #fff;
	font-size: 10px;
	border-radius: 4px;
}

.flower-particle {
	position: absolute;
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: #ff69b4; /* pink */
	opacity: 0.9;
	animation: popFade 700ms ease-out forwards;
}

@keyframes popFade {
	0% { opacity: 0.9; transform: scale(1); }
	100% { opacity: 0; transform: scale(1.8); }
}

/* Shimmering highlight for waterable tiles on Map 3 */
.waterable-shine {
	position: absolute;
	top: 0;
	left: 0;
	border-radius: 4px;
	background: rgba(0, 200, 255, 0.06);
	box-shadow: 0 0 4px 1px rgba(0, 200, 255, 0.35);
	animation: shinePulse 1400ms ease-in-out infinite;
	image-rendering: pixelated;
	z-index: 8;
	pointer-events: none;
}
/* Subtle highlight for fence targets on Map 4 */
.fence-target-shine {
	position: absolute;
	top: 0;
	left: 0;
	border-radius: 4px;
	background: rgba(120, 180, 120, 0.06);
	box-shadow: 0 0 3px 1px rgba(120, 180, 120, 0.30);
	animation: fencePulse 1600ms ease-in-out infinite;
	image-rendering: pixelated;
	z-index: 8;
	pointer-events: none;
}

@keyframes fencePulse {
	0% { box-shadow: 0 0 2px 1px rgba(120, 180, 120, 0.25); opacity: 0.5; }
	50% { box-shadow: 0 0 6px 3px rgba(120, 190, 120, 0.55); opacity: 0.8; }
	100% { box-shadow: 0 0 2px 1px rgba(120, 180, 120, 0.25); opacity: 0.5; }
}

@keyframes shinePulse {
	0% { box-shadow: 0 0 3px 1px rgba(0, 200, 255, 0.30); opacity: 0.55; }
	50% { box-shadow: 0 0 8px 3px rgba(0, 230, 255, 0.55); opacity: 0.8; }
	100% { box-shadow: 0 0 3px 1px rgba(0, 200, 255, 0.30); opacity: 0.55; }
}

.inventory {
	margin-left: 8px;
}
.inv-icon {
	width: 16px;
	height: 16px;
	vertical-align: middle;
	margin: 0 4px;
}

.exchange-modal {
	position: fixed;
	inset: 0;
	background: rgba(0,0,0,0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 100;
}
.exchange-card {
	background: #334a37;
	color: #fff;
	padding: 16px;
	border-radius: 8px;
	width: 280px;
	box-shadow: 0 4px 12px rgba(0,0,0,0.35);
	border: 1px solid #5b4a33;
}
.exchange-card.wide {
	width: 560px;
}
.trade-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px;
}
.panel {
	border: 1px solid #5b4a33;
	border-radius: 6px;
	padding: 8px;
}
.tool-badge {
	display: inline-block;
	padding: 2px 6px;
	margin-right: 6px;
	background: #3e4a3e;
	border-radius: 6px;
	color: #e6e6d8;
	font-size: 12px;
}
.exchange-card h3 {
	margin: 0 0 8px;
}
.hint {
	font-size: 12px;
	color: #555;
	margin: 0 0 10px;
}
.offer {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 8px 0;
}
.btn {
	display: block;
	width: 100%;
	margin: 6px 0;
	padding: 8px;
	border: none;
	background: #d6a94a;
	color: #fff;
	cursor: pointer;
	border-radius: 6px;
	font-weight: 700;
}
.btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
.btn.close {
	background: #5b4a33;
}
</style>
