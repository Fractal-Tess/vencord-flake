import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { ChannelStore } from "@webpack/common";

// Forwards messages from chosen channels to hyper-trader's signal endpoint.
// Read only: nothing is ever sent to Discord.

const logger = new Logger("HyperTrader");
const Native = VencordNative.pluginHelpers.HyperTrader as PluginNative<typeof import("./native")>;

const settings = definePluginSettings({
	endpoint: {
		type: OptionType.STRING,
		description: "Signal endpoint of the app",
		default: "http://127.0.0.1:3211/ingest/signal"
	},
	secret: {
		type: OptionType.STRING,
		description: "INGEST_SECRET of the app",
		default: ""
	},
	channelIds: {
		type: OptionType.STRING,
		description: "Ids of the channels to forward, separated by commas",
		default: ""
	}
});

// The message as it comes off the gateway, before the client turns it into a record.
type Incoming = {
	id: string;
	channel_id: string;
	content?: string;
	timestamp?: string;
	author?: { username: string; global_name?: string | null };
	member?: { nick?: string | null };
	embeds?: { title?: string; description?: string }[];
	// Forwarded messages carry their text here and have no content of their own.
	message_snapshots?: { message?: { content?: string } }[];
};

// "@everyone" and role pings open nearly every call and say nothing about the trade.
const PING = /@everyone|@here|<@&\d+>/g;

function watched(channelId: string) {
	return settings.store.channelIds.split(/[\s,]+/).includes(channelId);
}

function textOf(message: Incoming) {
	const embeds = (message.embeds ?? []).map(e => [e.title, e.description].filter(Boolean).join("\n"));
	const forwarded = (message.message_snapshots ?? []).map(s => s.message?.content);
	return [message.content, ...forwarded, ...embeds]
		.filter(Boolean)
		.join("\n")
		.replace(PING, "")
		.trim();
}

export default definePlugin({
	name: "HyperTrader",
	description: "Forwards messages from chosen channels to hyper-trader",
	authors: [{ name: "Fractal-Tess", id: 0n }],
	settings,

	flux: {
		async MESSAGE_CREATE({ message, optimistic }: { message: Incoming; optimistic: boolean }) {
			if (optimistic || !watched(message.channel_id)) return;
			const text = textOf(message);
			if (!text) return;

			const { endpoint, secret } = settings.store;
			if (!secret) return logger.warn("No secret set, message not forwarded");

			const result = await Native.forward(
				endpoint,
				secret,
				JSON.stringify({
					source: "discord",
					text,
					// The name shown in the channel, which is what a pasted conversation carries too.
					author: message.member?.nick || message.author?.global_name || message.author?.username,
					channel: ChannelStore.getChannel(message.channel_id)?.name ?? message.channel_id,
					externalId: `discord:${message.id}`,
					timestamp: message.timestamp ? Date.parse(message.timestamp) : Date.now()
				})
			);
			if (!result.ok) logger.error(`Message ${message.id} not forwarded: ${result.error}`);
		}
	}
});
